# 🤖 Three‑Agent Dev Workflow (ACL + Gemini CLI)

This script orchestrates three AI agents (Developer, Tester, Reviewer) using file‑system **ACLs** to physically isolate file access. Each agent runs a **Gemini CLI** prompt, and the workflow cycles to implement tasks, write tests, and review results.

## 🧠 How It Works

1. **Workflow Initialization**: The orchestrator ensures directories exist, configures the `gemini-agent` Git identity, and explicitly locks the `run.py` script so the AI cannot tamper with it.
2. **Sequential Execution & Permission Flipping**: Permissions are dynamically set via `setfacl` before each agent runs, granting only the strictly required access to the `gemini-agent` user.
   - **Developer** → reads `REVIEW.md` for bug fixes, otherwise picks the first unticked task from `TASKS.md` and implements code in `src/` and `index.html`.
   - **Tester** → locked out of `src/`. It writes test cases in `tests/` based on `REVIEW.md` (bug reproduction) or the `Tests:` section of the current task.
   - **Reviewer** → runs the test suite (`npx vitest run`). If tests fail, it writes bug details to `REVIEW.md`. If they pass, it marks the task as done in `TASKS.md`, clears `REVIEW.md`, and commits the changes.
3. **Infinite Loop Protection**: At the start of every cycle, the orchestrator checks `REVIEW.md`. If the Reviewer outputs *"Found same bug again"*, the orchestrator immediately halts to prevent runaway API usage.
4. **Cleanup**: Permissions are **restored** to the host user (`hrutav-modha`) after each iteration.

---

## ❌ The Problem It Solves

If you just tell an AI loop to "write code and then test it," it usually fails due to two major flaws:

- **Implementation Bias (The Tautology Problem):** If the Tester agent can read the Developer's source code, it writes tests tailored to perfectly match that exact *implementation* rather than the actual *specification* (`TASKS.md`). It simply rubber-stamps the code, including the bugs.
- **LLM Laziness & Shortcut Seeking:** LLMs are notoriously lazy when left unchecked. During testing, they frequently write fake, guaranteed-to-pass assertions like `expect(true).toBe(true)` just to trick the orchestrator into a "success" state and break out of the loop.

Soft prompts like *"Please write rigorous black-box tests"* do not fix this behavior. We need a physical, deterministic boundary.

---

## ✨ What’s Unique About This Approach

This project solves those problems by:

- **Enforcing access policies with bare-metal Linux ACLs** – every agent runs under the same system user (`gemini-agent`), but the orchestrator dynamically toggles `setfacl` to blind them from each other.  
- **No Docker Overhead** – It achieves zero-trust isolation natively on the host OS.
- **Using a fixed‑format task file (`TASKS.md`)** with explicit test definitions, so agents don’t need to guess what “done” means.

The result is a deterministic workflow: the Developer cannot see the tests, the Tester cannot see the source, and the Reviewer can only commit when the tests pass. 

## 📁 File & Directory Access Model (Kernel-Level)

| Agent      | `src/` | `tests/` | `index.html` | `TASKS.md` | `REVIEW.md` | `.git/` | `run.py` | `node_modules/` |
|------------|--------|----------|--------------|------------|-------------|---------|----------|-----------------|
| Developer  | rwx    | ---      | rwx          | r          | r           | –       | ---      | rx              |
| Tester     | ---    | rwx      | ---          | r          | r           | –       | ---      | rx              |
| Reviewer   | rx     | rx       | r            | rwx        | rwx         | rwx     | ---      | rx              |

- **`---`** = Locked (No access)
- **`r` / `rx`** = Read / Read+Execute (Directories)
- **`rwx`** = Full read/write/execute access

## 📝 Example `TASKS.md` Format

`- [ ] Implement login endpoint`  
`   Tests: Should return 200 with valid credentials, 401 with invalid`  
`- [ ] Add input validation`  
`   Tests: Should reject empty fields, enforce min length`

## ⚙️ Configuration

- `MAX_CYCLES` – number of iterations (set to 1 in `run.py`, increase for multi‑step workflows).
- **Gemini path** – change `/usr/local/nodejs/bin/gemini` if your CLI is installed elsewhere.
- **Test command** – modify the `npx vitest run` line inside the Reviewer prompt if you use a different runner.
- **Host User** – Update the `hrutav-modha` username in the `restore_permissions()` function to match your local Linux user.

## 📄 License

MIT
