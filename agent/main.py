from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
from datetime import datetime

from .agents.graph_agent import build_graph
from .agents.chatbot_graph import create_chatbot_graph, initialize_chat_state, create_session_id
from .agents.chatbot_node import ChatbotNode
from .redis_monitor import RedisMonitor
from .scheduler import RedisScheduler
from .api.v2.analysis import router as analysis_router  # 분석 관련 API 라우터 추가
from tools.weight_extraction_tool import weight_extraction_tool
from tools.form_fill_tool import form_fill_tool, form_improve_tool
from tools.form_edit_tool import form_edit_tool, form_status_check_tool
from tools.form_improve_tool import form_improve_tool
from .agents.application_evaluation_agent import evaluate_application
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

# 화자 분리 및 비디오 자르기 관련
import base64
import tempfile
import subprocess
import whisper
import librosa
import numpy as np
from typing import List, Dict, Any, Optional
import soundfile as sf
from pyannote.audio import Pipeline
from pyannote.audio.pipelines.utils.hook import ProgressHook

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

class SpeakerAnalysisRequest(BaseModel):
    audio_data: str  # base64 encoded audio
    video_data: str  # base64 encoded video
    audio_filename: str
    video_filename: str

class WhisperAnalysisRequest(BaseModel):
    audio_path: str
    application_id: Optional[int] = None

class QAAnalysisRequest(BaseModel):
    audio_path: str
    application_id: Optional[int] = None
    persist: Optional[bool] = False
    output_dir: Optional[str] = None
    max_workers: Optional[int] = 2
    delete_after_input: Optional[bool] = False
    run_emotion_context: Optional[bool] = False

# API 라우터 등록
app.include_router(analysis_router, prefix="/api/v2/agent", tags=["Analysis"])

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
            "speaker_analysis_and_trim": "/speaker-analysis-and-trim",
            "docs": "/docs"
        }
    }

