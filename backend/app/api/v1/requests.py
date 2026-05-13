from fastapi import APIRouter, Depends, HTTPException, status
from app.services.email_service import EmailService
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import re
import random
from datetime import datetime
import base64
import os
import glob
import json

from app.database import get_db
from app.models.certificate_request import (
    AutoPrintStatus,
    CertificateRequest,
    CertificateType,
    RequestStatus,
    RequestType,
)
from app.models.student import Student
from app.models.program import Program
from app.repositories import (
    AuditLogRepository,
    CertificateRequestRepository,
    CertificateTypeRepository,
    GraduationRecordRepository,
    ProgramRepository,
    StudentRepository,
)
from app.schemas.certificate_request import (
    CertificateRequestCreate,
    CertificateRequestResponse,
    CertificateRequestTrackResponse,
    CertificateRequestDetail,
    CourseDescriptionSelectionUpdate,
    GradeSelectionUpdate,
    RequestsValidationRequest,
    RequestsValidationResponse,
    DelayNoticeRequest,
    RejectionEmailRequest,
    CheckingEmailRequest,
)

from app.services.request_service import (
    update_request_status,
    update_student_data,
    add_note_to_request,
    generate_verification_token,
)
from app.models.audit_log import AuditLog
from app.schemas.certificate_request import StatusUpdateRequest, StudentDataUpdate
from app.schemas.audit import AuditLogResponse, RequestNoteCreate

from app.schemas.certificate_request import CertificateVerificationResponse

from app.services.certificate_service import generate_certificate_pdf
from app.services.fee_service import compute_request_cost, is_certification_of_grades, is_course_description
from app.services.purpose_service import analyze_request_purpose
from app.engine.certificate_dependency_engine import CertificateDependencyEngine
from app.api.v1.auth import require_permissions
from fastapi.responses import FileResponse
from app.services.audit_service import log_action, log_print_completed
from app.services.release_hold_service import (
    hold_request_for_no_pickup,
    send_manual_delay_notice,
)
from app.certificate_dependencies import normalize_certificate_name

# Create router
router = APIRouter(prefix="/requests", tags=["Certificate Requests"])

SUPPORTED_RECORDS_START_YEAR = 2018
OUT_OF_RANGE_YEAR_NOTIFICATION = (
    "A new certificate request was submitted with a graduation year outside "
    "the supported data range. Records prior to 2018 are not available in "
    "the system. Please review the request via the ODR portal."
)


def _build_audit_log_responses(
    db: Session, logs: list[AuditLog]
) -> list[AuditLogResponse]:
    request_ids = sorted(
        {
            log.entity_id
            for log in logs
            if log.entity_type == "certificate_request" and log.entity_id is not None
        }
    )
    request_map = {}
    if request_ids:
        request_repo = CertificateRequestRepository(db)
        request_map = {
            request.id: request
            for request in request_repo.query()
            .filter(CertificateRequest.id.in_(request_ids))
            .all()
        }

    items = []
    for log in logs:
        request = request_map.get(log.entity_id)
        items.append(
            AuditLogResponse(
                id=log.id,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                action=log.action,
                field_name=log.field_name,
                old_value=log.old_value,
                new_value=log.new_value,
                user_name=log.user_name,
                notes=log.notes,
                created_at=log.created_at,
                request_reference=(
                    request.reference_number if request is not None else None
                ),
                request_label=(request.request_label if request is not None else None),
                student_name=(request.student_name if request is not None else None),
                owner_username=(request.owner_username if request is not None else None),
            )
        )
    return items


def extract_graduation_year(record) -> int | None:
    if record is None:
        return None

    for value in (
        getattr(record, "date_of_graduation", None),
        getattr(record, "proposed_graduation_date", None),
        getattr(record, "academic_year", None),
    ):
        if not value:
            continue

        match = re.search(r"\b(19|20)\d{2}\b", str(value))
        if match:
            return int(match.group(0))

    return None


def is_graduation_related_certificate(certificate_type_name: Optional[str]) -> bool:
    normalized = str(certificate_type_name or "").strip().lower()
    if not normalized:
        return False

    keywords = (
        "graduation",
        "honor graduate",
        "completed academic requirement",
    )
    return any(keyword in normalized for keyword in keywords)


def is_gwa_certificate(certificate_type_name: Optional[str]) -> bool:
    normalized = normalize_certificate_name(certificate_type_name or "")
    return normalized in {
        "certificationofgwa",
        "certificateofgwa",
    }


def is_honor_graduate_certificate(certificate_type_name: Optional[str]) -> bool:
    normalized = normalize_certificate_name(certificate_type_name or "")
    return normalized == "certificationofhonorgraduate"


