import whisper
import torch
import torchaudio
import librosa
import soundfile as sf
from pydub import AudioSegment
import numpy as np
from typing import Dict, List, Any, Optional
import os
import tempfile
import json
from datetime import datetime
from .speaker_diarization_tool import SpeakerDiarizationTool

class SpeechRecognitionTool:
    def __init__(self):
        """도구 초기화"""
        self.model = whisper.load_model("base")
        self.sample_rate = 16000
        self.speaker_diarization = SpeakerDiarizationTool()
        # pyannote.audio 파이프라인 초기화 (HuggingFace 토큰이 있으면 사용)
        self.speaker_diarization.initialize_pipeline()
    
    def transcribe_audio(self, audio_file_path: str) -> Dict[str, Any]:
        """MP3 파일을 텍스트로 변환
        
        Args:
            audio_file_path: MP3 파일 경로
            
        Returns:
            변환된 텍스트와 메타데이터
        """
        try:
            # MP3를 WAV로 변환
            audio = AudioSegment.from_mp3(audio_file_path)
            temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            audio.export(temp_wav.name, format="wav")
            
            # Whisper로 음성 인식
            result = self.model.transcribe(temp_wav.name)
            
            # 임시 파일 삭제
            os.unlink(temp_wav.name)
            
            return {
                "text": result["text"],
                "segments": result["segments"],
                "language": result["language"],
                "success": True
            }
        except Exception as e:
            return {
                "text": "",
                "segments": [],
                "language": "",
                "success": False,
                "error": str(e)
            }
    
    def detect_speakers(self, audio_file_path: str) -> Dict[str, Any]:
        """화자 분리 (pyannote.audio 사용)
        
        Args:
            audio_file_path: 오디오 파일 경로
            
        Returns:
            화자별 세그먼트 정보
        """
        try:
            # pyannote.audio를 사용한 정교한 화자 분리
            diarization_result = self.speaker_diarization.diarize_audio(audio_file_path)
            
            if not diarization_result["success"]:
                # pyannote.audio 실패시 간단한 방법으로 fallback
                print(f"⚠️ pyannote.audio 실패, 간단한 방법 사용: {diarization_result.get('error', 'Unknown error')}")
                return self._fallback_speaker_detection(audio_file_path)
            
            # 화자 패턴 분석 추가
            pattern_result = self.speaker_diarization.analyze_speaker_patterns(
                diarization_result["segments"]
            )
            
            return {
                "speakers": diarization_result["segments"],
                "speaker_mapping": diarization_result.get("speaker_mapping", {}),
                "pattern_analysis": pattern_result,
                "success": True,
                "method": "pyannote.audio"
            }
        except Exception as e:
            print(f"❌ pyannote.audio 화자 분리 오류: {str(e)}")
            # 오류시 간단한 방법으로 fallback
            return self._fallback_speaker_detection(audio_file_path)
    
    def _fallback_speaker_detection(self, audio_file_path: str) -> Dict[str, Any]:
        """간단한 화자 분리 (fallback)"""
        try:
            # 오디오 로드
            y, sr = librosa.load(audio_file_path, sr=self.sample_rate)
            
            # 간단한 화자 분리 (음성 특성 기반)
            segments = self._simple_speaker_detection(y, sr)
            
            return {
                "speakers": segments,
                "success": True,
                "method": "simple_volume_based"
            }
        except Exception as e:
            return {
                "speakers": [],
                "success": False,
                "error": str(e),
                "method": "failed"
            }
    
    def _simple_speaker_detection(self, audio: np.ndarray, sr: int) -> List[Dict]:
        """간단한 화자 분리 (음성 특성 기반)
        실제 프로덕션에서는 pyannote.audio 사용 권장
        """
        # 음성 세그먼트 분할 (3초 단위)
        segment_length = 3 * sr
        segments = []
        
        for i in range(0, len(audio), segment_length):
            segment = audio[i:i + segment_length]
            if len(segment) < sr:  # 1초 미만은 건너뛰기
                continue
                
            # 간단한 특성 추출 (음성 유무, 볼륨 등)
            volume = np.mean(np.abs(segment))
            zero_crossings = np.sum(np.diff(np.sign(segment)))
            
            # 화자 구분 (간단한 휴리스틱)
            speaker = "speaker_1" if volume > 0.1 else "speaker_2"
            
            segments.append({
                "start": i / sr,
                "end": (i + len(segment)) / sr,
                "speaker": speaker,
                "volume": float(volume),
                "zero_crossings": int(zero_crossings)
            })
        
        return segments
    
    def analyze_interview_content(self, transcription: str, speakers: List[Dict]) -> Dict[str, Any]:
        """면접 내용 분석
        
        Args:
            transcription: 음성 인식 결과
            speakers: 화자별 세그먼트
            
        Returns:
            면접 분석 결과
        """
        try:
            # 간단한 키워드 분석
            keywords = {
                "기술": ["프로그래밍", "개발", "코딩", "프로젝트", "기술", "언어", "프레임워크"],
                "경험": ["경험", "프로젝트", "회사", "업무", "담당", "역할"],
                "인성": ["팀워크", "협력", "소통", "리더십"],
                "동기": ["지원", "동기", "목표", "꿈", "미래"]
            }
            
            analysis = {
                "total_duration": speakers[-1]["end"] if speakers else 0,
                "speaker_stats": {},
                "keyword_analysis": {},
                "suggested_questions": [],
                "evaluation_notes": []
            }
            
            # 화자별 통계
            for speaker in speakers:
                speaker_id = speaker["speaker"]
                if speaker_id not in analysis["speaker_stats"]:
                    analysis["speaker_stats"][speaker_id] = {
                        "total_time": 0,
                        "segments": 0
                    }
                analysis["speaker_stats"][speaker_id]["total_time"] += speaker["end"] - speaker["start"]
                analysis["speaker_stats"][speaker_id]["segments"] += 1
            
            # 키워드 분석
            for category, words in keywords.items():
                count = sum(1 for word in words if word in transcription)
                analysis["keyword_analysis"][category] = count
            
            # 평가 노트 생성
            if analysis["keyword_analysis"]["기술"] > 0:
                analysis["evaluation_notes"].append("기술 관련 경험 언급됨")
            if analysis["keyword_analysis"]["경험"] > 0:
                analysis["evaluation_notes"].append("구체적인 경험 사례 제시")
            if analysis["keyword_analysis"]["인성"] > 0:
                analysis["evaluation_notes"].append("팀워크 및 소통 능력 언급")
            
            return analysis
            
        except Exception as e:
            return {
                "error": str(e),
                "success": False
            }

# 전역 인스턴스
speech_recognition_tool = SpeechRecognitionTool()

def speech_recognition_tool_function(state: Dict[str, Any]) -> Dict[str, Any]:
    """음성 인식 및 면접 분석 도구
    
    Args:
        state: 현재 상태 (audio_file_path 포함)
        
    Returns:
        분석 결과가 포함된 상태
    """
    audio_file_path = state.get("audio_file_path")
    if not audio_file_path:
        return {**state, "speech_analysis": {"error": "No audio file provided"}}
    
    # 음성 인식
    transcription_result = speech_recognition_tool.transcribe_audio(audio_file_path)
    
    if not transcription_result["success"]:
        return {**state, "speech_analysis": transcription_result}
    
    # 화자 분리
    speakers_result = speech_recognition_tool.detect_speakers(audio_file_path)
    
    # 면접 내용 분석
    analysis_result = speech_recognition_tool.analyze_interview_content(
        transcription_result["text"],
        speakers_result.get("speakers", [])
    )
    
    return {
        **state,
        "speech_analysis": {
            "transcription": transcription_result,
            "speakers": speakers_result,
            "analysis": analysis_result,
            "timestamp": datetime.now().isoformat()
        }
    } 