# 화자 분리 및 비디오 자르기 클래스
class SpeakerAnalysisService:
    def __init__(self):
        self.whisper_model = None
        self.speaker_pipeline = None
        self._initialize_models()
    
    def _initialize_models(self):
        """AI 모델들 초기화"""
        try:
            print("화자 분리 서비스 모델 초기화 시작...")
            
            # Whisper 모델 로드 (더 빠른 모델 사용)
            self.whisper_model = whisper.load_model("tiny")  # base → tiny로 변경
            print("Whisper 모델 로드 완료 (tiny 모델)")
            
            # 화자 분리 파이프라인 초기화 (HuggingFace 토큰 지원)
            try:
                auth_token = os.environ.get("HUGGINGFACE_TOKEN") or os.environ.get("HF_TOKEN")
                if auth_token:
                    self.speaker_pipeline = Pipeline.from_pretrained(
                        "pyannote/speaker-diarization-3.1",
                        use_auth_token=auth_token
                    )
                else:
                    self.speaker_pipeline = Pipeline.from_pretrained(
                        "pyannote/speaker-diarization-3.1"
                    )
                print("화자 분리 파이프라인 초기화 완료")
            except Exception as e:
                print(f"화자 분리 파이프라인 초기화 실패: {str(e)}")
                self.speaker_pipeline = None
            
        except Exception as e:
            print(f"모델 초기화 오류: {str(e)}")
            raise
    
    def extract_applicant_audio(self, audio_path: str) -> List[Dict[str, float]]:
        """화자 분리를 통해 면접자 음성 세그먼트를 추출합니다."""
        try:
            if not self.speaker_pipeline:
                print("화자 분리 파이프라인이 없어 기본 분석을 사용합니다")
                return []
            
            print("화자 분리 시작...")
            
            # 화자 분리 실행
            diarization = self.speaker_pipeline(audio_path)
            
            # 화자별 세그먼트 추출
            speaker_segments = {}
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                if speaker not in speaker_segments:
                    speaker_segments[speaker] = []
                speaker_segments[speaker].append({
                    'start': turn.start,
                    'end': turn.end,
                    'duration': turn.end - turn.start
                })
            
            # 면접자 식별 (가장 긴 발화 시간을 가진 화자)
            if not speaker_segments:
                return []
            
            applicant_speaker = max(speaker_segments.keys(), 
                                  key=lambda s: sum(seg['duration'] for seg in speaker_segments[s]))
            
            print(f"면접자 화자 식별: {applicant_speaker}")
            print(f"면접자 발화 세그먼트: {len(speaker_segments[applicant_speaker])}개")
            
            return speaker_segments[applicant_speaker]
            
        except Exception as e:
            print(f"화자 분리 오류: {str(e)}")
            return []
    
    def trim_video_by_applicant_speech(self, video_path: str, applicant_segments: List[Dict], max_duration: int = 30) -> Optional[str]:
        """면접자 음성 세그먼트를 기반으로 영상을 자릅니다."""
        try:
            if not applicant_segments:
                print("면접자 음성 세그먼트가 없어 자르기를 건너뜁니다")
                return video_path
            
            # 30초 이내의 면접자 발화 세그먼트들 찾기
            valid_segments = []
            current_duration = 0
            
            for segment in applicant_segments:
                segment_end = segment.get("end", 0)
                if segment_end <= max_duration:
                    valid_segments.append(segment)
                    current_duration = segment_end
                else:
                    break
            
            if not valid_segments:
                print("유효한 면접자 발화 세그먼트가 없습니다")
                return video_path
            
            # 자를 시간 계산 (마지막 세그먼트 끝까지)
            trim_duration = current_duration
            
            # 이미 30초 이하면 자르지 않음
            if trim_duration >= max_duration:
                print(f"면접자 발화가 이미 {trim_duration:.1f}초로 적절한 길이입니다")
                return video_path
            
            # 자른 영상 파일 생성
            trimmed_path = tempfile.mktemp(suffix=".mp4")
            
            cmd = [
                "ffmpeg", "-i", video_path,
                "-t", str(trim_duration),
                "-c", "copy",  # 재인코딩 없이 빠른 자르기
                "-y", trimmed_path
            ]
            
            print(f"면접자 음성 기반 영상 자르기: {trim_duration:.1f}초")
            subprocess.run(cmd, check=True, capture_output=True)
            
            # 파일 크기 확인
            original_size = os.path.getsize(video_path) / (1024 * 1024)  # MB
            trimmed_size = os.path.getsize(trimmed_path) / (1024 * 1024)  # MB
            
            print(f"영상 크기: {original_size:.1f}MB → {trimmed_size:.1f}MB (절약: {original_size - trimmed_size:.1f}MB)")
            
            return trimmed_path
            
        except Exception as e:
            print(f"면접자 음성 기반 영상 자르기 오류: {str(e)}")
            return video_path
    
    def create_video_segments_by_questions(self, video_path: str, audio_path: str, max_segment_duration: int = 60) -> List[Dict]:
        """
        질문별로 비디오를 세그먼트로 분리합니다.
        
        Args:
            video_path: 원본 비디오 경로
            audio_path: 오디오 파일 경로
            max_segment_duration: 최대 세그먼트 길이 (초)
            
        Returns:
            세그먼트 정보 리스트
        """
        try:
            print("질문별 비디오 세그먼트 분리 시작...")
            
            # Whisper로 음성 인식 및 타임스탬프 추출
            result = self.whisper_model.transcribe(audio_path, word_timestamps=True)
            
            # 질문 키워드 감지 (면접관 질문 패턴)
            question_keywords = [
                "질문", "어떻게", "왜", "언제", "어디서", "무엇을", "어떤", "설명해주세요", 
                "이유는", "경험", "계획", "목표", "장점", "단점", "해결", "도전", "성공", "실패"
            ]
            
            segments = []
            current_start = 0
            current_segment_duration = 0
            
            for segment in result.get("segments", []):
                text = segment.get("text", "").lower()
                start_time = segment.get("start", 0)
                end_time = segment.get("end", 0)
                
                # 질문 감지 또는 최대 길이 도달
                is_question = any(keyword in text for keyword in question_keywords)
                segment_duration = end_time - start_time
                
                if is_question or (current_segment_duration + segment_duration) > max_segment_duration:
                    # 현재 세그먼트 저장
                    if current_segment_duration > 10:  # 최소 10초 이상
                        segment_path = self._extract_video_segment(
                            video_path, current_start, start_time, len(segments) + 1
                        )
                        if segment_path:
                            segments.append({
                                'segment_index': len(segments) + 1,
                                'start_time': current_start,
                                'end_time': start_time,
                                'duration': start_time - current_start,
                                'file_path': segment_path,
                                'text': text,
                                'is_question': is_question
                            })
                    
                    # 새 세그먼트 시작
                    current_start = start_time
                    current_segment_duration = segment_duration
                else:
                    current_segment_duration += segment_duration
            
            # 마지막 세그먼트 처리
            if current_segment_duration > 10:
                segment_path = self._extract_video_segment(
                    video_path, current_start, result.get("segments", [{}])[-1].get("end", 0), len(segments) + 1
                )
                if segment_path:
                    segments.append({
                        'segment_index': len(segments) + 1,
                        'start_time': current_start,
                        'end_time': result.get("segments", [{}])[-1].get("end", 0),
                        'duration': result.get("segments", [{}])[-1].get("end", 0) - current_start,
                        'file_path': segment_path,
                        'text': result.get("segments", [{}])[-1].get("text", ""),
                        'is_question': False
                    })
            
            print(f"질문별 세그먼트 분리 완료: {len(segments)}개 세그먼트")
            return segments
            
        except Exception as e:
            print(f"질문별 세그먼트 분리 오류: {str(e)}")
            return []
    
    def _extract_video_segment(self, video_path: str, start_time: float, end_time: float, segment_index: int) -> Optional[str]:
        """비디오에서 특정 시간 구간을 추출합니다."""
        try:
            duration = end_time - start_time
            if duration < 5:  # 5초 미만은 건너뛰기
                return None
            
            segment_path = tempfile.mktemp(suffix=f"_segment_{segment_index}.mp4")
            
            cmd = [
                "ffmpeg", "-i", video_path,
                "-ss", str(start_time),
                "-t", str(duration),
                "-c", "copy",  # 재인코딩 없이 빠른 추출
                "-y", segment_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            
            # 파일 크기 확인
            file_size = os.path.getsize(segment_path) / (1024 * 1024)  # MB
            print(f"세그먼트 {segment_index} 추출 완료: {duration:.1f}초, {file_size:.1f}MB")
            
            return segment_path
            
        except Exception as e:
            print(f"비디오 세그먼트 추출 오류: {str(e)}")
            return None
    
    def _get_video_duration(self, video_path: str) -> Optional[float]:
        """비디오 길이를 가져옵니다."""
        try:
            cmd = [
                "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                "-of", "csv=p=0", video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return float(result.stdout.strip())
        except Exception as e:
            print(f"비디오 길이 확인 오류: {str(e)}")
            return None
    
    def analyze_audio_with_whisper(self, audio_path: str) -> Dict[str, Any]:
        """Whisper로 음성을 분석합니다."""
        try:
            print(f"🎤 Whisper 분석 시작: {audio_path}")
            
            # 파일 존재 확인
            if not os.path.exists(audio_path):
                print(f"❌ 오디오 파일이 존재하지 않습니다: {audio_path}")
                return {
                    "text": "",
                    "transcription": "",
                    "speech_rate": 0,
                    "segments_count": 0,
                    "duration": 0,
                    "language": "ko"
                }
            
            # Whisper로 음성 인식
            result = self.whisper_model.transcribe(audio_path, word_timestamps=True)
            transcription = result.get("text", "")
            segments = result.get("segments", [])
            language = result.get("language", "ko")
            
            print(f"✅ Whisper 분석 완료: {len(transcription)} 문자")
            
            # 오디오 로드
            audio, sr = librosa.load(audio_path, sr=16000)
            
            # 발화 속도 계산
            speech_rate = self._calculate_speech_rate(transcription, len(audio) / sr)
            
            return {
                "text": transcription,  # 'text' 키 추가
                "transcription": transcription,
                "speech_rate": round(speech_rate, 3),
                "segments_count": len(segments),
                "duration": len(audio) / sr,
                "language": language,
                "segments": segments
            }
            
        except Exception as e:
            print(f"❌ Whisper 분석 오류: {str(e)}")
            return {
                "text": "",
                "transcription": "",
                "speech_rate": 0,
                "segments_count": 0,
                "duration": 0,
                "language": "ko",
                "segments": []
            }

    def _merge_contiguous_by_role(self, diar_segments: List[Dict[str, Any]], applicant_id: str) -> List[Dict[str, Any]]:
        """연속된 동일 화자 역할(면접관/지원자)을 하나의 블록으로 병합"""
        if not diar_segments:
            return []
        # start 기준 정렬
        diar_segments = sorted(diar_segments, key=lambda s: s.get('start', 0.0))
        blocks: List[Dict[str, Any]] = []
        def role_of(sid: str) -> str:
            return "applicant" if str(sid) == str(applicant_id) else "interviewer"
        prev_role = role_of(diar_segments[0].get('speaker', 'unknown'))
        current = {
            'role': prev_role,
            'start': float(diar_segments[0].get('start', 0.0)),
            'end': float(diar_segments[0].get('end', 0.0))
        }
        for seg in diar_segments[1:]:
            r = role_of(seg.get('speaker', 'unknown'))
            s = float(seg.get('start', 0.0))
            e = float(seg.get('end', 0.0))
            if r == prev_role and s <= current['end'] + 0.2:  # 작은 겹침/간극 허용
                current['end'] = max(current['end'], e)
            else:
                blocks.append(current)
                current = {'role': r, 'start': s, 'end': e}
                prev_role = r
        blocks.append(current)
        return blocks

    def _slice_audio(self, audio_path: str, start: float, end: float) -> Optional[str]:
        """오디오에서 특정 구간을 파일로 저장하고 경로 반환"""
        try:
            if end - start <= 0.5:
                return None
            audio, sr = librosa.load(audio_path, sr=16000)
            s_idx = int(max(0.0, start) * sr)
            e_idx = int(min(len(audio) / sr, end) * sr)
            if e_idx <= s_idx:
                return None
            chunk = audio[s_idx:e_idx]
            out_path = tempfile.mktemp(suffix=f"_{int(start)}-{int(end)}s.wav")
            sf.write(out_path, chunk, sr)
            return out_path
        except Exception as e:
            print(f"오디오 슬라이스 오류: {str(e)}")
            return None

    def build_qa_pairs_and_analyze_answers(self, audio_path: str, persist: bool = False, output_dir: Optional[str] = None, application_id: Optional[str] = None, max_workers: int = 2) -> Dict[str, Any]:
        """화자분리로 Q→A 페어를 만들고, 지원자 답변별 Whisper 분석 수행

        max_workers: 답변 구간 병렬 전사 워커 수(권장 2~4)
        """
        try:
            diar_segments: List[Dict[str, Any]] = []
            if self.speaker_pipeline:
                diarization = self.speaker_pipeline(audio_path)
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    diar_segments.append({
                        'start': float(turn.start),
                        'end': float(turn.end),
                        'speaker': str(speaker),
                        'duration': float(turn.end - turn.start)
                    })
            else:
                # Fallback: pyannote 미초기화 시 간단 화자 감지 사용
                print("화자 분리 파이프라인 없음 → fallback 화자 감지 시도")
                try:
                    speech_tool = SpeechRecognitionTool()
                    diar = speech_tool.detect_speakers(audio_path)
                    diar_segments = [
                        {
                            'start': float(s.get('start', 0.0)),
                            'end': float(s.get('end', 0.0)),
                            'speaker': str(s.get('speaker', 'unknown')),
                            'duration': float(s.get('duration', 0.0))
                        }
                        for s in diar.get("speakers", [])
                    ]
                except Exception as e:
                    print(f"fallback 화자 감지 오류: {str(e)}")
                    diar_segments = []
            if not diar_segments:
                return {"success": True, "qa": []}

            # 지원자 화자 식별(총 발화시간 최대)
            totals: Dict[str, float] = {}
            for s in diar_segments:
                sid = str(s.get('speaker', 'unknown'))
                totals[sid] = totals.get(sid, 0.0) + max(0.0, float(s.get('duration', 0.0)))
            applicant_id = max(totals.items(), key=lambda kv: kv[1])[0]

            # 역할 블록 병합 후 Q→A 페어링
            blocks = self._merge_contiguous_by_role(diar_segments, applicant_id)
            qa_pairs: List[Dict[str, Any]] = []
            i = 0
            while i < len(blocks) - 1:
                q = blocks[i]
                a = blocks[i + 1]
                if q['role'] == 'interviewer' and a['role'] == 'applicant':
                    qa_pairs.append({
                        'question': {'start': q['start'], 'end': q['end']},
                        'answer': {'start': a['start'], 'end': a['end']}
                    })
                    i += 2
                else:
                    i += 1

            # 보정: Q→A 페어가 없으면, 지원자 블록만으로 답변 단위 페어 생성
            if not qa_pairs:
                for b in blocks:
                    if b['role'] == 'applicant':
                        qa_pairs.append({
                            'question': None,
                            'answer': {'start': b['start'], 'end': b['end']}
                        })

            # 각 답변 구간에 대해 Whisper 분석 (병렬)
            analyzed: List[Dict[str, Any]] = []
            from concurrent.futures import ThreadPoolExecutor, as_completed

            def process_one(idx: int, pair: Dict[str, Any]) -> Dict[str, Any]:
                answer = pair['answer']
                ans_path = self._slice_audio(audio_path, answer['start'], answer['end'])
                if not ans_path:
                    return {
                        'index': idx,
                        'question': pair['question'],
                        'answer': answer,
                        'analysis': {"text": "", "transcription": "", "duration": 0, "speech_rate": 0},
                        'answer_audio_path': None
                    }
                analysis = self.analyze_audio_with_whisper(ans_path)
                saved_path = None
                if persist:
                    try:
                        base_dir = output_dir or os.path.join("/tmp", "qa_slices")
                        if application_id:
                            base_dir = os.path.join(base_dir, str(application_id))
                        os.makedirs(base_dir, exist_ok=True)
                        saved_path = os.path.join(base_dir, f"answer_{idx:02d}_{int(answer['start'])}-{int(answer['end'])}s.wav")
                        import shutil
                        shutil.move(ans_path, saved_path)
                    except Exception as e:
                        print(f"답변 오디오 저장 오류: {str(e)}")
                        saved_path = None
                return {
                    'index': idx,
                    'question': pair['question'],
                    'answer': answer,
                    'analysis': analysis,
                    'answer_audio_path': saved_path or ans_path
                }

            max_workers = max(1, int(max_workers or 1))
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(process_one, idx, pair): idx
                    for idx, pair in enumerate(qa_pairs, start=1)
                }
                for future in as_completed(futures):
                    try:
                        analyzed.append(future.result())
                    except Exception as e:
                        print(f"병렬 전사 작업 오류: {str(e)}")

            return {
                'success': True,
                'applicant_speaker_id': applicant_id,
                'qa': analyzed,
                'total_pairs': len(analyzed)
            }
        except Exception as e:
            print(f"QA 분석 오류: {str(e)}")
            return {"success": False, "qa": [], "error": str(e)}
    
    def _calculate_speech_rate(self, transcription: str, duration: float) -> float:
        """말하기 속도를 계산합니다."""
        if not transcription or duration <= 0:
            return 0
        
        word_count = len(transcription.split())
        return word_count / duration  # 분당 단어 수

    def save_speaker_analysis_log(self, audio_path: str, speaker_segments: List[Dict], whisper_result: Dict, application_id: str = None) -> str:
        """화자분리 및 음성 분석 결과를 JSON 파일로 저장"""
        try:
            # 로그 디렉토리 생성
            log_dir = "logs/speaker_analysis"
            os.makedirs(log_dir, exist_ok=True)
            
            # 타임스탬프 생성
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"speaker_analysis_{application_id or 'unknown'}_{timestamp}.json"
            log_path = os.path.join(log_dir, filename)
            
            # 분석 결과 데이터 구성
            analysis_data = {
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "audio_file": audio_path,
                    "application_id": application_id,
                    "analysis_type": "speaker_diarization_and_whisper"
                },
                "speaker_analysis": {
                    "total_speakers": len(set(seg.get('speaker', 'unknown') for seg in speaker_segments)),
                    "speaker_segments": speaker_segments,
                    "applicant_speech_duration": sum(seg.get('duration', 0) for seg in speaker_segments),
                    "total_segments": len(speaker_segments)
                },
                "whisper_analysis": whisper_result,
                "summary": {
                    "transcription_length": len(whisper_result.get("transcription", "")),
                    "speech_rate": whisper_result.get("speech_rate", 0),
                    "analysis_duration": whisper_result.get("duration", 0)
                }
            }
            
            # JSON 파일로 저장
            with open(log_path, 'w', encoding='utf-8') as f:
                json.dump(analysis_data, f, ensure_ascii=False, indent=2)
            
            print(f"화자분리 분석 로그 저장 완료: {log_path}")
            return log_path
            
        except Exception as e:
            print(f"화자분리 로그 저장 실패: {str(e)}")
            return None

