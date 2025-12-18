from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.api.v2.auth.auth import get_current_user
from app.models.v2.auth.user import User
from app.models.v2.document.application import Application, StageName, OverallStatus, StageStatus, ApplicationStage
from app.models.v2.interview.media_analysis import MediaAnalysis
import json
import asyncio
from datetime import datetime

router = APIRouter()

# WebSocket 연결 관리자
class ConnectionManager:
    def __init__(self):
        # application_id: [WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, application_id: int):
        await websocket.accept()
        if application_id not in self.active_connections:
            self.active_connections[application_id] = []
        self.active_connections[application_id].append(websocket)

    def disconnect(self, websocket: WebSocket, application_id: int):
        if application_id in self.active_connections:
            if websocket in self.active_connections[application_id]:
                self.active_connections[application_id].remove(websocket)
            if not self.active_connections[application_id]:
                del self.active_connections[application_id]

    async def broadcast_to_application(self, message: dict, application_id: int):
        if application_id in self.active_connections:
            for connection in self.active_connections[application_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending message to {application_id}: {e}")

manager = ConnectionManager()

@router.get("/interview/practical/candidates", response_model=List[Dict[str, Any]])
def get_practical_interview_candidates(
    job_post_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    실무진 면접(PRACTICAL_INTERVIEW) 단계에 있는 지원자 목록 조회
    """
    try:
        # 기본 쿼리: 현재 단계가 '실무진 면접'이고, 전체 상태가 탈락이 아닌 지원자
        query = db.query(Application).filter(
            Application.current_stage == StageName.PRACTICAL_INTERVIEW,
            Application.overall_status == OverallStatus.PASSED  # 혹은 IN_PROGRESS
        )

        # 특정 공고에 대해서만 조회할 경우
        if job_post_id:
            query = query.filter(Application.job_post_id == job_post_id)

        # ApplicationStage 테이블과 조인하여 현재 단계의 구체적인 상태(대기중/예정됨 등) 확인
        # 실무진 면접 단계의 상세 상태를 가져오기 위해 조인
        query = query.join(ApplicationStage, (Application.id == ApplicationStage.application_id) & (ApplicationStage.stage_name == StageName.PRACTICAL_INTERVIEW))
        
        # 필요한 필드만 선택적으로 가져오기 (성능 최적화)
        # 실제 면접관 UI에 필요한 정보: 이름, 지원일, 현재 상태, 이력서 ID
        applications = query.all()

        result = []
        for app in applications:
            # 현재 단계(실무진 면접)의 상태 정보 찾기
            current_stage_status = "UNKNOWN"
            for stage in app.stages:
                if stage.stage_name == StageName.PRACTICAL_INTERVIEW:
                    current_stage_status = stage.status.value
                    break
            
            result.append({
                "application_id": app.id,
                "applicant_name": app.name,
                "applicant_email": app.email,
                "resume_id": app.resume_id,
                "job_post_id": app.job_post_id,
                "job_title": app.job_post.title if app.job_post else "Unknown Job",
                "applied_at": app.applied_at.isoformat() if app.applied_at else None,
                "stage_status": current_stage_status, # PENDING, SCHEDULED, IN_PROGRESS, COMPLETED
                "overall_status": app.overall_status.value
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"실무진 면접 대상자 조회 실패: {str(e)}")


@router.websocket("/ws/interview/{application_id}")
async def websocket_interview_endpoint(websocket: WebSocket, application_id: int, db: Session = Depends(get_db)):
    """
    실시간 면접 STT 및 AI 분석을 위한 WebSocket 엔드포인트
    - 오디오 스트림 수신 (Binary)
    - STT 결과 및 AI 분석 결과 송신 (Text/JSON)
    """
    await manager.connect(websocket, application_id)
    
    # 세션 상태 (Mock용)
    transcript_buffer = []
    
    try:
        while True:
            # 메시지 수신 (텍스트 또는 바이너리)
            message = await websocket.receive()
            
            if "text" in message:
                # 제어 메시지 처리 (예: {"type": "start_analysis"})
                data = json.loads(message["text"])
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif data.get("type") == "save_analysis":
                    # AI 분석 결과 DB 저장 (Mock)
                    # 실제로는 STT 결과 텍스트를 AI 모델에 보내서 분석 결과를 받아와야 함
                    
                    # MediaAnalysis 저장
                    try:
                         # 기존 분석 확인
                        existing_analysis = db.query(MediaAnalysis).filter(
                            MediaAnalysis.application_id == application_id
                        ).order_by(MediaAnalysis.analysis_timestamp.desc()).first()

                        if not existing_analysis:
                             analysis = MediaAnalysis(
                                application_id=application_id,
                                status="completed",
                                transcription=" ".join(transcript_buffer),
                                overall_score=85.5, # Mock Score
                                detailed_analysis={
                                    "communication": "Excellent",
                                    "technical_understanding": "Good"
                                }
                            )
                             db.add(analysis)
                             db.commit()
                             
                        # 클라이언트에 알림
                        await websocket.send_json({
                            "type": "analysis_saved",
                            "message": "AI 분석 결과가 저장되었습니다."
                        })
                    except Exception as db_e:
                        print(f"DB Error: {db_e}")

            elif "bytes" in message:
                # 오디오 데이터 수신 (Binary)
                audio_chunk = message["bytes"]
                
                # TODO: 실제 STT 엔진(Google Speech-to-Text, Whisper 등) 연동
                # 여기서는 Mock으로 3초마다 랜덤 텍스트 반환하거나 에코 처리
                
                # Mock STT (실제로는 비동기 STT 서비스 호출)
                # 오디오 청크를 받으면 처리 중임을 알리거나
                # 일정 크기가 모이면 STT 요청
                
                # 시뮬레이션: 10% 확률로 STT 결과 전송 (너무 자주는 아니고)
                import random
                if random.random() < 0.1:
                    mock_texts = [
                        "네, 그 부분에 대해서는 제가 프로젝트 경험이 있습니다.",
                        "Spring Boot를 사용하여 마이크로서비스 아키텍처를 구현했습니다.",
                        "팀원 간의 갈등은 대화를 통해 해결하려고 노력했습니다.",
                        "데이터베이스 최적화를 위해 인덱싱을 적용했습니다.",
                        "Restful API 설계 원칙을 준수했습니다."
                    ]
                    stt_text = random.choice(mock_texts)
                    transcript_buffer.append(stt_text)
                    
                    # STT 결과 전송
                    await websocket.send_json({
                        "type": "stt_result",
                        "text": stt_text,
                        "speaker": "applicant", # 화자 분리 (Mock)
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    # AI 실시간 피드백 전송 (키워드 매칭 등)
                    if "갈등" in stt_text:
                        await websocket.send_json({
                            "type": "ai_feedback",
                            "category": "communication",
                            "message": "갈등 해결 경험 언급 감지됨. 구체적인 해결 방안에 대해 추가 질문 추천.",
                            "timestamp": datetime.now().isoformat()
                        })
                    if "Spring Boot" in stt_text:
                         await websocket.send_json({
                            "type": "ai_feedback",
                            "category": "technical",
                            "message": "핵심 기술 스택(Spring Boot) 언급 확인.",
                            "timestamp": datetime.now().isoformat()
                        })

    except WebSocketDisconnect:
        manager.disconnect(websocket, application_id)
    except Exception as e:
        print(f"WebSocket Error: {e}")
        manager.disconnect(websocket, application_id)
