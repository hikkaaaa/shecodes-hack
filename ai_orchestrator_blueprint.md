# AI Code Mentor — Intelligent Core (AI Orchestrator) Blueprint

## 1. High-Level System Diagram

```text
[Frontend Client] <── WebSocket / REST ──> [API Gateway (FastAPI)]
                                                   |
                                                   ▼
                                        [AI Central Orchestrator]
                                        /          |           \
                                       /           |            \
[Static Analysis Engines] ◄──────────► [Memory & Context] ◄────► [Specialist Agents]
  - Linter / PyType                    - Redis Cache           - Reviewer Agent
  - Semgrep / Bandit                   - DB (PostgreSQL)       - Security Agent
  - AST Parser                         - Session Context       - Refactor Agent
  - Cyclomatic Calc                                            - Debug Agent
                                                               - Test Agent
                                                                    ▲
                                                                    |
                                        [Execution Environment] ◄───┘
                                        - Docker Sandbox (Pytest/Jest)
                                        - STDOUT / STDERR Capture
```

## 2. Multi-Agent Architecture & Interface Design

The AI layer strictly decouples reasoning from tool execution. The **Orchestrator** acts as the switchboard, injecting shared state (the "Memory & Context") into stateless specialist agents.

### Agent Interface Contract

Every agent adheres to a strict input/output typed contract:

**Input (Context Payload):**
*   `files`: `Map<string, string>` (File path -> contents)
*   `active_file`: `string`
*   `static_analysis_results`: `JSON` (Pre-computed metrics/lint errors)
*   `task_intent`: `enum` (e.g., `REVIEW`, `DEBUG`)
*   `extra_context`: `JSON` (e.g., stack traces, goal specifications)

**Output (Structured JSON):**
*   `status`: `enum` (`SUCCESS`, `NEEDS_INFO`, `FAILED`)
*   `actions`: `List[Mutation]` (Proposed file diffs)
*   `feedback`: `List[Issue]` (Line-specific commentary)
*   `metadata`: `JSON` (Token usage, confidence score)

### Orchestrator Pseudo-Code

```python
class AIOrchestrator:
    def handle_request(self, payload: RequestPayload):
        # 1. Deduplicate & Cache Check
        cache_key = hash(payload.files + payload.intent)
        if cached := redis.get(cache_key):
             return cached
             
        # 2. Parallel Static Analysis
        static_results = await asyncio.gather(
            run_linter(payload.files),
            run_ast_parser(payload.files),
            run_semgrep(payload.files)
        )
        
        # 3. Context Assembly
        context = {
            "files": payload.files,
            "static_data": static_results,
            "history": self.db.get_recent_history(payload.user_id)
        }
        
        # 4. Routing via Intent
        if payload.intent == "REVIEW":
             result = await ReviewAgent.execute(context)
             
             # 5. Parallel Scoring
             score = await ScoringEngine.calculate(static_results, result.feedback)
             result.attach_score(score)
             
        elif payload.intent == "AUTO_FIX":
             result = await self._run_test_fix_loop(context)
             
        # 6. Cache & Return
        redis.setex(cache_key, TTL=3600, result)
        self.db.log_interaction(payload.user_id, result)
        return result
```

## 3. Review Flow (Static First, LLM Second)

To avoid hallucination and reduce costs, deterministic checks always run first.

1.  **Static Analysis Check**: The Orchestrator runs PyLint/ESLint and calculates cyclomatic complexity *before* touching the LLM.
2.  **Context Construction**: The static errors (e.g., `line 42: undefined variable`) are injected into the LLM prompt.
3.  **LLM Reasoning**: The Reviewer Agent is prompted: *"Here is the code, and here are the static linter errors. Explain these errors conceptually to a student, and evaluate the overall architecture."*
4.  **Result Merge**: The Orchestrator merges deterministic rule violations with LLM-generated conceptual advice (e.g., "This function violates the Single Responsibility Principle").

## 4. Security Scan Flow

1.  **Static Detection (Fast)**: A tool like `Semgrep` or `Bandit` scans the codebase (Execution time: ~50ms). It flags potential issues (e.g., `hashlib.md5() used`).
2.  **LLM Validation**: The Security Agent is invoked with the specific lines flagged by the static tool.
    *   *Prompt*: "A static analyzer flagged line 14 as a weak hashing vulnerability. Review the context. Is this a false positive used in a safe context (like a checksum for a non-security feature)? If it is a real vulnerability, generate a patch using `hashlib.sha256()`."
3.  **Output**: If confidence is high, the system prompts the frontend to render a red squiggly line with the LLM's explanation and a 1-click apply patch.

## 5. Auto Test & Fix Loop (Agentic Loop)

