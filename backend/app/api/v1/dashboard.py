from collections import Counter, defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.certificate_request import CertificateRequest, RequestStatus

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


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    requests = db.query(CertificateRequest).all()
    now = datetime.now()
    today = now.date()
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
    completed_this_month = sum(
        1
        for r in requests
        if r.status == RequestStatus.COMPLETED and _safe_date(r.created_at) and _safe_date(r.created_at) >= month_start
    )
    rejected_total = sum(
        1 for r in requests if r.status == RequestStatus.REJECTED
    )

    requests_yesterday = sum(
        1 for r in requests if _safe_date(r.created_at) == yesterday
    )

    ready_yesterday = sum(
        1
        for r in requests
        if r.status == RequestStatus.FOR_RELEASING and _safe_date(r.created_at) == yesterday
    )

    completed_last_month = sum(
        1
        for r in requests
        if r.status == RequestStatus.COMPLETED
        and _safe_date(r.created_at)
        and last_month_start <= _safe_date(r.created_at) <= last_month_end
    )

    status_breakdown = {
        "processing": sum(1 for r in requests if r.status == RequestStatus.PROCESSING),
        "for_review": for_approval_review,
        "for_releasing": ready_for_printing,
        "completed": sum(1 for r in requests if r.status == RequestStatus.COMPLETED),
        "rejected": rejected_total,
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
            "completed": 0,
            "rejected": 0,
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
        elif status_val == RequestStatus.COMPLETED:
            day_buckets[created]["completed"] += 1
        elif status_val == RequestStatus.REJECTED:
            day_buckets[created]["rejected"] += 1

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
            "completed_this_month": completed_this_month,
            "rejected": rejected_total,
        },
        "changes": {
            "requests_today": _pct_change(requests_today, requests_yesterday),
            "ready_for_printing": _pct_change(ready_for_printing, ready_yesterday),
            "completed_this_month": _pct_change(completed_this_month, completed_last_month),
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
