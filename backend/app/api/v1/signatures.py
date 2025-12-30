from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from app.database import get_db
from app.models.signature import Signature
from app.schemas.signature import SignatureCreate, SignatureResponse, SignatureUpdate

router = APIRouter(prefix="/signatures", tags=["Signatures"])

# Upload directory
UPLOAD_DIR = "uploads/signatures"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=SignatureResponse, status_code=status.HTTP_201_CREATED)
async def upload_signature(
    name: str = Form(...),
    title: str = Form(...),
    position: str = Form(...),
    notes: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form("Admin"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a signature image
    
    Accepts PNG, JPG, or JPEG files
    Position can be: left, center, right
    """
    
    # Validate file type
    allowed_extensions = [".png", ".jpg", ".jpeg"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PNG, JPG, and JPEG files are allowed"
        )
    
    # Validate position
    if position not in ["left", "center", "right"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Position must be 'left', 'center', or 'right'"
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
    
    # PROCESS IMAGE: Remove background using AI
    from app.utils.image_processor import ImageProcessor
    
    try:
        processor = ImageProcessor()
        
        # Create processed filename
        processed_filename = f"processed_{new_filename}"
        processed_path = os.path.join(UPLOAD_DIR, processed_filename)
        
        # Remove background and optimize
        print(f"🤖 Processing signature with AI...")
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
        
        print(f"✅ AI processing complete!")
        
    except Exception as e:
        print(f"⚠️ AI processing failed, using original: {e}")
        # If AI fails, continue with original image
        # Don't raise error - system still works without background removal

    # Create signature record
    signature = Signature(
        name=name,
        title=title,
        position=position,
        file_path=file_path,
        file_name=new_filename,
        notes=notes,
        uploaded_by=uploaded_by,
        is_active=True,
        is_default=False
    )
    
    db.add(signature)
    db.commit()
    db.refresh(signature)

    print(f"✅ Signature uploaded and processed with AI: {signature.name}")
    
    return signature

@router.get("/", response_model=List[SignatureResponse])
def get_all_signatures(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get all signatures
    
    By default returns only active signatures
    """
    
    query = db.query(Signature)
    
    if active_only:
        query = query.filter(Signature.is_active == True)
    
    signatures = query.order_by(Signature.created_at.desc()).all()
    
    return signatures

@router.get("/{signature_id}", response_model=SignatureResponse)
def get_signature(
    signature_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific signature by ID
    """
    
    signature = db.query(Signature).filter(Signature.id == signature_id).first()
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )
    
    return signature

@router.patch("/{signature_id}", response_model=SignatureResponse)
def update_signature(
    signature_id: int,
    update_data: SignatureUpdate,
    db: Session = Depends(get_db)
):
    """
    Update signature details
    
    Can update name, title, position, status, etc.
    """
    
    signature = db.query(Signature).filter(Signature.id == signature_id).first()
    
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
    if update_data.position is not None:
        if update_data.position not in ["left", "center", "right"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Position must be 'left', 'center', or 'right'"
            )
        signature.position = update_data.position
    if update_data.is_active is not None:
        signature.is_active = update_data.is_active
    if update_data.is_default is not None:
        # If setting as default, unset other defaults first
        if update_data.is_default:
            db.query(Signature).update({Signature.is_default: False})
        signature.is_default = update_data.is_default
    if update_data.notes is not None:
        signature.notes = update_data.notes
    
    db.commit()
    db.refresh(signature)
    
    return signature

@router.delete("/{signature_id}")
def delete_signature(
    signature_id: int,
    hard_delete: bool = False,
    db: Session = Depends(get_db)
):
    """
    Delete a signature
    
    By default, soft delete (mark as inactive)
    Set hard_delete=true to permanently delete
    """
    
    signature = db.query(Signature).filter(Signature.id == signature_id).first()
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )
    
    if hard_delete:
        # Delete file
        if os.path.exists(signature.file_path):
            os.remove(signature.file_path)
        
        # Delete from database
        db.delete(signature)
        db.commit()
        
        return {"message": "Signature permanently deleted"}
    else:
        # Soft delete - just mark as inactive
        signature.is_active = False
        db.commit()
        
        return {"message": "Signature deactivated"}

@router.post("/{signature_id}/set-default", response_model=SignatureResponse)
def set_default_signature(
    signature_id: int,
    db: Session = Depends(get_db)
):
    """
    Set a signature as the default
    
    Only one signature can be default at a time
    """
    
    signature = db.query(Signature).filter(Signature.id == signature_id).first()
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signature not found"
        )
    
    # Unset all other defaults
    db.query(Signature).update({Signature.is_default: False})
    
    # Set this as default
    signature.is_default = True
    db.commit()
    db.refresh(signature)
    
    return signature