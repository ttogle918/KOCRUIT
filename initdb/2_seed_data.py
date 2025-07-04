import mysql.connector
import json
from datetime import datetime

print("🚀 Starting seed data insertion...")

def parse_datetime(value):
    try:
        return datetime.fromisoformat(value)
    except:
        return None

# DB 연결
print("📡 Connecting to database...")
conn = mysql.connector.connect(
    host="localhost",  # 호스트에서 실행
    user="root",
    password="root",  # docker-compose.yml의 MYSQL_ROOT_PASSWORD
    database="kocruit_db",
    port=3307  # docker-compose.yml의 포트 매핑
)
cursor = conn.cursor()
print("✅ Database connection successful!")

# 기존 데이터 삭제 (순서 중요: 외래키 제약조건 때문에)
print("🗑️ Deleting existing data...")
try:
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    cursor.execute("DELETE FROM schedule_interview")
    cursor.execute("DELETE FROM interview_evaluation")
    cursor.execute("DELETE FROM interview_question")
    cursor.execute("DELETE FROM evaluation_detail")
    cursor.execute("DELETE FROM application")
    cursor.execute("DELETE FROM applicant_user")
    cursor.execute("DELETE FROM company_user")
    cursor.execute("DELETE FROM resume_memo")
    cursor.execute("DELETE FROM spec")
    cursor.execute("DELETE FROM resume")
    cursor.execute("DELETE FROM jobpost_role")
    cursor.execute("DELETE FROM jobpost")
    cursor.execute("DELETE FROM department")
    cursor.execute("DELETE FROM field_name_score")
    cursor.execute("DELETE FROM weight")
    cursor.execute("DELETE FROM notification")
    cursor.execute("DELETE FROM schedule")
    cursor.execute("DELETE FROM users")
    cursor.execute("DELETE FROM company")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    conn.commit()
    print("✅ Existing data deleted successfully!")
except Exception as e:
    print(f"❌ Error deleting existing data: {e}")
    conn.rollback()

# ID 매핑 딕셔너리
user_id_map = {}
resume_id_map = {}
company_id_map = {}
department_id_map = {}
jobpost_id_map = {}
application_id_map = {}
schedule_id_map = {}
company_user_id_map = {}
interview_id_map = {}
evaluation_id_map = {}

# === COMPANY ===
print("🏢 Inserting companies...")
with open("../data/company.json", "r", encoding="utf-8") as f:
    for company in json.load(f):
        bus_num = company.get("bus_num", "")  # 새로 추가된 bus_num
        cursor.execute(
            "INSERT INTO company (name, description, address, phone, website, bus_num, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())",
            (company["name"], company.get("description"), company["address"], company.get("phone"), company.get("website"), bus_num)
        )
        company_id_map[company["name"]] = cursor.lastrowid
print("✅ Companies inserted!")

# === USERS ===
print("👤 Inserting users...")
with open("../data/users.json", "r", encoding="utf-8") as f:
    for user in json.load(f):
        for key in ["birth_date", "created_at", "updated_at"]:
            if key in user:
                user[key] = parse_datetime(user[key])

        cursor.execute("""
            INSERT INTO users
                (name, email, password, phone, user_type,
                 birth_date, gender, address, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s)
        """, (
            user["name"], user["email"], user["password"], user.get("phone"),
            user.get("user_type"),
            user.get("birth_date"), user.get("gender"), user.get("address"),
            user.get("created_at"), user.get("updated_at")
        ))
        user_id_map[user["email"]] = cursor.lastrowid   # 그대로 유지
print("✅ Users inserted!")

# users 로딩
cursor.execute("SELECT id, email FROM users")
for uid, email in cursor.fetchall():
    user_id_map[email] = uid

# company 로딩
cursor.execute("SELECT id, name FROM company")
for cid, name in cursor.fetchall():
    company_id_map[name] = cid

# jobpost 로딩
cursor.execute("SELECT id, title, company_id FROM jobpost")
for jid, title, cid in cursor.fetchall():
    jobpost_id_map[(title, cid)] = jid

# company_user 로딩
cursor.execute("SELECT id, email FROM users WHERE user_type = 'COMPANY'")
for uid, email in cursor.fetchall():
    company_user_id_map[email] = uid

# === RESUME ===
print("📄 Inserting resumes...")
with open("../data/resume.json", "r", encoding="utf-8") as f:
    for resume in json.load(f):
        email = resume["personal_info"]["email"]
        user_id = user_id_map.get(email)
        content = json.dumps(resume.get("self_introduction", []), ensure_ascii=False, indent=2)
        cursor.execute("""
            INSERT INTO resume (user_id, title, content, file_url, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
        """, (user_id, "기본 이력서", content, ""))
        resume_id_map[email] = cursor.lastrowid
