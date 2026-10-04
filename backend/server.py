"""
backend/server.py
-----------------
FastAPI backend for Local Agentic AI.
Exposes REST and WebSocket endpoints for real-time interaction
with the existing LangChain + Ollama agent.

Architecture:
  React (localhost:3000)
    ↓ HTTP / WebSocket
  FastAPI (localhost:8000)
    ↓
  agent.py (LangChain Tool-Calling Agent)
    ↓
  tools.py (Calculator, Files, Weather, Web Search, Time)
    ↓
  Ollama (qwen3:4b) - Local
"""

import asyncio
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure project root is in sys.path so agent and tools can be imported cleanly
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from agent import Agent
from tools import registry

# ============================================================
# FASTAPI APPLICATION SETUP
# ============================================================

app = FastAPI(
    title="Local Agentic AI Backend",
    description="Local Agentic AI backend with real-time LangChain tool execution transparency",
    version="1.0.0",
)

# Enable CORS for React frontend (localhost:3000, 127.0.0.1:3000, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = "qwen3:4b"


# ============================================================
# SESSION MANAGEMENT
# ============================================================

class SessionManager:
    """Manages conversational agent sessions without altering core agent logic."""

    def __init__(self):
        self._sessions: Dict[str, Agent] = {}

    def get_agent(self, session_id: str = "default") -> Agent:
        if session_id not in self._sessions:
            self._sessions[session_id] = Agent(model=DEFAULT_MODEL)
        return self._sessions[session_id]

    def reset_session(self, session_id: str = "default") -> None:
        if session_id in self._sessions:
            self._sessions[session_id].reset()
        else:
            self._sessions[session_id] = Agent(model=DEFAULT_MODEL)

    def list_sessions(self) -> List[str]:
        return list(self._sessions.keys())


session_manager = SessionManager()


# ============================================================
# OLLAMA HEALTH HELPER
# ============================================================

def check_ollama_status() -> Dict[str, Any]:
    """Check whether local Ollama service is reachable and list models."""
    url = f"{OLLAMA_BASE_URL}/api/tags"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "agentic-ai-backend/1.0"})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            data = json.loads(resp.read().decode())
            models = [m.get("name") for m in data.get("models", [])]
            return {
                "online": True,
                "url": OLLAMA_BASE_URL,
                "models": models,
                "has_target_model": any(DEFAULT_MODEL in m for m in models),
            }
    except Exception as exc:
        return {
            "online": False,
            "url": OLLAMA_BASE_URL,
            "models": [],
            "has_target_model": False,
            "error": str(exc),
        }


# ============================================================
# PYDANTIC SCHEMAS
# ============================================================

class ChatRequest(BaseModel):
    message: str = Field(..., description="User message to the agent")
    session_id: Optional[str] = Field("default", description="Conversation session ID")


class ResetRequest(BaseModel):
    session_id: Optional[str] = Field("default", description="Session ID to clear")


# ============================================================
# REST ENDPOINTS
# ============================================================

@app.get("/api/health")
async def get_health():
    """
    Health check endpoint.
    Checks backend connectivity, Ollama status, and available tools.
    """
    ollama_info = check_ollama_status()
    schemas = registry.get_schemas()

    return {
        "status": "healthy",
        "backend": "connected",
        "ollama": {
            "connected": ollama_info["online"],
            "url": ollama_info["url"],
            "models": ollama_info["models"],
            "target_model": DEFAULT_MODEL,
            "target_model_available": ollama_info["has_target_model"],
            "error": ollama_info.get("error"),
        },
        "agent": {
            "framework": "LangChain",
            "model": DEFAULT_MODEL,
            "architecture": "Tool-Calling Agent",
            "tools_count": len(schemas),
        },
        "timestamp": time.time(),
    }


@app.get("/api/tools")
async def get_tools():
    """
    Return all registered agent tools with their schema, descriptions, and metadata.
    """
    schemas = registry.get_schemas()
    formatted_tools = []

    # Map tool name to nice category and icon metadata
    metadata_map = {
        "calculate": {
            "category": "Math & Calculations",
            "icon": "calculator",
            "displayName": "Calculator",
        },
        "get_current_time": {
            "category": "System & Time",
            "icon": "clock",
            "displayName": "Current Time",
        },
        "read_file": {
            "category": "File Operations",
            "icon": "file-text",
            "displayName": "Read File",
        },
        "write_file": {
            "category": "File Operations",
            "icon": "file-plus",
            "displayName": "Write File",
        },
        "get_weather": {
            "category": "Information Services",
            "icon": "cloud-sun",
            "displayName": "Weather",
        },
        "web_search": {
            "category": "Information Services",
            "icon": "globe",
            "displayName": "Web Search",
        },
    }

    for item in schemas:
        fn = item.get("function", {})
        name = fn.get("name", "")
        meta = metadata_map.get(
            name,
            {
                "category": "General",
                "icon": "wrench",
                "displayName": name.replace("_", " ").title(),
            },
        )
        formatted_tools.append(
            {
                "name": name,
                "displayName": meta["displayName"],
                "category": meta["category"],
                "icon": meta["icon"],
                "description": fn.get("description", ""),
                "parameters": fn.get("parameters", {}),
            }
        )

    return {
        "count": len(formatted_tools),
        "tools": formatted_tools,
    }


