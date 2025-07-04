from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.company import (
    CompanyCreate, CompanyUpdate, CompanyDetail, CompanyList,
    DepartmentCreate, DepartmentUpdate, DepartmentDetail
)
from app.models.company import Company, Department
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[CompanyList])
def get_companies(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Company)
    
    # 검색 기능 추가
    if search:
        query = query.filter(Company.name.contains(search))
    
    # 오름차순 정렬 (회사명 기준)
    companies = query.order_by(Company.name.asc()).offset(skip).limit(limit).all()
    return companies


@router.get("/{company_id}", response_model=CompanyDetail)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.post("/", response_model=CompanyDetail)
def create_company(
    company: CompanyCreate,
    db: Session = Depends(get_db)
):
    db_company = Company(**company.dict())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


@router.put("/{company_id}", response_model=CompanyDetail)
def update_company(
    company_id: int,
    company: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_company = db.query(Company).filter(Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    for field, value in company.dict(exclude_unset=True).items():
        setattr(db_company, field, value)
    
    db.commit()
    db.refresh(db_company)
    return db_company


@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_company = db.query(Company).filter(Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    db.delete(db_company)
    db.commit()
    return {"message": "Company deleted successfully"}


# Department endpoints
@router.get("/departments/", response_model=List[DepartmentDetail])
def get_departments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    departments = db.query(Department).offset(skip).limit(limit).all()
    return departments


@router.get("/departments/{department_id}", response_model=DepartmentDetail)
def get_department(department_id: int, db: Session = Depends(get_db)):
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.post("/departments/", response_model=DepartmentDetail)
def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_department = Department(**department.dict())
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department


@router.put("/departments/{department_id}", response_model=DepartmentDetail)
def update_department(
    department_id: int,
    department: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if not db_department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    for field, value in department.dict(exclude_unset=True).items():
        setattr(db_department, field, value)
    
    db.commit()
    db.refresh(db_department)
    return db_department


@router.delete("/departments/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if not db_department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    db.delete(db_department)
    db.commit()
    return {"message": "Department deleted successfully"}


# Spring Boot 호환용 엔드포인트
@router.get("/common/company", response_model=List[CompanyList], include_in_schema=False)
def get_companies_common(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return get_companies(skip=skip, limit=limit, search=search, db=db) 