print("✅ Resumes inserted!")

# === SPEC ===
print("📑 Inserting specs...")
with open("../data/spec.json", "r", encoding="utf-8") as f:
    specs = json.load(f)

spec_idx = 0
resume_idx = 0
specs_len = len(specs)

for email, resume_id in resume_id_map.items():
    while spec_idx < specs_len:
        spec = specs[spec_idx]

        # 새로운 이력서의 시작은 education + institution 항목으로 판단
        if spec["spec_type"] == "education" and spec["spec_title"] == "institution":
            if resume_idx >= len(resume_id_map):
                break
            resume_id = list(resume_id_map.values())[resume_idx]
            resume_idx += 1

        cursor.execute("""
            INSERT INTO spec (resume_id, spec_type, spec_title, spec_description)
            VALUES (%s, %s, %s, %s)
        """, (resume_id, spec["spec_type"], spec["spec_title"], spec["spec_description"]))

        spec_idx += 1
print("✅ Specs inserted!")

# === DEPARTMENT ===
print("🏬 Inserting departments...")
with open("../data/department.json", "r", encoding="utf-8") as f:
    departments = json.load(f)

for dept in departments:
    company_name = dept["company"]
    company_id = company_id_map.get(company_name)
    if not company_id:
        print(f"❗ company_id_map에 없는 회사명: {company_name}")
        continue

    cursor.execute("""
        INSERT INTO department (name, description, job_function, created_at, updated_at, company_id)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        dept["name"],
        dept.get("description"),
        dept["job_function"],
        parse_datetime(dept["created_at"]),
        parse_datetime(dept["created_at"]),
        company_id
    ))

    department_id_map[(dept["name"], company_id)] = cursor.lastrowid
print("✅ Departments inserted!")

# === JOBPOST ===
print("💼 Inserting jobposts...")
with open("../data/jobpost.json", "r", encoding="utf-8") as f:
    for entry in json.load(f):
        company_id = company_id_map.get(entry["company"])
        for post in entry["jobposts"]:
            dept_name = post["department_name"]
            department_id = department_id_map.get((dept_name, company_id))
            cursor.execute("""
                INSERT INTO jobpost (company_id, department_id, user_id, title, department, qualifications, conditions, job_details, procedures, headcount, start_date, end_date, location, employment_type, deadline, team_members, weights, status, created_at, updated_at)
                VALUES (%s, %s, NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                company_id, department_id, post["title"], post.get("department_name"), post["qualifications"], post["conditions"],
                post["job_details"], post["procedure"], post["headcount"],
                parse_datetime(post["start_date"]), parse_datetime(post["end_date"]),
                post.get("location"), post.get("employment_type"), post.get("deadline"),
                post.get("team_members"), post.get("weights"), post.get("status", "ACTIVE"),
                parse_datetime(post["created_at"]), parse_datetime(post["updated_at"])
            ))
            jobpost_id_map[(post["title"], company_id)] = cursor.lastrowid
print("✅ Jobposts inserted!")

# === WEIGHT ===
print("⚖️ Inserting weights...")
with open("../data/weight.json", "r", encoding="utf-8") as f:
    for entry in json.load(f):
        company_id = company_id_map.get(entry["company"])
        if not company_id: 
            print(f"⚠️ company_id 매핑 실패 - company: {entry['company']}")
            continue
        for post in entry.get("jobposts", []):
            jobpost_id = jobpost_id_map.get((post["title"], company_id))
            if not jobpost_id:
                print(f"⚠️ jobpost_id 매핑 실패 - title: {post['title']}, company: {entry['company']}")
                continue
            for w in post.get("weight", []):
                cursor.execute("""
                    INSERT INTO weight (target_type, jobpost_id, field_name, weight_value, updated_at)
                    VALUES (%s, %s, %s, %s, NOW())
                """, (w["targetType"], jobpost_id, w["fieldName"], float(w["weightValue"])))
print("✅ Weights inserted!")

# === COMPANY_USER ===
print("👥 Inserting company users...")
with open("../data/company_user.json", "r", encoding="utf-8") as f:
    for cu in json.load(f):
        email = cu["email"]
        company_name = cu["company"]
        ranks = cu["rank"]
        joined_at = parse_datetime(cu["joined_at"])

        user_id = user_id_map.get(email)
        company_id = company_id_map.get(company_name)

        if user_id and company_id:
            cursor.execute("""
                        INSERT INTO company_user (id, company_id, department_id, ranks, joined_at)
        VALUES (%s, %s, %s, %s, %s)
            """, (user_id, company_id, None, ranks, joined_at))
            company_user_id_map[email] = user_id
        else:
            print(f"⚠️ 매핑 실패 - email: {email}, company: {company_name}")
