def upper_tool(state):
    return {**state, "upper": state.get("input", "").upper()}
