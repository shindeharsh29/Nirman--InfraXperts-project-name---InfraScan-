from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class User(UserBase):
    id: int
    is_admin: bool

    class Config:
        from_attributes = True

class ImageVerificationBase(BaseModel):
    image_hash: str
    ai_confidence: float
    damage_type: Optional[str] = None
    bounding_boxes: Optional[str] = None
    verification_source: str

class ImageVerification(ImageVerificationBase):
    id: int
    complaint_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ComplaintBase(BaseModel):
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    location_importance_score: float = 1.0

class ComplaintCreate(ComplaintBase):
    pass

class Complaint(ComplaintBase):
    id: int
    image_path: str
    status: str
    priority_level: str
    priority_score: float
    created_at: datetime
    reporter_id: Optional[int] = None
    verifications: List[ImageVerification] = []

    class Config:
        from_attributes = True

