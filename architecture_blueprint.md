# AI Code Mentor — Intelligent IDE for Students

## 1. High-Level Architecture Overview

The system is designed as a scalable, service-oriented architecture comprising five key layers:

1. **Presentation Layer (Frontend)**: A React + TypeScript SPA providing a rich, IDE-like experience (powered by Monaco Editor). It resembles VSCode's layout with dynamic sidebars, a file tree, editor, right-side analysis pane, and terminal view.
2. **API & Orchestration Layer (Backend)**: Built with Python and FastAPI, this layer exposes RESTful APIs and WebSockets. It handles routing, user authentication, file management, and orchestrates calls to the AI Agents.
3. **AI Intelligence Layer (Agents)**: A specialized set of modular agents (Reviewer, Refactor, Security, Debug, Test) communicating via an internal orchestrator. Powered by the OpenAI API.
4. **Execution Layer (Sandbox)**: Docker-based isolated execution sandboxes. This layer securely spins up ephemeral containers to run user code, execute Pytest/Jest scripts, and stream real-time logs back to the user.
5. **Data Persistence Layer (Database)**: PostgreSQL for robust relational data (users, projects, progress metrics, and interaction history) and Redis for rate-limiting, session caching, and Celery task queue management.

---

## 2. Backend Architecture

### Folder Structure (Detailed Tree)
```
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── dependencies.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── agents.py
│   │   │   └── sandbox.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── logging.py
│   ├── db/
│   │   ├── session.py
│   │   └── models/
│   │       ├── user.py
│   │       ├── project.py
│   │       ├── score.py
│   │       └── analysis_history.py
│   ├── services/
│   │   ├── file_manager.py
│   │   ├── sandbox_executor.py
│   │   └── scoring_engine.py
│   ├── agents/
│   │   ├── orchestrator.py
│   │   ├── base_agent.py
│   │   ├── review_agent.py
│   │   ├── refactor_agent.py
│   │   ├── security_agent.py
│   │   └── test_agent.py
│   ├── prompts/
│   │   └── templates/
│   └── tests/
├── Dockerfile
├── requirements.txt
└── .env
```

### Module Responsibilities
- **API Routers**: Handle HTTP requests, validate input via Pydantic, and format responses.
- **Services (Service Layer)**: Encapsulate business logic. E.g., `file_manager.py` handles reading/writing code files to local or cloud storage (S3); `sandbox_executor.py` interfaces with Docker daemon.
- **Agents**: Contains LangChain/OpenAI logic. Structured with a Base Agent strategy and specific prompts corresponding to each agent's role.
- **Sandbox execution**: Utilizes the `docker` Python library to spin up scoped containers with memory limits and network disables to securely run student code.

---

## 3. API Design

| Endpoint | Method | Purpose | High-Level Request / Response |
|----------|--------|---------|--------------------------------|
| `/api/v1/projects/{id}/analyze` | `POST` | Trigger AI review | **Req**: `{"files": ["path", ...]}` <br/> **Res**: `{"issues": [...], "score": 85}` |
| `/api/v1/projects/{id}/refactor`| `POST` | Ask for smart code refactor | **Req**: `{"target": "file/folder", "goal": "ts-conversion"}` <br/> **Res**: `{"diff": "..."}` |
| `/api/v1/sandbox/run` | `POST` | Execute tests/code in Docker | **Req**: `{"command": "npm test"}` <br/> **Res**: `{"stdout": "...", "status": "failed"}` |
| `/api/v1/agents/chat` | `WS` | Streaming WS for Chat/Debug | **Req**: `{"type": "debug", "trace": "..."}` <br/> **Res**: Streams markdown explanation & fixes |
| `/api/v1/users/{id}/progress` | `GET` | Get historical skill scores | **Req**: n/a <br/> **Res**: `{"history": [{"date", "scores"}], "trend": "improving"}` |

---

## 4. Frontend Architecture

### Tech Stack: React, TypeScript, Zustand (State), Tailwind CSS

### Folder Structure
```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── store/
│   │   ├── useIdeStore.ts (Active files, theme)
│   │   ├── useAgentStore.ts (Agent chat history, review findings)
│   ├── components/
│   │   ├── IDE/
│   │   │   ├── Sidebar.tsx (File Explorer, Git, Extensions)
│   │   │   ├── EditorArea.tsx (Monaco Integration)
│   │   │   ├── BottomPanel.tsx (Terminal, Test Outputs)
│   │   │   └── TopNavigation.tsx (Tabs)
│   │   ├── AnalysisPane/
│   │   │   ├── AIChat.tsx
│   │   │   ├── CodeReviewInsights.tsx
│   │   │   └── SkillScoreRadarChart.tsx
│   ├── hooks/
│   │   ├── useApi.ts
│   │   └── useFileSystem.ts
│   ├── pages/
│   │   ├── Dashboard.tsx (Project Selection, Growth Mode)
│   │   └── Workspace.tsx (Main IDE View)
│   └── styles/
│       └── globals.css
```

