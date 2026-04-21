from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from io import StringIO
import csv
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.certificate_request import RequestStatus
from app.api.v1.auth import require_permissions
from app.repositories import CertificateRequestRepository

router = APIRouter(prefix="/reports", tags=["Reports"])


def _safe_date(value):
    if not value:
        return None
    if hasattr(value, "date"):
        return value.date()
    return value


def _apply_period(requests, period: Optional[str], today):
    if not period or period == "all":
        return requests
    if period == "today":
        return [r for r in requests if _safe_date(r.created_at) == today]
    if period == "last_7_days":
        start = today - timedelta(days=6)
        return [
            r
            for r in requests
            if _safe_date(r.created_at) and _safe_date(r.created_at) >= start
        ]
    if period == "last_30_days":
        start = today - timedelta(days=29)
        return [
            r
            for r in requests
            if _safe_date(r.created_at) and _safe_date(r.created_at) >= start
        ]
    if period == "this_month":
        start = today.replace(day=1)
        return [
            r
            for r in requests
            if _safe_date(r.created_at) and _safe_date(r.created_at) >= start
        ]
    if period == "this_year":
        start = today.replace(month=1, day=1)
        return [
            r
            for r in requests
            if _safe_date(r.created_at) and _safe_date(r.created_at) >= start
        ]
    return requests


def _format_duration(seconds: float | None) -> str:
    if seconds is None:
        return "0"
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


def _format_generation_duration(milliseconds: float | None) -> str:
    if milliseconds is None:
        return "0 ms"
    if milliseconds < 1000:
        return f"{int(round(milliseconds))} ms"
    seconds = milliseconds / 1000
    if seconds < 60:
        return f"{seconds:.2f} s"
    minutes = int(seconds // 60)
    remaining_seconds = seconds % 60
    return f"{minutes}m {remaining_seconds:.1f}s"


def _last_n_days(n: int, today):
    return [today - timedelta(days=i) for i in range(n - 1, -1, -1)]


def _linear_forecast(counts: list[int], horizon: int) -> list[int]:
    n = len(counts)
    if n == 0:
        return [0 for _ in range(horizon)]
    x_vals = list(range(n))
    x_mean = sum(x_vals) / n
    y_mean = sum(counts) / n
    denom = sum((x - x_mean) ** 2 for x in x_vals)
    if denom == 0:
        slope = 0
    else:
        slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, counts)) / denom
    intercept = y_mean - slope * x_mean
    preds = []
    for i in range(n, n + horizon):
        val = intercept + slope * i
        preds.append(max(0, int(round(val))))
    return preds


def _moving_average_forecast(
    counts: list[int], horizon: int, window: int = 7
) -> list[int]:
    if not counts:
        return [0 for _ in range(horizon)]
    window = min(window, len(counts))
    avg = sum(counts[-window:]) / window
    return [max(0, int(round(avg))) for _ in range(horizon)]


def _exp_smoothing_forecast(
    counts: list[int], horizon: int, alpha: float = 0.3
) -> list[int]:
    if not counts:
        return [0 for _ in range(horizon)]
    level = counts[0]
    for value in counts[1:]:
        level = alpha * value + (1 - alpha) * level
    return [max(0, int(round(level))) for _ in range(horizon)]


