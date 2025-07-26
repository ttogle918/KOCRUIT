from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

from agents.graph_agent import build_graph
from agents.chatbot_graph import create_chatbot_graph, initialize_chat_state, create_session_id
from agents.chatbot_node import ChatbotNode
from redis_monitor import RedisMonitor
from scheduler import RedisScheduler
from tools.weight_extraction_tool import weight_extraction_tool
from tools.form_fill_tool import form_fill_tool, form_improve_tool
from tools.form_edit_tool import form_edit_tool, form_status_check_tool
from tools.form_improve_tool import form_improve_tool
from agents.application_evaluation_agent import evaluate_application
from tools.speech_recognition_tool import speech_recognition_tool
from tools.highlight_tool import highlight_resume_content
# from tools.realtime_interview_evaluation_tool import realtime_interview_evaluation_tool, RealtimeInterviewEvaluationTool
from dotenv import load_dotenv
import uuid
import os
from fastapi import HTTPException
from langchain_openai import ChatOpenAI
import json
from pydantic import BaseModel
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
from tools.speech_recognition_tool import SpeechRecognitionTool
from tools.realtime_interview_evaluation_tool import RealtimeInterviewEvaluationTool
from tools.answer_grading_tool import grade_written_test_answer

# Python 경로에 현재 디렉토리 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

app = FastAPI(
    title="AI Agent API",
    description="AI Agent for KOCruit Project",
    version="1.0.0"
)

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # 프론트엔드 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic 모델 정의
class HighlightResumeRequest(BaseModel):
    text: str
    job_description: str = ""
    company_values: str = ""
    jobpost_id: Optional[int] = None
    company_id: Optional[int] = None

# 헬스체크 엔드포인트
@app.get("/health")
async def health_check():
    """서버 상태 확인 엔드포인트"""
    return {"status": "healthy", "message": "Kocruit Agent API is running"}

@app.get("/")
async def root():
    """루트 경로 - API 정보 반환"""
    return {
        "message": "AI Agent API is running",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/chat/",
            "highlight_resume": "/highlight-resume",
            "extract_weights": "/extract-weights/",
            "evaluate_application": "/evaluate-application/",
            "monitor_health": "/monitor/health",
            "monitor_sessions": "/monitor/sessions",
            "speech_recognition": "/agent/speech-recognition",
            "realtime_evaluation": "/agent/realtime-interview-evaluation",
            "docs": "/docs"
        }
    }

# OpenAI API 키가 있을 때만 그래프 초기화
try:
    if os.getenv("OPENAI_API_KEY"):
        graph_agent = build_graph()
        chatbot_graph = create_chatbot_graph()
    else:
        graph_agent = None
        chatbot_graph = None
        print("Warning: OPENAI_API_KEY not found. Some features will be limited.")
except Exception as e:
    print(f"Error initializing agents: {e}")
    graph_agent = None
    chatbot_graph = None

# Redis 모니터링 시스템 초기화
try:
    redis_monitor = RedisMonitor()
    scheduler = RedisScheduler(redis_monitor)
    print("Redis monitoring system initialized successfully.")
except Exception as e:
    print(f"Error initializing Redis monitor: {e}")
    redis_monitor = None
    scheduler = None

@app.post("/highlight-resume")
async def highlight_resume(request: dict):
    """이력서 하이라이팅 분석 (resume_content 직접 전달)"""
    print(f"🎯 AI Agent: 하이라이팅 요청 받음!")
    print(f"📥 요청 데이터: {request}")
    
    try:
        # HighlightResumeTool 인스턴스 생성
        highlight_tool = get_highlight_tool()
        if not highlight_tool:
            print("❌ HighlightResumeTool 초기화 실패")
            raise HTTPException(status_code=503, detail="HighlightResumeTool을 초기화할 수 없습니다")
        
        # application_id 필수 체크
        if "application_id" not in request:
            print("❌ application_id 누락")
            raise HTTPException(status_code=400, detail="application_id is required")
        
        # resume_content 필수 체크
        if "resume_content" not in request:
            print("❌ resume_content 누락")
            raise HTTPException(status_code=400, detail="resume_content is required")
        
        application_id = request["application_id"]
        resume_content = request["resume_content"]
        jobpost_id = request.get("jobpost_id")
        company_id = request.get("company_id")
        
        print(f"✅ 파라미터 확인 완료: application_id={application_id}, jobpost_id={jobpost_id}, company_id={company_id}")
        print(f"📄 이력서 내용 길이: {len(resume_content)} characters")
        
        # resume_content 기반 하이라이팅 실행 (비동기)
        print("🚀 하이라이팅 분석 시작...")
        result = await highlight_tool.run_all_with_content(
            resume_content=resume_content,
            application_id=application_id,
            jobpost_id=jobpost_id,
            company_id=company_id
        )
        
        print(f"✅ 하이라이팅 분석 완료: {len(result.get('highlights', []))} highlights")
        print(f"📤 응답 전송 시작...")
        print(f"📦 응답 데이터: {result}")
        return result
        
    except Exception as e:
        print(f"❌ 하이라이팅 분석 중 오류 발생: {str(e)}")
        import traceback
        print(f"📋 상세 오류: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run/")
