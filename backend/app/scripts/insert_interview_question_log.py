#!/usr/bin/env python3
"""
면접 질문 로그 삽입 스크립트
"""

import pymysql
import sys
from datetime import datetime

def insert_interview_question_log():
    # DB 연결 설정
    try:
        conn = pymysql.connect(
            host='kocruit-02.c5k2wi2q8g80.us-east-2.rds.amazonaws.com',
            user='admin',
            password='kocruit1234!',
            database='kocruit',
            port=3306,
            charset='utf8mb4',
            autocommit=False
        )
        cur = conn.cursor()
        print("✅ DB 연결 성공!")
        
    except Exception as e:
        print(f"❌ DB 연결 실패: {e}")
        return

    # ====== 여기에 네 질문/답변 데이터를 리스트로 등록 ======
    questions = [
  {
    "application_id": 80,
    "job_post_id": 17,
    "interview_type": "FIRST_INTERVIEW",
    "question_id": None,
    "question_text": "공모펀드 공시 프로젝트에서 맡은 역할과 구체적으로 기여한 부분에 대해 설명해 주실 수 있나요?",
    "answer_text": "공모펀드 공시 프로젝트에서 팀원으로서 투자설명서, 정정신고 등 주요 법정 문서 작성과 DART 공시를 담당했습니다. 약 2개월 동안 총 36건의 공시를 진행하였고, 체크리스트를 만들어 오류를 최소화했습니다. 판매사와의 소통, 자료 제출 등 업무 프로세스 전반을 관리하여 신속·정확한 공시를 달성했습니다."
  },
  {
    "application_id": 80,
    "job_post_id": 17,
    "interview_type": "FIRST_INTERVIEW",
    "question_id": None,
    "question_text": "IM 작성 및 업데이트 과정에서 직면한 기술적 어려움은 무엇이었으며, 그것을 어떻게 해결하였나요?",
    "answer_text": "IM 및 투자제안서 작성 시 다양한 이해관계자의 요구사항을 동시에 반영해야 했고, 정보가 실시간으로 변동되어 최신성 유지에 어려움이 있었습니다. 이를 해결하기 위해 각 부서와의 커뮤니케이션을 강화하고, 수정 요청이 들어올 때마다 버전별 변경 이력을 체계적으로 관리하는 프로세스를 도입했습니다."
  },
  {
    "application_id": 80,
    "job_post_id": 17,
    "interview_type": "FIRST_INTERVIEW",
    "question_id": None,
    "question_text": "펀드 관련 콘텐츠 제작 프로젝트에서 팀원들과의 협업 과정에서 발생한 갈등이 있었다면, 어떻게 해결하였는지 구체적으로 이야기해 주세요.",
    "answer_text": "카드뉴스 기획 단계에서 메시지 방향성과 디자인 선호도가 달라 의견 충돌이 있었습니다. 팀 내 의견을 충분히 수렴한 뒤, 대상 고객층 설문과 피드백을 반영해 최종 콘셉트를 도출했고, 각자 강점을 살려 역할을 분담했습니다. 결과적으로 우수 결과물 선정과 SNS 내 호응을 얻을 수 있었습니다."
  },
  {
    "application_id": 80,
    "job_post_id": 17,
    "interview_type": "FIRST_INTERVIEW",
    "question_id": None,
    "question_text": "공모펀드 공시 프로젝트의 성과와 측정 가능한 결과에 대해 설명해 주실 수 있나요?",
    "answer_text": "약 2달간 총 36건의 공모펀드 공시를 문제없이 완료했고, 오류나 반려 없이 마감 기한을 모두 준수했습니다. 체크리스트 및 검토 절차를 통한 실수 예방이 주효했으며, 판매사와의 협업 평가에서도 높은 신뢰도를 얻어 추가 업무 기회까지 맡게 되었습니다."
  },
  {
    "application_id": 80,
    "job_post_id": 17,
    "interview_type": "FIRST_INTERVIEW",
    "question_id": None,
    "question_text": "각 프로젝트를 통해 얻은 주요 인사이트나 개인적인 성장은 무엇이었는지 공유해 주세요.",
    "answer_text": "공시, 콘텐츠, IM 등 다양한 프로젝트를 경험하며 체계적 문서 작성, 프로세스 관리, 소통과 협업의 중요성을 배웠습니다. 오류를 사전에 방지하는 체크리스트 습관, 실시간 변화에 민감하게 대응하는 데이터 관리 역량을 키울 수 있었습니다."
  },
  {
    "application_id": 80,
    "job_post_id": 17,
    "interview_type": "FIRST_INTERVIEW",
    "question_id": None,
    "question_text": "KOSA공공의 핵심가치에 부합하는 경험이나 상황을 공유해 주실 수 있나요?",
    "answer_text": "모든 공시와 보고서 작성 시 책임감 있게 데이터와 근거를 꼼꼼하게 검증하였고, 팀원·유관부서와의 협업을 중시했습니다. 적극적으로 의견을 나누고, 체계적 관리와 신뢰성 있는 결과물을 추구해온 경험이 KOSA공공의 핵심가치와 일치한다고 생각합니다."
  },
  {
    "application_id": 80,
    "job_post_id": 17,
    "interview_type": "FIRST_INTERVIEW",
    "question_id": None,
    "question_text": "팀워크를 중시하는 KOSA공공에서 동료와의 협업 경험에 대해 이야기해 주세요.",
    "answer_text": "공모펀드, IM, 콘텐츠 제작 등 모든 프로젝트에서 팀원 간 의견 공유, 역할 분담, 피드백 반영을 통해 최적의 결과물을 만들어냈습니다. 특히 문제 발생 시 즉각 소통하며 해결책을 모색했던 경험이 많습니다."
  },
  {
    "application_id": 80,
    "job_post_id": 17,
    "interview_type": "FIRST_INTERVIEW",
    "question_id": None,
    "question_text": "KOSA공공의 기업문화에 적응하기 위해 어떤 노력이나 준비를 해왔는지 말씀해 주시겠어요?",
    "answer_text": "새로운 환경에서는 우선 기존 규정과 업무 흐름을 숙지하고, 필요한 자료나 정보를 빠르게 정리·공유하는 데 집중합니다. 인턴십, 해외연수 등 다양한 조직 경험을 통해 유연하게 협업하고, 변화에 적극적으로 적응해왔습니다."
  },
  {
    "application_id": 80,
    "job_post_id": 17,
    "interview_type": "FIRST_INTERVIEW",
    "question_id": None,
    "question_text": "KOSA공공의 인재상에 맞춰 본인의 장점과 약점을 어떻게 발전시켜 나갈 계획인지 설명해 주세요.",
    "answer_text": "장점은 적극성과 꼼꼼함, 빠른 성장력입니다. 단점은 신중한 성격으로 의사결정에 시간이 걸릴 때가 있는데, 미리 일정 관리를 하고 중간 점검을 습관화하여 보완하려 노력합니다. 팀원 피드백도 적극 수용하고 있습니다."
  }
]





    # ================================================

    output_sqls = []
    success_count = 0
    error_count = 0

    # 기존 질문 ID 매핑 테이블 생성
    print("🔍 기존 질문 ID 매핑 확인 중...")
    question_id_mapping = {}
    
    # 모든 기존 질문 조회
    cur.execute("SELECT id, question_text FROM interview_question")
    existing_questions = cur.fetchall()
    
    for qid, qtext in existing_questions:
        question_id_mapping[qtext] = qid
    
    print(f"📊 기존 질문 개수: {len(existing_questions)}개")

    try:
        for i, q in enumerate(questions, 1):
            try:
                print(f"🔄 처리 중... ({i}/{len(questions)})")
                
                qid = q['question_id']
                qtext = q['question_text']
                
                # 1. 질문 ID 결정 (기존 매핑 테이블 활용)
                if qid:
                    # 지정된 ID가 실제로 존재하는지 확인
                    if qid in [qid for qid, _ in existing_questions]:
                        print(f"  ✅ 지정된 질문 ID {qid} 사용")
                    else:
                        print(f"  ⚠️ 지정된 질문 ID {qid}가 존재하지 않습니다. 텍스트로 검색합니다.")
                        qid = None
                
                if not qid:
                    # 매핑 테이블에서 질문 텍스트로 ID 찾기
                    if qtext in question_id_mapping:
                        qid = question_id_mapping[qtext]
                        print(f"  🔍 기존 질문 발견: ID {qid}")
                    else:
                        # 새로운 질문이므로 다음 ID 할당
                        cur.execute("SELECT MAX(id) FROM interview_question")
                        max_id = cur.fetchone()[0]
                        next_id = (max_id or 0) + 1
                        
                        cur.execute(
                            "INSERT INTO interview_question (id, application_id, question_text, type, created_at) VALUES (%s, %s, %s, %s, %s)",
                            (next_id, q['application_id'], qtext, 'PERSONAL', datetime.now())
                        )
                        conn.commit()
                        qid = next_id
                        question_id_mapping[qtext] = qid  # 매핑 테이블 업데이트
                        print(f"  📝 새 질문 생성: ID {qid}")
                
                # 3. interview_question_log에 삽입할 데이터 준비
                log_data = (
                    q['application_id'],
                    q['job_post_id'],
                    q['interview_type'],
                    qid,
                    qtext,
                    q['answer_text'],
                    None,  # answer_audio_url
                    None   # answer_video_url
                )
                
                # 4. 중복 체크 (같은 지원자의 같은 질문에 대한 답변)
                cur.execute(
                    """SELECT id FROM interview_question_log 
                       WHERE application_id = %s AND question_id = %s AND interview_type = %s""",
                    (q['application_id'], qid, q['interview_type'])
                )
                
                if cur.fetchone():
                    print(f"  ⚠️ 중복 데이터 발견, 건너뜀")
                    continue
                
                # 5. 로그 삽입
                cur.execute(
                    """INSERT INTO interview_question_log 
                       (application_id, job_post_id, interview_type, question_id, 
                        question_text, answer_text, answer_audio_url, answer_video_url, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (*log_data, datetime.now())
                )
                
                # 6. SQL 파일용 데이터 준비
                sql = f"""({q['application_id']}, 17, '{q['interview_type']}', {qid}, '{qtext.replace("'", "''")}', '{q['answer_text'].replace("'", "''")}', NULL, NULL)"""
                output_sqls.append(sql)
                
                success_count += 1
                print(f"  ✅ 성공: 질문 ID {qid}")
                
            except Exception as e:
                error_count += 1
                print(f"  ❌ 오류: {e}")
                continue
        
        # 전체 커밋
        conn.commit()
        print(f"\n🎉 처리 완료!")
        print(f"✅ 성공: {success_count}개")
        print(f"❌ 실패: {error_count}개")
        
        # 7. SQL 파일로 저장
        if output_sqls:
            with open("interview_question_log_insert.sql", "w", encoding="utf-8") as f:
                f.write("-- 면접 질문 로그 삽입 SQL\n")
                f.write(f"-- 생성일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"-- 총 {len(output_sqls)}개 데이터\n\n")
                f.write("INSERT INTO interview_question_log (application_id, job_post_id, interview_type, question_id, question_text, answer_text, answer_audio_url, answer_video_url) VALUES\n")
                f.write(",\n".join(output_sqls) + ";")
            
            print(f"💾 SQL 파일 생성 완료! (interview_question_log_insert.sql)")
        
    except Exception as e:
        print(f"❌ 전체 오류: {e}")
        conn.rollback()
    
    finally:
        cur.close()
        conn.close()
        print("🔌 DB 연결 종료")

if __name__ == "__main__":
    insert_interview_question_log() 