@router.get("/summary")
def get_reports_summary(
    period: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("reports.read")),
):
    request_repo = CertificateRequestRepository(db)
    requests = request_repo.certificates_only().all()
    now = datetime.now()
    today = now.date()

    filtered = _apply_period(requests, period, today)

    total_requests = len(filtered)
    released_requests = [r for r in filtered if r.status == RequestStatus.RELEASED]
    rejected_requests = [r for r in filtered if r.status == RequestStatus.REJECTED]

    pending_count = sum(
        1 for r in filtered if r.status in {RequestStatus.SUBMITTED, RequestStatus.PENDING}
    )
    processing_count = sum(
        1 for r in filtered if r.status == RequestStatus.PROCESSING
    )
    requests_today = sum(
        1 for r in filtered if _safe_date(r.created_at) == today
    )

    release_rate = (
        round((len(released_requests) / total_requests) * 100)
        if total_requests
        else 0
    )
    rejection_rate = (
        round((len(rejected_requests) / total_requests) * 100)
        if total_requests
        else 0
    )

    status_counts = Counter(
        r.status.value if hasattr(r.status, "value") else str(r.status)
        for r in filtered
        if r.status
    )

    avg_processing_seconds = None
    durations = []
    for r in released_requests:
        if not r.created_at:
            continue
        end_time = r.updated_at or r.created_at
        try:
            durations.append((end_time - r.created_at).total_seconds())
        except Exception:
            pass
    if durations:
        avg_processing_seconds = sum(durations) / len(durations)

    pdf_generation_durations = [
        r.pdf_generation_time_ms
        for r in filtered
        if getattr(r, "pdf_generation_time_ms", None) is not None
    ]
    avg_pdf_generation_ms = (
        sum(pdf_generation_durations) / len(pdf_generation_durations)
        if pdf_generation_durations
        else None
    )

    certificate_counter = Counter(
        r.certificate_type_name for r in filtered if r.certificate_type_name
    )
    program_counter = Counter(r.program for r in filtered if r.program)
    requestor_counter = Counter(r.requestor_name for r in filtered if r.requestor_name)

    last_30_days = _last_n_days(30, today)
    daily_counts = {d: 0 for d in last_30_days}
    for r in requests:
        d = _safe_date(r.created_at)
        if d in daily_counts:
            daily_counts[d] += 1

    daily_series = [
        {"date": d.isoformat(), "count": daily_counts[d]} for d in last_30_days
    ]

    avg_daily_requests = (
        round(sum(daily_counts.values()) / len(daily_counts), 2) if daily_counts else 0
    )

    # Diagnostic analytics
    aging_buckets = {
        "0-2_days": 0,
        "3-5_days": 0,
        "6-10_days": 0,
        "11+_days": 0,
    }
    bottleneck_by_status = Counter()
    bottleneck_by_certificate = defaultdict(list)
    bottleneck_by_program = defaultdict(list)
    stalled_requests = []

    for r in filtered:
        if r.status == RequestStatus.RELEASED:
            continue
        created = _safe_date(r.created_at)
        if not created:
            continue
        age_days = (today - created).days
        if age_days <= 2:
            aging_buckets["0-2_days"] += 1
        elif age_days <= 5:
            aging_buckets["3-5_days"] += 1
        elif age_days <= 10:
            aging_buckets["6-10_days"] += 1
        else:
            aging_buckets["11+_days"] += 1

        if age_days >= 5:
            status_label = (
                r.status.value if hasattr(r.status, "value") else str(r.status)
            )
            bottleneck_by_status[status_label] += 1
            if r.certificate_type_name:
                bottleneck_by_certificate[r.certificate_type_name].append(age_days)
            if r.program:
                bottleneck_by_program[r.program].append(age_days)
        if age_days >= 7:
            stalled_requests.append(
                {
                    "reference_number": r.reference_number,
                    "student_name": r.student_name,
                    "status": (
                        r.status.value if hasattr(r.status, "value") else str(r.status)
                    ),
                    "age_days": age_days,
                }
            )

    stalled_requests = sorted(
        stalled_requests, key=lambda x: x["age_days"], reverse=True
    )[:8]

    bottleneck_cert_list = [
        {
            "certificate_type": name,
            "avg_age_days": round(sum(ages) / len(ages), 1),
            "count": len(ages),
        }
        for name, ages in bottleneck_by_certificate.items()
    ]
    bottleneck_cert_list.sort(
        key=lambda x: (x["avg_age_days"], x["count"]), reverse=True
    )

    bottleneck_program_list = [
        {
            "program": name,
            "avg_age_days": round(sum(ages) / len(ages), 1),
            "count": len(ages),
        }
        for name, ages in bottleneck_by_program.items()
    ]
    bottleneck_program_list.sort(
        key=lambda x: (x["avg_age_days"], x["count"]), reverse=True
    )

    # Predictive analytics
    counts_for_forecast = [d["count"] for d in daily_series]
    forecast_horizon = 7
    linear_pred = _linear_forecast(counts_for_forecast, forecast_horizon)
    avg_pred = _moving_average_forecast(counts_for_forecast, forecast_horizon, window=7)
    exp_pred = _exp_smoothing_forecast(counts_for_forecast, forecast_horizon, alpha=0.3)

    forecast_days = _last_n_days(
        forecast_horizon, today + timedelta(days=forecast_horizon)
    )
    forecast = []
    for i in range(forecast_horizon):
        forecast.append(
            {
                "date": forecast_days[i].isoformat(),
                "linear": linear_pred[i],
                "moving_avg": avg_pred[i],
                "exp_smoothing": exp_pred[i],
                "blended": int(round((linear_pred[i] + avg_pred[i] + exp_pred[i]) / 3)),
            }
        )

    return {
        "generated_at": now.isoformat(),
        "period": period or "all",
        "descriptive": {
            "total_requests": total_requests,
            "released_total": len(released_requests),
            "rejected_total": len(rejected_requests),
            "release_rate": release_rate,
            "rejection_rate": rejection_rate,
            "avg_processing_time_label": _format_duration(avg_processing_seconds),
            "avg_pdf_generation_time_ms": (
                round(avg_pdf_generation_ms, 2)
                if avg_pdf_generation_ms is not None
                else None
            ),
            "avg_pdf_generation_time_label": _format_generation_duration(
                avg_pdf_generation_ms
            ),
            "pdf_generation_samples": len(pdf_generation_durations),
            "avg_daily_requests_last_30_days": avg_daily_requests,
            "status_breakdown": status_counts,
            "pending": pending_count,
            "processing": processing_count,
            "requests_today": requests_today,
            "sla_days": 2,
            "certificate_types": [
                {"name": name, "count": count}
                for name, count in certificate_counter.most_common(8)
            ],
            "programs": [
                {"name": name, "count": count}
                for name, count in program_counter.most_common(8)
            ],
            "top_requestors": [
                {"name": name, "count": count}
                for name, count in requestor_counter.most_common(5)
            ],
            "daily_requests": daily_series,
        },
        "diagnostic": {
            "aging_buckets": aging_buckets,
            "bottleneck_by_status": bottleneck_by_status,
            "bottleneck_by_certificate": bottleneck_cert_list[:6],
            "bottleneck_by_program": bottleneck_program_list[:6],
            "stalled_requests": stalled_requests,
        },
        "predictive": {
            "methodology": {
                "linear_trend_window_days": len(counts_for_forecast),
                "moving_average_window_days": min(7, len(counts_for_forecast)),
                "exp_smoothing_alpha": 0.3,
            },
            "forecast_next_7_days": forecast,
        },
    }


