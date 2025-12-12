from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.auth.user import User
from app.schemas.auth import UserDetail
from app.api.v1.auth.auth import get_current_user

router = APIRouter()

@router.get("/{user_id}", response_model=UserDetail)
def get_user_by_id(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user_id_val = getattr(current_user, "id", None)
    if not isinstance(user_id_val, int):
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    if user_id_val != user_id and str(getattr(current_user.role, 'value', current_user.role)) != "ADMIN":
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    return user

@router.put("/{user_id}", response_model=UserDetail)
def update_user(user_id: int, user_update: UserDetail, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user_id_val = getattr(current_user, "id", None)
    if not isinstance(user_id_val, int):
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    if user_id_val != user_id and str(getattr(current_user.role, 'value', current_user.role)) != "ADMIN":
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user_id_val = getattr(current_user, "id", None)
    if not isinstance(user_id_val, int):
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    if user_id_val != user_id and str(getattr(current_user.role, 'value', current_user.role)) != "ADMIN":
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"} 