print("✅ Company users inserted!")

# === APPLICANT_USER ===
print("🎓 Inserting applicant users...")
with open("../data/applicant_user_list.json", "r", encoding="utf-8") as f:
    for a in json.load(f):
        email = a["email"]
        user_id = user_id_map.get(email)
        if user_id:
            cursor.execute("INSERT INTO applicant_user (id, resume_file_path) VALUES (%s, %s)", (user_id, None))
        else:
            print(f"⚠️ 사용자 ID를 찾을 수 없음: {email}")
print("✅ Applicant users inserted!")

# === APPLICATION ===
print("📝 Inserting applications...")
with open("../data/application.json", "r", encoding="utf-8") as f:
    for app in json.load(f):
        email = app["email"]
        user_id = user_id_map.get(email)
        resume_id = resume_id_map.get(email)
        company_id = company_id_map.get(app["company"])
        jobpost_id = jobpost_id_map.get((app["title"], company_id))
        if None in (user_id, resume_id, jobpost_id):
            print(f"❌ 매핑 실패 → {app}")
            continue
        cursor.execute("""
            INSERT INTO application (user_id, resume_id, job_post_id, status, applied_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (
            user_id, resume_id, jobpost_id,
            app["status"]
        ))
        application_id_map[(email, app["title"])] = cursor.lastrowid
print("✅ Applications inserted!")

# === FIELD_NAME_SCORE ===
print("📊 Inserting field name scores...")
with open("../data/field_name_score.json", "r", encoding="utf-8") as f:
    scores = json.load(f)
    for s in scores:
        application_id = application_id_map.get((s["email"], s["jobpost_title"]))
        if not application_id:
            print(f"⚠️ application_id 매핑 실패 - email: {s['email']}, jobpost_title: {s['jobpost_title']}")
            continue
        cursor.execute("INSERT INTO field_name_score (application_id, field_name, score) VALUES (%s, %s, %s)", (application_id, s["field_name"], s["score"]))
print("✅ Field name scores inserted!")

# === JOBPOST_ROLE ===
print("🔐 Inserting jobpost roles...")
with open("../data/jobpost_role.json", "r", encoding="utf-8") as f:
    for rec in json.load(f):
        email        = rec["email"]
        company_name = rec["company"]
        role         = rec.get("role", "MANAGER")               # 기본값: MANAGER
        granted_at   = parse_datetime(rec.get("invited_at")) or datetime.now()

        # ① company_user_id 확보 (없으면 즉석에서 INSERT)
        company_user_id = company_user_id_map.get(email)
        if company_user_id is None:
            user_id    = user_id_map.get(email)
            company_id = company_id_map.get(company_name)

            if user_id and company_id:
                cursor.execute("""
                    INSERT INTO company_user (id, company_id, department_id, ranks, joined_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (user_id, company_id, None, None, None))
                company_user_id = user_id
                company_user_id_map[email] = user_id
            else:
                print(f"⚠️ company_user 매핑 실패 → {rec}")
                continue

        # ② jobpost_id 매핑
        jobpost_id = jobpost_id_map.get((rec["jobpost_title"], company_id_map.get(company_name)))
        if not jobpost_id:
            print(f"❌ jobpost_id 매핑 실패 → {rec}")
            continue

        # ③ 권한 부여
        cursor.execute("""
            INSERT INTO jobpost_role (jobpost_id, company_user_id, role, granted_at)
            VALUES (%s, %s, %s, %s)
        """, (jobpost_id, company_user_id, role, granted_at))
print("✅ Jobpost roles inserted!")

# === RESUME_MEMO ===
print("📝 Inserting resume memos...")
with open("../data/resume_memo.json", "r", encoding="utf-8") as f:
    for m in json.load(f):
        user_id = company_user_id_map.get(m["email"])
        application_id = application_id_map.get(m["email"])
        cursor.execute("INSERT INTO resume_memo (user_id, application_id, content, created_at) VALUES (%s, %s, %s, NOW())",
                       (user_id, application_id, m["content"]))
print("✅ Resume memos inserted!")

print("🎉 All data insertion completed successfully!")

# 마무리
conn.commit()
cursor.close()
conn.close()