# 화자 분리 서비스 초기화
speaker_analysis_service = SpeakerAnalysisService()

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

@app.post("/speaker-analysis-and-trim")
async def speaker_analysis_and_trim(request: SpeakerAnalysisRequest):
    """화자 분리 및 비디오 자르기 엔드포인트"""
    try:
        print("화자 분리 및 비디오 자르기 요청 시작...")
        
        # base64 디코딩
        audio_data = base64.b64decode(request.audio_data)
        video_data = base64.b64decode(request.video_data)
        
        # 임시 파일 생성
        temp_audio_path = tempfile.mktemp(suffix=".wav")
        temp_video_path = tempfile.mktemp(suffix=".mp4")
        
        try:
            # 파일 저장
            with open(temp_audio_path, 'wb') as f:
                f.write(audio_data)
            with open(temp_video_path, 'wb') as f:
                f.write(video_data)
            
            print(f"임시 파일 생성: {temp_audio_path}, {temp_video_path}")
            
            # 1단계: 화자 분리
            applicant_segments = speaker_analysis_service.extract_applicant_audio(temp_audio_path)
            
            # 2단계: 면접자 발화 시간 계산
            applicant_speech_duration = sum(seg['duration'] for seg in applicant_segments)
            
            # 3단계: 질문별 세그먼트 분리 (10분 이상 영상인 경우)
            video_duration = speaker_analysis_service._get_video_duration(temp_video_path)
            video_segments = []
            
            if video_duration and video_duration > 600:  # 10분 이상
                print(f"긴 영상 감지 ({video_duration:.1f}초), 질문별 세그먼트 분리 시작...")
                video_segments = speaker_analysis_service.create_video_segments_by_questions(
                    temp_video_path, temp_audio_path, max_segment_duration=60
                )
                print(f"질문별 세그먼트 분리 완료: {len(video_segments)}개 세그먼트")
            else:
                print(f"짧은 영상 ({video_duration:.1f}초), 기본 자르기 사용")
            
            # 4단계: 기본 비디오 자르기 (세그먼트가 없는 경우)
            trimmed_video_path = temp_video_path
            if not video_segments:
                trimmed_video_path = speaker_analysis_service.trim_video_by_applicant_speech(
                    temp_video_path, applicant_segments, max_duration=30
                )
            
            # 5단계: Whisper 분석
            whisper_analysis = speaker_analysis_service.analyze_audio_with_whisper(temp_audio_path)
            
            # 6단계: 분석 결과 로그 저장
            log_path = speaker_analysis_service.save_speaker_analysis_log(
                temp_audio_path, applicant_segments, whisper_analysis
            )
            
            # 7단계: 결과 정리
            trimmed_video_base64 = None
            if trimmed_video_path != temp_video_path and os.path.exists(trimmed_video_path):
                # 자른 비디오를 base64로 인코딩
                with open(trimmed_video_path, 'rb') as f:
                    trimmed_video_data = f.read()
                trimmed_video_base64 = base64.b64encode(trimmed_video_data).decode('utf-8')
            
            analysis_result = {
                "applicant_segments": applicant_segments,
                "applicant_speech_duration": applicant_speech_duration,
                "trimmed_video_base64": trimmed_video_base64,
                "is_trimmed": trimmed_video_path != temp_video_path,
                "whisper_analysis": whisper_analysis,
                "trimmed_filename": f"trimmed_{request.video_filename}" if trimmed_video_base64 else None,
                "log_path": log_path,
                "video_segments": video_segments,  # 질문별 세그먼트 정보
                "original_duration": video_duration,
                "segment_count": len(video_segments)
            }
            
            print("화자 분리 및 비디오 자르기 완료")
            
            return {
                "success": True,
                "message": "화자 분리 및 비디오 자르기가 완료되었습니다",
                "analysis": analysis_result
            }
            
        finally:
            # 임시 파일 정리
            try:
                if os.path.exists(temp_audio_path):
                    os.remove(temp_audio_path)
                if os.path.exists(temp_video_path):
                    os.remove(temp_video_path)
                print("임시 파일 정리 완료")
            except Exception as e:
                print(f"임시 파일 정리 오류: {str(e)}")
        
    except Exception as e:
        print(f"화자 분리 및 비디오 자르기 오류: {str(e)}")
        return {
            "success": False,
            "message": f"오류가 발생했습니다: {str(e)}",
            "analysis": {}
        }