async def run(request: Request):
    data = await request.json()
    # job_posting, resume 필드 둘 다 받아야 함
    job_posting = data.get("job_posting", "")
    resume = data.get("resume", "")
    state = {
        "job_posting": job_posting,
        "resume": resume
    }
    result = graph_agent.invoke(state)
    if result is None:
        return {"error": "LangGraph returned None"}
    return {
        "job_posting_suggestion": result.get("job_posting_suggestion"),
        "resume_score": result.get("resume_score"),
    }

@app.post("/chat/")
async def chat(request: Request):
    """챗봇 대화 API"""
    data = await request.json()
    user_message = data.get("message", "")
    session_id = data.get("session_id", None)
    page_context = data.get("page_context", {})  # 페이지 컨텍스트 추가
    
    if not user_message:
        return {"error": "Message is required"}
    
    # 세션 ID가 없으면 새로 생성
    if not session_id:
        session_id = create_session_id()
    
    # chatbot_graph가 초기화되지 않은 경우 기본 응답
    if chatbot_graph is None:
        return {
            "session_id": session_id,
            "ai_response": "죄송합니다. 현재 챗봇 서비스가 설정 중입니다. 잠시 후 다시 시도해주세요.",
            "context_used": "",
            "conversation_history_length": 0,
            "page_suggestions": [],
            "dom_actions": [],
            "error": "OpenAI API key not configured"
        }
    
    # 챗봇 상태 초기화 (페이지 컨텍스트 포함)
    chat_state = initialize_chat_state(user_message, session_id, page_context)
    
    # 챗봇 그래프 실행
    try:
        result = chatbot_graph.invoke(chat_state)
        return {
            "session_id": session_id,
            "ai_response": result.get("ai_response", ""),
            "context_used": result.get("context_used", ""),
            "conversation_history_length": result.get("conversation_history_length", 0),
            "page_suggestions": result.get("page_suggestions", []),  # 페이지별 제안사항
            "dom_actions": result.get("dom_actions", []),  # DOM 조작 액션
            "error": result.get("error", "")
        }
    except Exception as e:
        return {
            "session_id": session_id,
            "error": f"Chatbot error: {str(e)}",
            "ai_response": "죄송합니다. 오류가 발생했습니다."
        }

@app.post("/chat/add-knowledge/")
async def add_knowledge(request: Request):
    """지식 베이스에 문서 추가"""
    data = await request.json()
    documents = data.get("documents", [])
    metadata = data.get("metadata", None)
    
    if not documents:
        return {"error": "Documents are required"}
    
    try:
        chatbot_node = ChatbotNode()
        chatbot_node.add_knowledge(documents, metadata)
        return {"message": f"Added {len(documents)} documents to knowledge base"}
    except Exception as e:
        return {"error": f"Failed to add knowledge: {str(e)}"}

@app.delete("/chat/clear/{session_id}")
async def clear_conversation(session_id: str):
    """특정 세션의 대화 히스토리 삭제"""
    try:
        chatbot_node = ChatbotNode()
        chatbot_node.clear_conversation(session_id)
        return {"message": f"Cleared conversation history for session {session_id}"}
    except Exception as e:
        return {"error": f"Failed to clear conversation: {str(e)}"}

@app.get("/chat/session/new")
async def create_new_session():
    """새로운 세션 생성"""
    session_id = create_session_id()
    return {"session_id": session_id}

