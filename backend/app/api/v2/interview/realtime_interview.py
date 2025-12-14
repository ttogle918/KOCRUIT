from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
import json
import asyncio
import logging
from datetime import datetime
import base64
import tempfile
import os

from app.core.database import get_db
from app.models.v2.interview.interview_evaluation import InterviewEvaluation
from app.models.v2.interview.interview_panel import InterviewPanelAssignment, InterviewPanelRequest, InterviewPanelMember
from app.schemas.interview_evaluation import InterviewEvaluationCreate

router = APIRouter()

# WebSocket 연결 관리
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.interview_sessions: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.interview_sessions[session_id] = {
            "start_time": datetime.now(),
            "transcripts": [],
            "evaluations": [],
            "speaker_notes": {}
        }
        logging.info(f"WebSocket 연결됨: {session_id}")
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.interview_sessions:
            del self.interview_sessions[session_id]
        logging.info(f"WebSocket 연결 해제: {session_id}")
    
    async def send_personal_message(self, message: str, session_id: str):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(message)
    
    async def broadcast(self, message: str, session_id: str):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/interview/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """실시간 면접 WebSocket 엔드포인트"""
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # 클라이언트로부터 메시지 수신 (타임아웃 설정)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                # 메시지 타입에 따른 처리
                message_type = message.get("type")
                
                if message_type == "audio_chunk":
                    await handle_audio_chunk(session_id, message)
                elif message_type == "speaker_note":
                    await handle_speaker_note(session_id, message)
                elif message_type == "evaluation_request":
                    await handle_evaluation_request(session_id, message)
                elif message_type == "session_end":
                    await handle_session_end(session_id, message)
                else:
                    await manager.send_personal_message(
                        json.dumps({"error": "Unknown message type"}),
                        session_id
                    )
                    
            except asyncio.TimeoutError:
                # 타임아웃 시 연결 유지를 위한 ping 메시지 전송
                await manager.send_personal_message(
                    json.dumps({"type": "ping", "timestamp": datetime.now().timestamp()}),
                    session_id
                )
                continue
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        logging.error(f"WebSocket 오류: {e}")
        manager.disconnect(session_id)

async def handle_audio_chunk(session_id: str, message: Dict[str, Any]):
    """오디오 청크 처리"""
    try:
        audio_data = message.get("audio_data")
        timestamp = message.get("timestamp", datetime.now().timestamp())
        
        if not audio_data:
            await manager.send_personal_message(
                json.dumps({"error": "No audio data provided"}),
                session_id
            )
            return
        
        # Base64 디코딩
        audio_bytes = base64.b64decode(audio_data)
        
        # 임시 파일에 저장
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_audio_path = temp_file.name
        
        # 음성 인식 및 화자 분리 처리
        result = await process_audio_chunk(temp_audio_path, timestamp)
        
        # 세션 데이터 업데이트
        if session_id in manager.interview_sessions:
            session_data = manager.interview_sessions[session_id]
            
            if result.get("transcription", {}).get("text"):
                session_data["transcripts"].append({
                    "timestamp": timestamp,
                    "speaker": result.get("diarization", {}).get("current_speaker", "unknown"),
                    "text": result["transcription"]["text"]
                })
            
            if result.get("evaluation", {}).get("score", 0) > 0:
                session_data["evaluations"].append(result["evaluation"])
        
        # 결과를 클라이언트에 전송
        await manager.send_personal_message(
            json.dumps({
                "type": "audio_processed",
                "result": result
            }),
            session_id
        )
        
        # 임시 파일 삭제
        os.unlink(temp_audio_path)
        
    except Exception as e:
        logging.error(f"오디오 청크 처리 오류: {e}")
        await manager.send_personal_message(
            json.dumps({"error": str(e)}),
            session_id
        )

