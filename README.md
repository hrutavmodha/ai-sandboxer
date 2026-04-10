# 🤖 Multi‑Agent Vibe-Coding Workflow Orchestrator

A TypeScript‑based orchestrator that implements a robust, isolated software development lifecycle (SDLC) using multiple AI agents. It leverages the **Gemini CLI** for high‑level reasoning and **Linux Access Control Lists (ACLs)** to ensure a zero‑trust, deterministic execution environment.

---

## 🧠 Architectural Overview

This system coordinates four specialized AI agents in a continuous loop, ensuring each task is planned, implemented, tested, and reviewed with minimal human intervention.

### 👥 The Agents

1.  **Planner (`src/agents/planner/`)**: Analyzes the project goal and generates a structured roadmap in **`app/tasks.json`**. It identifies the necessary components and the testing strategy for each task.
2.  **Developer (`src/agents/developer/`)**: Implements the code changes defined in the roadmap. It has write access to the source code but is strictly isolated from the test suite to prevent implementation bias.
3.  **Tester (`src/agents/tester/`)**: Writes comprehensive tests based on the task specification and the project's validation schema. It is blinded from the Developer's implementation to ensure true black‑box testing.
4.  **Reviewer (`src/agents/reviewer/`)**: Validates the Developer's work by running the test suite. If tests fail, it identifies bugs and provides feedback. If they pass, it marks the task as complete, cleans up, and commits the changes.

---

## 🛡️ Security & Isolation: ACL‑Based Boundary

To solve the **Implementation Bias** and **LLM Laziness** problems, this project uses surgical **Linux ACLs** managed in **`src/acl.ts`**.

-   **Dynamic Permission Flipping**: Before each agent execution, the orchestrator flips permissions using `setfacl`.
-   **Kernel‑Level Boundaries**: Agents run under a restricted system user (e.g., `gemini-agent`). The Developer cannot see the tests, the Tester cannot see the source, and the Reviewer only commits when the tests pass.
-   **No Docker Overhead**: Achieves physical, deterministic isolation natively on the host OS.

### 📁 File & Directory Access Model

| Agent      | `src/` | `tests/` | `app/tasks.json` | `app/REVIEW.md` | `.git/` | `node_modules/` |
|------------|--------|----------|------------------|-----------------|---------|-----------------|
| Developer  | rwx    | ---      | r                | r               | ---     | rx              |
| Tester     | ---    | rwx      | r                | r               | ---     | rx              |
| Reviewer   | rx     | rx       | rwx              | rwx             | rwx     | rx              |

-   **`---`** = Locked (No access)
-   **`r` / `rx`** = Read / Read+Execute (Directories)
-   **`rwx`** = Full read/write/execute access

---

## 🚀 Getting Started

### Prerequisites

-   **Linux OS** with ACL support (`setfacl`, `getfacl`).
-   **Gemini CLI** installed and configured (e.g., in `/usr/local/nodejs/bin/gemini`).
-   **Node.js & ts‑node** for running the orchestration script.

### Configuration

Configuration is managed in **`app/vibe.config.ts`**. This file defines the agents, their commands, and custom instructions.

### Running the Workflow

Start the orchestrator with a project goal:

```bash
npx ts-node src/run.ts --prompt "Build a responsive todo list app with local storage"
```

---

## 📂 Key Components

-   **`src/run.ts`**: The main entry point.
-   **`src/core/workflow.ts`**: Orchestration logic and state management.
-   **`src/acl.ts`**: Logic for managing file‑system level isolation.
-   **`src/core/runner.ts`**: Handles the execution of the Gemini CLI in headless mode.
-   **`app/tasks.json`**: The persistent project roadmap.
-   **`src/agents/`**: Contains the logic and specialized prompts for each agent.

---

## 📄 License

MIT
