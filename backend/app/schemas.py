# app/schemas.py
from pydantic import BaseModel, EmailStr, constr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: constr(min_length=4)  # Ensures password is at least 6 characters

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: constr(min_length=6)

class Token(BaseModel):
    token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None


class MessageBase(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    response_type: Optional[str] = "text"

class MessageResponse(BaseModel):
    conversation_id: str
    detailed_response: str
    sources: List[str]
    metadata: Dict[str, Any]
    relationships: List[Dict[str, str]]
    text_content: List[Dict[str, str]]

class ConversationResponse(BaseModel):
    id: str
    messages: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True