@app.post("/api/reset")
async def reset_session_endpoint(req: ResetRequest):
    """Reset conversation memory for a session."""
    session_manager.reset_session(req.session_id)
    return {
        "status": "success",
        "session_id": req.session_id,
        "message": "Conversation memory cleared.",
    }


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Synchronous fallback chat endpoint.
    Runs the agent and collects all execution events.
    """
    ollama_info = check_ollama_status()
    if not ollama_info["online"]:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to Ollama. Make sure Ollama is running.",
        )

    agent = session_manager.get_agent(req.session_id)
    events: List[Dict[str, Any]] = []

    def callback(event_type: str, data: Any):
        events.append(
            {
                "event": event_type,
                "data": data,
                "timestamp": time.time(),
            }
        )

    try:
        response = await asyncio.to_thread(agent.run, req.message, step_callback=callback)
        return {
            "session_id": req.session_id,
            "response": response,
            "events": events,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ============================================================
# WEBSOCKET REAL-TIME STREAMING
# ============================================================

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket):
    """
    Real-time streaming WebSocket endpoint.
    Streams agent thinking status, tool start, tool running, tool completion,
    tool output, duration, and final response in real time.
    """
    await websocket.accept()

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                payload = json.loads(raw_text)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "message": "Invalid JSON format."}
                )
                continue

            msg_type = payload.get("type", "message")
            session_id = payload.get("session_id", "default")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})
                continue

            if msg_type == "reset":
                session_manager.reset_session(session_id)
                await websocket.send_json(
                    {
                        "type": "reset_ack",
                        "session_id": session_id,
                        "message": "Conversation memory cleared.",
                    }
                )
                continue

            user_message = payload.get("content", "").strip()
            if not user_message:
                await websocket.send_json(
                    {"type": "error", "message": "Empty message received."}
                )
                continue

            # Verify Ollama before invoking
            ollama_info = check_ollama_status()
            if not ollama_info["online"]:
                await websocket.send_json(
                    {
                        "type": "error",
                        "error_type": "ollama_offline",
                        "message": "Unable to connect to Ollama. Make sure Ollama is running.",
                    }
                )
                continue

            agent = session_manager.get_agent(session_id)

            # Create thread-safe queue to bridge agent synchronous execution with async WebSocket
            event_queue: asyncio.Queue = asyncio.Queue()
            loop = asyncio.get_running_loop()

            def agent_callback(event_type: str, data: Any):
                packet = {
                    "type": event_type,
                    "data": data,
                    "timestamp": time.time(),
                }
                loop.call_soon_threadsafe(event_queue.put_nowait, packet)

            async def run_agent_in_background():
                try:
                    ans = await asyncio.to_thread(
                        agent.run,
                        user_message,
                        step_callback=agent_callback,
                    )
                    loop.call_soon_threadsafe(
                        event_queue.put_nowait,
                        {"type": "__done__", "final_answer": ans},
                    )
                except Exception as ex:
                    loop.call_soon_threadsafe(
                        event_queue.put_nowait,
                        {"type": "__error__", "error": str(ex)},
                    )

            # Start agent in background thread
            worker_task = asyncio.create_task(run_agent_in_background())

            # Initial status event
            await websocket.send_json(
                {
                    "type": "status",
                    "data": {"message": "Agent is thinking..."},
                    "timestamp": time.time(),
                }
            )

            # Pump events from queue to WebSocket
            while True:
                event = await event_queue.get()
                ev_type = event.get("type")

                if ev_type == "__done__":
                    final_ans = event.get("final_answer", "")
                    await websocket.send_json(
                        {
                            "type": "done",
                            "final_answer": final_ans,
                            "timestamp": time.time(),
                        }
                    )
                    break

                if ev_type == "__error__":
                    err_msg = event.get("error", "Unknown agent error.")
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": err_msg,
                            "timestamp": time.time(),
                        }
                    )
                    break

                # Send real-time event to client
                await websocket.send_json(event)

            # Wait for background task to complete cleanup
            await worker_task

    except WebSocketDisconnect:
        # Client disconnected cleanly
        pass
    except Exception as exc:
        try:
            await websocket.send_json(
                {"type": "error", "message": f"Server error: {str(exc)}"}
            )
        except Exception:
            pass


# ============================================================
# ENTRYPOINT FOR DIRECT EXECUTION
# ============================================================

if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting Local Agentic AI Backend on http://127.0.0.1:8000")
    uvicorn.run("backend.server:app", host="0.0.0.0", port=8000, reload=True)
