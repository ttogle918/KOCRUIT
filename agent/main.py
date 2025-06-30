from fastapi import FastAPI, Request
from agents.graph_agent import build_graph
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
graph_agent = build_graph()

@app.post("/run/")
async def run(request: Request):
    data = await request.json()
    # job_posting, resume 필드 둘 다 받아야 함
    job_posting = data.get("job_posting", "")
    resume = data.get("resume", "")
    state = {
        "job_posting": job_posting,
        "resume": resume
    }
    result = graph_agent.invoke(state)
    if result is None:
        return {"error": "LangGraph returned None"}
    return {
        "job_posting_suggestion": result.get("job_posting_suggestion"),
        "resume_score": result.get("resume_score"),
    }
