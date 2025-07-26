import time
from sqlalchemy.orm import sessionmaker
from agent.tools.speech_recognition_tool import SpeechRecognitionTool
from app.models.interview_question_log import InterviewQuestionLog
from datetime import datetime

Session = sessionmaker(bind=...)  # DB 엔진 바인딩

def agent_worker():
    speech_tool = SpeechRecognitionTool()
    while True:
        session = Session()
        logs = session.query(InterviewQuestionLog).filter_by(status='pending').all()
        for log in logs:
            try:
                log.status = 'processing'
                session.commit()
                trans_result = speech_tool.transcribe_audio(log.answer_audio_url)
                trans_text = trans_result.get("text", "")
                # 감정/태도/점수화 등 추가 분석
                log.answer_text_transcribed = trans_text
                log.emotion = "보통"
                log.attitude = "보통"
                log.answer_score = 4.0
                log.answer_feedback = "자동 분석 결과"
                log.status = 'done'
                log.updated_at = datetime.now()
                session.commit()
            except Exception as e:
                log.status = 'failed'
                log.answer_feedback = f"분석 실패: {str(e)}"
                session.commit()
        session.close()
        time.sleep(10)