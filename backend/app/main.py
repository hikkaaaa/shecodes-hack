from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import uuid
import asyncio

from .sandbox_executor import run_in_sandbox
from .agent import analyze_code

app = FastAPI(title="AI Code Mentor API")

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

class AnalyzeResponse(BaseModel):
    issues: List[dict]
    score: int
    insights: str

class RunRequest(BaseModel):
    files: dict[str, str]
    test_command: str

class RunResponse(BaseModel):
    stdout: str
    stderr: str
    error: bool

@app.post("/api/v1/projects/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    # Pass the files to the AI agent
    try:
        result = await analyze_code(request.files)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
