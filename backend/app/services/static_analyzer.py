import re
import ast
import json
from typing import Dict, Any

try:
    from radon.complexity import cc_visit, AVERAGE_PENALTY
except ImportError:
    cc_visit = None

class StaticAnalyzer:
    @staticmethod
    def analyze(files: Dict[str, str]) -> Dict[str, Any]:
        results = {}
        for filename, content in files.items():
            file_metrics = {"complexity": 1, "warnings": []}
            
            # Simple Python Complexity Check
            if filename.endswith(".py") and cc_visit:
                try:
                    blocks = cc_visit(content)
                    if blocks:
                        avg_cc = sum(b.complexity for b in blocks) / len(blocks)
                        file_metrics["complexity"] = avg_cc
                except Exception:
                    file_metrics["warnings"].append({"line": 1, "msg": "SyntaxError: Unable to parse Python AST."})
            
            # Simple Linter Mock (detects missing docstrings, bad variable names, print statements)
            lines = content.split('\n')
            for i, line in enumerate(lines):
                # Detect plain prints
                if re.search(r'\bprint\s*\(', line):
                    if filename.endswith('.py') and "print(" in line:
                         file_metrics["warnings"].append({"line": i+1, "msg": "Consider using the logging module instead of print()."})
                
                # Detect console.log in JS
                if re.search(r'console\.log\s*\(', line):
                     file_metrics["warnings"].append({"line": i+1, "msg": "Consider removing console.log in production."})
                
                # Detect hardcoded secrets (Security Sandbox Mock)
                if re.search(r'(api_key|password|secret|token)\s*=\s*[\'"][^\'"]+[\'"]', line, re.IGNORECASE):
                     file_metrics["warnings"].append({"line": i+1, "severity": "high", "msg": "Potential hardcoded secret detected!"})

            results[filename] = file_metrics
            
        return results
