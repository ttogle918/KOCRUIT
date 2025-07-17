from langchain_openai import ChatOpenAI
from typing import Dict, List, Any, Optional
import json
from datetime import datetime

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

def realtime_interview_evaluation_tool(state: Dict[str, Any]) -> Dict[str, Any]:
    """실시간 면접 평가 도구
    
    Args:
        state: 현재 상태 (transcription, speakers, job_info, resume_info 포함)
        
    Returns:
        실시간 평가 결과가 포함된 상태
    """
    transcription = state.get("transcription", "")
    speakers = state.get("speakers", [])
    job_info = state.get("job_info", "")
    resume_info = state.get("resume_info", "")
    current_time = state.get("current_time", 0)
    
    if not transcription:
        return {**state, "realtime_evaluation": {"error": "No transcription provided"}}
    
    # 면접 진행 상황 분석
    interview_progress = _analyze_interview_progress(transcription, speakers, current_time)
    
    # 실시간 평가 생성
    evaluation = _generate_realtime_evaluation(
        transcription, speakers, job_info, resume_info, interview_progress
    )
    
    # 메모 자동 생성
    auto_memo = _generate_auto_memo(evaluation, transcription, speakers)
    
    return {
        **state,
        "realtime_evaluation": {
            "evaluation": evaluation,
            "auto_memo": auto_memo,
            "interview_progress": interview_progress,
            "timestamp": datetime.now().isoformat()
        }
    }

def _analyze_interview_progress(transcription: str, speakers: List[Dict], current_time: float) -> Dict[str, Any]:
    """면접 진행 상황 분석"""
    
    # 화자별 발화 시간 계산
    speaker_times = {}
    for speaker in speakers:
        speaker_id = speaker.get("speaker", "unknown")
        duration = speaker.get("end", 0) - speaker.get("start", 0)
        speaker_times[speaker_id] = speaker_times.get(speaker_id, 0) + duration
    
    # 면접 단계 추정
    total_duration = current_time
    interview_stage = "introduction"
    if total_duration > 300:  # 5분 이상
        interview_stage = "main_questions"
    if total_duration > 600:  # 10분 이상
        interview_stage = "detailed_discussion"
    if total_duration > 900:  # 15분 이상
        interview_stage = "closing"
    
    return {
        "total_duration": total_duration,
        "speaker_times": speaker_times,
        "interview_stage": interview_stage,
        "transcription_length": len(transcription)
    }

def _generate_realtime_evaluation(
    transcription: str, 
    speakers: List[Dict], 
    job_info: str, 
    resume_info: str, 
    progress: Dict[str, Any]
) -> Dict[str, Any]:
    """실시간 평가 생성"""
    
    prompt = f"""
    다음은 진행 중인 면접의 음성 인식 결과입니다:
    
    면접 내용:
    {transcription}
    
    화자 정보:
    {json.dumps(speakers, ensure_ascii=False, indent=2)}
    
    채용공고 정보:
    {job_info}
    
    지원자 이력서 정보:
    {resume_info}
    
    면접 진행 상황:
    - 총 시간: {progress['total_duration']}초
    - 현재 단계: {progress['interview_stage']}
    - 화자별 발화 시간: {progress['speaker_times']}
    
    위 정보를 바탕으로 실시간 면접 평가를 해주세요.
    
    평가 기준:
    1. 기술력 (0-5점): 기술적 지식과 경험
    2. 의사소통능력 (0-5점): 명확한 설명과 소통
    3. 인성 (0-5점): 태도와 협력성
    4. 적극성 (0-5점): 적극적인 참여와 관심
    5. 직무 적합성 (0-5점): 채용공고와의 매칭도
    
    JSON 형식으로 응답해주세요:
    {{
        "scores": {{
            "technical_skills": 4,
            "communication": 3,
            "personality": 4,
            "proactiveness": 3,
            "job_fit": 4
        }},
        "strengths": ["강점1", "강점2"],
        "weaknesses": ["개선점1", "개선점2"],
        "suggested_questions": ["추천질문1", "추천질문2"],
        "overall_impression": "전체적인 인상",
        "next_focus": "다음에 집중할 영역"
    }}
    """
    
    try:
        response = llm.invoke(prompt)
        if isinstance(response.content, str):
            evaluation = json.loads(response.content)
        else:
            # response.content가 이미 dict인 경우
            evaluation = response.content if isinstance(response.content, dict) else {}
        return evaluation
    except Exception as e:
        return {
            "scores": {"technical_skills": 0, "communication": 0, "personality": 0, "proactiveness": 0, "job_fit": 0},
            "strengths": [],
            "weaknesses": [],
            "suggested_questions": [],
            "overall_impression": "평가 생성 중 오류 발생",
            "next_focus": "기본 질문 계속",
            "error": str(e)
        }

