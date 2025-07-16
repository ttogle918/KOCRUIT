from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class NotificationBase(BaseModel):
    message: str
    type: Optional[str] = None
    is_read: bool = False
    url: Optional[str] = None


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None


class NotificationDetail(NotificationBase):
    id: int
    user_id: int
    created_at: datetime
    url: Optional[str] = None
    
    class Config:
        from_attributes = True


class NotificationList(BaseModel):
    id: int
    message: str
    type: Optional[str] = None
    is_read: bool
    created_at: datetime
    url: Optional[str] = None
    
    class Config:
        from_attributes = True 