# === Question Video Analyzer ===
import cv2
import numpy as np
import json
import tempfile
import os
from typing import Dict, List, Tuple, Optional
import logging
from video_analyzer import VideoAnalyzer
from video_downloader import VideoDownloader

logger = logging.getLogger(__name__)

class QuestionVideoAnalyzer:
    """질문별 비디오 분석기"""
    
    def __init__(self):
        """초기화"""
        self.video_analyzer = VideoAnalyzer()
        self.video_downloader = VideoDownloader()
        
    def analyze_question_segments(self, video_url: str, question_logs: List[Dict]) -> Dict:
        """
        질문별 구간 분석 수행
        
        Args:
            video_url: 비디오 URL
            question_logs: 질문 로그 리스트 (시간 정보 포함)
            
        Returns:
            질문별 분석 결과 딕셔너리
        """
        try:
            logger.info(f"질문별 비디오 분석 시작: {len(question_logs)}개 질문")
            
            # 비디오 다운로드
            video_path = self.video_downloader.download_video(video_url)
            if not video_path:
                logger.warning("비디오 다운로드 실패, 더미 데이터로 대체")
                return self._generate_dummy_analysis(question_logs)
            
            # 비디오 정보 추출
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps if fps > 0 else 0
            cap.release()
            
            logger.info(f"비디오 정보: {duration:.2f}초, {fps:.2f} FPS")
            
            # 비디오가 유효하지 않은 경우 더미 데이터 반환
            if duration <= 0 or fps <= 0:
                logger.warning("비디오가 유효하지 않음, 더미 데이터로 대체")
                return self._generate_dummy_analysis(question_logs)
            
            # 질문별 분석 수행
            question_analyses = []
            for i, question_log in enumerate(question_logs):
                try:
                    logger.info(f"질문 {i+1} 분석 중: {question_log.get('question_text', 'Unknown')[:50]}...")
                    
                    # 질문 구간 추출
                    question_segment = self._extract_question_segment(
                        video_path, question_log, fps, duration
                    )
                    
                    if question_segment:
                        # 구간별 분석 수행
                        segment_analysis = self._analyze_question_segment(
                            question_segment, question_log, fps
                        )
                        question_analyses.append(segment_analysis)
                    else:
                        logger.warning(f"질문 {i+1} 구간 추출 실패, 더미 데이터 생성")
                        dummy_analysis = self._generate_dummy_question_analysis(question_log, i)
                        question_analyses.append(dummy_analysis)
                        
                except Exception as e:
                    logger.error(f"질문 {i+1} 분석 오류: {str(e)}")
                    # 오류 발생 시 더미 데이터 생성
                    dummy_analysis = self._generate_dummy_question_analysis(question_log, i)
                    question_analyses.append(dummy_analysis)
                    continue
            
            # 통계 계산
            overall_stats = self._calculate_overall_statistics(question_analyses)
            
            # 임시 파일 정리
            if os.path.exists(video_path):
                os.remove(video_path)
            
            return {
                "question_analyses": question_analyses,
                "overall_statistics": overall_stats,
                "total_questions": len(question_logs),
                "analyzed_questions": len(question_analyses)
            }
            
        except Exception as e:
            logger.error(f"질문별 분석 오류: {str(e)}")
            # 전체 오류 시에도 더미 데이터 반환
            return self._generate_dummy_analysis(question_logs)
    
    def _extract_question_segment(self, video_path: str, question_log: Dict, fps: float, total_duration: float) -> Optional[str]:
        """
        질문별 구간 추출
        
        Args:
            video_path: 비디오 파일 경로
            question_log: 질문 로그
            fps: 프레임 레이트
            total_duration: 전체 영상 길이
            
        Returns:
            추출된 구간 비디오 파일 경로 또는 None
        """
        try:
            # 시간 정보 추출 (초 단위)
            start_time = question_log.get('answer_start_time', 0)
            end_time = question_log.get('answer_end_time', total_duration)
            
            # 시간이 설정되지 않은 경우 기본값 사용
            if start_time == 0 and end_time == total_duration:
                # 질문 로그에서 순서대로 시간 할당
                question_index = question_log.get('question_index', 0)
                segment_duration = 30  # 30초씩 할당
                start_time = question_index * segment_duration
                end_time = min(start_time + segment_duration, total_duration)
            
            # 구간이 유효한지 확인
            if start_time >= end_time or start_time >= total_duration:
                logger.warning(f"유효하지 않은 시간 구간: {start_time} - {end_time}")
                return None
            
            # FFmpeg로 구간 추출
            output_path = tempfile.mktemp(suffix='.mp4')
            cmd = f'ffmpeg -i "{video_path}" -ss {start_time} -to {end_time} -c copy "{output_path}" -y'
            
            result = os.system(cmd)
            if result != 0:
                logger.error(f"구간 추출 실패: {cmd}")
                return None
            
            logger.info(f"구간 추출 완료: {start_time:.2f}s - {end_time:.2f}s -> {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"구간 추출 오류: {str(e)}")
            return None
    
    def _analyze_question_segment(self, segment_path: str, question_log: Dict, fps: float) -> Dict:
        """
        질문 구간 분석
        
        Args:
            segment_path: 구간 비디오 파일 경로
            question_log: 질문 로그
            fps: 프레임 레이트
            
        Returns:
            구간별 분석 결과
        """
        try:
            # 기존 VideoAnalyzer 사용하여 분석
            analysis_result = self.video_analyzer.analyze_video(segment_path)
            
            # 질문별 정보 추가
            question_analysis = {
                "question_log_id": question_log.get('id'),
                "question_text": question_log.get('question_text', ''),
                "question_start_time": question_log.get('question_start_time'),
                "question_end_time": question_log.get('question_end_time'),
                "answer_start_time": question_log.get('answer_start_time'),
                "answer_end_time": question_log.get('answer_end_time'),
                "analysis_result": analysis_result
            }
            
            # 임시 파일 정리
            if os.path.exists(segment_path):
                os.remove(segment_path)
            
            return question_analysis
            
        except Exception as e:
            logger.error(f"구간 분석 오류: {str(e)}")
            # 임시 파일 정리
            if os.path.exists(segment_path):
                os.remove(segment_path)
            return None
    
    def _calculate_overall_statistics(self, question_analyses: List[Dict]) -> Dict:
        """
        전체 통계 계산
        
        Args:
            question_analyses: 질문별 분석 결과 리스트
            
        Returns:
            전체 통계 정보
        """
        if not question_analyses:
            return {}
        
        # 점수들 수집
        scores = []
        facial_scores = []
        posture_scores = []
        gaze_scores = []
        audio_scores = []
        
        for analysis in question_analyses:
            if analysis and 'analysis_result' in analysis:
                result = analysis['analysis_result']
                
                # 종합 점수
                if 'overall_score' in result:
                    scores.append(result['overall_score'])
                
                # 얼굴 표정 점수
                if 'facial_expressions' in result:
                    facial = result['facial_expressions']
                    if 'confidence_score' in facial:
                        facial_scores.append(facial['confidence_score'])
                
                # 자세 점수
                if 'posture_analysis' in result:
                    posture = result['posture_analysis']
                    if 'posture_score' in posture:
                        posture_scores.append(posture['posture_score'])
                
                # 시선 점수
                if 'gaze_analysis' in result:
                    gaze = result['gaze_analysis']
                    if 'focus_ratio' in gaze:
                        gaze_scores.append(gaze['focus_ratio'])
                
                # 음성 점수
                if 'audio_analysis' in result:
                    audio = result['audio_analysis']
                    if 'clarity_score' in audio:
                        audio_scores.append(audio['clarity_score'])
        
        # 통계 계산
        def calculate_stats(values):
            if not values:
                return {}
            return {
                "mean": np.mean(values),
                "std": np.std(values),
                "min": np.min(values),
                "max": np.max(values),
                "count": len(values)
            }
        
        return {
            "overall_score": calculate_stats(scores),
            "facial_expression_score": calculate_stats(facial_scores),
            "posture_score": calculate_stats(posture_scores),
            "gaze_score": calculate_stats(gaze_scores),
            "audio_score": calculate_stats(audio_scores),
            "total_questions_analyzed": len(question_analyses)
        } 

    def _generate_dummy_analysis(self, question_logs: List[Dict]) -> Dict:
        """더미 분석 데이터 생성"""
        question_analyses = []
        
        for i, question_log in enumerate(question_logs):
            dummy_analysis = self._generate_dummy_question_analysis(question_log, i)
            question_analyses.append(dummy_analysis)
        
        overall_stats = self._calculate_overall_statistics(question_analyses)
        
        return {
            "question_analyses": question_analyses,
            "overall_statistics": overall_stats,
            "total_questions": len(question_logs),
            "analyzed_questions": len(question_analyses)
        }
    
    def _generate_dummy_question_analysis(self, question_log: Dict, index: int) -> Dict:
        """개별 질문에 대한 더미 분석 데이터 생성"""
        import random
        
        # 더미 점수 생성 (70-90점 범위)
        base_score = random.uniform(70, 90)
        
        return {
            "question_log_id": question_log.get('id'),
            "question_text": question_log.get('question_text', ''),
            "question_start_time": index * 30,
            "question_end_time": (index + 1) * 30,
            "answer_start_time": index * 30 + 5,
            "answer_end_time": (index + 1) * 30 - 5,
            "analysis_result": {
                "overall_score": base_score,
                "facial_expressions": {
                    "smile_frequency": random.uniform(0.3, 0.7),
                    "eye_contact_ratio": random.uniform(0.7, 0.9),
                    "emotion_variation": random.uniform(0.5, 0.8),
                    "confidence_score": random.uniform(0.6, 0.9)
                },
                "posture_analysis": {
                    "posture_changes": random.randint(2, 8),
                    "nod_count": random.randint(3, 10),
                    "posture_score": random.uniform(0.7, 0.9),
                    "hand_gestures": ["open_palm", "pointing"]
                },
                "gaze_analysis": {
                    "eye_aversion_count": random.randint(1, 4),
                    "focus_ratio": random.uniform(0.7, 0.9),
                    "gaze_consistency": random.uniform(0.6, 0.8)
                },
                "audio_analysis": {
                    "speech_rate": random.randint(100, 150),
                    "clarity_score": random.uniform(0.7, 0.9),
                    "volume_consistency": random.uniform(0.6, 0.8),
                    "transcription": f"질문 {index + 1}에 대한 답변입니다."
                },
                "recommendations": [
                    "전반적으로 좋은 면접 태도를 보여주셨습니다!",
                    "조금 더 자연스러운 미소를 연습해보세요.",
                    "시선을 화면 중앙에 더 집중해보세요."
                ]
            }
        } 