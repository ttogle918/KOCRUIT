from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import json
import requests
import os
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime

from app.core.database import get_db
from app.models.question_video_analysis import QuestionMediaAnalysis
from app.models.media_analysis import MediaAnalysis
from app.models.application import Application
from app.services.whisper_analysis_service import whisper_analysis_service

router = APIRouter()

# 컨테이너 API 엔드포인트
VIDEO_ANALYSIS_URL = "http://video-analysis:8002"
AGENT_URL = "http://agent:8001"

@router.post("/process/{application_id}")
async def process_whisper_analysis(
    application_id: int,
    db: Session = Depends(get_db)
):
    """지원자의 비디오를 분석하여 Whisper 결과를 DB에 저장 (백그라운드 처리)"""
    
    try:
        # 1. 지원자 정보 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        
        if not application.ai_interview_video_url:
            raise HTTPException(status_code=404, detail="AI 면접 비디오가 없습니다")
        
        # 2. 백그라운드에서 분석 시작
        result = whisper_analysis_service.start_background_analysis(application_id)
        
        return {
            "success": True,
            "message": "Whisper 분석이 백그라운드에서 시작되었습니다. 상태를 확인하려면 /status/{application_id} 엔드포인트를 사용하세요.",
            "application_id": application_id,
            "status": "processing"
        }
        
    except Exception as e:
        print(f"❌ Whisper 분석 시작 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 시작 중 오류가 발생했습니다: {str(e)}")