@app.post("/whisper-analysis")
async def whisper_analysis_api(request: WhisperAnalysisRequest):
    """Whisper 음성 분석 API"""
    audio_path = request.audio_path
    application_id = request.application_id

    print(f"🎤 Whisper 분석 API 호출: audio_path={audio_path}, application_id={application_id}")

    if not audio_path:
        print("❌ audio_path가 제공되지 않았습니다")
        return {"success": False, "error": "audio_path is required"}

    try:
        # 파일 존재 확인
        if not os.path.exists(audio_path):
            print(f"❌ 오디오 파일이 존재하지 않습니다: {audio_path}")
            return {
                "success": False, 
                "error": f"Audio file not found: {audio_path}"
            }

        print(f"✅ 오디오 파일 확인됨: {audio_path}")
        
        # Whisper 분석 실행
        whisper_analysis = speaker_analysis_service.analyze_audio_with_whisper(audio_path)
        
        if not whisper_analysis:
            print("❌ Whisper 분석 결과가 없습니다")
            return {
                "success": False,
                "error": "Whisper analysis failed"
            }

        print(f"✅ Whisper 분석 완료: {whisper_analysis.get('text', '')[:100]}...")
        
        # 로그 저장
        log_path = speaker_analysis_service.save_speaker_analysis_log(
            audio_path, [], whisper_analysis, application_id
        )

        return {
            "success": True,
            "whisper_analysis": whisper_analysis,
            "log_path": log_path
        }
    except Exception as e:
        print(f"❌ Whisper 분석 API 오류: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/diarized-qa-analysis")
