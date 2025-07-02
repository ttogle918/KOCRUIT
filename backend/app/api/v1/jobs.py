from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.job import JobPostCreate, JobPostUpdate, JobPostDetail, JobPostList
from app.models.job import JobPost
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[JobPostList])
def get_job_posts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    job_posts = db.query(JobPost).offset(skip).limit(limit).all()
    return job_posts


@router.get("/{job_post_id}", response_model=JobPostDetail)
def get_job_post(job_post_id: int, db: Session = Depends(get_db)):
    job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
    if not job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    return job_post


@router.post("/", response_model=JobPostDetail)
def create_job_post(
    job_post: JobPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_job_post = JobPost(**job_post.dict())
    db.add(db_job_post)
    db.commit()
    db.refresh(db_job_post)
    return db_job_post


@router.put("/{job_post_id}", response_model=JobPostDetail)
def update_job_post(
    job_post_id: int,
    job_post: JobPostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
    if not db_job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    
    for field, value in job_post.dict(exclude_unset=True).items():
        setattr(db_job_post, field, value)
    
    db.commit()
    db.refresh(db_job_post)
    return db_job_post


@router.delete("/{job_post_id}")
def delete_job_post(
    job_post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
    if not db_job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    
    db.delete(db_job_post)
    db.commit()
    return {"message": "Job post deleted successfully"}


@router.get("/common/jobposts", response_model=List[JobPostList], include_in_schema=False)
def get_job_posts_common_direct(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_job_posts(skip=skip, limit=limit, db=db)