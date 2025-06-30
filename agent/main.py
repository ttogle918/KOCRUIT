from fastapi import FastAPI, Request
from agents.graph_agent import build_graph
from agents.chatbot_graph import create_chatbot_graph, initialize_chat_state, create_session_id
from agents.chatbot_node import ChatbotNode
from dotenv import load_dotenv
import uuid

load_dotenv()

app = FastAPI()
graph_agent = build_graph()
chatbot_graph = create_chatbot_graph()

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

@app.post("/chat/")
async def chat(request: Request):
    """챗봇 대화 API"""
    data = await request.json()
    user_message = data.get("message", "")
    session_id = data.get("session_id", None)
    
    if not user_message:
        return {"error": "Message is required"}
    
    # 세션 ID가 없으면 새로 생성
    if not session_id:
        session_id = create_session_id()
    
    # 챗봇 상태 초기화
    chat_state = initialize_chat_state(user_message, session_id)
    
    # 챗봇 그래프 실행
    try:
        result = chatbot_graph.invoke(chat_state)
        return {
            "session_id": session_id,
            "ai_response": result.get("ai_response", ""),
            "context_used": result.get("context_used", ""),
            "conversation_history_length": result.get("conversation_history_length", 0),
            "error": result.get("error", "")
        }
    except Exception as e:
        return {
            "session_id": session_id,
            "error": f"Chatbot error: {str(e)}",
            "ai_response": "죄송합니다. 오류가 발생했습니다."
        }

@app.post("/chat/add-knowledge/")
async def add_knowledge(request: Request):
    """지식 베이스에 문서 추가"""
    data = await request.json()
    documents = data.get("documents", [])
    metadata = data.get("metadata", None)
    
    if not documents:
        return {"error": "Documents are required"}
    
    try:
        chatbot_node = ChatbotNode()
        chatbot_node.add_knowledge(documents, metadata)
        return {"message": f"Added {len(documents)} documents to knowledge base"}
    except Exception as e:
        return {"error": f"Failed to add knowledge: {str(e)}"}

@app.delete("/chat/clear/{session_id}")
async def clear_conversation(session_id: str):
    """특정 세션의 대화 히스토리 삭제"""
    try:
        chatbot_node = ChatbotNode()
        chatbot_node.clear_conversation(session_id)
        return {"message": f"Cleared conversation history for session {session_id}"}
    except Exception as e:
        return {"error": f"Failed to clear conversation: {str(e)}"}

@app.get("/chat/session/new")
async def create_new_session():
    """새로운 세션 생성"""
    session_id = create_session_id()
    return {"session_id": session_id}