async def analyze_speakers_and_context(audio_path: str, whisper_result: Dict[str, Any]) -> Dict[str, Any]:
    """화자 분리 및 문맥 분석"""
    try:
        # agent 컨테이너에서 화자 분리 및 문맥 분석 실행
        cmd = [
#            "docker", "exec", "kocruit_agent",
            "python", "-c",
            f"""
import sys
sys.path.append('/app')
from tools.speech_recognition_tool import SpeechRecognitionTool
import json

speech_tool = SpeechRecognitionTool()

# 화자 분리
speaker_result = speech_tool.detect_speakers('{audio_path}')

# 문맥 분석 (면접관 질문과 지원자 답변 구분)
context_analysis = analyze_interview_context(
    '{whisper_result["text"]}', 
    speaker_result.get('speakers', []),
    speaker_result.get('speaker_mapping', {{}})
)

result = {{
    "speaker_detection": speaker_result,
    "context_analysis": context_analysis
}}

print(json.dumps(result, ensure_ascii=False))
            """
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return json.loads(result.stdout.strip())
        else:
            print(f"❌ 화자 분리 및 문맥 분석 실패: {result.stderr}")
            return {
                "speaker_detection": {"speakers": [], "success": False},
                "context_analysis": {"qa_pairs": [], "evaluation": {}}
            }
            
    except Exception as e:
        print(f"❌ 화자 분리 및 문맥 분석 오류: {str(e)}")
        return {
            "speaker_detection": {"speakers": [], "success": False},
            "context_analysis": {"qa_pairs": [], "evaluation": {}}
        }

async def run_openai_answer_analysis(question: str, answer: str) -> Dict[str, Any]:
    """OpenAI 답변 분석 (API 호출 방식)"""
    try:
        # agent 컨테이너의 API 호출
        response = requests.post(
            f"{AGENT_URL}/openai-answer-analysis",
            json={
                "question": question,
                "answer": answer
            },
            timeout=300
        )
        
        if response.status_code != 200:
            print(f"❌ OpenAI 답변 분석 실패: {response.text}")
            return {}
            
        result = response.json()
        if result.get("success"):
            print("✅ OpenAI 답변 분석 성공")
            return result["analysis"]
        else:
            print(f"❌ OpenAI 답변 분석 실패: {result.get('error')}")
            return {}
            
    except Exception as e:
        print(f"❌ OpenAI 답변 분석 오류: {str(e)}")
        return {}

async def run_openai_context_analysis(transcription: str, speakers: List[Dict]) -> Dict[str, Any]:
    """OpenAI 문맥 분석 (API 호출 방식)"""
    try:
        # agent 컨테이너의 API 호출
        response = requests.post(
            f"{AGENT_URL}/openai-context-analysis",
            json={
                "transcription": transcription,
                "speakers": speakers
            },
            timeout=300
        )
        
        if response.status_code != 200:
            print(f"❌ OpenAI 문맥 분석 실패: {response.text}")
            return {}
            
        result = response.json()
        if result.get("success"):
            print("✅ OpenAI 문맥 분석 성공")
            return result["analysis"]
        else:
            print(f"❌ OpenAI 문맥 분석 실패: {result.get('error')}")
            return {}
            
    except Exception as e:
        print(f"❌ OpenAI 문맥 분석 오류: {str(e)}")
        return {}

async def run_emotion_analysis(transcription: str) -> Dict[str, Any]:
    """감정 분석 (API 호출 방식)"""
    try:
        # agent 컨테이너의 API 호출
        response = requests.post(
            f"{AGENT_URL}/emotion-analysis",
            json={
                "transcription": transcription
            },
            timeout=300
        )
        
        if response.status_code != 200:
            print(f"❌ 감정 분석 실패: {response.text}")
            return {}
            
        result = response.json()
        if result.get("success"):
            print("✅ 감정 분석 성공")
            return result["analysis"]
        else:
            print(f"❌ 감정 분석 실패: {result.get('error')}")
            return {}
            
    except Exception as e:
        print(f"❌ 감정 분석 오류: {str(e)}")
        return {}

async def analyze_interview_context(transcription: str, speakers: List[Dict], speaker_mapping: Dict = None) -> Dict[str, Any]:
    """면접 문맥 분석 (OpenAI GPT-4o 기반 정교한 분석)"""
    try:
        # pyannote.audio 화자 매핑이 있으면 활용
        if speaker_mapping:
            print(f"🎯 pyannote.audio 화자 매핑 사용: {speaker_mapping}")
        
        # OpenAI GPT-4o를 사용한 정교한 문맥 분석
        openai_analysis = await run_openai_context_analysis(transcription, speakers)
        
        # 간단한 질문-답변 구분 (fallback)
        lines = transcription.split('.')
        qa_pairs = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            # 질문 패턴 감지
            if any(keyword in line for keyword in ['?', '무엇', '어떻게', '왜', '언제', '어디서']):
                # 다음 라인이 답변일 가능성
                if i + 1 < len(lines):
                    answer = lines[i + 1].strip()
                    if answer:
                        # OpenAI로 답변 품질 분석
                        answer_analysis = await run_openai_answer_analysis(line, answer)
                        
                        qa_pairs.append({
                            "question": line,
                            "answer": answer,
                            "question_type": "면접관",
                            "answer_quality": answer_analysis.get("score", 50),
                            "answer_analysis": answer_analysis,
                            "speaker_analysis": "pyannote.audio" if speaker_mapping else "simple"
                        })
        
        # 화자별 통계 (pyannote.audio 결과 활용)
        speaker_stats = {}
        if speakers:
            for speaker in speakers:
                speaker_id = speaker.get("speaker", "unknown")
                speaker_name = speaker_mapping.get(speaker_id, speaker_id) if speaker_mapping else speaker_id
                
                if speaker_name not in speaker_stats:
                    speaker_stats[speaker_name] = {
                        "total_time": 0,
                        "segments": 0,
                        "role": "면접관" if "면접관" in speaker_name else "지원자"
                    }
                
                speaker_stats[speaker_name]["total_time"] += speaker.get("duration", 0)
                speaker_stats[speaker_name]["segments"] += 1
        
        return {
            "qa_pairs": qa_pairs,
            "total_questions": len(qa_pairs),
            "average_answer_quality": sum(qa["answer_quality"] for qa in qa_pairs) / len(qa_pairs) if qa_pairs else 0,
            "speaker_statistics": speaker_stats,
            "openai_analysis": openai_analysis,
            "evaluation": openai_analysis.get("evaluation", {
                "communication_skills": openai_analysis.get("communication_skills", 50),
                "technical_knowledge": openai_analysis.get("technical_knowledge", 50),
                "problem_solving": openai_analysis.get("problem_solving", 50)
            })
        }
        
    except Exception as e:
        print(f"❌ 문맥 분석 오류: {str(e)}")
        return {"qa_pairs": [], "evaluation": {}}

# 기존 간단한 평가 함수들은 OpenAI 기반 분석으로 대체됨

def extract_file_id_from_url(url: str) -> str:
    """Google Drive URL에서 파일 ID 추출"""
    import re
    
    # Google Drive URL 패턴들
    patterns = [
        r'/file/d/([a-zA-Z0-9_-]+)',
        r'/d/([a-zA-Z0-9_-]+)',
        r'id=([a-zA-Z0-9_-]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def download_video_from_drive(drive_url: str, application_id: int) -> str:
    """Google Drive에서 비디오 다운로드 (API 호출 방식)"""
    try:
        # video-analysis 컨테이너의 API 호출
        response = requests.post(
            f"{VIDEO_ANALYSIS_URL}/download-video",
            json={
                "video_url": drive_url,
                "application_id": application_id
            },
            timeout=300
        )
        
        if response.status_code != 200:
            print(f"❌ 비디오 다운로드 실패: {response.text}")
            return None
            
        result = response.json()
        if result.get("success"):
            print(f"✅ 비디오 다운로드 성공: {result['video_path']}")
            return result["video_path"]
        else:
            print("❌ 비디오 다운로드 실패")
            return None
            
    except Exception as e:
        print(f"❌ 비디오 다운로드 오류: {str(e)}")
        return None

def extract_audio_from_video(video_path: str, max_duration_seconds: int = 120) -> str:
    """비디오에서 오디오 추출 (API 호출 방식)"""
    try:
        # video-analysis 컨테이너의 API 호출
        response = requests.post(
            f"{VIDEO_ANALYSIS_URL}/extract-audio",
            json={
                "video_path": video_path,
                "max_duration_seconds": max_duration_seconds
            },
            timeout=300
        )
        
        if response.status_code != 200:
            print(f"❌ 오디오 추출 실패: {response.text}")
            return None
            
        result = response.json()
        if result.get("success"):
            print(f"✅ 오디오 추출 성공: {result['audio_path']}")
            return result["audio_path"]
        else:
            print("❌ 오디오 추출 실패")
            return None
            
    except Exception as e:
        print(f"❌ 오디오 추출 오류: {str(e)}")
        return None


@router.post("/process-qa-local")
async def process_qa_local(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """로컬(공유 볼륨) 경로의 오디오/비디오를 직접 받아 QA 분석 실행 후 DB 저장

    payload:
      - application_id: int
      - audio_path: str (선호)
      - video_path: str (audio_path가 없을 때만 사용)
      - persist: bool = True
      - output_dir: str = "/data/qa_slices"
      - max_workers: int = 2
      - max_duration_seconds: int | None (video_path 사용 시 오디오 추출 상한)
      - delete_video_after: bool = False (video_path 사용 시, 분석 완료 후 비디오 삭제)
    """
    try:
        application_id = int(payload.get("application_id")) if payload.get("application_id") is not None else None
        audio_path = payload.get("audio_path")
        video_path = payload.get("video_path")
        persist = bool(payload.get("persist", True))
        output_dir = payload.get("output_dir", "/data/qa_slices")
        max_workers = int(payload.get("max_workers", 2))
        delete_after_input = bool(payload.get("delete_after_input", False))
        run_emotion_context = bool(payload.get("run_emotion_context", False))
        max_duration_seconds = payload.get("max_duration_seconds")
        delete_video_after = bool(payload.get("delete_video_after", False))

        if not application_id:
            raise HTTPException(status_code=400, detail="application_id is required")

        # 오디오 경로가 없고 비디오 경로만 있으면 video-analysis로 오디오 추출
        if not audio_path and video_path:
            try:
                resp = requests.post(
                    f"{VIDEO_ANALYSIS_URL}/extract-audio",
                    json={
                        "video_path": video_path,
                        "max_duration_seconds": max_duration_seconds
                    },
                    timeout=600
                )
                if resp.status_code != 200 or not resp.json().get("success"):
                    raise HTTPException(status_code=502, detail=f"오디오 추출 실패: {resp.text}")
                audio_path = resp.json().get("audio_path")
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"오디오 추출 오류: {str(e)}")

        if not audio_path:
            raise HTTPException(status_code=400, detail="audio_path or video_path is required")

        # 에이전트 QA 분석 호출 (로컬 경로 직접 사용)
        try:
            response = requests.post(
                f"{AGENT_URL}/diarized-qa-analysis",
                json={
                    "audio_path": audio_path,
                    "application_id": application_id,
                    "persist": persist,
                    "output_dir": output_dir,
                    "max_workers": max_workers,
                    "delete_after_input": delete_after_input
                },
                timeout=1800
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent 호출 실패: {str(e)}")

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Agent 오류: {response.text}")

        result = response.json()
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=f"QA 분석 실패: {result.get('error', 'unknown')}")

        # 추가: 감정/문맥 분석 실행 (옵션)
        emotion_ctx_result: Dict[str, Any] = {}
        if run_emotion_context:
            try:
                qa_items = result.get("qa", [])
                parts = []
                for item in qa_items:
                    a = item.get("analysis", {})
                    t = a.get("transcription") or a.get("text") or ""
                    if t:
                        parts.append(str(t).strip())
                combined_transcription = " \n".join(parts)

                if combined_transcription:
                    # 감정 분석
                    emo = await run_emotion_analysis(combined_transcription)
                    # 문맥 분석(OpenAI)
                    ctx = await run_openai_context_analysis(combined_transcription, [])
                    emotion_ctx_result = {
                        "combined_transcription_length": len(combined_transcription),
                        "emotion_analysis": emo or {},
                        "context_analysis": ctx or {}
                    }
            except Exception as e:
                print(f"❌ 추가 감정/문맥 분석 오류: {str(e)}")
                emotion_ctx_result = {"error": str(e)}

        # DB 저장/업데이트(question_log_id=999)
        try:
            existing = db.query(QuestionMediaAnalysis).filter(
                QuestionMediaAnalysis.application_id == application_id,
                QuestionMediaAnalysis.question_log_id == 999
            ).first()
            if existing:
                existing.analysis_timestamp = datetime.now()
                existing.status = "completed"
                existing.transcription = None
                existing.question_score = None
                existing.question_feedback = None
                existing.detailed_analysis = {
                    "qa_analysis": result,
                    "source": "process-qa-local",
                    "audio_path": audio_path,
                    "extra_emotion_context": emotion_ctx_result
                }
            else:
                new_row = QuestionMediaAnalysis(
                    application_id=application_id,
                    question_log_id=999,
                    question_text="Diarized QA Analysis (local)",
                    analysis_timestamp=datetime.now(),
                    status="completed",
                    detailed_analysis={
                        "qa_analysis": result,
                        "source": "process-qa-local",
                        "audio_path": audio_path,
                        "extra_emotion_context": emotion_ctx_result
                    }
                )
                db.add(new_row)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"❌ QA 분석 DB 저장 오류(process-qa-local): {str(e)}")

        # 입력 파일 삭제 처리
        try:
            if delete_video_after and video_path and os.path.exists(video_path):
                os.remove(video_path)
        except Exception as e:
            print(f"입력 비디오 삭제 오류: {str(e)}")

        return {
            "success": True,
            "application_id": application_id,
            "total_pairs": result.get("total_pairs", 0),
            "applicant_speaker_id": result.get("applicant_speaker_id"),
            "qa": result.get("qa", []),
            "audio_path": audio_path,
            "extra_emotion_context": emotion_ctx_result
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ process-qa-local 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-qa/{application_id}")
async def process_qa_based_analysis(
    application_id: int,
    persist: bool = False,
    output_dir: str = None,
    db: Session = Depends(get_db)
):
    """화자분리 기반으로 면접관→지원자 페어를 만들고, 지원자 답변만 Whisper 분석하여 리스트로 반환"""
    try:
        # 1) 지원자/영상 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        if not application.ai_interview_video_url:
            raise HTTPException(status_code=404, detail="AI 면접 비디오가 없습니다")

        # 2) 비디오 다운로드
        video_path = download_video_from_drive(application.ai_interview_video_url, application_id)
        if not video_path:
            raise HTTPException(status_code=500, detail="비디오 다운로드 실패")

        # 3) 오디오 추출 (QA 분석은 전체 구간 필요성이 높아 여유롭게 상한 설정)
        audio_path = extract_audio_from_video(video_path, max_duration_seconds=3600)
        if not audio_path:
            raise HTTPException(status_code=500, detail="오디오 추출 실패")

        # 4) Agent에 QA 분석 요청
        try:
            response = requests.post(
                f"{AGENT_URL}/diarized-qa-analysis",
                json={
                    "audio_path": audio_path,
                    "application_id": application_id,
                    "persist": persist,
                    "output_dir": output_dir
                },
                timeout=1200
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Agent 호출 실패: {str(e)}")

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Agent 오류: {response.text}")

        result = response.json()
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=f"QA 분석 실패: {result.get('error', 'unknown')}")

        # 5) 결과를 DB에 저장/업데이트 (전체 분석 레코드: question_log_id=999)
        try:
            existing = db.query(QuestionMediaAnalysis).filter(
                QuestionMediaAnalysis.application_id == application_id,
                QuestionMediaAnalysis.question_log_id == 999
            ).first()
            if existing:
                existing.analysis_timestamp = datetime.now()
                existing.status = "completed"
                existing.transcription = None
                existing.question_score = None
                existing.question_feedback = None
                existing.detailed_analysis = {
                    "qa_analysis": result
                }
            else:
                new_row = QuestionMediaAnalysis(
                    application_id=application_id,
                    question_log_id=999,
                    question_text="Diarized QA Analysis",
                    analysis_timestamp=datetime.now(),
                    status="completed",
                    detailed_analysis={
                        "qa_analysis": result
                    }
                )
                db.add(new_row)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"❌ QA 분석 DB 저장 오류: {str(e)}")

        # 6) 결과 반환 (프론트는 dropdown으로 qa 배열을 표시)
        return {
            "success": True,
            "application_id": application_id,
            "total_pairs": result.get("total_pairs", 0),
            "applicant_speaker_id": result.get("applicant_speaker_id"),
            "qa": result.get("qa", [])
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ QA 기반 분석 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def run_whisper_analysis(audio_path: str, application_id: int) -> Dict[str, Any]:
    """Whisper 분석 실행 (API 호출 방식)"""
    try:
        print(f"🎤 Agent 컨테이너에 Whisper 분석 요청: {audio_path}")
        
        # agent 컨테이너의 API 호출
        response = requests.post(
            f"{AGENT_URL}/whisper-analysis",
            json={
                "audio_path": audio_path,
                "application_id": application_id
            },
            timeout=300
        )
        
        print(f"📡 Agent 응답 상태: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Whisper 분석 실패: {response.text}")
            return None
            
        result = response.json()
        print(f"📋 Agent 응답: {result}")
        
        if result.get("success"):
            whisper_analysis = result.get("whisper_analysis", {})
            print(f"✅ Whisper 분석 성공: {whisper_analysis.get('text', '')[:100]}...")
            return whisper_analysis
        else:
            error_msg = result.get('error', 'Unknown error')
            print(f"❌ Whisper 분석 실패: {error_msg}")
            return None
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Agent 컨테이너 연결 실패: {str(e)}")
        return None
    except requests.exceptions.Timeout as e:
        print(f"❌ Agent 컨테이너 요청 타임아웃: {str(e)}")
        return None
    except Exception as e:
        print(f"❌ Whisper 분석 오류: {str(e)}")
        return None

def calculate_average_score(whisper_result: Dict[str, Any], speaker_analysis: Dict[str, Any] = None) -> float:
    """Whisper 결과에서 평균 점수 계산 (문맥 분석 포함)"""
    try:
        text = whisper_result.get("text", "")
        base_score = 50.0
        
        # 1. 텍스트 길이 기반 기본 점수
        if len(text) > 500:
            base_score += 20
        elif len(text) > 300:
            base_score += 15
        elif len(text) > 100:
            base_score += 10
        
        # 2. 문맥 분석 점수 (화자 분리 결과가 있는 경우)
        if speaker_analysis and speaker_analysis.get("context_analysis"):
            context = speaker_analysis["context_analysis"]
            
            # 답변 품질 점수
            if context.get("average_answer_quality"):
                base_score += context["average_answer_quality"] * 0.3
            
            # 평가 점수들
            evaluation = context.get("evaluation", {})
            if evaluation.get("communication_skills"):
                base_score += evaluation["communication_skills"] * 0.2
            if evaluation.get("technical_knowledge"):
                base_score += evaluation["technical_knowledge"] * 0.3
            if evaluation.get("problem_solving"):
                base_score += evaluation["problem_solving"] * 0.2
        
        return min(base_score, 100.0)
            
    except Exception as e:
        print(f"❌ 점수 계산 오류: {str(e)}")
        return 50.0

@router.get("/status/{application_id}")
async def get_whisper_analysis_status(
    application_id: int,
    db: Session = Depends(get_db)
):
    """지원자의 Whisper 분석 상태 확인 (상세 정보 포함)"""
    
    analysis = db.query(QuestionMediaAnalysis).filter(
        QuestionMediaAnalysis.application_id == application_id,
        QuestionMediaAnalysis.question_log_id == 999  # 전체 영상 분석용 임시 ID
    ).first()
    
    if analysis:
        # 분석 데이터 파싱
        analysis_data = analysis.detailed_analysis or {}
        
        return {
            "has_analysis": True,
            "created_at": analysis.analysis_timestamp.isoformat() if analysis.analysis_timestamp else None,
            "transcription_length": len(analysis.transcription) if analysis.transcription else 0,
            "score": analysis.question_score,
            "transcription": analysis.transcription,
            "speaker_analysis": analysis_data.get("speaker_analysis", {}),
            "emotion_analysis": analysis_data.get("emotion_analysis", {}),
            "context_analysis": analysis_data.get("speaker_analysis", {}).get("context_analysis", {}),
            "analysis_method": analysis_data.get("speaker_method", "unknown")
        }
    else:
        # 폴백: VideoAnalysis 테이블에서도 확인 (백그라운드 Whisper 저장 경로)
        video = db.query(MediaAnalysis).filter(
            MediaAnalysis.application_id == application_id
        ).first()
        if video:
            # audio_analysis, detailed_analysis가 문자열일 수 있으므로 안전 파싱
            def _safe_load(obj):
                try:
                    if isinstance(obj, str):
                        return json.loads(obj)
                    return obj or {}
                except Exception:
                    return {}

            audio_analysis = _safe_load(video.audio_analysis)
            detailed = _safe_load(getattr(video, 'detailed_analysis', {}))
            transcription = getattr(video, 'transcription', None) or audio_analysis.get('transcription')
            return {
                "has_analysis": True,
                "created_at": video.analysis_timestamp.isoformat() if getattr(video, 'analysis_timestamp', None) else None,
                "transcription_length": len(transcription) if transcription else 0,
                "score": getattr(video, 'overall_score', None),
                "transcription": transcription,
                "speaker_analysis": detailed.get("speaker_analysis", {}),
                "emotion_analysis": detailed.get("emotion_analysis", {}),
                "context_analysis": detailed.get("speaker_analysis", {}).get("context_analysis", {}),
                "analysis_method": "video_analysis"
            }
        return {
            "has_analysis": False
        }