# Redis 모니터링 엔드포인트들
@app.get("/monitor/health")
async def get_redis_health():
    """Redis 상태 확인"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    return redis_monitor.get_health_status()

@app.get("/monitor/sessions")
async def get_session_statistics():
    """세션 통계 정보"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    return redis_monitor.get_session_statistics()

@app.post("/monitor/cleanup")
async def cleanup_sessions():
    """만료된 세션 정리"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    return redis_monitor.cleanup_expired_sessions()

@app.post("/monitor/backup")
async def backup_conversations(request: Request):
    """대화 기록 백업"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    
    data = await request.json()
    backup_name = data.get("backup_name")
    return redis_monitor.backup_conversations(backup_name)

@app.post("/monitor/restore")
async def restore_conversations(request: Request):
    """대화 기록 복구"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    
    data = await request.json()
    backup_file = data.get("backup_file")
    if not backup_file:
        return {"error": "backup_file is required"}
    
    return redis_monitor.restore_conversations(backup_file)

@app.get("/monitor/backups")
async def get_backup_list():
    """백업 파일 목록"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    return redis_monitor.get_backup_list()

@app.delete("/monitor/backup/{backup_name}")
async def delete_backup(backup_name: str):
    """백업 파일 삭제"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    return redis_monitor.delete_backup(backup_name)

@app.post("/monitor/memory-limit")
async def set_memory_limit(request: Request):
    """메모리 제한 설정"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    
    data = await request.json()
    max_memory_mb = data.get("max_memory_mb", 512)
    return redis_monitor.set_memory_limit(max_memory_mb)

@app.post("/monitor/start")
async def start_monitoring():
    """모니터링 시작"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    
    redis_monitor.start_monitoring()
    return {"message": "Monitoring started"}

@app.post("/monitor/stop")
async def stop_monitoring():
    """모니터링 중지"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    
    redis_monitor.stop_monitoring()
    return {"message": "Monitoring stopped"}