1.  **Generation**: User specifies a file. The Test Agent reads the AST, identifies public functions, and generates a `pytest`/`jest` suite covering standard and edge cases.
2.  **Execution execution**: Orchestrator mounts the tests and code into the Docker Sandbox. Runs `pytest`.
3.  **Capture & Analyze**: 
    *   If `ExitCode == 0`: Return success.
    *   If `ExitCode != 0`: Capture `stdout` (traceback).
4.  **The Fix Loop (Max 3 iterations)**:
    *   Orchestrator sends `(Code + Traceback + Failing Test)` to the **Debug Agent**.
    *   Debug Agent returns a JSON `Patch` (diff) and an `Explanation`.
    *   Orchestrator applies the Patch to files inside the temporary Sandbox volume.
    *   Sandbox re-runs `pytest`.
5.  **Termination**: The loop ends when tests pass, or when `Iteration > MAX_RETRIES`. If it fails, it returns the final explanation indicating why the auto-fix couldn't converge.

## 6. Refactoring Flow (Multi-File Awareness)

1.  **Dependency Graphing**: Before hitting the LLM, the Orchestrator builds an AST dependency graph (e.g., `A.py imports B.py`).
2.  **Chunking**: If migrating a large JS project to TS, the Orchestrator doesn't send the whole repo. It orders files topologically (leaves first, dependents last).
3.  **Type Inference**: The Refactor Agent processes `File B` first, returning the TS version. The Orchestrator extracts exported interfaces and passes them in the prompt for `File A`, ensuring cross-file type consistency. 
4.  **Diff Generation**: The agent outputs standard Unified Diff formats mapped to file paths.

## 7. Scoring System Integration

The final `SkillScore` (0-100) is a weighted composite mathematically designed to discourage LLM "vibes" and enforce concrete mechanics.

*   **Static Metrics (60% weight)**:
    *   *Test Coverage %*
    *   *Cyclomatic Complexity* (Avg per function)
    *   *Linter Violations* (Count / LOC)
*   **LLM Heuristics (40% weight)**:
    *   *Readability*: Evaluates variable naming descriptiveness and comment logic.
    *   *Architecture*: Identifies tightly coupled modules or "God Functions".
*   **Anti-Hallucination Mechanism**: The LLM is forced to output scores as categorical arrays (e.g., `["fails_DRY", "excellent_names"]`), which the Scoring Engine rigidly maps to integer penalties/bonuses, rather than letting the LLM invent a raw number.

## 8. Growth Tracking & Engine

*   **Data Stored**: Every successful "Analyze" or "Pass" event saves: `Timestamp`, `ProjectID`, `StaticMetrics`, `CategoricalArray` (from Scoring), and a `DiffHash`.
*   **Trend Calculation**: The engine calculates a 7-day Simple Moving Average of complexity and linter counts.
*   **Skill Improvement Computation**: The Growth Engine is actually an Agent triggered defensively (e.g., once a day). It is fed a diff of *Month 1 Code* vs *Month 2 Code*. It doesn't grade logic; it generates semantic achievements (e.g., "You have stopped nesting `if` statements! +15 Architecture").

## 9. Data Storage Design

*   **DB (PostgreSQL)**: 
    *   `Users`, `Projects`, `Metrics_Snapshots` (Time-series data for Growth), `Agent_Interactions` (For fine-tuning logs).
*   **Cache (Redis)**:
    *   AST representations of unchanged files.
    *   LLM Outputs keyed by `SHA256(FileContent + AgentIntent)` to entirely bypass the OpenAI API if a student asks for a review of unchanged code.
*   **Recompute**:
    *   Final Skill Scores are recomputed dynamically on the fly if the weighting algorithm changes, based on the immutable historical `CategoricalArrays`.

## 10. Prompt Engineering Strategy

*   **System Prompt Structure**: Every prompt is dynamically built:
    `[Role] + [Constraints] + [Output Format] + [Context injected by Orchestrator]`
*   **Structured Outputs**: OpenAI's `response_format: { type: "json_object" }` is strictly enforced. The prompt includes a TypeScript interface definition the LLM must obey.
*   **Constraining Formats**: 
    *"You are the Test Agent. You must output ONLY valid JSON matching this schema. Focus on the public interface. Do not explain your reasoning in the generated code."*

## 11. Scalability Considerations

*   **Token Optimization**:
    *   Only modified files (via Git diff logic) and their direct dependencies are sent to the LLM. 
    *   Large files > 3000 LOC are aggressively truncated using AST pruning (removing function bodies of unrelated pure functions).
*   **Async/Parallel Execution**: FastAPI routes calls to Celery Workers for long-running Auto-Fix loops, freeing up the API thread. Independent agents (Reviewer, Security) are triggered via `asyncio.gather` simultaneously to reduce perceived latency.
*   **Cost Control**: The strict Caching layer absorbs ~30% of Student redundant actions (e.g., spamming the "Analyze" button without saving changes). Static analysis acts as a gatekeeper; if static logic detects syntax errors so severe the code won't compile, the system short-circuits and refuses the LLM call entirely, returning the syntax error directly.
