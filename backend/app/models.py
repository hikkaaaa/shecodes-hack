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

class AgentAction(str, Enum):
    MODIFY_FILE = "modify_file"
    CREATE_FILE = "create_file"
    INSERT_CODE = "insert_code"
    EXPLAIN_ONLY = "explain_only"

class ChatRequest(BaseModel):
    user_message: str
    current_file_content: str
    current_file_path: str
    full_project_tree: Dict[str, str]
    selected_code: Optional[str] = None

class ChatResponse(BaseModel):
    action: AgentAction
    target_file: str
    code: str
    explanation: Optional[str] = ""