@router.get("/export")
def export_reports(
    report_type: str = "summary",
    period: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("reports.read")),
):
    request_repo = CertificateRequestRepository(db)
    requests = request_repo.certificates_only().all()
    now = datetime.now()
    today = now.date()

    if report_type == "requests":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "reference_number",
                "student_name",
                "program",
                "certificate_type",
                "status",
                "requestor_name",
                "requestor_email",
                "created_at",
                "updated_at",
            ]
        )
        for r in requests:
            writer.writerow(
                [
                    r.reference_number,
                    r.student_name,
                    r.program,
                    r.certificate_type_name,
                    r.status.value if hasattr(r.status, "value") else str(r.status),
                    r.requestor_name,
                    r.requestor_email,
                    r.created_at,
                    r.updated_at,
                ]
            )
        output.seek(0)
        filename = f"certify_requests_{now.strftime('%Y%m%d_%H%M%S')}.csv"
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    filtered = _apply_period(requests, period, today)
    status_counts = Counter(
        r.status.value if hasattr(r.status, "value") else str(r.status)
        for r in filtered
        if r.status
    )
    certificate_counter = Counter(
        r.certificate_type_name for r in filtered if r.certificate_type_name
    )
    program_counter = Counter(r.program for r in filtered if r.program)

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["section", "metric", "value"])
    writer.writerow(["summary", "total_requests", len(filtered)])
    writer.writerow(["summary", "generated_at", now.isoformat()])
    for status, count in status_counts.items():
        writer.writerow(["status_breakdown", status, count])
    for name, count in certificate_counter.most_common(10):
        writer.writerow(["certificate_types", name, count])
    for name, count in program_counter.most_common(10):
        writer.writerow(["programs", name, count])

    output.seek(0)
    filename = f"certify_summary_{now.strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
