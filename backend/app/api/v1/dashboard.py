from collections import Counter, defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.certificate_request import CertificateRequest, RequestStatus
from app.api.v1.auth import require_permissions
from app.repositories import CertificateRequestRepository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _safe_date(value):
    if not value:
        return None
    if hasattr(value, "date"):
        return value.date()
    return value


def _pct_change(current: int, previous: int):
    if previous == 0:
        if current == 0:
            return {"percent": 0, "direction": "flat"}
        return {"percent": 100, "direction": "up"}
    change = ((current - previous) / previous) * 100
    direction = "up" if change > 0 else "down" if change < 0 else "flat"
    return {"percent": round(abs(change)), "direction": direction}


def _format_duration(seconds: float | None) -> str:
    if seconds is None:
        return "—"
    total_minutes = int(round(seconds / 60))
    if total_minutes <= 0:
        return "0m"
    days, rem = divmod(total_minutes, 60 * 24)
    hours, minutes = divmod(rem, 60)
    if days > 0:
        return f"{days}d {hours}h"
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def _apply_period(requests, period: Optional[str], today):
    if not period or period == "all":
        return requests
    if period == "today":
        return [r for r in requests if _safe_date(r.created_at) == today]
    if period == "last_7_days":
        start = today - timedelta(days=6)
        return [r for r in requests if _safe_date(r.created_at) and _safe_date(r.created_at) >= start]
    if period == "last_30_days":
        start = today - timedelta(days=29)
        return [r for r in requests if _safe_date(r.created_at) and _safe_date(r.created_at) >= start]
    if period == "this_month":
        start = today.replace(day=1)
        return [r for r in requests if _safe_date(r.created_at) and _safe_date(r.created_at) >= start]
    if period == "this_year":
        start = today.replace(month=1, day=1)
        return [r for r in requests if _safe_date(r.created_at) and _safe_date(r.created_at) >= start]
    return requests


@router.get("/summary")
def get_dashboard_summary(
    period: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("dashboard.read")),
):
    request_repo = CertificateRequestRepository(db)
    requests = request_repo.query().all()
    now = datetime.now()
    today = now.date()
    requests = _apply_period(requests, period, today)
    month_start = today.replace(day=1)
    yesterday = today - timedelta(days=1)
    last_month_end = month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    requests_today = sum(
        1 for r in requests if _safe_date(r.created_at) == today
    )

    pending_for_checking = sum(
        1 for r in requests if r.status in {RequestStatus.SUBMITTED, RequestStatus.PENDING}
    )
    for_approval_review = sum(
        1 for r in requests if r.status == RequestStatus.APPROVED
    )
    ready_for_printing = sum(
        1 for r in requests if r.status == RequestStatus.FOR_RELEASING
    )
    released_this_month = sum(
        1
        for r in requests
        if r.status == RequestStatus.RELEASED and _safe_date(r.created_at) and _safe_date(r.created_at) >= month_start
    )

    requests_yesterday = sum(
        1 for r in requests if _safe_date(r.created_at) == yesterday
    )

    ready_yesterday = sum(
        1
        for r in requests
        if r.status == RequestStatus.FOR_RELEASING and _safe_date(r.created_at) == yesterday
    )

    released_last_month = sum(
        1
        for r in requests
        if r.status == RequestStatus.RELEASED
        and _safe_date(r.created_at)
        and last_month_start <= _safe_date(r.created_at) <= last_month_end
    )

    released_durations = []
    for r in requests:
        if r.status != RequestStatus.RELEASED:
            continue
        if not r.created_at:
            continue
        end_time = r.updated_at or r.created_at
        try:
            released_durations.append((end_time - r.created_at).total_seconds())
        except Exception:
            pass

    avg_processing_seconds = (
        sum(released_durations) / len(released_durations)
        if released_durations
        else None
    )
    avg_processing_time_label = _format_duration(avg_processing_seconds)

    status_breakdown = {
        "processing": sum(1 for r in requests if r.status == RequestStatus.PROCESSING),
        "for_review": for_approval_review,
        "for_releasing": ready_for_printing,
        "released": sum(1 for r in requests if r.status == RequestStatus.RELEASED),
    }

    recent = sorted(
        requests,
        key=lambda r: r.created_at or datetime.min,
        reverse=True,
    )

    monthly_overview = [
        {
            "id": r.id,
            "sr_code": r.sr_code or "-",
            "student_name": r.student_name,
            "certificate_type": r.certificate_type_name,
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "reference_number": r.reference_number,
            "created_at": r.created_at,
        }
        for r in recent[:6]
    ]

    recent_requests = [
        {
            "id": r.id,
            "reference_number": r.reference_number,
            "sr_code": r.sr_code or "-",
            "student_name": r.student_name,
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
        }
        for r in recent[:3]
    ]

    requestor_counter = Counter(r.requestor_name for r in requests if r.requestor_name)
    performance_leaderboard = [
        {"name": name, "count": count}
        for name, count in requestor_counter.most_common(3)
    ]

    cert_counter = Counter(r.certificate_type_name for r in requests if r.certificate_type_name)
    certificate_history = [
        {"certificate_type": cert_type, "count": count}
        for cert_type, count in cert_counter.most_common(5)
    ]

    pending_cutoff = today - timedelta(days=5)
    pending_over_5_days = sum(
        1
        for r in requests
        if r.status in {RequestStatus.SUBMITTED, RequestStatus.PENDING, RequestStatus.APPROVED, RequestStatus.PROCESSING}
        and _safe_date(r.created_at)
        and _safe_date(r.created_at) <= pending_cutoff
    )

    day_buckets = defaultdict(
        lambda: {
            "processing": 0,
            "for_review": 0,
            "for_releasing": 0,
            "released": 0,
        }
    )
    last_days = [today - timedelta(days=i) for i in range(8, -1, -1)]

    for r in requests:
        created = _safe_date(r.created_at)
        if created not in last_days:
            continue
        status_val = r.status
        if status_val == RequestStatus.PROCESSING:
            day_buckets[created]["processing"] += 1
        elif status_val == RequestStatus.APPROVED:
            day_buckets[created]["for_review"] += 1
        elif status_val == RequestStatus.FOR_RELEASING:
            day_buckets[created]["for_releasing"] += 1
        elif status_val == RequestStatus.RELEASED:
            day_buckets[created]["released"] += 1

    requests_over_time = [
        {
            "date": d.isoformat(),
            "label": d.strftime("%a"),
            **day_buckets[d],
        }
        for d in last_days
    ]

    return {
        "generated_at": now.isoformat(),
        "totals": {
            "requests_today": requests_today,
            "pending_for_checking": pending_for_checking,
            "for_approval_review": for_approval_review,
            "ready_for_printing": ready_for_printing,
            "released_this_month": released_this_month,
            "avg_processing_time_label": avg_processing_time_label,
        },
        "changes": {
            "requests_today": _pct_change(requests_today, requests_yesterday),
            "ready_for_printing": _pct_change(ready_for_printing, ready_yesterday),
            "released_this_month": _pct_change(released_this_month, released_last_month),
        },
        "status_breakdown": status_breakdown,
        "requests_over_time": requests_over_time,
        "monthly_overview": monthly_overview,
        "performance_leaderboard": performance_leaderboard,
        "recent_requests": recent_requests,
        "certificate_history": certificate_history,
        "alerts": {
            "pending_over_5_days": pending_over_5_days,
        },
    }
