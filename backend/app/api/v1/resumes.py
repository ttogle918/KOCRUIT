from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.resume import (
    ResumeCreate, ResumeUpdate, ResumeDetail, ResumeList,
    ResumeMemoCreate, ResumeMemoUpdate, ResumeMemoDetail
)
from app.models.resume import Resume, ResumeMemo
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ResumeList])
def get_resumes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).offset(skip).limit(limit).all()
    return resumes


@router.get("/{resume_id}", response_model=ResumeDetail)
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("/", response_model=ResumeDetail)
def create_resume(
    resume: ResumeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_resume = Resume(**resume.dict(), user_id=current_user.id)
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.put("/{resume_id}", response_model=ResumeDetail)
def update_resume(
    resume_id: int,
    resume: ResumeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    for field, value in resume.dict(exclude_unset=True).items():
        setattr(db_resume, field, value)
    
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    db.delete(db_resume)
    db.commit()
    return {"message": "Resume deleted successfully"}


# Resume Memo endpoints
@router.post("/{resume_id}/memos", response_model=ResumeMemoDetail)
def create_resume_memo(
    resume_id: int,
    memo: ResumeMemoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_memo = ResumeMemo(**memo.dict(), writer_id=current_user.id)
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    return db_memo


@router.get("/{resume_id}/memos", response_model=List[ResumeMemoDetail])
def get_resume_memos(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    memos = db.query(ResumeMemo).filter(ResumeMemo.resume_id == resume_id).all()
    return memos


@router.put("/memos/{memo_id}", response_model=ResumeMemoDetail)
def update_resume_memo(
    memo_id: int,
    memo: ResumeMemoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_memo = db.query(ResumeMemo).filter(ResumeMemo.id == memo_id, ResumeMemo.writer_id == current_user.id).first()
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    
    for field, value in memo.dict(exclude_unset=True).items():
        setattr(db_memo, field, value)
    
    db.commit()
    db.refresh(db_memo)
    return db_memo 