import whisper
import torch
import numpy as np
from typing import Dict, List, Any, Optional
import json
import tempfile
import os
from datetime import datetime
import logging
from .speech_recognition_tool import SpeechRecognitionTool
from .speaker_diarization_tool import SpeakerDiarizationTool

class RealtimeInterviewEvaluationTool:
    def __init__(self):
        """실시간 면접 평가 도구 초기화"""
        self.speech_tool = SpeechRecognitionTool()
        self.diarization_tool = SpeakerDiarizationTool()
        self.evaluation_history = []
        self.current_session = None
        
    def initialize_session(self, session_id: str, participants: List[Dict]) -> bool:
        """면접 세션 초기화
        
        Args:
            session_id: 세션 ID
            participants: 참가자 목록 (면접관, 지원자)
        """
        try:
            self.current_session = {
                "session_id": session_id,
                "participants": participants,
                "start_time": datetime.now(),
                "evaluations": [],
                "speaker_notes": {},
                "real_time_transcript": []
            }
            
            # 화자 분리 파이프라인 초기화
            self.diarization_tool.initialize_pipeline()
            
            logging.info(f"면접 세션 초기화 완료: {session_id}")
            return True
            
        except Exception as e:
            logging.error(f"세션 초기화 실패: {e}")
            return False
    
    def process_audio_chunk(self, audio_chunk: bytes, timestamp: float) -> Dict[str, Any]:
        """실시간 오디오 청크 처리
        
        Args:
            audio_chunk: 오디오 데이터
            timestamp: 타임스탬프
        
        Returns:
            실시간 처리 결과
        """
        try:
            if not self.current_session:
                # 세션이 초기화되지 않은 경우 기본 세션 생성
                self.current_session = {
                    "session_id": f"default_session_{timestamp}",
                    "participants": ["면접관_1", "면접관_2", "면접관_3", "지원자_1", "지원자_2", "지원자_3"],
                    "start_time": datetime.now(),
                    "evaluations": [],
                    "speaker_notes": {},
                    "real_time_transcript": []
                }
                logging.info("기본 세션 자동 생성")
            
            # 임시 파일에 오디오 저장
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_chunk)
                temp_audio_path = temp_file.name
            
            # 음성 인식 (실제 Whisper 모델 사용)
            try:
                logging.info(f"음성 인식 시작: {temp_audio_path}")
                transcription_result = self.speech_tool.transcribe_audio(temp_audio_path)
                logging.info(f"음성 인식 결과: {transcription_result.get('text', '')}")
            except Exception as e:
                logging.error(f"음성 인식 실패: {e}")
                transcription_result = {"text": f"음성 인식 오류: {str(e)}", "success": False}
            
            # 화자 분리 (실시간 버전)
            try:
                logging.info("화자 분리 시작")
                diarization_result = self._process_realtime_diarization(temp_audio_path, timestamp)
                logging.info(f"화자 분리 결과: {diarization_result.get('current_speaker', 'unknown')}")
            except Exception as e:
                logging.error(f"화자 분리 실패: {e}")
                diarization_result = {"current_speaker": "unknown", "confidence": 0.0, "error": str(e)}
            
            # 실시간 평가
            try:
                logging.info("실시간 평가 시작")
                evaluation_result = self._evaluate_realtime_content(
                    transcription_result.get("text", ""),
                    diarization_result.get("current_speaker", "unknown"),
                    timestamp
                )
                logging.info(f"평가 결과: {evaluation_result.get('score', 0)}점")
            except Exception as e:
                logging.error(f"평가 실패: {e}")
                evaluation_result = {"score": 0, "feedback": [f"평가 오류: {str(e)}"], "success": False}
            
            # 결과 저장
            result = {
                "timestamp": timestamp,
                "transcription": transcription_result,
                "diarization": diarization_result,
                "evaluation": evaluation_result,
                "success": True
            }
            
            self._update_session_data(result)
            
            # 임시 파일 삭제
            try:
                os.unlink(temp_audio_path)
            except Exception as e:
                logging.warning(f"임시 파일 삭제 실패: {e}")
            
            logging.info("오디오 청크 처리 완료")
            return result
            
        except Exception as e:
            logging.error(f"실시간 오디오 처리 실패: {e}")
            return {"error": str(e), "success": False}
    
    def _process_realtime_diarization(self, audio_path: str, timestamp: float) -> Dict[str, Any]:
        """실시간 화자 분리 처리"""
        try:
            # 간단한 실시간 화자 분리 (음성 특성 기반)
            # 실제 구현에서는 더 정교한 방법 사용
            y, sr = self.speech_tool.model.transcribe(audio_path)
            
            # 음성 특성 분석
            volume = np.mean(np.abs(y))
            pitch = self._extract_pitch(y, sr)
            
            # 화자 구분 (간단한 휴리스틱)
            current_speaker = self._identify_speaker(volume, pitch, timestamp)
    
            return {
                "current_speaker": current_speaker,
                "volume": float(volume),
                "pitch": float(pitch),
                "confidence": 0.8  # 신뢰도
            }
            
        except Exception as e:
            logging.error(f"실시간 화자 분리 실패: {e}")
            return {"current_speaker": "unknown", "error": str(e)}
    
    def _extract_pitch(self, audio: np.ndarray, sr: int) -> float:
        """음성에서 피치 추출"""
        try:
            # 간단한 피치 추출 (실제로는 더 정교한 방법 사용)
            fft = np.fft.fft(audio)
            freqs = np.fft.fftfreq(len(audio), 1/sr)
            
            # 주요 주파수 찾기
            magnitude = np.abs(fft)
            peak_freq_idx = np.argmax(magnitude[1:len(magnitude)//2]) + 1
            pitch = freqs[peak_freq_idx]
            
            return abs(pitch)
            
        except Exception:
            return 0.0
    
    def _identify_speaker(self, volume: float, pitch: float, timestamp: float) -> str:
        """화자 식별 (간단한 휴리스틱)"""
        # 이전 발화 패턴과 비교하여 화자 구분
        # 실제 구현에서는 더 정교한 방법 사용
        
        if volume > 0.1:
            if pitch > 200:  # 높은 피치
                return "지원자_1"
            else:  # 낮은 피치
                return "면접관_1"
        else:
            return "unknown"
    
    def _evaluate_realtime_content(self, text: str, speaker: str, timestamp: float) -> Dict[str, Any]:
        """실시간 내용 평가"""
        if not text.strip():
            return {"score": 0, "feedback": "음성 없음", "success": False}
        
        try:
            # 간단한 평가 기준
            evaluation = {
                "speaker": speaker,
                "text": text,
                "timestamp": timestamp,
                "score": 0,
                "feedback": [],
                "keywords": [],
                "sentiment": "neutral"
            }
            
            # 키워드 분석
            keywords = {
                "기술": ["프로그래밍", "개발", "코딩", "프로젝트", "기술", "언어", "프레임워크"],
                "경험": ["경험", "프로젝트", "회사", "업무", "담당", "역할"],
                "인성": ["팀워크", "협력", "소통", "리더십"],
                "동기": ["지원", "동기", "목표", "꿈", "미래"]
            }
            
            # 점수 계산
            total_score = 0
            for category, words in keywords.items():
                count = sum(1 for word in words if word in text)
                if count > 0:
                    evaluation["keywords"].append(f"{category}: {count}개")
                    total_score += count * 10
            
            evaluation["score"] = min(total_score, 100)
            
            # 피드백 생성
            if evaluation["score"] > 50:
                evaluation["feedback"].append("좋은 답변입니다")
            elif evaluation["score"] > 20:
                evaluation["feedback"].append("보통 수준의 답변입니다")
            else:
                evaluation["feedback"].append("더 구체적인 답변이 필요합니다")
            
            return evaluation
            
        except Exception as e:
            logging.error(f"실시간 평가 실패: {e}")
            return {"error": str(e), "success": False}
    
    def _update_session_data(self, result: Dict[str, Any]):
        """세션 데이터 업데이트"""
        if not self.current_session:
            return
        
        # 실시간 트랜스크립트 업데이트
        if result.get("transcription", {}).get("text"):
            self.current_session["real_time_transcript"].append({
                "timestamp": result["timestamp"],
                "speaker": result.get("diarization", {}).get("current_speaker", "unknown"),
                "text": result["transcription"]["text"]
            })
        
        # 평가 히스토리 업데이트
        if result.get("evaluation", {}).get("score", 0) > 0:
            self.current_session["evaluations"].append(result["evaluation"])
        
        # 화자별 메모 업데이트
        speaker = result.get("diarization", {}).get("current_speaker", "unknown")
        if speaker not in self.current_session["speaker_notes"]:
            self.current_session["speaker_notes"][speaker] = []
        
        if result.get("evaluation", {}).get("feedback"):
            self.current_session["speaker_notes"][speaker].append({
                "timestamp": result["timestamp"],
                "feedback": result["evaluation"]["feedback"]
            })
    
    def get_session_summary(self) -> Dict[str, Any]:
        """세션 요약 정보 반환"""
        if not self.current_session:
            return {"error": "세션이 없습니다", "success": False}
        
        try:
            # 화자별 통계
            speaker_stats = {}
            for speaker in self.current_session["speaker_notes"]:
                speaker_stats[speaker] = {
                    "total_notes": len(self.current_session["speaker_notes"][speaker]),
                    "avg_score": 0
                }
            
            # 평균 점수 계산
            if self.current_session["evaluations"]:
                total_score = sum(eval.get("score", 0) for eval in self.current_session["evaluations"])
                avg_score = total_score / len(self.current_session["evaluations"])
            else:
                avg_score = 0
            
            return {
                "session_id": self.current_session["session_id"],
                "duration": (datetime.now() - self.current_session["start_time"]).total_seconds(),
                "total_evaluations": len(self.current_session["evaluations"]),
                "average_score": avg_score,
                "speaker_stats": speaker_stats,
                "transcript_length": len(self.current_session["real_time_transcript"]),
                "success": True
            }
            
        except Exception as e:
            logging.error(f"세션 요약 생성 실패: {e}")
            return {"error": str(e), "success": False}
    
    def end_session(self) -> Dict[str, Any]:
        """세션 종료 및 최종 결과 반환"""
        if not self.current_session:
            return {"error": "세션이 없습니다", "success": False}
        
        try:
            summary = self.get_session_summary()
            final_result = {
                "session_summary": summary,
                "full_transcript": self.current_session["real_time_transcript"],
                "all_evaluations": self.current_session["evaluations"],
                "speaker_notes": self.current_session["speaker_notes"],
                "end_time": datetime.now().isoformat()
            }
            
            # 세션 초기화
            self.current_session = None
            
            return final_result
            
        except Exception as e:
            logging.error(f"세션 종료 실패: {e}")
            return {"error": str(e), "success": False}

# 전역 인스턴스
realtime_evaluation_tool = RealtimeInterviewEvaluationTool()

# LangGraph 도구로 사용할 함수
def realtime_interview_evaluation_tool(state: Dict[str, Any]) -> Dict[str, Any]:
    """실시간 면접 평가 도구 함수
    
    Args:
        state: 현재 상태 (audio_chunk, timestamp, session_id 등 포함)
        
    Returns:
        실시간 평가 결과가 포함된 상태
    """
    action = state.get("action", "process_chunk")
    
    if action == "initialize":
        session_id = state.get("session_id")
        participants = state.get("participants", [])
        success = realtime_evaluation_tool.initialize_session(session_id, participants)
        return {**state, "initialization": {"success": success}}
    
    elif action == "process_chunk":
        audio_chunk = state.get("audio_chunk")
        timestamp = state.get("timestamp", datetime.now().timestamp())
        
        if not audio_chunk:
            return {**state, "realtime_evaluation": {"error": "No audio chunk provided"}}
        
        result = realtime_evaluation_tool.process_audio_chunk(audio_chunk, timestamp)
        return {**state, "realtime_evaluation": result}
    
    elif action == "get_summary":
        summary = realtime_evaluation_tool.get_session_summary()
        return {**state, "session_summary": summary}
    
    elif action == "end_session":
        final_result = realtime_evaluation_tool.end_session()
        return {**state, "final_result": final_result}
    
    else:
        return {**state, "error": f"Unknown action: {action}"} 