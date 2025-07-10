import pymysql
import json
from datetime import datetime

def parse_datetime(value):
    try:
        return datetime.fromisoformat(value)
    except:
        return None

# DB 연결
conn = pymysql.connect(
    host="kocruit-01.c5k2wi2q8g80.us-east-2.rds.amazonaws.com",
    user="admin",
    password="kocruit1234!",
    db="kocruit"
)
cursor = conn.cursor()

# 매핑 딕셔너리
user_id_map = {}
resume_id_map = {}
company_id_map = {}
department_id_map = {}
jobpost_id_map = {}
application_id_map = {}
company_user_id_map = {}

# === 0. 매핑 정보 불러오기 ===
cursor.execute("SELECT id, email FROM users")
user_id_map = {email: uid for uid, email in cursor.fetchall()}

cursor.execute("SELECT id, user_id FROM resume")
resume_id_map = {user_id: rid for rid, user_id in cursor.fetchall()}

cursor.execute("SELECT id, name FROM company")
company_id_map = {name: cid for cid, name in cursor.fetchall()}

cursor.execute("""
    SELECT a.id, u.email, j.title
    FROM application a
    JOIN users u ON a.user_id = u.id
    JOIN jobpost j ON a.job_post_id = j.id
""")
application_id_map = {(email, title): app_id for app_id, email, title in cursor.fetchall()}

cursor.execute("""
    SELECT u.email, cu.id
    FROM company_user cu
    JOIN users u ON cu.id = u.id
""")
company_user_id_map = {email: user_id for email, user_id in cursor.fetchall()}

# === RESUME_MEMO ===
print("📝 Inserting resume memos...")
with open("../data/resume_memo.json", "r", encoding="utf-8") as f:
    for m in json.load(f):
        user_id = company_user_id_map.get(m["email"])
        application_id = application_id_map.get(m["email"])
        cursor.execute("INSERT INTO resume_memo (user_id, application_id, content, created_at) VALUES (%s, %s, %s, NOW())",
                       (user_id, application_id, m["content"]))
print("✅ Resume memos inserted!")

print("✅ RESUME_MEMO 테이블 삽입 완료")
conn.commit()


# === 1. SPEC ===
with open("../data/spec.json", "r", encoding="utf-8") as f:
    specs = json.load(f)

spec_idx = 0
specs_len = len(specs)

for email, user_id in user_id_map.items():
    resume_id = resume_id_map.get(user_id)
    if not resume_id:
        continue

    while spec_idx < specs_len:
        spec = specs[spec_idx]
        if spec["spec_type"] == "education" and spec["spec_title"] == "institution":
            break
        cursor.execute("""
            INSERT INTO spec (resume_id, spec_type, spec_title, spec_description)
            VALUES (%s, %s, %s, %s)
        """, (resume_id, spec["spec_type"], spec["spec_title"], spec["spec_description"]))
        spec_idx += 1
    spec_idx += 1
conn.commit()

print("✅ spec connection successful!")

# 종료
cursor.close()
conn.close()
print("✅ 전체 데이터 삽입 완료!")