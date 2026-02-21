from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import uuid
import asyncio

from app.models import RequestPayload, AgentResponse, Intent, ChatRequest, ChatResponse
from app.core.orchestrator import AIOrchestrator
from app.sandbox_executor import run_in_sandbox
from app.agents.specialists import InteractiveChatAgent

app = FastAPI(title="AI Code Mentor API - Orchestrator Powered")

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    files: dict[str, str]
    active_file: str = "index.py"
    intent: Intent = Intent.REVIEW

class RunRequest(BaseModel):
    files: dict[str, str]
    test_command: str

class RunResponse(BaseModel):
    stdout: str
    stderr: str
    error: bool

@app.post("/api/v1/projects/analyze", response_model=AgentResponse)
async def analyze(request: AnalyzeRequest):
    # Route through the intelligent core Orchestrator
    try:
        payload = RequestPayload(
            files=request.files,
            intent=request.intent,
            active_file=request.active_file,
            extra_context={}
        )
        result = await AIOrchestrator.handle_request(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sandbox/run", response_model=RunResponse)
async def sandbox_run(request: RunRequest):
    try:
        job_id = str(uuid.uuid4())
        result = run_in_sandbox(job_id, request.files, request.test_command)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/agents/chat", response_model=ChatResponse)
async def agent_chat(request: ChatRequest):
    try:
        result = await InteractiveChatAgent.execute(request)
        if "action" not in result:
            result = {
                "action": "explain_only",
                "target_file": request.current_file_path,
                "code": "",
                "explanation": result.get("explanation", "Agent executed query but returned no actionable JSON.")
            }
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
