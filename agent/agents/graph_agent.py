from langgraph.graph import Graph
from tools.job_posting_tool import job_posting_recommend_tool
from tools.resume_score_tool import resume_score_tool

def build_graph():
    graph = Graph()
    graph.add_node("job_posting_tool", job_posting_recommend_tool)
    graph.add_node("resume_score_tool", resume_score_tool)
    # entry point는 "job_posting_tool"로
    graph.set_entry_point("job_posting_tool")
    graph.add_edge("job_posting_tool", "resume_score_tool")
    graph.set_finish_point("resume_score_tool")
    return graph.compile()
