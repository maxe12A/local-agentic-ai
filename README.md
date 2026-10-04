# 🤖 Local Agentic AI

### Autonomous AI Agent — Private. Local. Controlled.

> Run an AI agent locally with Ollama and LangChain, execute tools, enforce security policies, and keep sensitive data inside your machine.

![Local Agentic AI](./screenshots/dashboard.png)

---

## ⚡ Fast. Private. Controlled.

**Local Agentic AI** is a local-first AI agent framework designed to run LLM-powered agents on your own machine.

Instead of sending every request to a cloud AI API, the agent uses a locally running LLM through **Ollama** and provides controlled access to tools.

```text
                    USER
                      │
                      ▼
              ┌───────────────┐
              │  AI AGENT     │
              │ Reason + Act  │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ AI HARNESS    │
              │               │
              │ Policy Engine │
              │ Permissions   │
              │ Data Checker  │
              │ Audit Logger  │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │    OLLAMA     │
              │   Local LLM   │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ LOCAL TOOLS   │
              │ Calculator    │
              │ Files         │
              │ Time          │
              │ Custom Tools  │
              └───────────────┘
