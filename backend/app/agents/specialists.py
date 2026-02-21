import json
import os
from openai import AsyncOpenAI
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../../.env'))

try:
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
except:
    client = None

class BaseAgent:
    @staticmethod
    async def chat_completion(prompt: str, content: str) -> Dict[str, Any]:
        if not client:
            return {"status": "FAILED", "feedback": [], "actions": [], "insights": "API key missing"}
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": content}
                ],
                temperature=0.2
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Agent Error: {e}")
            return {"status": "FAILED", "feedback": [], "actions": [], "insights": str(e)}

class ReviewerAgent:
    @staticmethod
    async def execute(context: Dict[str, Any]) -> Dict[str, Any]:
        prompt = """You are an AI Code Mentor reviewing a student's code. 
        You will receive context containing the raw files and static analysis errors (linter warnings/complexity metrics).
        Explain these static errors conceptually to a student. Identify architectural flaws.
        Return ONLY valid JSON matching this schema:
        {
           "status": "SUCCESS",
           "feedback": [
             { "file": "index.py", "line": 4, "severity": "high/medium/low", "message": "Why this is an issue and how to fix it." }
           ],
           "insights": "General summary of improvement."
        }"""
        return await BaseAgent.chat_completion(prompt, json.dumps(context, indent=2))

class SecurityAgent:
    @staticmethod
    async def execute(context: Dict[str, Any]) -> Dict[str, Any]:
        prompt = """You are a Security Sentinel scanning student code.
        Focus ONLY on vulnerabilities. 
        Return ONLY valid JSON matching this schema:
        {
           "status": "SUCCESS",
           "feedback": [
             { "file": "main.py", "line": 42, "severity": "high", "message": "Vulnerability explained" }
           ],
           "actions": [
             { "file": "main.py", "diff": "proposed secure code" }
           ]
        }"""
        return await BaseAgent.chat_completion(prompt, json.dumps(context, indent=2))

class DebugAgent:
    @staticmethod
    async def execute(context: Dict[str, Any]) -> Dict[str, Any]:
        prompt = """You are an Auto-Fix Debug Agent.
        Analyze the provided code and the Stack Trace included in 'extra_context'.
        Return ONLY valid JSON matching this schema:
        {
           "status": "SUCCESS",
           "feedback": [{"file": "...", "message": "Root cause of the crash."}],
           "actions": [{"file": "...", "diff": "Fixed version of the code that will pass tests."}]
        }"""
        return await BaseAgent.chat_completion(prompt, json.dumps(context, indent=2))
