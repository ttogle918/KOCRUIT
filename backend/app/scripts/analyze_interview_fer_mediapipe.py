# analyze_interview_fer_mediapipe.py

import moviepy.editor as mp
import speech_recognition as sr
from pydub import AudioSegment, silence
import cv2
from fer import FER
import mediapipe as mp_mediapipe
import numpy as np
import json

video_path = "input.mp4"
audio_path = "audio.wav"
video = mp.VideoFileClip(video_path)
video.audio.write_audiofile(audio_path)

# 오디오 분석
recognizer = sr.Recognizer()
with sr.AudioFile(audio_path) as source:
    audio = recognizer.record(source)
    try:
        text = recognizer.recognize_google(audio, language="ko-KR")
    except Exception:
        text = ""
audio_seg = AudioSegment.from_wav(audio_path)
duration_sec = len(audio_seg) / 1000
loudness = audio_seg.dBFS
word_count = len(text.split())
speech_rate = word_count / duration_sec * 60 if duration_sec > 0 else 0
silence_chunks = silence.detect_silence(audio_seg, min_silence_len=500, silence_thresh=audio_seg.dBFS-14)
total_silence_time = sum([(end - start) for start, end in silence_chunks]) / 1000

# 감정/표정 분석 (fer)
cap = cv2.VideoCapture(video_path)
frame_rate = int(cap.get(cv2.CAP_PROP_FPS))
frame_count = 0
smile_count = 0
emotion_variation = set()
detector = FER()

# 시선/자세 분석 (mediapipe)
mp_face = mp_mediapipe.solutions.face_mesh
face_mesh = mp_face.FaceMesh(static_image_mode=False, max_num_faces=1)
eye_contact_good = 0
eye_contact_total = 0
posture_changes = 0
last_nose_y = None

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    if frame_count % (frame_rate * 2) == 0:  # 2초마다 분석
        # 감정(fer)
        try:
            result = detector.detect_emotions(frame)
            if result and result[0]["emotions"]:
                emotions = result[0]["emotions"]
                dominant_emotion = max(emotions, key=emotions.get)
                emotion_variation.add(dominant_emotion)
                if dominant_emotion == "happy":
                    smile_count += 1
        except Exception:
            pass
        # 시선/자세(간단 예시)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)
        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0].landmark
            # 시선: 양쪽 눈의 x좌표 평균이 중앙에 가까우면 정면
            left_eye = landmarks[33]
            right_eye = landmarks[263]
            eye_center_x = (left_eye.x + right_eye.x) / 2
            if 0.4 < eye_center_x < 0.6:
                eye_contact_good += 1
            eye_contact_total += 1
            # 자세: 코의 y좌표 변화로 간단 추정
            nose_y = landmarks[1].y
            if last_nose_y is not None and abs(nose_y - last_nose_y) > 0.02:
                posture_changes += 1
            last_nose_y = nose_y
    frame_count += 1
cap.release()

# 텍스트 분석(키워드, 반복)
from textblob import TextBlob
blob = TextBlob(text)
keywords = [word for word, tag in blob.tags if tag.startswith('NN')]
redundancy_score = 1 - (len(set(text.split())) / (word_count + 1e-5))

# 기타
background_noise_level = "low" if loudness > -30 else "high"
other_person_detected = False  # 실제로는 얼굴 인식 등 추가 필요
overtime_flag = duration_sec > 60

# 결과 저장
result = {
    "answer_text": text,
    "answer_duration_sec": duration_sec,
    "speech_rate": speech_rate,
    "audio_loudness": loudness,
    "total_silence_time": total_silence_time,
    "smile_frequency": smile_count,
    "facial_expression_variation": list(emotion_variation),
    "eye_contact_ratio": eye_contact_good / (eye_contact_total + 1e-5),
    "posture_changes": posture_changes,
    "keyword_coverage": keywords,
    "redundancy_score": redundancy_score,
    "background_noise_level": background_noise_level,
    "other_person_detected": other_person_detected,
    "overtime_flag": overtime_flag
}

with open("ai_interview_analysis_68.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("분석 결과가 ai_interview_analysis_68.json에 저장되었습니다.")

#  {
#       "applicant_id": 43,
#       "responses": [
#         {
#           "category": "기업문화",
#           "ai_question": "KOSA공공에 지원하게 된 동기는 무엇인가요?",
#           "answer_text": "디지털 전환을 통해 공공서비스의 효율성을 향상하고 싶습니다. KOSA공공이 추진하는 스마트 행정 프로젝트에 공헌하며 장기적 비전을 실현하고자 지원했습니다.",
#           "answer_duration_sec": 34.2,
#           "speech_rate": 155.6,
#           "audio_loudness": -18.4,
#           "total_silence_time": 1.1,
#           "smile_frequency": 2,
#           "facial_expression_variation": ["neutral", "positive"],
#           "eye_contact_ratio": 0.90,
#           "posture_changes": 1,
#           "keyword_coverage": ["디지털 전환", "스마트 행정", "비전"],
#           "redundancy_score": 0.05,
#           "background_noise_level": "low",
#           "other_person_detected": false,
#           "overtime_flag": false
#         },
#     ...