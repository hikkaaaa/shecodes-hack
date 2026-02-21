from typing import Dict, Any, List

class ScoringEngine:
    @staticmethod
    def calculate(static_results: Dict[str, Any], agent_feedback: List[Any]) -> int:
        base_score = 100
        
        # 1. Deduct based on Cyclomatic Complexity
        total_complexity = sum(metric.get('complexity', 1) for metric in static_results.values() if isinstance(metric, dict))
        avg_complexity = total_complexity / max(1, len(static_results))
        if avg_complexity > 5:
            base_score -= 10
        elif avg_complexity > 10:
            base_score -= 20
            
        # 2. Deduct based on Static Warnings Count
        total_warnings = sum(len(metric.get('warnings', [])) for metric in static_results.values() if isinstance(metric, dict))
        base_score -= (total_warnings * 2)
        
        # 3. Deduct based on LLM heuristic feedback severity
        for issue in agent_feedback:
            severity = issue.get("severity", "medium").lower()
            if severity == "high":
                base_score -= 8
            elif severity == "medium":
                base_score -= 3
            else:
                base_score -= 1
                
        # Constrain 0 to 100
        return max(0, min(100, int(base_score)))
