import os
import threading
from datetime import datetime, timedelta

import requests

from app.database import SessionLocal
from app.models.certificate_request import (
    AutoPrintStatus,
    CertificateRequest,
    RequestStatus,
)
from app.services.audit_service import log_print_completed
from app.services.certificate_service import generate_certificate_pdf


class AutoPrintWorker:
    def __init__(self, db_factory=SessionLocal):
        self._db_factory = db_factory
        self._stop_event = threading.Event()
        self._thread = None

    def start(self):
        if (os.getenv("CERTIFY_AUTO_PRINT_ENABLED", "1") or "1").strip() == "0":
            print("[AutoPrint] Disabled via CERTIFY_AUTO_PRINT_ENABLED=0")
            return
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(
            target=self._run, name="auto-print-worker", daemon=True
        )
        self._thread.start()
        print("[AutoPrint] Worker started")

    def stop(self):
        self._stop_event.set()

    def _run(self):
        interval = float(os.getenv("CERTIFY_AUTO_PRINT_INTERVAL", "5") or "5")
        batch = int(os.getenv("CERTIFY_AUTO_PRINT_BATCH", "5") or "5")
        sending_timeout_seconds = int(
            os.getenv("CERTIFY_AUTO_PRINT_SENDING_TIMEOUT", "120") or "120"
        )
        print_agent_url = (
            os.getenv("PRINT_AGENT_URL", "http://127.0.0.1:3100") or ""
        ).rstrip("/")

        while not self._stop_event.is_set():
            try:
                self._process_batch(
                    print_agent_url,
                    batch,
                    timedelta(seconds=max(sending_timeout_seconds, 5)),
                )
            except Exception as exc:
                print(f"[AutoPrint] Unexpected error: {exc}")
            self._stop_event.wait(interval)

    def _process_batch(self, print_agent_url, batch, sending_timeout):
        db = self._db_factory()
        try:
            self._recover_stale_sending_jobs(db, sending_timeout, batch)
            self._refresh_submitted_jobs(db, print_agent_url, batch)
            pending = (
                db.query(CertificateRequest)
                .filter(CertificateRequest.auto_print_requested_at.isnot(None))
                .filter(CertificateRequest.auto_printed_at.is_(None))
                .filter(CertificateRequest.status == RequestStatus.FOR_RELEASING)
                .filter(
                    (CertificateRequest.auto_print_status.is_(None))
                    | (
                        CertificateRequest.auto_print_status
                        == AutoPrintStatus.REQUESTED.value
                    )
                    | (
                        CertificateRequest.auto_print_status
                        == AutoPrintStatus.FAILED.value
                    )
                )
                .order_by(CertificateRequest.auto_print_requested_at.asc())
                .limit(batch)
                .all()
            )
            for request in pending:
                self._print_request(db, request, print_agent_url)
        finally:
            db.close()

    def _recover_stale_sending_jobs(self, db, sending_timeout, batch):
        cutoff = datetime.now() - sending_timeout
        sending = (
            db.query(CertificateRequest)
            .filter(CertificateRequest.auto_print_requested_at.isnot(None))
            .filter(CertificateRequest.auto_printed_at.is_(None))
            .filter(CertificateRequest.status == RequestStatus.FOR_RELEASING)
            .filter(
                CertificateRequest.auto_print_status == AutoPrintStatus.SENDING.value
            )
            .filter(
                (CertificateRequest.updated_at.is_(None))
                | (CertificateRequest.updated_at <= cutoff)
            )
            .order_by(CertificateRequest.auto_print_requested_at.asc())
            .limit(batch)
            .all()
        )

        for request in sending:
            request.auto_print_status = AutoPrintStatus.REQUESTED.value
            request.auto_print_job_id = None
            request.auto_print_error = (
                "Recovered from a stale SENDING state and re-queued automatically."
            )
            db.commit()
            db.refresh(request)
            print(
                f"[AutoPrint] Re-queued stale sending job for "
                f"{request.reference_number}"
            )

    def _refresh_submitted_jobs(self, db, print_agent_url, batch):
        submitted = (
            db.query(CertificateRequest)
            .filter(CertificateRequest.auto_print_requested_at.isnot(None))
            .filter(CertificateRequest.auto_printed_at.is_(None))
            .filter(CertificateRequest.status == RequestStatus.FOR_RELEASING)
            .filter(
                CertificateRequest.auto_print_status == AutoPrintStatus.SUBMITTED.value
            )
            .order_by(CertificateRequest.auto_print_requested_at.asc())
            .limit(batch)
            .all()
        )

        for request in submitted:
            self._sync_print_job(db, request, print_agent_url)

    def _sync_print_job(self, db, request, print_agent_url):
        job_id = (request.auto_print_job_id or "").strip()
        if not job_id:
            return

        try:
            response = requests.get(
                f"{print_agent_url}/jobs/{job_id}",
                timeout=15,
            )
            if response.status_code == 404:
                print(
                    f"[AutoPrint] Job {job_id} for {request.reference_number} "
                    "is no longer available in the agent."
                )
                return
            response.raise_for_status()
            payload = response.json()
            self._apply_job_status(db, request, payload)
        except Exception as exc:
            print(
                f"[AutoPrint] Failed to refresh job {job_id} for "
                f"{request.reference_number}: {exc}"
            )

    def _print_request(self, db, request, print_agent_url):
        try:
            pdf_path = request.pdf_path
            if not pdf_path or not os.path.exists(pdf_path):
                pdf_path = generate_certificate_pdf(
                    db=db, request_id=request.id, user_name="AutoPrint"
                )
                request.pdf_path = pdf_path
                db.commit()
                db.refresh(request)

            with open(pdf_path, "rb") as handle:
                pdf_bytes = handle.read()

            request.auto_print_status = AutoPrintStatus.SENDING.value
            request.auto_print_error = None
            db.commit()
            db.refresh(request)

            response = requests.post(
                f"{print_agent_url}/print",
                data=pdf_bytes,
                headers={"Content-Type": "application/pdf"},
                timeout=90,
            )
            response.raise_for_status()

            try:
                payload = response.json()
            except ValueError:
                payload = {"status": "completed"}

            self._apply_job_status(db, request, payload)
        except Exception as exc:
            db.rollback()
            request.auto_print_status = AutoPrintStatus.FAILED.value
            request.auto_print_error = str(exc)
            db.commit()
            db.refresh(request)
            print(
                f"[AutoPrint] Failed to print {request.reference_number}: {exc}"
            )

    def _apply_job_status(self, db, request, payload):
        status_value = str(payload.get("status") or "").strip().lower()
        job_id = payload.get("job_id") or request.auto_print_job_id
        printer = payload.get("printer") or "default"

        if job_id:
            request.auto_print_job_id = str(job_id)

        if status_value in {"completed", "printed", "done"}:
            self._mark_request_completed(db, request)
            print(
                f"[AutoPrint] Confirmed completion for {request.reference_number} "
                f"on {printer}"
            )
            return

        if status_value in {"failed", "error"}:
            request.auto_print_status = AutoPrintStatus.FAILED.value
            request.auto_print_error = payload.get("error") or payload.get("message")
            db.commit()
            db.refresh(request)
            print(
                f"[AutoPrint] Agent reported failure for "
                f"{request.reference_number}: {request.auto_print_error}"
            )
            return

        request.auto_print_status = AutoPrintStatus.SUBMITTED.value
        request.auto_print_error = None
        db.commit()
        db.refresh(request)
        print(
            f"[AutoPrint] Submitted {request.reference_number} to printer "
            f"{printer}; waiting for completion confirmation."
        )

    def _mark_request_completed(self, db, request):
        already_printed = bool(request.auto_printed_at)
        if not already_printed:
            request.auto_printed_at = datetime.now()

        request.auto_print_confirmed_at = request.auto_printed_at or datetime.now()
        request.auto_print_status = AutoPrintStatus.COMPLETED.value
        request.auto_print_error = None
        db.commit()
        db.refresh(request)

        if not already_printed:
            log_print_completed(db, request, user_name="AutoPrint")
