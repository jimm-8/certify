from datetime import datetime, timedelta
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.certificate_request import CertificateRequest
from app.services.release_hold_service import (
    start_processing_hold,
    start_request_hold,
    stop_processing_hold,
    stop_request_hold,
    get_effective_processing_seconds,
)


def _make_request(created_at: datetime) -> CertificateRequest:
    return CertificateRequest(
        reference_number="REF-SLA-001",
        pin="1234",
        request_type="certificate",
        requestor_name="Req",
        requestor_address="Addr",
        requestor_relationship="Self",
        requestor_contact="0917",
        requestor_email="req@example.com",
        purpose="Test",
        student_name="Ada Lovelace",
        program="BSCS",
        created_at=created_at,
        processing_hold_total_seconds=0,
        release_hold_total_seconds=0,
    )


def test_effective_processing_seconds_subtracts_payment_and_release_holds():
    created_at = datetime(2026, 5, 13, 8, 0, 0)
    request = _make_request(created_at)

    assert start_processing_hold(
        request,
        now=created_at + timedelta(hours=1),
    )
    assert stop_processing_hold(
        request,
        now=created_at + timedelta(hours=2),
    )

    assert start_request_hold(
        request,
        reason="Signatory unavailable",
        now=created_at + timedelta(hours=3),
    )
    assert stop_request_hold(
        request,
        now=created_at + timedelta(hours=4),
    )

    effective_seconds = get_effective_processing_seconds(
        request,
        end_time=created_at + timedelta(hours=5),
    )

    assert effective_seconds == 3 * 60 * 60


def test_stop_processing_hold_is_noop_when_not_active():
    request = _make_request(datetime(2026, 5, 13, 8, 0, 0))

    assert stop_processing_hold(request) is False
    assert request.processing_hold_total_seconds == 0
