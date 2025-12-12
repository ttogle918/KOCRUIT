import re
from typing import List, Dict, Any

def parse_resume_specs(specs: List[Any]) -> Dict[str, List[Dict[str, str]]]:
    """
    Spec 모델 리스트를 받아서 의미 단위(학력, 수상, 자격증 등)로 그룹화하여 반환합니다.
    """
    educations = []
    awards = []
    certificates = []
    skills = []
    experiences = []  # activities + project_experience를 통합
    
    if not specs:
        return {
            "educations": educations,
            "awards": awards,
            "certificates": certificates,
            "skills": skills,
            "experiences": experiences
        }

    for spec in specs:
        spec_type = str(spec.spec_type).lower().strip()
        spec_title = str(spec.spec_title)
        spec_description = spec.spec_description or ""
        
        # 1. 학력 (Education)
        if "education" in spec_type or "학력" in spec_type:
            if spec_title == "institution":
                education = {
                    "period": "",
                    "schoolName": spec_description,
                    "major": "",
                    "graduated": False,
                    "degree": "",
                    "gpa": "",
                    "duration": ""
                }
                educations.append(education)
            elif spec_title == "start_date":
                if educations: educations[-1]["startDate"] = spec_description
            elif spec_title == "end_date":
                if educations: educations[-1]["endDate"] = spec_description
            elif spec_title == "degree":
                if educations:
                    educations[-1]["degree"] = spec_description
                    # major/degree 상세 파싱
                    degree_raw = spec_description or ""
                    school_name = educations[-1]["schoolName"] or ""
                    
                    if "고등학교" in school_name:
                        educations[-1]["major"] = ""
                        educations[-1]["degree"] = ""
                    elif "대학교" in school_name or "대학" in school_name:
                        if degree_raw:
                            m = re.match(r"(.+?)\((.+?)\)", degree_raw)
                            if m:
                                educations[-1]["major"] = m.group(1).strip()
                                educations[-1]["degree"] = m.group(2).strip()
                            else:
                                educations[-1]["major"] = degree_raw.strip()
                                educations[-1]["degree"] = ""
                        else:
                            educations[-1]["major"] = ""
                            educations[-1]["degree"] = ""
                    else:
                        educations[-1]["major"] = ""
                        educations[-1]["degree"] = ""
            elif spec_title == "gpa":
                if educations: educations[-1]["gpa"] = spec_description
            elif spec_title == "duration":
                if educations: educations[-1]["duration"] = spec_description
        
        # 2. 수상 (Awards)
        elif "award" in spec_type or "수상" in spec_type:
            if spec_title == "title":
                award = {
                    "title": spec_description,
                    "date": "",
                    "description": "",
                    "duration": ""
                }
                awards.append(award)
            elif spec_title == "date":
                if awards: awards[-1]["date"] = spec_description
            elif spec_title == "description":
                if awards: awards[-1]["description"] = spec_description
            elif spec_title == "duration":
                if awards: awards[-1]["duration"] = spec_description
        
        # 3. 자격증 (Certifications)
        elif "certificate" in spec_type or "자격증" in spec_type:
            if spec_title == "name":
                certificate = {
                    "name": spec_description,
                    "date": "",
                    "duration": ""
                }
                certificates.append(certificate)
            elif spec_title == "date":
                if certificates: certificates[-1]["date"] = spec_description
            elif spec_title == "duration":
                if certificates: certificates[-1]["duration"] = spec_description
        
        # 4. 스킬 (Skills)
        elif "skill" in spec_type or "기술" in spec_type:
            skills.append(spec_description)
        
        # 5. 대외활동 (Activities)
        elif "activity" in spec_type or "활동" in spec_type:
            if spec_title == "organization":
                experience = {
                    "type": "activity",
                    "organization": spec_description,
                    "role": "",
                    "period": "",
                    "description": "",
                    "duration": ""
                }
                experiences.append(experience)
            elif spec_title == "role":
                if experiences and experiences[-1]["type"] == "activity":
                    experiences[-1]["role"] = spec_description
            elif spec_title == "period":
                if experiences and experiences[-1]["type"] == "activity":
                    experiences[-1]["period"] = spec_description
            elif spec_title == "description":
                if experiences and experiences[-1]["type"] == "activity":
                    experiences[-1]["description"] = spec_description
            elif spec_title == "duration":
                if experiences and experiences[-1]["type"] == "activity":
                    experiences[-1]["duration"] = spec_description
        
        # 6. 프로젝트 (Project Experience)
        elif "project" in spec_type or "경력" in spec_type:
            if spec_title == "title":
                experience = {
                    "type": "project",
                    "title": spec_description,
                    "role": "",
                    "duration": "",
                    "technologies": "",
                    "description": ""
                }
                experiences.append(experience)
            elif spec_title == "role":
                if experiences and experiences[-1]["type"] == "project":
                    experiences[-1]["role"] = spec_description
            elif spec_title == "duration":
                if experiences and experiences[-1]["type"] == "project":
                    experiences[-1]["duration"] = spec_description
            elif spec_title == "technologies":
                if experiences and experiences[-1]["type"] == "project":
                    experiences[-1]["technologies"] = spec_description
            elif spec_title == "description":
                if experiences and experiences[-1]["type"] == "project":
                    experiences[-1]["description"] = spec_description

    return {
        "educations": educations,
        "awards": awards,
        "certificates": certificates,
        "skills": skills,
        "experiences": experiences
    }