async def diarized_qa_analysis(request: QAAnalysisRequest):
    """화자분리로 Q→A 구간을 만들고 지원자 답변별 Whisper 분석 반환"""
    audio_path = request.audio_path
    application_id = request.application_id
    try:
        if not audio_path or not os.path.exists(audio_path):
            return {"success": False, "error": f"audio not found: {audio_path}"}
        result = speaker_analysis_service.build_qa_pairs_and_analyze_answers(
            audio_path,
            persist=bool(request.persist),
            output_dir=request.output_dir,
            application_id=str(application_id) if application_id else None,
            max_workers=int(request.max_workers or 2)
        )
        
        # 감정/문맥 분석 옵션이 활성화된 경우 추가 분석 수행
        if request.run_emotion_context and result.get("success"):
            try:
                print("🎭 감정/문맥 분석 시작...")
                
                # 전체 전사본 수집
                full_transcription = ""
                for qa in result.get("qa", []):
                    if qa.get("answer_transcription"):
                        full_transcription += qa["answer_transcription"] + " "
                
                if full_transcription.strip():
                    # 감정 분석
                    emotion_result = await emotion_analysis_api({"transcription": full_transcription})
                    if emotion_result.get("success"):
                        result["emotion_analysis"] = emotion_result["analysis"]
                        print("✅ 감정 분석 완료")
                    
                    # 문맥 분석
                    context_result = await openai_context_analysis_api({
                        "transcription": full_transcription,
                        "speakers": result.get("speakers", [])
                    })
                    if context_result.get("success"):
                        result["context_analysis"] = context_result["analysis"]
                        print("✅ 문맥 분석 완료")
                
                print("🎭 감정/문맥 분석 완료")
                
            except Exception as e:
                print(f"⚠️ 감정/문맥 분석 중 오류 (무시): {str(e)}")
                # 감정/문맥 분석 실패해도 QA 분석 결과는 반환
        # 로그 저장(선택)
        try:
            speaker_analysis_service.save_speaker_analysis_log(
                audio_path, [], {"qa_result": result}, str(application_id) if application_id else None
            )
        except Exception:
            pass
        # 입력 오디오 파일 삭제 옵션 처리
        try:
            if bool(request.delete_after_input) and os.path.exists(audio_path):
                os.remove(audio_path)
        except Exception as e:
            print(f"입력 오디오 삭제 오류: {str(e)}")

        return result
    except Exception as e:
        return {"success": False, "error": str(e), "qa": []}