@app.post("/monitor/auto-cleanup/enable")
async def enable_auto_cleanup():
    """자동 정리 활성화"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    
    redis_monitor.enable_auto_cleanup()
    return {"message": "Auto cleanup enabled"}

@app.post("/monitor/auto-cleanup/disable")
async def disable_auto_cleanup():
    """자동 정리 비활성화"""
    if redis_monitor is None:
        return {"error": "Redis monitor not initialized"}
    
    redis_monitor.disable_auto_cleanup()
    return {"message": "Auto cleanup disabled"}

@app.post("/monitor/scheduler/start")
async def start_scheduler():
    """스케줄러 시작"""
    if scheduler is None:
        return {"error": "Scheduler not initialized"}
    
    import asyncio
    asyncio.create_task(scheduler.start())
    return {"message": "Scheduler started"}

@app.post("/monitor/scheduler/stop")
async def stop_scheduler():
    """스케줄러 중지"""
    if scheduler is None:
        return {"error": "Scheduler not initialized"}
    
    return {"message": "Scheduler stopped"}

@app.get("/monitor/scheduler/status")
async def get_scheduler_status():
    """스케줄러 상태 확인"""
    if scheduler is None:
        return {"error": "Scheduler not initialized"}
    
    return scheduler.get_scheduler_status()

@app.post("/monitor/cleanup/manual")
async def manual_cleanup():
    """수동 정리 실행"""
    if scheduler is None:
        return {"error": "Scheduler not initialized"}
    
    result = await scheduler.run_manual_cleanup()
    return result

@app.post("/monitor/backup/manual")
async def manual_backup(request: Request):
    """수동 백업 실행"""
    if scheduler is None:
        return {"error": "Scheduler not initialized"}
    
    data = await request.json()
    backup_name = data.get("backup_name")
    
    result = await scheduler.run_manual_backup(backup_name)
    return result



@app.post("/extract-weights/")
async def extract_weights(request: Request):
    """채용공고 내용을 분석하여 가중치를 추출합니다."""
    data = await request.json()
    job_posting_content = data.get("job_posting", "")
    
    if not job_posting_content:
        return {"error": "Job posting content is required"}
    
    try:
        state = {"job_posting": job_posting_content}
        result = weight_extraction_tool(state)
        weights = result.get("weights", [])
        
        return {
            "weights": weights,
            "message": f"Successfully extracted {len(weights)} weights"
        }
    except Exception as e:
        return {
            "error": f"Failed to extract weights: {str(e)}",
            "weights": []
        }

@app.post("/evaluate-application/")
async def evaluate_application_api(request: Request):
    """지원자의 서류를 AI로 평가합니다."""
    data = await request.json()
    job_posting = data.get("job_posting", "")
    spec_data = data.get("spec_data", {})
    resume_data = data.get("resume_data", {})
    weight_data = data.get("weight_data", {})
    
    if not job_posting or not spec_data or not resume_data:
        return {"error": "job_posting, spec_data, and resume_data are required"}
    
    try:
        # weight_data를 포함하여 평가 실행
        initial_state = {
            "job_posting": job_posting,
            "spec_data": spec_data,
            "resume_data": resume_data,
            "weight_data": weight_data,
            "ai_score": 0.0,
            "scoring_details": {},
            "pass_reason": "",
            "fail_reason": "",
            "status": "",
            "decision_reason": "",
            "confidence": 0.0
        }
        
        result = evaluate_application(job_posting, spec_data, resume_data, weight_data)
        
        return {
            "ai_score": result.get("ai_score", 0.0),
            "document_status": result.get("document_status", "REJECTED"),
            "pass_reason": result.get("pass_reason", ""),
            "fail_reason": result.get("fail_reason", ""),
            "scoring_details": result.get("scoring_details", {}),
            "decision_reason": result.get("decision_reason", ""),
            "confidence": result.get("confidence", 0.0),
            "message": "Application evaluation completed successfully"
        }
    except Exception as e:
        return {
            "error": f"Failed to evaluate application: {str(e)}",
            "ai_score": 0.0,
            "document_status": "REJECTED",
            "pass_reason": "",
            "fail_reason": "",
            "scoring_details": {},
            "decision_reason": "",
            "confidence": 0.0
        }

# 폼 관련 API 엔드포인트들
@app.post("/ai/form-fill")
async def ai_form_fill(request: Request):
    """AI를 통한 폼 자동 채우기"""
    data = await request.json()
    description = data.get("description", "")
    current_form_data = data.get("current_form_data", {})
    
    if not description:
        return {"error": "Description is required"}
    
    try:
        state = {
            "description": description,
            "current_form_data": current_form_data
        }
        result = form_fill_tool(state)
        return result
    except Exception as e:
        return {"error": f"Form fill failed: {str(e)}"}

@app.post("/ai/form-improve")
async def ai_form_improve(request: Request):
    """AI를 통한 폼 개선 제안"""
    data = await request.json()
    current_form_data = data.get("current_form_data", {})
    
    if not current_form_data:
        return {"error": "Current form data is required"}
    
    try:
        state = {
            "current_form_data": current_form_data
        }
        result = form_improve_tool(state)
        return result
    except Exception as e:
        return {"error": f"Form improve failed: {str(e)}"}

@app.post("/ai/form-field-update")
async def ai_form_field_update(request: Request):
    """AI를 통한 특정 폼 필드 수정"""
    data = await request.json()
    field_name = data.get("field_name", "")
    new_value = data.get("new_value", "")
    current_form_data = data.get("current_form_data", {})
    
    if not field_name or not new_value:
        return {"error": "Field name and new value are required"}
    
    try:
        state = {
            "field_name": field_name,
            "new_value": new_value,
            "current_form_data": current_form_data
        }
        result = form_edit_tool(state)
        return result
    except Exception as e:
        return {"error": f"Form field update failed: {str(e)}"}

@app.post("/ai/form-status-check")
async def ai_form_status_check(request: Request):
    """AI를 통한 폼 상태 확인"""
    data = await request.json()
    current_form_data = data.get("current_form_data", {})
    
    try:
        state = {
            "current_form_data": current_form_data
        }
        result = form_status_check_tool(state)
        return result
    except Exception as e:
        return {"error": f"Form status check failed: {str(e)}"}

@app.post("/ai/field-improve")
async def ai_field_improve(request: Request):
    """AI를 통한 특정 필드 개선"""
    data = await request.json()
    field_name = data.get("field_name", "")
    current_content = data.get("current_content", "")
    user_request = data.get("user_request", "")
    form_context = data.get("form_context", {})
    
    if not field_name:
        return {"error": "Field name is required"}
    
    try:
        state = {
            "field_name": field_name,
            "current_content": current_content,
            "user_request": user_request,
            "form_context": form_context
        }
        result = form_improve_tool(state)
        return result
    except Exception as e:
        return {"error": f"Field improve failed: {str(e)}"}

@app.post("/ai/route")
async def ai_route(request: Request):
    """LLM 기반 라우팅 - 사용자 의도를 분석하여 적절한 도구로 분기"""
    data = await request.json()
    message = data.get("message", "")
    current_form_data = data.get("current_form_data", {})
    user_intent = data.get("user_intent", "")
    
    print(f"🔄 /ai/route 호출: message={message}")
    
    if not message:
        return {"error": "message is required"}
    
    try:
        # LangGraph를 사용한 라우팅
        state = {
            "message": message,
            "user_intent": user_intent,
            "current_form_data": current_form_data,
            "description": message,  # form_fill_tool이 description 필드를 사용하므로 추가
            "page_context": data.get("page_context", {})
        }
        
        # 그래프가 초기화되지 않은 경우
        if graph_agent is None:
            return {"error": "Graph agent not initialized"}
        
        result = graph_agent.invoke(state)
        print(f"🎯 라우팅 결과: {result}")
        
        # 결과에서 적절한 응답 추출
        if "info" in result:
            print(f"📋 info_tool 결과 감지: {result['info']}")
            return {
                "success": True,
                "response": result["info"],
                "tool_used": "info_tool"
            }
        elif "form_data" in result:
            return {
                "success": True,
                "response": result.get("message", "폼이 채워졌습니다."),
                "form_data": result.get("form_data", {}),
                "tool_used": "form_fill_tool"
            }
        elif "suggestions" in result:
            return {
                "success": True,
                "response": "폼 개선 제안:\n" + "\n".join([f"{i+1}. {s}" for i, s in enumerate(result.get("suggestions", []))]),
                "tool_used": "form_improve_tool"
            }
        elif "questions" in result:
            return {
                "success": True,
                "response": "면접 질문:\n" + "\n".join([f"{i+1}. {q}" for i, q in enumerate(result.get("questions", []))]),
                "tool_used": "project_question_generator"
            }
        elif "status" in result:
            return {
                "success": True,
                "response": result.get("status", "폼 상태를 확인했습니다."),
                "tool_used": "form_status_check_tool"
            }
        elif "response" in result:
            # spell_check_tool 등이 반환하는 response 필드 처리
            return {
                "success": True,
                "response": result.get("response", "요청을 처리했습니다."),
                "tool_used": "spell_check_tool"
            }
        else:
            # message가 있으면 그것을 사용, 없으면 기본 메시지
            response_message = result.get("message", "요청을 처리했습니다.")
            print(f"📝 기본 응답: {response_message}")
            return {
                "success": True,
                "response": response_message,
                "form_data": result.get("form_data", {}),
                "tool_used": "unknown"
            }
            
    except Exception as e:
        print(f"❌ /ai/route 오류: {e}")
        return {"success": False, "error": str(e)}

@app.post("/chat/suggest-questions")
async def suggest_questions(request: Request):
    """LLM을 활용한 예시 질문(빠른 응답) 생성 API"""
    data = await request.json()
    recent_messages = data.get("recent_messages", [])  # [{sender, text, timestamp} ...]
    page_context = data.get("page_context", {})
    form_data = data.get("form_data", {})

    # 최근 메시지 텍스트만 추출
    last_user_message = ""
    for msg in reversed(recent_messages):
        if msg.get("sender") == "user":
            last_user_message = msg.get("text", "")
            break

    # 프롬프트 설계
    prompt = f"""
    아래는 채용/HR 챗봇의 대화 맥락과 페이지 정보, 폼 상태입니다.
    이 맥락에서 사용자가 다음에 할 수 있는 유용한 예시 질문(빠른 응답 버튼용)을 4개 추천해 주세요.
    - 너무 단순하거나 반복적이지 않게, 실제로 도움이 될 만한 질문이어야 합니다.
    - 예시 질문은 한글로, 짧고 명확하게 작성하세요.
    - 반드시 배열(JSON)로만 응답하세요.

    [최근 사용자 메시지]
    {last_user_message}

    [페이지 정보]
    {page_context}

    [폼 상태]
    {form_data}

    예시 응답:
    ["지원자 목록 보여줘", "경력 우대 조건 추가", "면접 일정 추천해줘", "폼 개선 제안"]
    """
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.5)
    try:
        response = llm.invoke(prompt)
        text = response.content.strip()
        # JSON 배열만 추출
        if "[" in text:
            start = text.find("[")
            end = text.find("]", start)
            arr = text[start:end+1]
            suggestions = json.loads(arr)
        else:
            suggestions = [text]
        return {"suggestions": suggestions}
    except Exception as e:
        return {"suggestions": ["지원자 목록 보여줘", "폼 개선 제안", "면접 일정 추천해줘", "채용공고 작성 방법"]}

@app.post("/agent/speech-recognition")
async def speech_recognition_api(request: Request):
    """인식 API"""
    data = await request.json()
    audio_file_path = data.get("audio_file_path", "") 
    if not audio_file_path:
        return {"error": "audio_file_path is required"}
    
    try:
        # 음성 인식 도구 실행
        state = {
            "audio_file_path": audio_file_path
        }
        
        result = speech_recognition_tool(state)
        
        return {
            "success": True,
            "speech_analysis": result.get("speech_analysis", {})
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/agent/realtime-interview-evaluation")
async def realtime_interview_evaluation_api(request: Request):
    """실시간 면접 평가 API"""
    data = await request.json()
    transcription = data.get("transcription", "")
    speakers = data.get("speakers", [])
    job_info = data.get("job_info", {})
    resume_info = data.get("resume_info", {})
    current_time = data.get("current_time", 0)
    
    if not transcription:
        return {"error": "transcription is required"}
    
    try:
        # 실시간 평가 도구 실행
        state = {
            "transcription": transcription,
            "speakers": speakers,
            "job_info": job_info,
            "resume_info": resume_info,
            "current_time": current_time
        }
        
        # 실시간 평가 도구를 동적으로 import
        from tools.realtime_interview_evaluation_tool import realtime_interview_evaluation_tool
        result = realtime_interview_evaluation_tool(state)
        
        return {
            "success": True,
            "realtime_evaluation": result.get("realtime_evaluation", {})
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/agent/ai-interview-evaluation")
async def ai_interview_evaluation_api(request: Request):
    """AI 면접 평가 API"""
    data = await request.json()
    session_id = data.get("session_id")
    job_info = data.get("job_info", "")
    audio_data = data.get("audio_data", {})
    behavior_data = data.get("behavior_data", {})
    game_data = data.get("game_data", {})
    
    if not session_id:
        return {"error": "session_id is required"}
    
    try:
        # AI 면접 워크플로우 실행
        from agents.ai_interview_workflow import run_ai_interview
        
        result = run_ai_interview(
            session_id=session_id,
            job_info=job_info,
            audio_data=audio_data,
            behavior_data=behavior_data,
            game_data=game_data
        )
        
        return {
            "success": True,
            "total_score": result.get("total_score", 0),
            "evaluation_metrics": result.get("evaluation_metrics", {}),
            "feedback": result.get("feedback", []),
            "session_id": session_id
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/evaluate-audio")
async def evaluate_audio(
    application_id: int = Form(...),
    question_id: int = Form(...),
    question_text: str = Form(...),
    audio_file: UploadFile = File(...)
):
    """
    오디오 파일을 받아 실시간으로 STT, 감정/태도, 답변 점수화 결과를 반환
    """
    # 1. 임시 파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(await audio_file.read())
        tmp_path = tmp.name

    try:
        # 2. 오디오→텍스트(STT)
        speech_tool = SpeechRecognitionTool()
        trans_result = speech_tool.transcribe_audio(tmp_path)
        trans_text = trans_result.get("text", "")

        # 3. 감정/태도 분석
        realtime_tool = RealtimeInterviewEvaluationTool()
        eval_result = realtime_tool._evaluate_realtime_content(trans_text, "applicant", 0)
        sentiment = eval_result.get("sentiment", "neutral")
        if sentiment == "positive":
            emotion = attitude = "긍정"
        elif sentiment == "negative":
            emotion = attitude = "부정"
        else:
            emotion = attitude = "보통"

        # 4. 답변 점수화
        grade = grade_written_test_answer(question_text, trans_text)
        answer_score = grade.get("score")
        answer_feedback = grade.get("feedback")

        return {
            "answer_text_transcribed": trans_text,
            "emotion": emotion,
            "attitude": attitude,
            "answer_score": answer_score,
            "answer_feedback": answer_feedback,
        }
    finally:
        # 임시 파일 삭제
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=False,  # 자동 리로드 비활성화
        log_level="info"
    )
