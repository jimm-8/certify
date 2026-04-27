from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime
from pathlib import Path

from app.database import get_db
from app.models.authorized_official import AuthorizedOfficial
from app.repositories import AuthorizedOfficialRepository
from app.schemas.signature import SignatureCreate, SignatureResponse, SignatureUpdate
from app.api.v1.auth import require_permissions

router = APIRouter(prefix="/signatures", tags=["Signatures"])

# Upload directory
UPLOAD_DIR = "uploads/signatures"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=SignatureResponse, status_code=status.HTTP_201_CREATED)
async def upload_signature(
    name: str = Form(...),
    title: str = Form(...),
    campus_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("signatures.manage")),
):
    """
    Upload a signature image
    
    Accepts PNG, JPG, or JPEG files
    """
    
    # Validate file type
    allowed_extensions = [".png", ".jpg", ".jpeg"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PNG, JPG, and JPEG files are allowed"
        )
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = name.replace(" ", "_").replace("/", "_")
    new_filename = f"sig_{safe_name}_{timestamp}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # PROCESS IMAGE: Normalize and optimize (non-AI)
    from app.utils.image_processor import ImageProcessor
    
    try:
        processor = ImageProcessor()
        
        # Create processed filename
        processed_filename = f"processed_{new_filename}"
        processed_path = os.path.join(UPLOAD_DIR, processed_filename)
        
        # Normalize and optimize
        print(f"🤖 Processing signature image...")
        processed_path = processor.optimize_signature(
            input_path=file_path,
            output_path=processed_path,
            max_width=400
        )
        
        # Delete original file (keep only processed version)
        if os.path.exists(file_path) and file_path != processed_path:
            os.remove(file_path)
        
        # Update paths to use processed version
        file_path = processed_path
        new_filename = os.path.basename(processed_path)
        
        print(f"✅ Signature processing complete.")
        
    except Exception as e:
        print(f"Warning: Image processing failed, using original: {e}")
        # If processing fails, continue with original image
        # Don't raise error - system still works without optional processing

    # Create signature record
    signature = AuthorizedOfficial(
        name=name,
        title=title,
        campus_id=campus_id,
        signature_path=file_path,
        is_active=True
    )
    
    signature_repo = AuthorizedOfficialRepository(db)
    signature_repo.add(signature)
    db.commit()
    db.refresh(signature)

    print(f"✅ Signature uploaded: {signature.name}")
    
    return signature

@router.get("/", response_model=List[SignatureResponse])
def get_all_signatures(
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("signatures.manage")),
):
    """
    Get all signatures
    
    By default returns only active signatures
    """
    
    signature_repo = AuthorizedOfficialRepository(db)
    query = signature_repo.query()
    
    if active_only:
        query = signature_repo.active()
    
    signatures = query.order_by(AuthorizedOfficial.created_at.desc()).all()
    
    return signatures

@router.get("/{signature_id}", response_model=SignatureResponse)
def get_signature(
    signature_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("signatures.manage")),
):
    """
    Get a specific signature by ID
    """
    
    signature_repo = AuthorizedOfficialRepository(db)
    signature = signature_repo.query().filter(AuthorizedOfficial.id == signature_id).first()
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )
    
    return signature


@router.get("/{signature_id}/file")
def get_signature_file(
    signature_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("signatures.manage")),
):
    """
    Download a signature image file
    """
    signature_repo = AuthorizedOfficialRepository(db)
    signature = signature_repo.query().filter(AuthorizedOfficial.id == signature_id).first()

    if not signature or not signature.signature_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature file not found"
        )

    upload_root = Path(UPLOAD_DIR).resolve()
    file_path = Path(signature.signature_path).resolve()
    if upload_root not in file_path.parents or not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature file not found"
        )

    return FileResponse(path=str(file_path), filename=file_path.name)

@router.patch("/{signature_id}", response_model=SignatureResponse)
def update_signature(
    signature_id: int,
    update_data: SignatureUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("signatures.manage")),
):
    """
    Update signature details
    
    Can update name, title, position, status, etc.
    """
    
    signature_repo = AuthorizedOfficialRepository(db)
    signature = signature_repo.query().filter(AuthorizedOfficial.id == signature_id).first()
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )
    
    # Update fields
    if update_data.name is not None:
        signature.name = update_data.name
    if update_data.title is not None:
        signature.title = update_data.title
    if update_data.campus_id is not None:
        signature.campus_id = update_data.campus_id
    if update_data.signature_path is not None:
        signature.signature_path = update_data.signature_path
    if update_data.is_active is not None:
        signature.is_active = update_data.is_active
    
    db.commit()
    db.refresh(signature)
    
    return signature

@router.delete("/{signature_id}")
def delete_signature(
    signature_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("signatures.manage")),
):
    """
    Soft delete a signature
    
    Marks the record as deleted without removing it or the file.
    """
    
    signature_repo = AuthorizedOfficialRepository(db)
    signature = signature_repo.query().filter(AuthorizedOfficial.id == signature_id).first()
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )
    
    # Soft delete - mark as deleted and inactive
    signature.is_active = False
    signature.deleted_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Signature deleted"}

