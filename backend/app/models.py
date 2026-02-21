from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from enum import Enum

class Intent(str, Enum):
    REVIEW = "REVIEW"
    SECURITY_SCAN = "SECURITY_SCAN"
    AUTO_FIX = "AUTO_FIX"
    REFACTOR = "REFACTOR"

class RequestPayload(BaseModel):
    files: Dict[str, str]
    intent: Intent
    active_file: str
    extra_context: Optional[Dict[str, Any]] = None

class Issue(BaseModel):
    file: str
    line: Optional[int] = None
    severity: str
    message: str

class Mutation(BaseModel):
    file: str
    diff: str # simple string representation of fix/diff

class AgentResponse(BaseModel):
    status: str
    actions: List[Mutation] = []
    feedback: List[Issue] = []
    metadata: Dict[str, Any] = {}
    score: Optional[int] = None
    insights: Optional[str] = None
