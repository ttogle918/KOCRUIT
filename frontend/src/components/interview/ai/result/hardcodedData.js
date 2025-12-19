// AI 면접 결과 상세페이지에서 사용하는 테스트용 하드코딩 데이터
export const hardcodedData = {
  59: {
    video_analysis: {
      speech_rate: 150.0,
      volume_level: 0.75,
      pronunciation_score: 0.85,
      intonation_score: 0.6,
      emotion_variation: 0.6,
      smile_frequency: 1.0,
      eye_contact_ratio: 0.8,
      hand_gesture: 0.5,
      nod_count: 2,
      posture_changes: 2,
      stress_signal_score: 0.28,
      visual_distraction_score: 0.12,
      emotion_consistency_score: 0.79,
      analysis_timestamp: "2025-07-27T11:29:09.108308",
      source_url: "https://drive.google.com/file/d/18dO35QTr0cHxEX8CtMtCkzfsBRes68XB/view?usp=drive_link"
    },
    question_analysis: [
      {
        id: 1,
        question_text: "자신의 강점과 약점에 대해 말씀해 주세요.",
        question_score: 4.5,
        audio_analysis: { transcription: "저의 강점은 빠른 학습 능력과 문제 해결 능력입니다. 약점은 가끔 세부 사항에 너무 집착하는 경향이 있다는 점입니다." },
        gaze_analysis: { focus_ratio: 0.85 },
        facial_expressions: { emotion_variation: "안정적" },
        posture_analysis: { posture_score: 0.9 },
        question_feedback: "답변이 논리적이며 시선 처리가 안정적입니다."
      },
      {
        id: 2,
        question_text: "우리 회사에 지원하게 된 동기는 무엇인가요?",
        question_score: 4.2,
        audio_analysis: { transcription: "기술적인 도전 과제가 많은 이 회사에서 제 역량을 발휘하고 싶어 지원하게 되었습니다." },
        gaze_analysis: { focus_ratio: 0.78 },
        facial_expressions: { emotion_variation: "열정적" },
        posture_analysis: { posture_score: 0.85 },
        question_feedback: "자신감 있는 태도가 돋보입니다."
      }
    ],
    stages: {
      ai: {
        score: 4.2,
        feedback: "차분하고 논리적인 답변이 인상적입니다.",
        transcription: "안녕하세요. 지원자 김도원입니다. 저는 백엔드 개발자로서..."
      },
      practice: {
        score: 4.5,
        feedback: "기술적 이해도가 매우 높으며 실무 적용 능력이 우수합니다.",
        transcription: "실무 면접에서는 주로 스프링 부트의 내부 동작 원리에 대해 답변했습니다."
      },
      executive: {
        score: 4.0,
        feedback: "조직 융화력과 비전이 뚜렷합니다.",
        transcription: "임원 면접에서는 회사의 성장 방향과 저의 커리어 목표를 연결하여..."
      }
    }
  },
  61: {
    video_analysis: {
      speech_rate: 145.0,
      volume_level: 0.8,
      pronunciation_score: 0.9,
      intonation_score: 0.7,
      smile_frequency: 0.8,
      eye_contact_ratio: 0.9,
      hand_gesture: 0.6,
      stress_signal_score: 0.22,
      visual_distraction_score: 0.09,
      emotion_consistency_score: 0.84,
      analysis_timestamp: "2025-07-27T11:30:15.123456"
    },
    question_analysis: [
      {
        id: 1,
        question_text: "최근에 해결한 어려운 기술적 문제는 무엇인가요?",
        question_score: 4.8,
        audio_analysis: { transcription: "대용량 트래픽 상황에서 DB 병목 현상을 해결하기 위해 쿼리 최적화와 인덱싱을 적용했습니다." },
        gaze_analysis: { focus_ratio: 0.92 },
        facial_expressions: { emotion_variation: "매우 안정" },
        posture_analysis: { posture_score: 0.95 },
        question_feedback: "전문성이 매우 뛰어나고 전달력이 좋습니다."
      }
    ],
    stages: {
      ai: { score: 4.5, feedback: "매우 우수한 의사소통 능력을 보유하고 있습니다.", transcription: "반갑습니다. 이현서입니다. 데이터 분석가로서..." },
      practice: { score: 4.2, feedback: "데이터 파이프라인 설계 능력이 뛰어납니다.", transcription: "빅데이터 처리를 위한 아키텍처 설계 경험을 설명했습니다." },
      executive: { score: 4.8, feedback: "리더십과 책임감이 돋보이는 인재입니다.", transcription: "팀 프로젝트의 갈등 해결 사례를 중심으로 답변했습니다." }
    }
  },
  68: {
    video_analysis: {
      speech_rate: 140.0,
      volume_level: 0.7,
      pronunciation_score: 0.8,
      smile_frequency: 0.9,
      eye_contact_ratio: 0.85,
      stress_signal_score: 0.35,
      visual_distraction_score: 0.15,
      emotion_consistency_score: 0.72,
      analysis_timestamp: "2025-07-27T11:31:22.789012"
    },
    stages: {
      ai: { score: 3.8, feedback: "성실한 태도가 돋보이나 긴장한 기색이 보입니다.", transcription: "안녕하세요. 최지현입니다. 웹 퍼블리셔로서..." },
      practice: { score: 4.0, feedback: "사용자 중심의 UI/UX 설계 철학이 뚜렷합니다.", transcription: "반응형 웹 디자인과 접근성 개선 사례를 발표했습니다." },
      executive: { score: 3.5, feedback: "발전 가능성이 높으나 직무 이해도가 조금 더 필요합니다.", transcription: "회사의 브랜드 가치와 디자인 시스템의 연관성에 대해..." }
    }
  }
};