def is_cav_certificate(certificate_type_name: Optional[str]) -> bool:
    normalized = normalize_certificate_name(certificate_type_name or "")
    return normalized in {
        "certificationauthenticationandverification",
        "certificationauthenticationandverificationcav",
    }

# Helper function to generate reference number
def generate_reference_number(db: Session) -> str:
    """Generate unique reference number in format: YY-MMDD-#####"""
    now = datetime.now()
    year = now.strftime("%y")
    month_day = now.strftime("%m%d")

    request_repo = CertificateRequestRepository(db)
    while True:
        random_suffix = f"{random.randint(0, 99999):05d}"
        ref = f"{year}-{month_day}-{random_suffix}"
        exists = request_repo.query().filter(
            CertificateRequest.reference_number == ref
        ).first()
        if not exists:
            return ref

# Helper function to generate PIN
def generate_pin() -> str:
    """Generate random 4-digit PIN"""
    return str(random.randint(1000, 9999))

# Helper function to save signature
def save_signature(signature_data: str, reference_number: str) -> str:
    """Save base64 signature image and return file path"""
    if not signature_data:
        return None
    
    try:
        # Create uploads/signatures directory if it doesn't exist
        upload_dir = "uploads/signatures"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Remove data:image/png;base64, prefix if present
        if "," in signature_data:
            signature_data = signature_data.split(",")[1]
        
        # Decode base64
        image_data = base64.b64decode(signature_data)
        
        # Save file
        filename = f"{reference_number}.png"
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        return filepath
    except Exception as e:
        print(f"Error saving signature: {e}")
        return None