async def process_audio_chunk(audio_path: str, timestamp: float) -> Dict[str, Any]:
    """오디오 청크 처리 (비동기)"""
    try:
        # AI 에이전트 서비스 호출 (HTTP API 사용)
        import httpx
        
        # 오디오 파일을 바이트로 읽기
        with open(audio_path, 'rb') as f:
            audio_chunk = f.read()
        
        # 간단한 오디오 분석 (실제로는 더 정교한 분석 필요)
        audio_features = {
            "volume": 0.5,  # 실제로는 오디오에서 추출
            "pitch": 200,   # 실제로는 오디오에서 추출
            "speech_rate": 150,  # WPM
            "clarity": 0.8
        }
        
        # 음성 인식 (실제로는 Whisper 사용)
        transcription_result = {"text": "안녕하세요, 자기소개를 해드리겠습니다.", "success": True}
        
        # AI 에이전트 서비스 호출
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://kocruit_agent:8001/agent/ai-interview-evaluation",
                    json={
                        "session_id": f"session_{timestamp}",
                        "job_info": "IT 개발자",
                        "audio_data": {
                            "transcript": transcription_result.get("text", ""),
                            "audio_features": audio_features
                        },
                        "behavior_data": {
                            "eye_contact": 7,
                            "facial_expression": 8,
                            "posture": 6,
                            "tone": 7,
                            "extraversion": 6,
                            "openness": 7,
                            "conscientiousness": 8,
                            "agreeableness": 7,
                            "neuroticism": 4
                        },
                        "game_data": {
                            "focus_score": 7,
                            "response_time_score": 8,
                            "memory_score": 6,
                            "situation_score": 7,
                            "problem_solving_score": 8
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                else:
                    logging.error(f"AI 에이전트 호출 실패: {response.status_code}")
                    result = {"error": f"AI 에이전트 호출 실패: {response.status_code}", "success": False}
                    
        except Exception as e:
            logging.error(f"AI 에이전트 호출 오류: {e}")
            result = {"error": f"AI 에이전트 호출 오류: {str(e)}", "success": False}
        
        # 결과 변환
        if result.get("success", True) and "error" not in result:
            return {
                "timestamp": timestamp,
                "transcription": transcription_result,
                "diarization": {"current_speaker": "지원자", "confidence": 0.9},
                "evaluation": {
                    "score": result.get("total_score", 0),
                    "feedback": ["AI 면접 평가 완료"],
                    "success": True,
                    "metrics": result.get("evaluation_metrics", {})
                },
                "success": True
            }
        else:
            return {
                "timestamp": timestamp,
                "transcription": transcription_result,
                "diarization": {"current_speaker": "unknown", "error": result.get("error", "Unknown error")},
                "evaluation": {"score": 0, "feedback": [f"오류: {result.get('error', 'Unknown error')}"], "success": False},
                "success": False,
                "error": result.get("error", "Unknown error")
            }
        
    except Exception as e:
        logging.error(f"오디오 처리 오류: {e}")
        # 오류 발생 시에도 시뮬레이션 대신 오류 정보 반환
        return {
            "timestamp": timestamp,
            "transcription": {"text": f"처리 오류: {str(e)}", "success": False},
            "diarization": {"current_speaker": "unknown", "error": str(e)},
            "evaluation": {"score": 0, "feedback": [f"오류: {str(e)}"], "success": False},
            "success": False,
            "error": str(e)
        }

async def handle_speaker_note(session_id: str, message: Dict[str, Any]):
    """화자별 메모 처리"""
    try:
        speaker = message.get("speaker")
        note = message.get("note")
        timestamp = message.get("timestamp", datetime.now().timestamp())
        
        if not speaker or not note:
            await manager.send_personal_message(
                json.dumps({"error": "Speaker and note are required"}),
                session_id
            )
            return
        
        # 세션 데이터에 메모 추가
        if session_id in manager.interview_sessions:
            session_data = manager.interview_sessions[session_id]
            if speaker not in session_data["speaker_notes"]:
                session_data["speaker_notes"][speaker] = []
            
            session_data["speaker_notes"][speaker].append({
                "timestamp": timestamp,
                "note": note
            })
        
        # 확인 메시지 전송
        await manager.send_personal_message(
            json.dumps({
                "type": "note_saved",
                "speaker": speaker,
                "note": note,
                "timestamp": timestamp
            }),
            session_id
        )
        
    except Exception as e:
        logging.error(f"메모 처리 오류: {e}")
        await manager.send_personal_message(
            json.dumps({"error": str(e)}),
            session_id
        )

async def handle_evaluation_request(session_id: str, message: Dict[str, Any]):
    """평가 요청 처리"""
    try:
        if session_id not in manager.interview_sessions:
            await manager.send_personal_message(
                json.dumps({"error": "Session not found"}),
                session_id
            )
            return
        
        session_data = manager.interview_sessions[session_id]
        
        # 세션 요약 생성
        summary = {
            "session_id": session_id,
            "duration": (datetime.now() - session_data["start_time"]).total_seconds(),
            "total_transcripts": len(session_data["transcripts"]),
            "total_evaluations": len(session_data["evaluations"]),
            "speaker_stats": {}
        }
        
        # 화자별 통계
        for speaker, notes in session_data["speaker_notes"].items():
            summary["speaker_stats"][speaker] = {
                "total_notes": len(notes),
                "last_note": notes[-1]["note"] if notes else ""
            }
        
        # 평균 점수 계산
        if session_data["evaluations"]:
            total_score = sum(eval.get("score", 0) for eval in session_data["evaluations"])
            summary["average_score"] = total_score / len(session_data["evaluations"])
        else:
            summary["average_score"] = 0
        
        await manager.send_personal_message(
            json.dumps({
                "type": "evaluation_summary",
                "summary": summary
            }),
            session_id
        )
        
    except Exception as e:
        logging.error(f"평가 요청 처리 오류: {e}")
        await manager.send_personal_message(
            json.dumps({"error": str(e)}),
            session_id
        )

async def handle_session_end(session_id: str, message: Dict[str, Any]):
    """세션 종료 처리"""
    try:
        if session_id not in manager.interview_sessions:
            await manager.send_personal_message(
                json.dumps({"error": "Session not found"}),
                session_id
            )
            return
        
        session_data = manager.interview_sessions[session_id]
        
        # 최종 결과 생성
        final_result = {
            "session_id": session_id,
            "start_time": session_data["start_time"].isoformat(),
            "end_time": datetime.now().isoformat(),
            "duration": (datetime.now() - session_data["start_time"]).total_seconds(),
            "transcripts": session_data["transcripts"],
            "evaluations": session_data["evaluations"],
            "speaker_notes": session_data["speaker_notes"]
        }
        
        # 데이터베이스에 저장 (실제 구현에서는)
        # await save_interview_session(final_result)
        
        await manager.send_personal_message(
            json.dumps({
                "type": "session_ended",
                "final_result": final_result
            }),
            session_id
        )
        
        # 연결 종료
        manager.disconnect(session_id)
        
    except Exception as e:
        logging.error(f"세션 종료 처리 오류: {e}")
        await manager.send_personal_message(
            json.dumps({"error": str(e)}),
            session_id
        )

@router.get("/interview/session/{session_id}/status")
async def get_session_status(session_id: str):
    """세션 상태 조회"""
    if session_id not in manager.interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_data = manager.interview_sessions[session_id]
    
    return {
        "session_id": session_id,
        "is_active": session_id in manager.active_connections,
        "start_time": session_data["start_time"].isoformat(),
        "duration": (datetime.now() - session_data["start_time"]).total_seconds(),
        "total_transcripts": len(session_data["transcripts"]),
        "total_evaluations": len(session_data["evaluations"]),
        "speakers": list(session_data["speaker_notes"].keys())
    } 