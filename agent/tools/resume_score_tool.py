from langchain_openai import ChatOpenAI

def resume_score_tool(state):
    resume = state.get("resume", "")
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
    prompt = (
        "아래 이력서를 간단히 읽고, 0~100점으로 간단히 점수를 매겨줘. "
        "점수 기준: 경력, 기술, 자기소개, 맞춤성, 표현력. "
        "한 줄 총평도 포함해줘.\n\n"
        f"이력서:\n{resume}\n\n"
        "===>\n점수:"
    )
    resp = llm.invoke(prompt)
    return {**state, "resume_score": resp.content}
