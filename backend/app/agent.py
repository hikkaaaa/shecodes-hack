import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

async def analyze_code(files: dict[str, str]):
    system_prompt = """You are an AI Code Mentor, reviewing a student's code.
    You will receive a list of files. Focus on finding bugs, architectural flaws, and giving score.
    Return ONLY a JSON object exactly matching this schema:
    {
      "issues": [
        {
          "file": "filename.js",
          "line": 42,
          "severity": "high/medium/low",
          "message": "Description of issue and fix"
        }
      ],
      "score": 85,
      "insights": "General summary of improvement."
    }"""
    
    user_content = json.dumps(files, indent=2)

    try:
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.2
        )
        response_text = completion.choices[0].message.content
        return json.loads(response_text)
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return {"issues": [{"file": "all", "line": 0, "severity": "error", "message": str(e)}], "score": 0, "insights": "API error."}
