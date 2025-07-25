
from gtts import gTTS
from moviepy.editor import *
import os

import sys
print("PYTHON:", sys.executable)
print("sys.path:", sys.path)

# 인터뷰 데이터
interview_data = [
    {
      "turn": 1,
        "applicant_name": "지원자 61번",
      "ai_question": "KOSA공공의 인재상에 대해 어떻게 생각하시나요?",
      "expected_answer": "공공기관에서 가장 중요한 인재상은 정직성과 책임감이라고 생각합니다. 국민의 자산을 관리하고 복지를 수행하는 기관인 만큼, 투명하고 공정한 업무수행이 필수적입니다. 저는 금융동아리 부회장 시절, 지원금을 정직하게 운용한 경험을 통해 이러한 가치를 실천해본 경험이 있습니다."
    },
    {
      "turn": 2,
      "ai_question": "조직 문화에 적응하는 데 가장 중요한 것은 무엇이라고 생각하시나요?",
      "expected_answer": "소통과 경청이라고 생각합니다. 근로복지공단에서 민원 응대 업무를 하며 다양한 연령대 고객을 상대했는데, 빠른 이해보다 먼저 상대방 이야기를 충분히 듣는 것이 갈등을 줄이고 신뢰를 형성하는 데 도움이 됐습니다."
    },
    {
      "turn": 3,
      "ai_question": "팀워크와 개인 성과 중 어느 것을 더 중요하게 생각하시나요?",
      "expected_answer": "팀워크를 기반으로 한 개인 성과가 가장 이상적이라고 생각합니다. 졸업작품 공모전에서도 팀원들과 역할을 명확히 나누고 협력하며 최종 성과를 올렸던 경험이 있습니다."
    },
    {
      "turn": 4,
      "ai_question": "본인의 장단점은 무엇인가요?",
      "expected_answer": "장점은 신뢰감을 주는 성실함입니다. 주어진 일을 끝까지 책임지고 마무리하는 편이며, 이전 실습기관에서도 고객 응대 만족도에서 긍정적인 평가를 받았습니다. 단점은 완벽주의 성향으로 일정 조율에 시간이 걸리는 점인데, 우선순위 조절로 보완하고 있습니다."
    },
    {
      "turn": 5,
      "ai_question": "실패 경험을 말해주시고, 어떻게 극복했나요?",
      "expected_answer": "졸업작품 초기에는 기술 스택을 과도하게 설정한 탓에 일정 내 완성도가 떨어졌던 경험이 있습니다. 이후 최소 기능부터 완성하고 점진적으로 확장하는 방식으로 접근하여 최종적으로 공모전 입상까지 달성할 수 있었습니다."
    },
    {
      "turn": 6,
      "ai_question": "업무와 개인생활의 균형을 어떻게 맞추시겠습니까?",
      "expected_answer": "업무 시간에는 집중하고, 퇴근 후에는 독서와 운동을 통해 리프레시하는 루틴을 갖추고 있습니다. 이는 장기적인 업무 몰입도와 성과에 도움이 된다고 생각합니다."
    },
    {
      "turn": 7,
      "ai_question": "직장에서 가장 중요하다고 생각하는 가치는 무엇인가요?",
      "expected_answer": "신뢰라고 생각합니다. 국민연금공단처럼 장기 신뢰가 중요한 조직일수록, 원칙과 정직을 바탕으로 국민과의 약속을 지켜야 한다고 믿습니다."
    },
    {
      "turn": 8,
      "ai_question": "동료와 갈등이 생겼을 때 어떻게 해결하나요?",
      "expected_answer": "갈등은 감정보다 논리와 소통으로 접근해야 한다고 생각합니다. 예전 동아리 활동 중 예산 배분 문제로 갈등이 있었지만, 사전에 함께 예산 사용 기준을 정리해 문서화하고 공감대를 형성하며 원만하게 해결한 경험이 있습니다."
    }
  ]


# 설정
output_dir = os.path.join(os.path.dirname(__file__), "interview_videos")
os.makedirs(output_dir, exist_ok=True)
resolution = (1280, 720)
bg_color = (255, 255, 255)
logo_path = "logo.png"  # 기업 로고 파일

# 폰트 설정 (시스템에 따라 다름)
font_name = "Arial"  # 한글이 깨질 경우 NanumGothic 등 설치 필요

# 루프 처리
for i, item in enumerate(interview_data, start=1):
    q = item["ai_question"]
    a = item["expected_answer"]
    name = item["applicant_name"]
    tts_path = os.path.join(output_dir, f"audio_{i}.mp3")

    # 음성 생성
    tts = gTTS(text=a, lang='ko')
    tts.save(tts_path)
    audio = AudioFileClip(tts_path)
    duration = audio.duration

    # 질문 텍스트
    question_clip = TextClip(
        txt=q,
        fontsize=40,
        color='black',
        size=(resolution[0] - 100, None),
        method='caption',
        font=font_name
    ).set_duration(duration).set_position(("center", 50))

    # 답변 텍스트
    answer_clip = TextClip(
        txt=a,
        fontsize=36,
        color='black',
        size=(resolution[0] - 100, 300),
        method='caption',
        align='center',
        font=font_name
    ).set_duration(duration).set_position("center")

    # 이름 표시
    name_clip = TextClip(
        txt=name,
        fontsize=28,
        color='gray',
        font=font_name
    ).set_duration(duration).set_position(("center", resolution[1] - 80))

    # 배경
    bg = ColorClip(size=resolution, color=bg_color, duration=duration)

    # 로고 삽입 (옵션)
    if os.path.exists(logo_path):
        logo = (ImageClip(logo_path)
                .set_duration(duration)
                .resize(height=80)
                .set_position(("left", "top")))
    else:
        logo = None

    # 최종 합성
    clips = [bg, question_clip, answer_clip, name_clip, audio]
    if logo:
        clips.insert(1, logo)
    final = CompositeVideoClip(clips)
    final = final.set_audio(audio)

    # 저장
    save_path = os.path.join(output_dir, f"interview_{i}_{name}.mp4")
