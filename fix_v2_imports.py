import os
import re

TARGET_DIRS = [
    "backend/app/api/v2",
    "backend/app/models/v2",
    "backend/app/services/v2"
]

# 교체 규칙 (Regex) - 순서 중요!
REPLACEMENTS = [
    # 1. API: v1 -> v2
    (r"from app\.api\.v1", "from app.api.v2"),
    
    # 2. Models: app.models -> app.models.v2 (단, 이미 v2인 경우 제외)
    (r"from app\.models(?!\.v2)", "from app.models.v2"),
    
    # 3. Services: app.services -> app.services.v2 (단, 이미 v2인 경우 제외)
    (r"from app\.services(?!\.v2)", "from app.services.v2"),
]

# 세부 경로 매핑 (파일명 변경/이동 반영)
# 예: application -> document, reports -> report.reports 등
DETAIL_MAPPINGS = [
    # API
    (r"app\.api\.v2\.application", "app.api.v2.document"),
    (r"app\.api\.v2\.reports", "app.api.v2.report.reports"),
    (r"app\.api\.v2\.statistics_analysis", "app.api.v2.report.statistics_analysis"),
    (r"app\.api\.v2\.analysis_results", "app.api.v2.report.analysis_results"),
    (r"app\.api\.v2\.highlight_api", "app.api.v2.analysis.highlight_api"),
    (r"app\.api\.v2\.background_analysis", "app.api.v2.analysis.background_analysis"),
    (r"app\.api\.v2\.growth_prediction", "app.api.v2.analysis.growth_prediction"),
    (r"app\.api\.v2\.written_test", "app.api.v2.test.written_test"),
    (r"app\.api\.v2\.job_aptitude_reports", "app.api.v2.test.job_aptitude_reports"),
    (r"app\.api\.v2\.notifications", "app.api.v2.common.notifications"),
    
    # Models (models.v2.xxx)
    (r"app\.models\.v2\.application", "app.models.v2.document.application"), 
    (r"app\.models\.v2\.resume", "app.models.v2.document.resume"),
    (r"app\.models\.v2\.schedule", "app.models.v2.document.schedule"),
    (r"app\.models\.v2\.user", "app.models.v2.auth.user"),
    (r"app\.models\.v2\.company", "app.models.v2.auth.company"),
    (r"app\.models\.v2\.job", "app.models.v2.recruitment.job"),
    (r"app\.models\.v2\.weight", "app.models.v2.recruitment.weight"),
    (r"app\.models\.v2\.notification", "app.models.v2.common.notification"),
    
    # Services (services.v2.xxx)
    (r"app\.services\.v2\.application_service", "app.services.v2.document.application_service"),
    (r"app\.services\.v2\.application_evaluation_service", "app.services.v2.document.application_evaluation_service"),
    (r"app\.services\.v2\.interview_panel_service", "app.services.v2.interview.interview_panel_service"),
    (r"app\.services\.v2\.ai_interview_evaluation_service", "app.services.v2.interview.ai_interview_evaluation_service"),
    (r"app\.services\.v2\.interview_question_service", "app.services.v2.interview.interview_question_service"),
    (r"app\.services\.v2\.notification_service", "app.services.v2.common.notification_service"),
    (r"app\.services\.v2\.auth_service", "app.services.v2.auth.auth_service"),
]

print("Starting Import Fixes for V2...")

count = 0
for target_dir in TARGET_DIRS:
    if not os.path.exists(target_dir):
        print(f"Skipping {target_dir} (Not found)")
        continue
        
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    original_content = content
                    
                    # 1. 기본 교체 (v1 -> v2)
                    for pattern, replacement in REPLACEMENTS:
                        content = re.sub(pattern, replacement, content)
                        
                    # 2. 세부 경로 매핑 교체
                    for pattern, replacement in DETAIL_MAPPINGS:
                        content = re.sub(pattern, replacement, content)
                    
                    if content != original_content:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(content)
                        count += 1
                        print(f"Fixed: {file_path}")
                        
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

print(f"\nTotal {count} files updated.")
