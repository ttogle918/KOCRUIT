from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

def job_posting_recommend_tool(state):
    content = state.get("job_posting", "")
    prompt = (
        "아래의 채용 공고 내용을 읽고, 공고의 어색한 점을 수정하거나, "
        "더 효과적으로 매력적으로 보이게끔 문장을 추천해줘. "
        "수정/추천 이유도 한 줄로 설명해줘.\n\n"
        f"공고:\n{content}\n\n"
        "===>\n수정/추천:"
    )
    resp = llm.invoke(prompt)
    return {**state, "job_posting_suggestion": resp.content}
