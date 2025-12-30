from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
import secrets
import os

from app.models.certificate_request import CertificateRequest, RequestStatus, RequestNote
from app.models.audit_log import AuditLog

# Define valid status transitions
VALID_TRANSITIONS = {
    RequestStatus.SUBMITTED: [RequestStatus.PENDING],
    RequestStatus.PENDING: [RequestStatus.APPROVED, RequestStatus.REJECTED],
    RequestStatus.APPROVED: [RequestStatus.PROCESSING],
    RequestStatus.PROCESSING: [RequestStatus.FOR_REVIEW],
    RequestStatus.FOR_REVIEW: [RequestStatus.FOR_RELEASING, RequestStatus.APPROVED],  # Can go back to approved if issues
    RequestStatus.FOR_RELEASING: [RequestStatus.COMPLETED],
    RequestStatus.COMPLETED: [],  # Final state
    RequestStatus.REJECTED: []  # Final state
}

def can_transition_to(current_status: RequestStatus, new_status: RequestStatus) -> bool:
    """Check if status transition is valid"""
    return new_status in VALID_TRANSITIONS.get(current_status, [])

def generate_verification_token() -> str:
    """Generate unique verification token for QR code"""
    return secrets.token_urlsafe(32)

def update_request_status(
    db: Session,
    request_id: int,
    new_status: RequestStatus,
    user_name: str = "System",
    notes: Optional[str] = None,
    rejection_reason: Optional[str] = None,
    rejection_notes: Optional[str] = None
) -> CertificateRequest:
    """
    Update request status with validation and audit logging
    """
    # Get request
    request = db.query(CertificateRequest).filter(CertificateRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    # Check if already in final state
    if request.status in [RequestStatus.COMPLETED, RequestStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status of {request.status.value} request"
        )
    
    # Validate transition
    if not can_transition_to(request.status, new_status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {request.status.value} to {new_status.value}"
        )
    
    # Store old status for audit
    old_status = request.status
    
    # Update status
    request.status = new_status
    
    # Handle rejection
    if new_status == RequestStatus.REJECTED:
        if rejection_reason:
            request.rejection_reason = rejection_reason
        if rejection_notes:
            request.rejection_notes = rejection_notes
    
    # Generate verification token when moving to FOR_RELEASING
    if new_status == RequestStatus.APPROVED and not request.verification_token:
        request.verification_token = generate_verification_token()
    
    # Create audit log
    audit_log = AuditLog(
        request_id=request_id,
        action="STATUS_CHANGED",
        field_name="status",
        old_value=old_status.value,
        new_value=new_status.value,
        user_name=user_name,
        notes=notes
    )
    db.add(audit_log)
    
    # Add note if provided
    if notes:
        note = RequestNote(
            request_id=request_id,
            note=notes,
            note_type="STATUS_CHANGE",
            user_name=user_name
        )
        db.add(note)
    
    if new_status == RequestStatus.PROCESSING:
        try:
            from app.services.certificate_service import generate_certificate_pdf
            pdf_path = generate_certificate_pdf(db, request_id, user_name)
            
            # Save PDF path to request
            request.pdf_path = pdf_path
            
            # Add note about auto-generation
            auto_note = RequestNote(
                request_id=request_id,
                note=f"Certificate automatically generated: {os.path.basename(pdf_path)}",
                note_type="INFO",
                user_name="System"
            )
            db.add(auto_note)
        except Exception as e:
            print(f"Auto-generation failed: {e}")
            # Don't fail the status update if PDF generation fails
    
    # Add rejection note if rejecting
    if new_status == RequestStatus.REJECTED and (rejection_reason or rejection_notes):
        rejection_text = f"Rejection Reason: {rejection_reason}\n{rejection_notes or ''}"
        note = RequestNote(
            request_id=request_id,
            note=rejection_text,
            note_type="REJECTION_REASON",
            user_name=user_name
        )
        db.add(note)

    db.commit()
    db.refresh(request)
    
    return request

def update_student_data(
    db: Session,
    request_id: int,
    updates: dict,
    user_name: str = "System",
    notes: Optional[str] = None
) -> CertificateRequest:
    """
    Update student information on a request
    """
    request = db.query(CertificateRequest).filter(CertificateRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    # Update fields and create audit logs
    for field, new_value in updates.items():
        if new_value is not None and hasattr(request, field):
            old_value = getattr(request, field)
            if old_value != new_value:
                setattr(request, field, new_value)
                
                # Create audit log
                audit_log = AuditLog(
                    request_id=request_id,
                    action="DATA_UPDATED",
                    field_name=field,
                    old_value=str(old_value) if old_value else None,
                    new_value=str(new_value),
                    user_name=user_name,
                    notes=notes
                )
                db.add(audit_log)
    
    # Add note if provided
    if notes:
        note = RequestNote(
            request_id=request_id,
            note=notes,
            note_type="DATA_UPDATE",
            user_name=user_name
        )
        db.add(note)
    
    db.commit()
    db.refresh(request)
    
    return request

def add_note_to_request(
    db: Session,
    request_id: int,
    note_text: str,
    note_type: str = "INFO",
    user_name: str = "System"
) -> RequestNote:
    """
    Add a note to a request
    """
    request = db.query(CertificateRequest).filter(CertificateRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    note = RequestNote(
        request_id=request_id,
        note=note_text,
        note_type=note_type,
        user_name=user_name
    )
    db.add(note)
    
    # Also create audit log
    audit_log = AuditLog(
        request_id=request_id,
        action="NOTE_ADDED",
        field_name="notes",
        new_value=note_text,
        user_name=user_name
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(note)
    
    return note