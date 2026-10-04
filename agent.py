"""
agent.py - Local Agentic AI Core

Uses:
    LangChain
    ChatOllama
    Ollama
    Qwen3:4b

No OpenAI API key required.

Architecture:

User
  ↓
Agent
  ↓
LangChain
  ↓
ChatOllama
  ↓
Ollama
  ↓
Qwen3:4b
  ↓
Tool Calling
  ↓
Tool Result
  ↓
Agent
  ↓
Final Answer
"""

import os
import re
import sys
import time
from typing import Any, Callable, Dict, List, Optional

from langchain_ollama import ChatOllama
from langchain_core.messages import (
    HumanMessage,
    SystemMessage,
    AIMessage,
    ToolMessage,
)

# Make local imports work
sys.path.append(
    os.path.dirname(os.path.abspath(__file__))
)

from tools import registry


class Agent:
    """
    Local autonomous AI agent.

    Uses Qwen3 through Ollama and LangChain
    to reason and execute tools.
    """

    DEFAULT_SYSTEM_PROMPT = """
You are an intelligent autonomous AI agent.

You have access to tools that allow you to:
- perform calculations
- work with files
- retrieve information
- perform other useful actions

Rules:

1. Understand the user's objective.
2. Decide whether a tool is necessary.
3. If a tool is necessary, use the appropriate tool.
4. Observe the tool result.
5. Continue reasoning if another action is required.
6. Give the user a clear final answer.

For calculations and tasks requiring tools, prefer using
the appropriate tool instead of guessing.

Be accurate, concise, and helpful.
"""

    def __init__(
        self,
        llm=None,
        system_prompt: Optional[str] = None,
        model: str = "qwen3:4b",
        max_steps: int = 10,
        verbose: bool = True,
    ):

        self.model = model
        self.max_steps = max_steps
        self.verbose = verbose

        self.system_prompt = (
            system_prompt
            or self.DEFAULT_SYSTEM_PROMPT
        )

        # --------------------------------------------------
        # Create Ollama LLM
        # --------------------------------------------------

        if llm is not None:

            self.llm = llm

        else:

            self.llm = ChatOllama(
                model=self.model,
                temperature=0,
            )

        # --------------------------------------------------
        # Get tools from your registry
        # --------------------------------------------------

        self.tools = self._load_tools()

        # --------------------------------------------------
        # Bind tools to the LLM
        # --------------------------------------------------

        if self.tools:

            self.llm_with_tools = self.llm.bind_tools(
                self.tools
            )

        else:

            self.llm_with_tools = self.llm

        # --------------------------------------------------
        # Conversation memory
        # --------------------------------------------------

        self.messages = [
            SystemMessage(
                content=self.system_prompt
            )
        ]

        # Local model is always available
        self.is_configured = True

    # ======================================================
    # LOAD TOOLS
    # ======================================================

    def _load_tools(self):
        """
        Convert registered tool schemas into
        LangChain-compatible tools.
        """

        tools = []

        try:

            # If your registry provides actual LangChain
            # tools, use them directly.

            if hasattr(registry, "get_tools"):

                tools = registry.get_tools()

            else:

                print(
                    "⚠️ registry.get_tools() not found."
                )

        except Exception as e:

            print(
                f"⚠️ Could not load tools: {e}"
            )

        return tools

    # ======================================================
    # RESET MEMORY
    # ======================================================

    def reset(self):

        self.messages = [
            SystemMessage(
                content=self.system_prompt
            )
        ]

    # ======================================================
    # RUN AGENT
    # ======================================================

    def run(
        self,
        user_input: str,
        step_callback: Optional[
            Callable[[str, Any], None]
        ] = None,
    ) -> str:

        # --------------------------------------------------
        # Add user message
        # --------------------------------------------------

        self.messages.append(
            HumanMessage(
                content=user_input
            )
        )

        # --------------------------------------------------
        # Agent execution loop
        # --------------------------------------------------

        for step in range(
            1,
            self.max_steps + 1
        ):

            if step_callback:

                step_callback(
                    "step_start",
                    {
                        "step": step,
                        "max_steps": self.max_steps,
                    },
                )
                step_callback(
                    "status",
                    {
                        "message": (
                            "Agent is deciding which tool to use..."
                            if step == 1
                            else "Agent is reviewing tool results..."
                        )
                    },
                )

            try:

                # ------------------------------------------
                # Ask Qwen what to do
                # ------------------------------------------

                response = (
                    self.llm_with_tools.invoke(
                        self.messages
                    )
                )

            except Exception as e:

                error = (
                    f"LLM Error at step {step}: "
                    f"{str(e)}"
                )

                if step_callback:

                    step_callback(
                        "error",
                        error
                    )

                return error

            # ------------------------------------------------
            # Check whether Qwen wants to call a tool
            # ------------------------------------------------

            tool_calls = getattr(
                response,
                "tool_calls",
                []
            )

            if tool_calls:

                # Add Qwen's tool-call message
                self.messages.append(response)

                # --------------------------------------------
                # Execute requested tools
                # --------------------------------------------

                for tool_call in tool_calls:

                    tool_name = tool_call["name"]

                    tool_args = tool_call.get(
                        "args",
                        {}
                    )

                    tool_id = tool_call.get(
                        "id"
                    ) or f"call_{tool_name}_{int(time.time()*1000)}"

                    # Show tool call
                    if step_callback:

                        step_callback(
                            "status",
                            {
                                "message": f"Calling {tool_name}..."
                            },
                        )

                        step_callback(
                            "tool_start",
                            {
                                "name": tool_name,
                                "args": tool_args,
                                "id": tool_id,
                                "timestamp": time.time(),
                            },
                        )

                        step_callback(
                            "tool_running",
                            {
                                "name": tool_name,
                                "id": tool_id,
                            },
                        )

                    # ----------------------------------------
                    # Execute through registry
                    # ----------------------------------------

                    start_time = time.time()
                    status = "completed"

                    try:

                        result = registry.execute(
                            tool_name,
                            tool_args
                        )

                    except Exception as e:

                        status = "failed"
                        result = (
                            f"Tool execution error: "
                            f"{str(e)}"
                        )

                    duration = round(time.time() - start_time, 3)

                    # ----------------------------------------
                    # Show result
                    # ----------------------------------------

                    if step_callback:

                        step_callback(
                            "tool_result",
                            {
                                "name": tool_name,
                                "result": str(result),
                                "id": tool_id,
                                "duration": duration,
                                "status": status,
                                "timestamp": time.time(),
                            },
                        )

                        step_callback(
                            "status",
                            {
                                "message": f"{tool_name} {status}."
                            },
                        )

                    # ----------------------------------------
                    # Give result back to Qwen
                    # ----------------------------------------

                    self.messages.append(
                        ToolMessage(
                            content=str(result),
                            tool_call_id=tool_id,
                        )
                    )

                # Continue reasoning
                continue

            # ------------------------------------------------
            # No tool call = final answer
            # ------------------------------------------------

            raw_content = (
                response.content
                if response.content
                else ""
            )

            # Strip private reasoning / think tags if present
            final_content = re.sub(
                r"<think>.*?</think>",
                "",
                raw_content,
                flags=re.DOTALL
            ).strip()

            self.messages.append(
                response
            )

            if step_callback:

                step_callback(
                    "status",
                    {
                        "message": "Generating response..."
                    },
                )

                step_callback(
                    "final_answer",
                    final_content
                )

            return final_content


        # ----------------------------------------------------
        # Maximum steps reached
        # ----------------------------------------------------

        return (
            f"⚠️ Agent reached maximum "
            f"execution steps ({self.max_steps})."
        )