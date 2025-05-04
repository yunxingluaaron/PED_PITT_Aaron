from pydantic import BaseModel, EmailStr, constr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: constr(min_length=4)

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
    parent_name: Optional[str] = None

class MessageResponse(BaseModel):
    conversation_id: str
    detailed_response: str
    simple_response: str  # 新增：支持 simple_response
    sources: List[str]
    metadata: Dict[str, Any]
    relationships: List[Dict[str, str]]
    text_content: List[Dict[str, str]]
    parent_name: Optional[str] = None
    question_id: Optional[int] = None  # 来自 response_data
    ai_version_id: Optional[int] = None  # 来自 response_data
    user_version_id: Optional[int] = None  # 来自 response_data

class ConversationResponse(BaseModel):
    id: str
    messages: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

class QuestionResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    conversation_id: Optional[str] = None
    parent_name: Optional[str] = None
    versions: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class VersionHistoryResponse(BaseModel):
    id: int
    question_id: int
    content: str
    type: str
    timestamp: datetime
    parent_name: Optional[str] = None
    is_liked: bool
    is_bookmarked: bool
    
    class Config:
        from_attributes = True