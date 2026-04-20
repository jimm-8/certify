import os
import threading
from datetime import datetime

import requests

from app.database import SessionLocal
from app.models.certificate_request import CertificateRequest, RequestStatus
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
        print_agent_url = (
            os.getenv("PRINT_AGENT_URL", "http://127.0.0.1:3100") or ""
        ).rstrip("/")

        while not self._stop_event.is_set():
            try:
                self._process_batch(print_agent_url, batch)
            except Exception as exc:
                print(f"[AutoPrint] Unexpected error: {exc}")
            self._stop_event.wait(interval)

    def _process_batch(self, print_agent_url, batch):
        db = self._db_factory()
        try:
            pending = (
                db.query(CertificateRequest)
                .filter(CertificateRequest.auto_print_requested_at.isnot(None))
                .filter(CertificateRequest.auto_printed_at.is_(None))
                .filter(CertificateRequest.status == RequestStatus.FOR_RELEASING)
                .order_by(CertificateRequest.auto_print_requested_at.asc())
                .limit(batch)
                .all()
            )
            for request in pending:
                self._print_request(db, request, print_agent_url)
        finally:
            db.close()

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

            response = requests.post(
                f"{print_agent_url}/print",
                data=pdf_bytes,
                headers={"Content-Type": "application/pdf"},
                timeout=60,
            )
            response.raise_for_status()

            request.auto_printed_at = datetime.now()
            db.commit()
            db.refresh(request)
            log_print_completed(db, request, user_name="AutoPrint")
            print(f"[AutoPrint] Printed {request.reference_number}")
        except Exception as exc:
            db.rollback()
            print(
                f"[AutoPrint] Failed to print {request.reference_number}: {exc}"
            )