# Endpoint 1: Create certificate request
@router.post("/", response_model=CertificateRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_certificate_request(
    request_data: CertificateRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a new certificate request with signature
    """
    
    cert_type = None
    request_type = RequestType(request_data.request_type.value)
    requested_document_name = (
        request_data.requested_document_name.strip()
        if request_data.requested_document_name
        else None
    )
    resolved_sr_code = (request_data.sr_code or "").strip() or None
    student_repo = StudentRepository(db)
    if not resolved_sr_code and request_data.student_name:
        matched_student = student_repo.get_by_student_name(request_data.student_name)
        if matched_student is not None:
            resolved_sr_code = matched_student.sr_code

    graduation_year = None
    if request_data.year_graduated:
        try:
            graduation_year = int(str(request_data.year_graduated).strip())
        except (TypeError, ValueError):
            graduation_year = None

    needs_historical_review = (
        request_type == RequestType.CERTIFICATE
        and graduation_year is not None
        and graduation_year < SUPPORTED_RECORDS_START_YEAR
    )

    if request_type == RequestType.CERTIFICATE:
        cert_type_repo = CertificateTypeRepository(db)
        cert_type = cert_type_repo.get_active_by_id(request_data.certificate_type_id)

        if not cert_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certificate type not found or inactive"
            )
    
    # Generate reference number and PIN
    reference_number = generate_reference_number(db)
    pin = generate_pin()
    
    # Save signature if provided
    signature_path = None
    if request_data.signature_data:
        signature_path = save_signature(request_data.signature_data, reference_number)
    
    # Compute request cost on the server (pricing rules)
    computed_cost = None
    if cert_type is not None:
        if resolved_sr_code and (
            is_course_description(cert_type.name) or is_certification_of_grades(cert_type.name)
        ):
            student_courses = CertificateDependencyEngine._get_student_courses(
                db, resolved_sr_code
            )
            computed_cost = compute_request_cost(cert_type.name, row_count=len(student_courses))
        else:
            computed_cost = compute_request_cost(cert_type.name)

    # Create new request
    purpose_metadata = analyze_request_purpose(
        request_data.purpose,
        certificate_type_name=cert_type.name if cert_type else None,
        requested_document_name=requested_document_name,
    )

    new_request = CertificateRequest(
        reference_number=reference_number,
        pin=pin,
        request_type=request_type.value,
        requested_document_name=requested_document_name,
        certificate_type_id=cert_type.id if cert_type else None,
        certificate_type_name=cert_type.name if cert_type else None,
        requestor_name=request_data.requestor_name,
        requestor_address=request_data.requestor_address,
        requestor_relationship=request_data.requestor_relationship,
        requestor_contact=request_data.requestor_contact,
        requestor_email=request_data.requestor_email,
        purpose=purpose_metadata["purpose_raw"],
        purpose_normalized=purpose_metadata["purpose_normalized"],
        purpose_category=purpose_metadata["purpose_category"],
        purpose_extracted_notes=purpose_metadata["purpose_extracted_notes"],
        needs_instruction_review=purpose_metadata["needs_instruction_review"],
        sr_code=resolved_sr_code,
        student_name=request_data.student_name,
        program=request_data.program,
        major=request_data.major,
        year_graduated=request_data.year_graduated,
        signature_data=request_data.signature_data,
        request_cost=computed_cost if computed_cost is not None else request_data.request_cost,
        verification_token=generate_verification_token()
        if request_type == RequestType.CERTIFICATE and not needs_historical_review
        else None,
        status=RequestStatus.APPROVED
        if request_type == RequestType.CERTIFICATE and not needs_historical_review
        else RequestStatus.PENDING
        if needs_historical_review
        else RequestStatus.SUBMITTED,
    )
    
    # Save to database
    request_repo = CertificateRequestRepository(db)
    request_repo.add(new_request)
    db.commit()
    db.refresh(new_request)

    if needs_historical_review:
        log_action(
            db,
            action="REQUEST_REVIEW_REQUIRED",
            entity_type="certificate_request",
            entity_id=new_request.id,
            field_name="year_graduated",
            new_value=str(graduation_year),
            user_name="System",
            old_value=new_request.request_label,
            notes=OUT_OF_RANGE_YEAR_NOTIFICATION,
        )

    # Send confirmation email (optional; can be deferred to processing step)
    try:
        send_on_create = os.getenv("SEND_CONFIRMATION_ON_CREATE", "0").lower() in (
            "1",
            "true",
            "yes",
        )
        if send_on_create:
            campus_email = None
            campus_telNo = None

            program_repo = ProgramRepository(db)
            if resolved_sr_code:
                student = student_repo.get_by_sr_code(resolved_sr_code)
            else:
                student = None

            campus = None
            if student is not None:
                campus = student.campus or (student.program.campus if student.program else None)
            if campus is None and request_data.program:
                program = program_repo.get_by_name(request_data.program)
                campus = program.campus if program else None

            if campus is not None:
                campus_email = campus.campus_email
                campus_telNo = campus.campus_telNo

            email_service = EmailService()
            await email_service.send_request_confirmation(
                to_email=request_data.requestor_email,
                reference_number=reference_number,
                pin=pin,
                requestor_name=request_data.requestor_name,
                student_name=request_data.student_name,
                certificate_type=new_request.request_label,
                submitted_date=new_request.created_at,
                request_cost=new_request.request_cost,
                campus_email=campus_email,
                campus_telNo=campus_telNo,
            )
            print(f"Email sent to {request_data.requestor_email}")
    except Exception as e:
        print(f"Email failed but request was created: {e}")
        # Don't fail the request if email fails
    
    return CertificateRequestResponse(
        reference_number=reference_number,
        pin=pin,
        message=(
            "Certificate request submitted successfully! Check your email for tracking details."
            if request_type == RequestType.CERTIFICATE and not needs_historical_review
            else "Certificate request submitted and flagged for manual review. Check your email for tracking details."
            if request_type == RequestType.CERTIFICATE
            else "Document request submitted successfully! Check your email for tracking details."
        ),
        submitted_date=new_request.created_at
    )

# Endpoint 2: Track request by reference number and PIN
@router.get("/track", response_model=CertificateRequestTrackResponse)
def track_certificate_request(
    reference_number: str,
    pin: str,
    db: Session = Depends(get_db)
):
    """
    Track certificate request status
    
    Use your reference number and PIN to check the status of your request.
    """
    
    # Find request
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_reference_and_pin(reference_number, pin)
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found. Please check your reference number and PIN."
        )
    
    return CertificateRequestTrackResponse(
        reference_number=request.reference_number,
        status=request.status,
        request_type=request.request_type,
        requested_document_name=request.requested_document_name,
        certificate_type=request.certificate_type_name,
        request_label=request.request_label,
        student_name=request.student_name,
        submitted_date=request.created_at,
        updated_date=request.updated_at
    )

# Endpoint 3: Get all requests
@router.get("/", response_model=list[CertificateRequestDetail])
def get_all_requests(
    skip: int = 0,
    limit: int = 10,
    status_filter: Optional[str] = None,
    owner_username: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    request_repo = CertificateRequestRepository(db)
    query = request_repo.query()

    if status_filter:
        try:
            status_enum = RequestStatus[status_filter.upper()]  # convert string → enum
            query = query.filter(CertificateRequest.status == status_enum)
        except KeyError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{status_filter}'. Valid values: {[s.name for s in RequestStatus]}"
            )

    if owner_username:
        query = query.filter(CertificateRequest.owner_username == owner_username)

    requests = query.order_by(CertificateRequest.created_at.desc()).offset(skip).limit(limit).all()
    return requests

# Endpoint: Validate requests against registry
@router.post("/validate", response_model=RequestsValidationResponse)
def validate_requests(
    payload: RequestsValidationRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    request_repo = CertificateRequestRepository(db)
    student_repo = StudentRepository(db)
    program_repo = ProgramRepository(db)
    graduation_repo = GraduationRecordRepository(db)
    current_year = datetime.now().year

    def normalize_name(name: Optional[str]) -> str:
        if not name:
            return ""
        cleaned = " ".join(str(name).replace(",", " ").split())
        return cleaned.strip().lower()

    def tokenize_name(name: Optional[str]) -> list[str]:
        if not name:
            return []
        # Split into letter-only tokens, so "De la Cruz" -> ["de", "la", "cruz"]
        return [tok.lower() for tok in re.findall(r"[A-Za-z]+", str(name))]

    def is_invalid_text(value: Optional[str]) -> bool:
        if value is None:
            return False
        text = str(value).strip()
        if not text:
            return False

        # Disallow obviously unsafe/suspicious characters
        if re.search(r"[<>`{}\[\]|\\]", text):
            return True

        # Allow common characters across fields; flag anything outside this set
        if re.search(r"[^A-Za-z0-9 .,'\-/#@&()_+:?/]", text):
            return True

        # Flag gibberish like "sdgsdg" (long alpha-only with no vowels)
        alpha_only = re.sub(r"[^A-Za-z]", "", text)
        if len(alpha_only) >= 6:
            vowel_count = sum(1 for c in alpha_only.lower() if c in "aeiou")
            if vowel_count == 0:
                return True

        return False

    def add_invalid_flags(request_obj: CertificateRequest, flags_list: list[str]) -> None:
        fields = [
            ("requestor_name", "Requestor name"),
            ("requestor_address", "Requestor address"),
            ("requestor_relationship", "Requestor relationship"),
            ("requestor_contact", "Requestor contact"),
            ("requestor_email", "Requestor email"),
            ("purpose", "Purpose"),
            ("sr_code", "SR code"),
            ("student_name", "Student name"),
            ("program", "Program"),
            ("major", "Major"),
            ("year_graduated", "Year graduated"),
        ]
        for attr, label in fields:
            if is_invalid_text(getattr(request_obj, attr, None)):
                flags_list.append(f"Invalid input detected in {label}.")

    results = []
    for request_id in payload.request_ids:
        flags = []
        request = request_repo.get_by_id(request_id)
        if not request:
            results.append(
                {
                    "request_id": request_id,
                    "exists": False,
                    "flags": ["Request not found."],
                }
            )
            continue

        add_invalid_flags(request, flags)

        sr_code = (request.sr_code or "").strip()
        student = student_repo.get_by_sr_code(sr_code) if sr_code else None
        if student is None and request.student_name:
            student = student_repo.get_by_student_name(request.student_name)

        if not student:
            flags.append("Student record not found in registry.")
        else:
            if sr_code and student.sr_code and sr_code != student.sr_code:
                flags.append(
                    f"SR code does not match registry record ({student.sr_code})."
                )

            req_name = normalize_name(request.student_name)
            student_name = normalize_name(
                f"{student.first_name or ''} {student.middle_name or ''} {student.last_name or ''}"
            )
            if req_name and student_name:
                req_tokens = set(tokenize_name(request.student_name))
                student_tokens = (
                    tokenize_name(student.first_name)
                    + tokenize_name(student.middle_name)
                    + tokenize_name(student.last_name)
                )
                matches = sum(1 for tok in set(student_tokens) if tok in req_tokens)
                if matches < 2:
                    flags.append("Student name does not match registry.")

            if request.program and student.program and student.program.name:
                if normalize_name(request.program) != normalize_name(
                    student.program.name
                ):
                    flags.append("Program does not match registry.")

        campus = None
        if student is not None:
            campus = student.campus or (student.program.campus if student.program else None)
        if campus is None and request.program:
            program = program_repo.get_by_name(request.program)
            campus = program.campus if program else None

        if campus is None:
            flags.append("Campus could not be verified.")

        grad_record = None
        lookup_sr_code = sr_code or (student.sr_code if student is not None else "")
        if lookup_sr_code:
            grad_record = graduation_repo.get_by_sr_code(lookup_sr_code)
        if grad_record is None and request.student_name:
            grad_record = graduation_repo.get_by_student_name(request.student_name)

        # Graduation year validation
        if request.year_graduated:
            year_text = str(request.year_graduated).strip()
            if not re.fullmatch(r"\d{4}", year_text):
                flags.append("Year graduated must be a 4-digit year.")
            else:
                year_value = int(year_text)
                if year_value > current_year:
                    flags.append(
                        f"Graduation year cannot be later than {current_year}."
                    )
                if year_value <= 2022:
                    flags.append("Graduation year is 2022 or below.")
                if grad_record is not None and not grad_record.is_graduated:
                    flags.append("Student is not yet graduated.")
                else:
                    recorded_year = extract_graduation_year(grad_record)
                    if (
                        grad_record is not None
                        and recorded_year is not None
                        and year_value != recorded_year
                    ):
                        flags.append(
                            f"Graduation year does not match registry record ({recorded_year})."
                        )

        if is_gwa_certificate(request.certificate_type_name):
            if grad_record is None:
                flags.append(
                    "No graduation record found for this student for the requested GWA certificate."
                )
            elif not grad_record.is_graduated:
                flags.append(
                    "Student is not yet graduated for the requested GWA certificate."
                )

        if is_honor_graduate_certificate(request.certificate_type_name):
            if grad_record is None:
                flags.append(
                    "No graduation record found for this student for the requested honor graduate certificate."
                )
            elif not grad_record.is_graduated:
                flags.append(
                    "Student is not yet graduated for the requested honor graduate certificate."
                )
            elif not str(getattr(grad_record, "latin_honor", "") or "").strip():
                flags.append(
                    "No latin honor record found for this student for the requested honor graduate certificate."
                )

        if is_cav_certificate(request.certificate_type_name):
            if grad_record is None:
                flags.append(
                    "No graduation record found for this student for the requested CAV certificate."
                )
            elif not grad_record.is_graduated:
                flags.append(
                    "Student is not yet graduated for the requested CAV certificate."
                )

        if (
            is_graduation_related_certificate(request.certificate_type_name)
            and not is_gwa_certificate(request.certificate_type_name)
            and not is_honor_graduate_certificate(request.certificate_type_name)
            and grad_record is None
        ):
            flags.append(
                "No graduation record found for this student for the requested certificate."
            )

        results.append(
            {
                "request_id": request.id,
                "exists": student is not None,
                "flags": flags,
            }
        )
    return {"results": results}

# Endpoint 4: Get single request details
@router.get("/{request_id}", response_model=CertificateRequestDetail)
def get_request_detail(
    request_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    """
    Get detailed information about a specific request
    """
    
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_id(request_id)
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    return request

# Endpoint: Get student courses (taken with grades) for a request
@router.get("/{request_id}/taken-courses")
def get_request_taken_courses(
    request_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_id(request_id)

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    sr_code = (request.sr_code or "").strip()
    if not sr_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request does not have a student SR code",
        )

    courses = CertificateDependencyEngine._get_student_courses(db, sr_code)
    return courses

# Endpoint 5: Update request status
@router.patch("/{request_id}/status", response_model=CertificateRequestDetail)
async def update_status(                         
    request_id: int,
    status_update: StatusUpdateRequest,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_status")),
):
    # Convert schema enum to model enum to satisfy transition checks
    new_status = RequestStatus(status_update.new_status.value)
    updated_request = await update_request_status(  
        db=db,
        request_id=request_id,
        new_status=new_status,
        user_name=ctx["user"].username,
        notes=status_update.notes
    )
    return updated_request

# Endpoint 6: Update student data on request
@router.patch("/{request_id}/student-data", response_model=CertificateRequestDetail)
def update_request_student_data(
    request_id: int,
    data_update: StudentDataUpdate,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_data")),
):
    """
    Update student information on a request
    
    Used when student data is missing or incorrect.
    Creates audit logs for all changes.
    """
    
    # Prepare updates dictionary (only include non-None values)
    updates = {}
    if data_update.sr_code is not None:
        updates['sr_code'] = data_update.sr_code
    if data_update.student_name is not None:
        updates['student_name'] = data_update.student_name
    if data_update.program is not None:
        updates['program'] = data_update.program
    if data_update.major is not None:
        updates['major'] = data_update.major
    if data_update.year_graduated is not None:
        updates['year_graduated'] = data_update.year_graduated
    
    updated_request = update_student_data(
        db=db,
        request_id=request_id,
        updates=updates,
        user_name=ctx["user"].username,
        notes=data_update.notes
    )
    
    return updated_request

# Endpoint 7: Add note to request
@router.post("/{request_id}/notes", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    request_id: int,
    note_data: RequestNoteCreate,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.notes")),
):
    """
    Add a note/comment to a request
    
    Registrar can add notes for communication or documentation.
    """
    
    note = add_note_to_request(
        db=db,
        request_id=request_id,
        note_text=note_data.note,
        note_type=note_data.note_type,
        user_name=ctx["user"].username
    )
    
    return note

# Endpoint 8: Get all notes for a request
@router.get("/{request_id}/notes", response_model=list[AuditLogResponse])
def get_request_notes(
    request_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    """
    Get all notes/comments for a request
    """
    
    audit_repo = AuditLogRepository(db)
    notes = audit_repo.request_notes(request_id).all()
    
    return _build_audit_log_responses(db, notes)

# Endpoint 9: Get audit logs for a request
@router.get("/{request_id}/audit-logs", response_model=list[AuditLogResponse])
def get_request_audit_logs(
    request_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    """
    Get complete audit trail for a request
    
    Shows all changes made to the request (status changes, data updates, etc.)
    """
    
    audit_repo = AuditLogRepository(db)
    logs = audit_repo.for_request(request_id).all()
    
    return _build_audit_log_responses(db, logs)

# Endpoint 10: Get all audit logs (for admin/registrar)
@router.get("/audit-logs/all", response_model=list[AuditLogResponse])
def get_all_audit_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    """
    Get all audit logs across all requests
    
    For transparency and oversight.
    """
    
    audit_repo = AuditLogRepository(db)
    logs = (
        audit_repo.query()
        .outerjoin(
            CertificateRequest,
            CertificateRequest.id == AuditLog.entity_id,
        )
        .filter(
            or_(
                AuditLog.entity_type != "certificate_request",
                AuditLog.entity_id.is_(None),
                CertificateRequest.id.is_not(None),
            )
        )
        .order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return _build_audit_log_responses(db, logs)

# Endpoint 11: Verify certificate by token (public endpoint for QR code)
@router.get("/verify/{verification_token}", response_model=CertificateVerificationResponse)
def verify_certificate(
    verification_token: str,
    db: Session = Depends(get_db)
):
    """
    Verify certificate authenticity using QR code token
    
    This is a PUBLIC endpoint - anyone can verify if a certificate is real.
    Used for fraud prevention.
    """
    
    if not verification_token or verification_token == "null":
        return CertificateVerificationResponse(
            is_valid=False,
            message="Invalid verification code format."
        )
    
    
    request_repo = CertificateRequestRepository(db)
    request = request_repo.query().filter(
        CertificateRequest.verification_token == verification_token
    ).first()
    
    if not request:
        return CertificateVerificationResponse(
            is_valid=False,
            message="Invalid verification code. This certificate could not be verified."
        )
    
    # Check if certificate is in valid state
    if request.status not in [RequestStatus.FOR_RELEASING, RequestStatus.RELEASED]:
        return CertificateVerificationResponse(
            is_valid=False,
            message="This certificate is not yet released or has been revoked."
        )
    
    return CertificateVerificationResponse(
        is_valid=True,
        message="✓ Certificate is authentic and valid",
        certificate_type=request.certificate_type_name,
        student_name=request.student_name,
        issue_date=request.updated_at or request.created_at,
        status=request.status.value
    )

# Endpoint 12: Mark as released (when QR is scanned at release)
@router.post("/{request_id}/release", response_model=CertificateRequestDetail)
async def mark_as_released(
    request_id: int,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("certificates.release")),
):
    updated_request = await update_request_status(  
        db=db,
        request_id=request_id,
        new_status=RequestStatus.RELEASED,
        user_name=ctx["user"].username,
        notes="Certificate released to student"
    )
    return updated_request

# Endpoint: Send ready-for-release email manually
@router.post("/{request_id}/send-ready-email")
async def send_ready_email(
    request_id: int,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_status")),
):
    request_repo = CertificateRequestRepository(db)
    student_repo = StudentRepository(db)
    program_repo = ProgramRepository(db)

    request = request_repo.get_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )
    if request.status != RequestStatus.FOR_RELEASING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is not yet for releasing.",
        )

    campus_telNo = None
    student = None
    if request.sr_code:
        student = student_repo.get_by_sr_code(request.sr_code)
    campus = None
    if student is not None:
        campus = student.campus or (student.program.campus if student.program else None)
    if campus is None and request.program:
        program = program_repo.get_by_name(request.program)
        campus = program.campus if program else None
    if campus is not None:
        campus_telNo = campus.campus_telNo

    email_service = EmailService()
    await email_service.send_ready_for_release(
        to_email=request.requestor_email,
        reference_number=request.reference_number,
        requestor_name=request.requestor_name,
        student_name=request.student_name,
        certificate_type=request.certificate_type_name,
        campus_telNo=campus_telNo,
    )
    request.ready_email_sent_at = datetime.now()
    db.commit()
    db.refresh(request)
    log_action(
        db,
        action="READY_EMAIL_SENT",
        entity_type="certificate_request",
        entity_id=request.id,
        field_name="ready_email_sent_at",
        user_name=ctx["user"].username,
        notes=f"Sent ready-for-pickup email for {request.reference_number}.",
    )
    return {"message": "Ready-for-release email sent."}


@router.post("/{request_id}/send-checking-email")
async def send_checking_email(
    request_id: int,
    payload: CheckingEmailRequest,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_status")),
):
    request_repo = CertificateRequestRepository(db)

    request = request_repo.get_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )
    if request.status != RequestStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved requests in checking can send this email.",
        )
    if not (request.requestor_email or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requestor email is missing for this request.",
        )

    email_service = EmailService()
    was_sent = await email_service.send_checking_update(
        to_email=request.requestor_email,
        subject=payload.subject,
        message_body=payload.message,
        reference_number=request.reference_number,
        requestor_name=request.requestor_name,
        student_name=request.student_name,
        certificate_type=request.certificate_type_name or request.request_label,
    )
    if not was_sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Checking update email could not be sent. "
                "Please verify the requestor email address and SMTP mail settings."
            ),
        )

    log_action(
        db,
        action="CHECKING_EMAIL_SENT",
        entity_type="certificate_request",
        entity_id=request.id,
        user_name=ctx["user"].username,
        notes=f"Sent checking update email for {request.reference_number}.",
    )
    return {"message": "Checking update email sent."}


@router.post("/{request_id}/send-delay-notice")
async def send_delay_notice(
    request_id: int,
    payload: DelayNoticeRequest,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_status")),
):
    request_repo = CertificateRequestRepository(db)
    student_repo = StudentRepository(db)
    program_repo = ProgramRepository(db)

    request = request_repo.get_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )
    if request.status != RequestStatus.FOR_RELEASING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is not in for releasing.",
        )
    if not (request.requestor_email or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requestor email is missing for this request.",
        )

    reason = (payload.reason or "").strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delay notice reason is required.",
        )

    was_sent = await send_manual_delay_notice(
        db,
        request,
        reason=reason,
        user_name=ctx["user"].username,
    )
    if not was_sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Delay notice email could not be sent. "
                "Please verify the requestor email address and SMTP mail settings."
            ),
        )

    return {"message": "Delay notice sent."}


@router.post("/{request_id}/hold-requestor-no-pickup")
def hold_for_requestor_no_pickup(
    request_id: int,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_status")),
):
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )
    if request.status != RequestStatus.FOR_RELEASING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is not in for releasing.",
        )
    if request.release_hold_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is already on hold.",
        )

    was_held = hold_request_for_no_pickup(
        db,
        request,
        user_name=ctx["user"].username,
    )
    if not was_held:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start hold.",
        )

    return {"message": "Release timer paused because requestor did not pick up."}

# Endpoint: Mark auto print completed
@router.post("/{request_id}/mark-printed")
def mark_printed(
    request_id: int,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_status")),
):
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_id(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if request.auto_printed_at:
        return {
            "message": "Request already marked as printed.",
            "auto_printed_at": request.auto_printed_at,
            "auto_print_status": request.auto_print_status,
        }
    request.auto_printed_at = datetime.now()
    request.auto_print_confirmed_at = request.auto_printed_at
    request.auto_print_status = AutoPrintStatus.COMPLETED.value
    request.auto_print_error = None
    db.commit()
    db.refresh(request)
    log_print_completed(db, request, user_name=ctx["user"].username)
    return {
        "message": "Marked as printed.",
        "auto_printed_at": request.auto_printed_at,
        "auto_print_status": request.auto_print_status,
    }

# Endpoint: Send rejection email manually
@router.post("/{request_id}/send-rejection-email")
async def send_rejection_email(
    request_id: int,
    payload: RejectionEmailRequest,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_status")),
):
    request_repo = CertificateRequestRepository(db)
    student_repo = StudentRepository(db)
    program_repo = ProgramRepository(db)

    request = request_repo.get_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    campus_email = None
    campus_telNo = None
    student = None
    if request.sr_code:
        student = student_repo.get_by_sr_code(request.sr_code)
    campus = None
    if student is not None:
        campus = student.campus or (student.program.campus if student.program else None)
    if campus is None and request.program:
        program = program_repo.get_by_name(request.program)
        campus = program.campus if program else None
    if campus is not None:
        campus_email = campus.campus_email
        campus_telNo = campus.campus_telNo

    email_service = EmailService()
    await email_service.send_rejection_notice(
        to_email=request.requestor_email,
        reference_number=request.reference_number,
        requestor_name=request.requestor_name,
        student_name=request.student_name,
        certificate_type=request.certificate_type_name,
        notes=payload.notes,
        campus_email=campus_email,
        campus_telNo=campus_telNo,
    )
    log_action(
        db,
        action="REJECTION_EMAIL_SENT",
        entity_type="certificate_request",
        entity_id=request.id,
        user_name=ctx["user"].username,
        notes=f"Sent rejection email for {request.reference_number}.",
    )
    return {"message": "Rejection email sent."}

# Endpoint: Save course description selection for a request
@router.patch("/{request_id}/course-description-selection", response_model=CertificateRequestDetail)
def update_course_description_selection(
    request_id: int,
    data_update: CourseDescriptionSelectionUpdate,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_data")),
):
    request_repo = CertificateRequestRepository(db)
    audit_repo = AuditLogRepository(db)
    request = request_repo.get_by_id(request_id)

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    normalized = [
        str(code or "").strip()
        for code in (data_update.course_codes or [])
        if str(code or "").strip()
    ]

    old_value = request.course_description_selection
    new_value = json.dumps(normalized)

    request.course_description_selection = new_value
    request.request_cost = compute_request_cost(
        request.certificate_type_name, row_count=len(normalized)
    )

    audit_log = AuditLog(
        action="COURSE_DESCRIPTION_SELECTION_UPDATED",
        entity_type="certificate_request",
        entity_id=request_id,
        field_name="course_description_selection",
        old_value=old_value,
        new_value=new_value,
        user_name=ctx["user"].username,
        notes=data_update.notes or "Course description selection updated",
    )
    audit_repo.add(audit_log)
    db.commit()
    db.refresh(request)

    return request

# Endpoint: Save certification of grades selection for a request
@router.patch("/{request_id}/grade-selection", response_model=CertificateRequestDetail)
def update_grade_selection(
    request_id: int,
    data_update: GradeSelectionUpdate,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("requests.update_data")),
):
    request_repo = CertificateRequestRepository(db)
    audit_repo = AuditLogRepository(db)
    request = request_repo.get_by_id(request_id)

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found",
        )

    normalized = [
        str(key or "").strip()
        for key in (data_update.selection_keys or [])
        if str(key or "").strip()
    ]

    old_value = request.grade_selection
    new_value = json.dumps(normalized)

    request.grade_selection = new_value
    request.request_cost = compute_request_cost(
        request.certificate_type_name, row_count=len(normalized)
    )

    audit_log = AuditLog(
        action="GRADE_SELECTION_UPDATED",
        entity_type="certificate_request",
        entity_id=request_id,
        field_name="grade_selection",
        old_value=old_value,
        new_value=new_value,
        user_name=ctx["user"].username,
        notes=data_update.notes or "Certification of grades selection updated",
    )
    audit_repo.add(audit_log)
    db.commit()
    db.refresh(request)

    return request

# Endpoint 13: Generate certificate PDF
@router.post("/{request_id}/generate-certificate")
def generate_certificate(
    request_id: int,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("certificates.generate")),
):
    """
    Generate PDF certificate for a request
    
    This endpoint:
    1. Validates request is in correct status
    2. Generates PDF with student data
    3. Returns file path
    """
    
    pdf_path = generate_certificate_pdf(
        db=db,
        request_id=request_id,
        user_name=ctx["user"].username
    )
    
    return {
        "message": "Certificate generated successfully",
        "pdf_path": pdf_path,
        "filename": os.path.basename(pdf_path)
    }

# Endpoint 14: Download certificate PDF
@router.get("/{request_id}/download-certificate")
def download_certificate(
    request_id: int,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("certificates.generate")),
):
    """
    Download the generated certificate PDF
    
    Returns the PDF file for download
    """
    
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_id(request_id)
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    pdf_path = request.pdf_path
    if not pdf_path:
        # When the stored PDF path is cleared (for example after payment tagging),
        # force a fresh render so regenerated PDFs include the latest DST details.
        try:
            pdf_path = generate_certificate_pdf(
                db=db, request_id=request_id, user_name="System"
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certificate PDF not found. Please generate it first."
            )

    if not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate PDF file not found"
        )
    
    # Return file for download
    log_action(
        db,
        action="CERTIFICATE_DOWNLOADED",
        entity_type="certificate_request",
        entity_id=request.id,
        user_name=ctx["user"].username,
        notes=f"Downloaded certificate for {request.reference_number}.",
    )
    return FileResponse(
        path=pdf_path,
        media_type='application/pdf',
        filename=f"Certificate_{request.student_name}_{request.reference_number}.pdf"
    )