def _generate_auto_memo(evaluation: Dict[str, Any], transcription: str, speakers: List[Dict]) -> str:
    """자동 메모 생성"""
    memo_parts = []
    
    # 시간 정보
    if speakers:
        last_speaker = speakers[-1]
        memo_parts.append(f"[{last_speaker.get('end', 0):.1f}초]")
    
    # 평가 점수 요약
    scores = evaluation.get("scores", {})
    if scores:
        avg_score = sum(scores.values()) / len(scores)
        memo_parts.append(f"평균점수: {avg_score:.1f}/5.0")
    
    # 강점
    strengths = evaluation.get("strengths", [])
    if strengths:
        memo_parts.append(f"강점: {', '.join(strengths[:2])}")
    
    # 개선점
    weaknesses = evaluation.get("weaknesses", [])
    if weaknesses:
        memo_parts.append(f"개선점: {', '.join(weaknesses[:2])}")
    
    # 전체 인상
    impression = evaluation.get("overall_impression", "")
    if impression:
        memo_parts.append(f"인상: {impression}")
    
    # 다음 집중 영역
    next_focus = evaluation.get("next_focus", "")
    if next_focus:
        memo_parts.append(f"다음: {next_focus}")
    
    return " | ".join(memo_parts)

def continuous_evaluation_tool(state: Dict[str, Any]) -> Dict[str, Any]:
    """연속적인 면접 평가 (실시간 업데이트용)"""
    
    # 이전 평가 결과 가져오기
    previous_evaluation = state.get("realtime_evaluation", {})
    
    # 새로운 평가 수행
    new_evaluation = realtime_interview_evaluation_tool(state)
    
    # 평가 변화 분석
    if previous_evaluation and "evaluation" in previous_evaluation:
        changes = _analyze_evaluation_changes(
            previous_evaluation["evaluation"],
            new_evaluation["realtime_evaluation"]["evaluation"]
        )
        new_evaluation["realtime_evaluation"]["changes"] = changes
    
    return new_evaluation

def _analyze_evaluation_changes(previous: Dict[str, Any], current: Dict[str, Any]) -> Dict[str, Any]:
    """평가 변화 분석"""
    changes = {
        "score_changes": {},
        "new_strengths": [],
        "new_weaknesses": [],
        "improvements": [],
        "concerns": []
    }
    
    # 점수 변화
    prev_scores = previous.get("scores", {})
    curr_scores = current.get("scores", {})
    
    for key in curr_scores:
        if key in prev_scores:
            change = curr_scores[key] - prev_scores[key]
            if abs(change) >= 0.5:  # 0.5점 이상 변화만 기록
                changes["score_changes"][key] = change
    
    # 새로운 강점/약점
    prev_strengths = set(previous.get("strengths", []))
    curr_strengths = set(current.get("strengths", []))
    changes["new_strengths"] = list(curr_strengths - prev_strengths)
    
    prev_weaknesses = set(previous.get("weaknesses", []))
    curr_weaknesses = set(current.get("weaknesses", []))
    changes["new_weaknesses"] = list(curr_weaknesses - prev_weaknesses)
    
    return changes 