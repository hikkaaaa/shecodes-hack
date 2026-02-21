import asyncio
from typing import Dict, Any

from app.models import RequestPayload, AgentResponse, Intent
from app.services.static_analyzer import StaticAnalyzer
from app.services.scoring import ScoringEngine
from app.agents.specialists import ReviewerAgent, SecurityAgent, DebugAgent
from app.db.cache import CacheManager
from app.sandbox_executor import run_in_sandbox

class AIOrchestrator:
    @classmethod
    async def handle_request(cls, payload: RequestPayload) -> AgentResponse:
        # 1. Deduplicate & Cache Check
        cache_key = CacheManager.get_key(payload.files, payload.intent.value)
        cached_result = CacheManager.get(cache_key)
        if cached_result:
            return AgentResponse(**cached_result)
        
        # 2. Parallel Static Analysis (using async gather for future-proofing)
        # Note: In a pure async environment, 'analyze' would be async. 
        # Here we mock it as synchronous but wrap it logically.
        static_results = StaticAnalyzer.analyze(payload.files)
        
        # 3. Context Assembly
        context = {
            "active_file": payload.active_file,
            "files": payload.files,
            "static_data": static_results,
            "extra_context": payload.extra_context or {}
        }
        
        raw_result = {}

        # 4. Routing via Intent
        if payload.intent == Intent.REVIEW:
            raw_result = await ReviewerAgent.execute(context)
            # 5. Determine Skill Score based on Static + LLM Feedback
            score = ScoringEngine.calculate(static_results, raw_result.get("feedback", []))
            raw_result["score"] = score
            
        elif payload.intent == Intent.SECURITY_SCAN:
            raw_result = await SecurityAgent.execute(context)
            
        elif payload.intent == Intent.AUTO_FIX:
             # Run test sandbox loop
             test_cmd = payload.extra_context.get("test_command", "python index.py")
             sandbox_result = run_in_sandbox("job-uuid", payload.files, test_cmd)
             if sandbox_result["error"]:
                 context["extra_context"]["stack_trace"] = sandbox_result["stderr"]
                 raw_result = await DebugAgent.execute(context)
             else:
                 raw_result = {"status": "SUCCESS", "insights": "Tests passed! No fix needed.", "actions": [], "feedback": []}
        
        # 6. Cache and Return
        if raw_result.get("status") != "FAILED":
             CacheManager.set(cache_key, raw_result)
             
        return AgentResponse(**raw_result)
