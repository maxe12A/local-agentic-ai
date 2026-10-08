# 🤖 Local Agentic AI

<img width="1462" height="836" alt="image" src="https://github.com/user-attachments/assets/a5b3f19d-0f56-48a5-b77f-155f2a92c9f6" />

A **private, local AI agent** powered by **Ollama + Qwen3:4B + LangChain**, with a React dashboard and FastAPI backend.

### 🚀 Features
- 🧠 Local Qwen3:4B inference
- 🤖 Autonomous tool-using agent
- 🧮 Calculator
- 📁 Local file operations
- 🕒 System information
- 🌐 Optional web/weather tools
- 🔐 Designed for future air-gapped deployment
- 🛡️ Planned security harness with policies, tool control, prompt protection, and audit logs

### 🏗️ Architecture
**React → FastAPI → LangChain Agent → Ollama/Qwen3:4B → Local Tools**

### 🛠️ Tech Stack
**React • Vite • FastAPI • LangChain • Ollama • Qwen3:4B • Python**

### ▶️ Run

```bash
# Ollama
ollama serve

# Backend
uvicorn backend.server:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Dashboard: `http://localhost:3000`

### 🔐 Security Roadmap
- Policy engine
- Tool permissions
- Prompt-injection detection
- Data classification
- Audit logging
- Sandboxing
- Network isolation
- Human approval
- Full air-gapped deployment

**Think locally. Act intelligently. Stay in control.**
