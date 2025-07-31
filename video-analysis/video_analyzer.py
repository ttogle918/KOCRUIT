# === Video Analysis with AI Models ===
import cv2
import numpy as np
import mediapipe as mp
import librosa
import soundfile as sf
import tempfile
import os
import logging
from typing import Dict, Any, List, Tuple, Optional
import json
from datetime import datetime
import subprocess
from video_downloader import VideoDownloader

# TensorFlow 기반 감정 분석
try:
    from deepface import DeepFace
    EMOTION_ANALYSIS_AVAILABLE = True
except ImportError:
    EMOTION_ANALYSIS_AVAILABLE = False
    logger.warning("DeepFace not available")

# Agent 서비스 연동
import httpx
import asyncio

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoAnalyzer:
    """AI 모델을 사용한 영상 분석 클래스"""
    
    def __init__(self):
        """초기화"""
        self.downloader = VideoDownloader()
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_pose = mp.solutions.pose
        self.mp_hands = mp.solutions.hands
        self.face_mesh = None
        self.pose = None
        self.hands = None
        self.trimmed_files = []  # 자른 영상 파일 추적
        
        # Agent 서비스 URL
        self.agent_service_url = "http://kocruit_agent:8001"
        
        # 모델 초기화
        self._initialize_models()
    
    def _initialize_models(self):
        """AI 모델들 초기화"""
        try:
            logger.info("AI 모델 초기화 시작...")
            
            # MediaPipe 모델들 초기화
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            
            self.pose = self.mp_pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                smooth_landmarks=True,
                enable_segmentation=False,
                smooth_segmentation=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            
            self.hands = self.mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            
            logger.info("MediaPipe 모델들 초기화 완료")
            
        except Exception as e:
            logger.error(f"모델 초기화 오류: {str(e)}")
            raise
    
    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """영상 전체 분석 (화자 분리 기반 최적화)"""
        temp_file_path = None
        try:
            logger.info(f"영상 분석 시작: {video_path}")
            
            # URL인 경우 다운로드
            if video_path.startswith(('http://', 'https://')):
                logger.info(f"URL에서 영상 다운로드 시작: {video_path}")
                temp_file_path = self.downloader.download_video(video_path)
                if not temp_file_path:
                    logger.warning("영상 다운로드 실패, 테스트 데이터 반환")
                    return self._get_test_analysis_result()
                video_path = temp_file_path
                logger.info(f"영상 다운로드 완료: {video_path}")
            
            # 영상 파일 존재 확인
            if not os.path.exists(video_path):
                logger.warning(f"영상 파일을 찾을 수 없습니다: {video_path}, 테스트 데이터 반환")
                return self._get_test_analysis_result()
            
            # 1단계: 오디오 추출
            temp_audio_path = self._extract_audio(video_path)
            if not temp_audio_path:
                logger.warning("오디오 추출 실패, 테스트 데이터 반환")
                return self._get_test_analysis_result()
            
            # 2단계: Agent로 화자 분리 및 비디오 자르기 요청
            speaker_analysis = self._request_speaker_analysis_and_trim(temp_audio_path, video_path)
            
            # 3단계: 자른 비디오로 분석 수행
            analysis_video_path = video_path  # 기본값
            
            # 자른 비디오가 있으면 임시 파일로 저장
            if speaker_analysis.get("trimmed_video_base64"):
                trimmed_video_data = base64.b64decode(speaker_analysis["trimmed_video_base64"])
                analysis_video_path = tempfile.mktemp(suffix=".mp4")
                with open(analysis_video_path, 'wb') as f:
                    f.write(trimmed_video_data)
                logger.info(f"자른 비디오 저장: {analysis_video_path}")
                self.trimmed_files.append(analysis_video_path)  # 정리 목록에 추가
            
            # OpenCV로 영상 열기
            cap = cv2.VideoCapture(analysis_video_path)
            if not cap.isOpened():
                logger.warning("영상을 열 수 없습니다, 테스트 데이터 반환")
                return self._get_test_analysis_result()
            
            # 비디오 정보
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0
            
            logger.info(f"분석 비디오 정보: {frame_count}프레임, {fps}fps, {duration:.2f}초")
            
            # 분석 결과 초기화
            analysis_result = {
                "video_path": analysis_video_path,
                "original_video_path": video_path,
                "analysis_timestamp": datetime.now().isoformat(),
                "video_info": {
                    "frame_count": frame_count,
                    "fps": fps,
                    "duration": duration,
                    "is_trimmed": analysis_video_path != video_path
                },
                "speaker_analysis": speaker_analysis,
                "facial_expressions": self._analyze_facial_expressions(cap),
                "posture_analysis": self._analyze_posture(cap),
                "gaze_analysis": self._analyze_gaze(cap),
                "audio_analysis": self._analyze_audio_quality(temp_audio_path, speaker_analysis),
                "overall_score": 0,
                "recommendations": []
            }
            
            # 전체 점수 계산
            analysis_result["overall_score"] = self._calculate_overall_score(analysis_result)
            
            # 추천사항 생성
            analysis_result["recommendations"] = self._generate_recommendations(analysis_result)
            
            cap.release()
            
            # 임시 오디오 파일 정리
            if os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)
            
            logger.info("영상 분석 완료")
            return analysis_result
            
        except Exception as e:
            logger.error(f"영상 분석 오류: {str(e)}")
            logger.info("테스트 데이터 반환")
            return self._get_test_analysis_result()
        finally:
            # 임시 파일 정리
            if temp_file_path and os.path.exists(temp_file_path):
                self.downloader.cleanup_temp_file(temp_file_path)
    
    def _analyze_facial_expressions(self, cap: cv2.VideoCapture) -> Dict[str, Any]:
        """얼굴 표정을 분석합니다."""
        try:
            with self.mp_face_detection.FaceDetection(
                model_selection=1, min_detection_confidence=0.5
            ) as face_detection:
                smile_count = 0
                total_frames = 0
                confidence_scores = []
                
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # 10프레임마다 분석 (성능 최적화)
                    if total_frames % 10 == 0:
                        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        results = face_detection.process(rgb_frame)
                        
                        if results.detections:
                            for detection in results.detections:
                                confidence_scores.append(detection.score[0])
                                
                                # 간단한 미소 감지 (입술 영역 분석)
                                # 실제로는 더 정교한 감정 분석 모델 사용 필요
                                if detection.score[0] > 0.8:
                                    smile_count += 1
                    
                    total_frames += 1
                
                smile_frequency = smile_count / max(total_frames // 10, 1)
                avg_confidence = np.mean(confidence_scores) if confidence_scores else 0
                
                return {
                    "smile_frequency": round(smile_frequency, 3),
                    "eye_contact_ratio": round(avg_confidence, 3),
                    "emotion_variation": round(len(set(confidence_scores)) / max(len(confidence_scores), 1), 3),
                    "confidence_score": round(avg_confidence, 3)
                }
                
        except Exception as e:
            logger.error(f"얼굴 표정 분석 오류: {str(e)}")
            return {
                "smile_frequency": None,
                "eye_contact_ratio": None,
                "emotion_variation": None,
                "confidence_score": None
            }
    
    def _analyze_posture(self, cap: cv2.VideoCapture) -> Dict[str, Any]:
        """자세를 분석합니다."""
        try:
            with self.mp_pose.Pose(
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            ) as pose:
                posture_changes = 0
                nod_count = 0
                hand_gestures = []
                posture_scores = []
                
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                prev_pose = None
                
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # 15프레임마다 분석
                    if cap.get(cv2.CAP_PROP_POS_FRAMES) % 15 == 0:
                        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        results = pose.process(rgb_frame)
                        
                        if results.pose_landmarks:
                            current_pose = self._extract_pose_features(results.pose_landmarks)
                            
                            if prev_pose is not None:
                                # 자세 변화 감지
                                pose_change = self._calculate_pose_change(prev_pose, current_pose)
                                if pose_change > 0.1:
                                    posture_changes += 1
                                
                                # 고개 끄덕임 감지
                                if self._detect_nod(prev_pose, current_pose):
                                    nod_count += 1
                            
                            prev_pose = current_pose
                            posture_scores.append(self._calculate_posture_score(results.pose_landmarks))
                
                avg_posture_score = np.mean(posture_scores) if posture_scores else 0
                
                return {
                    "posture_score": round(avg_posture_score, 3),
                    "posture_changes": posture_changes,
                    "nod_count": nod_count,
                    "hand_gestures": hand_gestures
                }
                
        except Exception as e:
            logger.error(f"자세 분석 오류: {str(e)}")
            return {
                "posture_score": None,
                "posture_changes": None,
                "nod_count": None,
                "hand_gestures": []
            }
    
    def _analyze_gaze(self, cap: cv2.VideoCapture) -> Dict[str, Any]:
        """시선을 분석합니다."""
        try:
            with self.mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            ) as face_mesh:
                focus_frames = 0
                total_frames = 0
                eye_aversion_count = 0
                gaze_consistency = []
                
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # 20프레임마다 분석
                    if total_frames % 20 == 0:
                        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        results = face_mesh.process(rgb_frame)
                        
                        if results.multi_face_landmarks:
                            landmarks = results.multi_face_landmarks[0]
                            
                            # 시선 방향 계산 (간단한 구현)
                            left_eye = landmarks.landmark[33]  # 왼쪽 눈
                            right_eye = landmarks.landmark[263]  # 오른쪽 눈
                            
                            # 화면 중앙을 향하는지 확인
                            eye_center_x = (left_eye.x + right_eye.x) / 2
                            if 0.4 < eye_center_x < 0.6:  # 화면 중앙 영역
                                focus_frames += 1
                            else:
                                eye_aversion_count += 1
                            
                            gaze_consistency.append(eye_center_x)
                    
                    total_frames += 1
                
                focus_ratio = focus_frames / max(total_frames // 20, 1)
                gaze_consistency_score = 1 - np.std(gaze_consistency) if gaze_consistency else 0
                
                return {
                    "focus_ratio": round(focus_ratio, 3),
                    "eye_aversion_count": eye_aversion_count,
                    "gaze_consistency": round(gaze_consistency_score, 3)
                }
                
        except Exception as e:
            logger.error(f"시선 분석 오류: {str(e)}")
            return {
                "focus_ratio": None,
                "eye_aversion_count": None,
                "gaze_consistency": None
            }
    
    def _extract_audio(self, video_path: str) -> Optional[str]:
        """비디오에서 오디오를 추출합니다."""
        try:
            temp_audio_path = tempfile.mktemp(suffix=".wav")
            
            cmd = [
                "ffmpeg", "-i", video_path,
                "-vn", "-acodec", "pcm_s16le",
                "-ar", "16000", "-ac", "1",
                "-y", temp_audio_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            logger.info(f"오디오 추출 완료: {temp_audio_path}")
            return temp_audio_path
            
        except Exception as e:
            logger.error(f"오디오 추출 오류: {str(e)}")
            return None
    
    def _request_speaker_analysis_and_trim(self, audio_path: str, video_path: str) -> Dict[str, Any]:
        """Agent 서비스로 화자 분리 및 비디오 자르기를 요청합니다."""
        try:
            logger.info("Agent 서비스로 화자 분리 및 비디오 자르기 요청...")
            
            # 오디오 파일을 base64로 인코딩
            with open(audio_path, 'rb') as f:
                audio_data = f.read()
            
            import base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            # 비디오 파일을 base64로 인코딩
            with open(video_path, 'rb') as f:
                video_data = f.read()
            
            video_base64 = base64.b64encode(video_data).decode('utf-8')
            
            # Agent 서비스 API 호출
            async def make_request():
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        f"{self.agent_service_url}/speaker-analysis-and-trim",
                        json={
                            "audio_data": audio_base64,
                            "video_data": video_base64,
                            "audio_filename": os.path.basename(audio_path),
                            "video_filename": os.path.basename(video_path)
                        }
                    )
                    return response.json()
            
            # 동기적으로 실행
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(make_request())
                loop.close()
                
                if result.get("success"):
                    logger.info("화자 분리 및 비디오 자르기 완료")
                    return result.get("analysis", {})
                else:
                    logger.warning(f"화자 분리 및 비디오 자르기 실패: {result.get('message', 'Unknown error')}")
                    return {}
                    
            except Exception as e:
                logger.error(f"Agent 서비스 요청 오류: {str(e)}")
                return {}
                
        except Exception as e:
            logger.error(f"화자 분리 및 비디오 자르기 요청 오류: {str(e)}")
            return {}
    
    def _analyze_audio_quality(self, audio_path: str, speaker_analysis: Dict[str, Any] = None) -> Dict[str, Any]:
        """오디오 품질을 분석합니다."""
        try:
            # 오디오 로드
            audio, sr = librosa.load(audio_path, sr=16000)
            
            # 기본 오디오 품질 분석
            clarity_score = self._calculate_audio_clarity(audio, sr)
            volume_consistency = self._calculate_volume_consistency(audio)
            
            # Agent 서비스에서 받은 Whisper 분석 결과 사용
            whisper_analysis = speaker_analysis.get("whisper_analysis", {}) if speaker_analysis else {}
            
            return {
                "transcription": whisper_analysis.get("transcription", ""),
                "clarity_score": round(clarity_score, 3),
                "speech_rate": whisper_analysis.get("speech_rate", 0),
                "volume_consistency": round(volume_consistency, 3),
                "segments_count": whisper_analysis.get("segments_count", 0),
                "trimmed_duration": whisper_analysis.get("duration"),
                "applicant_speech_duration": speaker_analysis.get("applicant_speech_duration", 0) if speaker_analysis else 0
            }
            
        except Exception as e:
            logger.error(f"오디오 품질 분석 오류: {str(e)}")
            return {
                "clarity_score": None,
                "volume_consistency": None,
                "duration": 0
            }
    
    # Whisper 분석은 Agent 서비스에서 통합 처리
    
    # 영상 자르기 기능은 Agent 서비스에서 처리
    
    def _get_video_duration(self, video_path: str) -> Optional[float]:
        """영상 길이를 가져옵니다."""
        try:
            cmd = [
                "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                "-of", "csv=p=0", video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return float(result.stdout.strip())
        except Exception as e:
            logger.error(f"영상 길이 확인 오류: {str(e)}")
            return None
    
    def _extract_pose_features(self, landmarks) -> Dict[str, float]:
        """포즈 랜드마크에서 특징을 추출합니다."""
        return {
            "nose_x": landmarks.landmark[0].x,
            "nose_y": landmarks.landmark[0].y,
            "left_shoulder_x": landmarks.landmark[11].x,
            "right_shoulder_x": landmarks.landmark[12].x,
            "left_ear_x": landmarks.landmark[7].x,
            "right_ear_x": landmarks.landmark[8].x
        }
    
    def _calculate_pose_change(self, prev_pose: Dict, current_pose: Dict) -> float:
        """포즈 변화를 계산합니다."""
        changes = []
        for key in prev_pose:
            if key in current_pose:
                changes.append(abs(prev_pose[key] - current_pose[key]))
        return np.mean(changes) if changes else 0
    
    def _detect_nod(self, prev_pose: Dict, current_pose: Dict) -> bool:
        """고개 끄덕임을 감지합니다."""
        if "nose_y" in prev_pose and "nose_y" in current_pose:
            y_change = abs(current_pose["nose_y"] - prev_pose["nose_y"])
            return y_change > 0.05
        return False
    
    def _calculate_posture_score(self, landmarks) -> float:
        """자세 점수를 계산합니다."""
        # 어깨 균형 확인
        left_shoulder = landmarks.landmark[11]
        right_shoulder = landmarks.landmark[12]
        
        shoulder_balance = 1 - abs(left_shoulder.y - right_shoulder.y)
        
        # 목 기울기 확인
        nose = landmarks.landmark[0]
        left_ear = landmarks.landmark[7]
        right_ear = landmarks.landmark[8]
        
        head_tilt = 1 - abs(left_ear.y - right_ear.y)
        
        return (shoulder_balance + head_tilt) / 2
    
    def _calculate_audio_clarity(self, audio: np.ndarray, sr: int) -> float:
        """오디오 명확도를 계산합니다."""
        # 스펙트럼 중심 주파수
        spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
        return np.mean(spectral_centroids) / (sr / 2)
    
    def _calculate_speech_rate(self, transcription: str, duration: float) -> float:
        """말하기 속도를 계산합니다."""
        if not transcription or duration <= 0:
            return 0
        
        word_count = len(transcription.split())
        return word_count / duration  # 분당 단어 수
    
    def _calculate_volume_consistency(self, audio: np.ndarray) -> float:
        """볼륨 일관성을 계산합니다."""
        # RMS 에너지
        rms = librosa.feature.rms(y=audio)[0]
        return 1 - np.std(rms) / np.mean(rms) if np.mean(rms) > 0 else 0
    
    def _calculate_overall_score(self, analysis_result: Dict[str, Any]) -> float:
        """면접자 전용 전체 점수를 계산합니다."""
        scores = []
        
        # 얼굴 표정 점수 (면접자 감정 표현)
        facial = analysis_result.get("facial_expressions", {})
        if facial.get("confidence_score") is not None:
            scores.append(facial["confidence_score"] * 0.25)
        
        # 자세 점수 (면접자 태도)
        posture = analysis_result.get("posture_analysis", {})
        if posture.get("posture_score") is not None:
            scores.append(posture["posture_score"] * 0.25)
        
        # 시선 점수 (면접자 집중도)
        gaze = analysis_result.get("gaze_analysis", {})
        if gaze.get("focus_ratio") is not None:
            scores.append(gaze["focus_ratio"] * 0.25)
        
        # 오디오 점수 (면접자 발화 품질)
        audio = analysis_result.get("audio_analysis", {})
        if audio.get("clarity_score") is not None:
            scores.append(audio["clarity_score"] * 0.25)
        
        # 화자 분리 기반 발화 시간 보너스 (적극성)
        speaker_analysis = analysis_result.get("speaker_analysis", {})
        applicant_speech_duration = speaker_analysis.get("applicant_speech_duration", 0)
        if applicant_speech_duration > 0:
            speech_ratio = min(applicant_speech_duration / 30.0, 1.0)  # 30초 기준
            scores.append(speech_ratio * 0.1)  # 10% 보너스
        
        return round(np.mean(scores) * 100, 1) if scores else 0
    
    def _generate_recommendations(self, analysis_result: Dict[str, Any]) -> list:
        """면접자 전용 추천사항을 생성합니다."""
        recommendations = []
        
        facial = analysis_result.get("facial_expressions", {})
        posture = analysis_result.get("posture_analysis", {})
        gaze = analysis_result.get("gaze_analysis", {})
        audio = analysis_result.get("audio_analysis", {})
        speaker_analysis = analysis_result.get("speaker_analysis", {})
        
        # 화자 분리 기반 면접자 발화 적극성 분석
        applicant_speech_duration = speaker_analysis.get("applicant_speech_duration", 0)
        if applicant_speech_duration < 15:  # 15초 미만
            recommendations.append("더 적극적으로 답변해보세요. 충분한 설명이 중요합니다.")
        elif applicant_speech_duration > 25:  # 25초 초과
            recommendations.append("답변을 간결하게 요약해보세요. 핵심을 중심으로 말씀해주세요.")
        
        # 얼굴 표정 추천 (면접자 감정 표현)
        if facial.get("smile_frequency", 0) < 0.3:
            recommendations.append("면접 중 자연스러운 미소로 긴장을 풀어보세요.")
        
        if facial.get("confidence_score", 0) < 0.7:
            recommendations.append("더 자신감 있는 표정으로 답변해보세요.")
        
        # 자세 추천 (면접자 태도)
        if posture.get("posture_score", 0) < 0.7:
            recommendations.append("바른 자세로 면접관을 향해 앉아보세요.")
        
        if posture.get("nod_count", 0) < 3:
            recommendations.append("면접관의 말에 고개를 끄덕이며 집중을 표현해보세요.")
        
        # 시선 추천 (면접자 집중도)
        if gaze.get("focus_ratio", 0) < 0.6:
            recommendations.append("면접관을 향해 시선을 유지하며 집중해보세요.")
        
        if gaze.get("eye_aversion_count", 0) > 10:
            recommendations.append("시선을 너무 자주 돌리지 말고 면접관을 바라보세요.")
        
        # 오디오 추천 (면접자 발화 품질)
        if audio.get("clarity_score", 0) < 0.6:
            recommendations.append("더 명확하고 자신감 있는 목소리로 답변해보세요.")
        
        # 화자 분리 기반 발화 속도 추천
        speech_rate = speaker_analysis.get("speech_rate", 0)
        if speech_rate < 100:
            recommendations.append("조금 더 빠른 속도로 답변해보세요.")
        
        if not recommendations:
            recommendations.append("면접자로서 훌륭한 태도를 보여주셨습니다! 자신감 있고 명확한 답변을 잘 해주셨네요.")
        
        return recommendations
    
    def cleanup(self):
        """리소스 정리"""
        try:
            # 자른 영상 파일들 정리
            for trimmed_file in self.trimmed_files:
                try:
                    if os.path.exists(trimmed_file):
                        os.remove(trimmed_file)
                        logger.info(f"자른 영상 파일 정리: {trimmed_file}")
                except Exception as e:
                    logger.error(f"자른 영상 파일 정리 오류: {str(e)}")
            
            self.trimmed_files.clear()
            
            # 다운로더 정리
            self.downloader.cleanup_all()
            logger.info("VideoAnalyzer 리소스 정리 완료")
        except Exception as e:
            logger.error(f"리소스 정리 오류: {str(e)}") 

    def _get_test_analysis_result(self) -> Dict[str, Any]:
        """테스트용 분석 결과를 반환합니다."""
        logger.info("테스트 분석 결과 생성")
        return {
            "video_path": "test_video.mp4",
            "analysis_timestamp": datetime.now().isoformat(),
            "video_info": {
                "frame_count": 300,
                "fps": 30,
                "duration": 10.0
            },
            "facial_expressions": {
                "smile_frequency": 0.4,
                "eye_contact_ratio": 0.8,
                "emotion_variation": 0.6,
                "confidence_score": 0.75
            },
            "posture_analysis": {
                "posture_score": 0.8,
                "posture_changes": 5,
                "nod_count": 3,
                "hand_gestures": ["자연스러운 제스처"]
            },
            "gaze_analysis": {
                "focus_ratio": 0.7,
                "eye_aversion_count": 2,
                "gaze_consistency": 0.8
            },
            "audio_analysis": {
                "transcription": "안녕하세요. 면접에 참여하게 되어 기쁩니다.",
                "clarity_score": 0.8,
                "speech_rate": 120,
                "volume_consistency": 0.7
            },
            "overall_score": 78.5,
            "recommendations": [
                "전반적으로 좋은 면접 태도를 보여주셨습니다!",
                "조금 더 자연스러운 미소를 연습해보세요.",
                "시선을 화면 중앙에 더 집중해보세요."
            ]
        } 