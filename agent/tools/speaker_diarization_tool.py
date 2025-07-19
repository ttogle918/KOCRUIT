import torch
import torchaudio
from pyannote.audio import Pipeline
from pyannote.audio.pipelines.utils.hook import ProgressHook
import numpy as np
from typing import Dict, List, Any, Optional
import os
import tempfile
import json
from datetime import datetime
import logging

class SpeakerDiarizationTool:
    def __init__(self):
        """화자 분리 도구 초기화"""
        self.pipeline = None
        self.speaker_mapping = {}
        self.max_speakers = 6  # 면접관 3명 + 지원자 3명
        
    def initialize_pipeline(self, auth_token: str = None):
        """pyannote.audio 파이프라인 초기화"""
        try:
            # HuggingFace 토큰이 있으면 사용, 없으면 로컬 모델 사용
            if auth_token:
                self.pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=auth_token
                )
            else:
                # 로컬 모델 사용 (기본 설정)
                self.pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1"
                )
            
            # GPU 사용 가능시 GPU 사용
            if torch.cuda.is_available():
                self.pipeline = self.pipeline.to(torch.device("cuda"))
                
            logging.info("화자 분리 파이프라인 초기화 완료")
            return True
            
        except Exception as e:
            logging.error(f"화자 분리 파이프라인 초기화 실패: {e}")
            return False
    
    def diarize_audio(self, audio_file_path: str) -> Dict[str, Any]:
        """오디오 파일에서 화자 분리 수행
        
        Args:
            audio_file_path: 오디오 파일 경로
            
        Returns:
            화자별 세그먼트 정보
        """
        try:
            if not self.pipeline:
                return {"error": "파이프라인이 초기화되지 않았습니다", "success": False}
            
            # 화자 분리 수행
            with ProgressHook() as hook:
                diarization = self.pipeline(audio_file_path, hook=hook)
            
            # 결과 파싱
            segments = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                segments.append({
                    "start": turn.start,
                    "end": turn.end,
                    "speaker": speaker,
                    "duration": turn.end - turn.start
                })
            
            # 화자 매핑 업데이트
            self._update_speaker_mapping(segments)
            
            return {
                "segments": segments,
                "speakers": list(set([s["speaker"] for s in segments])),
                "total_duration": max([s["end"] for s in segments]) if segments else 0,
                "success": True
            }
            
        except Exception as e:
            logging.error(f"화자 분리 실패: {e}")
            return {
                "error": str(e),
                "success": False
            }
    
    def _update_speaker_mapping(self, segments: List[Dict]):
        """화자 ID를 의미있는 이름으로 매핑"""
        if not segments:
            return
            
        # 화자별 총 발화 시간 계산
        speaker_times = {}
        for segment in segments:
            speaker = segment["speaker"]
            if speaker not in speaker_times:
                speaker_times[speaker] = 0
            speaker_times[speaker] += segment["duration"]
        
        # 발화 시간 순으로 정렬하여 면접관/지원자 구분
        sorted_speakers = sorted(speaker_times.items(), key=lambda x: x[1], reverse=True)
        
        # 새로운 매핑 생성
        new_mapping = {}
        for i, (speaker_id, _) in enumerate(sorted_speakers):
            if i < 3:  # 상위 3명은 면접관으로 가정
                new_mapping[speaker_id] = f"면접관_{i+1}"
            else:  # 나머지는 지원자로 가정
                new_mapping[speaker_id] = f"지원자_{i-2}"
        
        self.speaker_mapping = new_mapping
    
    def get_speaker_name(self, speaker_id: str) -> str:
        """화자 ID를 의미있는 이름으로 변환"""
        return self.speaker_mapping.get(speaker_id, speaker_id)
    
    def analyze_speaker_patterns(self, segments: List[Dict]) -> Dict[str, Any]:
        """화자별 패턴 분석"""
        if not segments:
            return {"error": "세그먼트가 없습니다", "success": False}
        
        speaker_stats = {}
        
        for segment in segments:
            speaker = self.get_speaker_name(segment["speaker"])
            
            if speaker not in speaker_stats:
                speaker_stats[speaker] = {
                    "total_time": 0,
                    "segments": 0,
                    "avg_duration": 0,
                    "interruptions": 0
                }
            
            speaker_stats[speaker]["total_time"] += segment["duration"]
            speaker_stats[speaker]["segments"] += 1
        
        # 평균 발화 시간 계산
        for speaker in speaker_stats:
            if speaker_stats[speaker]["segments"] > 0:
                speaker_stats[speaker]["avg_duration"] = (
                    speaker_stats[speaker]["total_time"] / 
                    speaker_stats[speaker]["segments"]
                )
        
        return {
            "speaker_stats": speaker_stats,
            "success": True
        }

# 전역 인스턴스
speaker_diarization_tool = SpeakerDiarizationTool()

def speaker_diarization_tool_function(state: Dict[str, Any]) -> Dict[str, Any]:
    """화자 분리 도구 함수
    
    Args:
        state: 현재 상태 (audio_file_path 포함)
        
    Returns:
        화자 분리 결과가 포함된 상태
    """
    audio_file_path = state.get("audio_file_path")
    if not audio_file_path:
        return {**state, "diarization": {"error": "No audio file provided"}}
    
    # 화자 분리 수행
    diarization_result = speaker_diarization_tool.diarize_audio(audio_file_path)
    
    if not diarization_result["success"]:
        return {**state, "diarization": diarization_result}
    
    # 화자 패턴 분석
    pattern_result = speaker_diarization_tool.analyze_speaker_patterns(
        diarization_result["segments"]
    )
    
    return {
        **state,
        "diarization": {
            "segments": diarization_result["segments"],
            "speakers": diarization_result["speakers"],
            "speaker_mapping": speaker_diarization_tool.speaker_mapping,
            "pattern_analysis": pattern_result,
            "timestamp": datetime.now().isoformat()
        }
    } 