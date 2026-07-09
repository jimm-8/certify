from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    sr_code = Column(String(20), nullable=True)
    payer_name = Column(String(255), nullable=False)
    purpose = Column(Text, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(50), nullable=True)
    payment_status = Column(String(20), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    or_number = Column(String(20), nullable=True)
    date_of_payment = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
