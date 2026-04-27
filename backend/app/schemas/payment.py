from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, constr


FiveDigitOrNumber = constr(pattern=r"^\d{5}$")


class PaymentCreate(BaseModel):
    request_id: int = Field(..., description="Certificate request id")
    amount: Optional[float] = Field(None, description="Payment amount")
    payment_method: Optional[str] = Field(None, description="Payment method")
    payment_status: Optional[str] = Field("PAID", description="Payment status")
    or_number: Optional[FiveDigitOrNumber] = Field(
        None, description="Official receipt number as a 5-digit number"
    )


class PaymentByReferenceCreate(BaseModel):
    reference_number: str = Field(..., description="Certificate request reference number")
    amount: Optional[float] = Field(None, description="Payment amount")
    purpose: Optional[str] = Field(None, description="Purpose of payment")
    payment_method: Optional[str] = Field(None, description="Payment method")
    payment_status: Optional[str] = Field("PAID", description="Payment status")
    or_number: Optional[FiveDigitOrNumber] = Field(
        None, description="Official receipt number as a 5-digit number"
    )


class PaymentReferencesRequest(BaseModel):
    reference_numbers: list[str] = Field(
        default_factory=list, description="List of request reference numbers"
    )


class PaymentInfo(BaseModel):
    reference_number: str
    amount: Optional[float] = None
    or_number: Optional[str] = None
    payment_status: Optional[str] = None
    paid_at: Optional[datetime] = None
    date_of_payment: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentInfoListResponse(BaseModel):
    items: list[PaymentInfo]


class PaymentResponse(BaseModel):
    id: int
    sr_code: Optional[str] = None
    payer_name: str
    purpose: str
    amount: float
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentLookupResponse(BaseModel):
    id: int
    sr_code: Optional[str] = None
    reference_number: str
    student_name: str
    certificate_type_name: str
    requestor_name: str
    request_cost: Optional[float] = None
    status: str

    class Config:
        from_attributes = True