### IDE Layout Zones
- **Left Sidebar**: File Explorer, Search, Growth Mode metric summary.
- **Center**: Monaco Editor instances managed by tabs. Includes CodeLens features for "Quick Fix" buttons.
- **Right Panel (Analysis Pane)**: Displays agent output, active explanations, refactoring previews, and Security Sentinel warnings.
- **Bottom Panel**: Terminal (Xterm.js) attached to Sandbox WebSockets, and a Test Runner visualizer.

---

## 5. AI Agent Architecture

The system uses an **Orchestrator** pattern. The Orchestrator intercepts requests, provides workspace context (current files, dependency graphs), and delegates to specialists.

- **Reviewer Agent**: Analyzes AST chunks + LLM prompting. Returns structured JSON containing specific lines, error explainers, and suggestions.
- **Refactor Agent**: Works cross-file. It is given `(file_tree, target_files)` and outputs standardized Git-like `diff` files to be parsed and rendered on the frontend.
- **Security Sentinel**: First runs blazing-fast static analysis (bandit / semgrep). Findings are fed to the LLM to filter false positives and generate remediation patches.
- **Debug Agent**: Subscribes to Sandbox test failures. It reads the stack trace and the originating file to provide context-aware fixes.
- **Test Agent**: Reads functions and writes comprehensive edge-case test suites (Jest/Pytest). It has self-healing capabilities: if tests fail on first run due to syntactical errors, it auto-refines the test code.

**Communication**: Agents operate behind a queue (Celery/RabbitMQ) for long-running tasks, streaming intermediate status updates to the frontend via WebSockets.

---

## 6. Scoring Engine Design

The Skill Score is computed using a Weighted Hybrid approach:

- **Static Analysis (40%)**: Cyclomatic complexity, test coverage percentages, linter warnings, PEP8/ESLint compliance.
- **AI Heuristics (60%)**: 
  - *Quality*: Does the code handle edge cases? Are variable names descriptive? (Evaluated by LLM rubric).
  - *Architecture*: Are principles like DRY, SOLID, and MVC respected?
  - *Optimization*: Are the algorithms used optimal in Big O notation?

**Aggregation Logic**: 
The `ScoringEngine` module standardizes all metrics iteratively to a 0-100 scale per category. The overall score is an adaptive moving average that rewards consistency over single-point successes.

---

## 7. Growth Tracking System

- **Stored Metrics**: Every project submission/milestone captures the snapshot of the 4 core scores (Quality, Readability, Optimization, Architecture).
- **Comparison & Visuals**: Stored as chronological events. The Growth Mode visualizes these points using line graphs and radar charts (using Recharts).
- **Gamification**: The system calculates the `delta` (improvement) between past solutions and new ones. High deltas unlock achievements (e.g., "Architecture Tycoon", "Zero Bug Hero"). The LLM generates personalized progress summaries ("You've drastically improved your async function handling since last week!").

---

## 8. Interaction Flow Diagrams

### Example: Auto-Fix Loop Flow (Test Agent)
1. User clicks "Run & Auto-Fix".
2. **Backend** maps project files into the Docker Sandbox.
3. Sandbox executes `pytest`.
4. If output == `Fail`:
   - Backend captures the `stderr` Stack Trace.
   - Forwards trace + relevant code to the **Debug Agent**.
5. **Debug Agent** outputs a detailed explanation + a proposed fix `.diff`.
6. Orchestrator applies the diff inside the Sandbox.
7. System re-runs tests automatically.
8. Loop terminates upon `Pass` or reaches `MAX_ITER=3`. Result streamed to Frontend.

### Example: Security Scan Flow
1. File uploaded or saved.
2. Background worker triggers AST static tool (Semgrep).
3. Raw vulnerabilities fetched.
4. **Security Agent** analyzes raw outputs to discard false positives.
5. High-confidence risks sent through WebSocket to IDE.
6. Frontend renders red squiggly lines via Monaco Editor markers.
7. Hovering over squiggly shows "Security Sentinel: Hardcoded Secret Detected → Click to Auto-Vault."