@app.post("/openai-answer-analysis")
async def openai_answer_analysis_api(request: dict):
    """OpenAI 답변 품질 분석 API"""
    try:
        from tools.openai_nlp_analyzer import openai_nlp_analyzer
        
        question = request.get("question", "")
        answer = request.get("answer", "")
        
        if not question or not answer:
            return {"success": False, "error": "question and answer are required"}
        
        analysis = openai_nlp_analyzer.analyze_answer_quality(question, answer)
        
        return {
            "success": True,
            "analysis": analysis
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/openai-context-analysis")
async def openai_context_analysis_api(request: dict):
    """OpenAI 문맥 분석 API"""
    try:
        from tools.openai_nlp_analyzer import openai_nlp_analyzer
        
        transcription = request.get("transcription", "")
        speakers = request.get("speakers", [])
        
        if not transcription:
            return {"success": False, "error": "transcription is required"}
        
        analysis = openai_nlp_analyzer.analyze_interview_context(transcription, speakers)
        
        return {
            "success": True,
            "analysis": analysis
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/emotion-analysis")
async def emotion_analysis_api(request: dict):
    """OpenAI 감정 분석 API"""
    try:
        from tools.openai_nlp_analyzer import openai_nlp_analyzer
        
        transcription = request.get("transcription", "")
        
        if not transcription:
            return {"success": False, "error": "transcription is required"}
        
        analysis = openai_nlp_analyzer.analyze_emotion_from_text(transcription)
        
        return {
            "success": True,
            "analysis": analysis
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

@app.post("/realtime-audio-analysis")
async def realtime_audio_analysis(
    audio_data: str = Form(...),  # base64 encoded audio chunk
    session_id: str = Form(...),
    timestamp: float = Form(...),
    application_id: str = Form(None)
):
    """실시간 음성 분석 엔드포인트"""
    try:
        print(f"실시간 음성 분석 요청: session_id={session_id}, timestamp={timestamp}")
        
        # base64 디코딩
        audio_chunk = base64.b64decode(audio_data)
        
        # 임시 파일 생성
        temp_audio_path = tempfile.mktemp(suffix=".wav")
        
        try:
            # 오디오 청크 저장
            with open(temp_audio_path, 'wb') as f:
                f.write(audio_chunk)
            
            # 1단계: 화자 분리 (실시간 버전)
            speaker_segments = speaker_analysis_service.extract_applicant_audio(temp_audio_path)
            
            # 2단계: Whisper 분석
            whisper_analysis = speaker_analysis_service.analyze_audio_with_whisper(temp_audio_path)
            
            # 3단계: 실시간 분석 결과 로그 저장
            log_path = speaker_analysis_service.save_speaker_analysis_log(
                temp_audio_path, speaker_segments, whisper_analysis, application_id
            )
            
            # 4단계: 실시간 분석 결과 반환
            analysis_result = {
                "session_id": session_id,
                "timestamp": timestamp,
                "speaker_segments": speaker_segments,
                "whisper_analysis": whisper_analysis,
                "log_path": log_path,
                "analysis_duration": whisper_analysis.get("duration", 0),
                "speech_rate": whisper_analysis.get("speech_rate", 0),
                "transcription": whisper_analysis.get("transcription", "")
            }
            
            print(f"실시간 음성 분석 완료: {len(speaker_segments)}개 세그먼트, {whisper_analysis.get('speech_rate', 0):.2f} wpm")
            
            return {
                "success": True,
                "result": analysis_result
            }
            
        finally:
            # 임시 파일 정리
            if os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)
                
    except Exception as e:
        print(f"실시간 음성 분석 오류: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=False,  # 자동 리로드 비활성화
        log_level="info"
    )
