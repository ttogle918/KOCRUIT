def echo_tool(state):
    return {**state, "echo": f"Echo: {state.get('input', '')}"}
