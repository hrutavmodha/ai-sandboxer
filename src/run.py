import subprocess
import sys
import logging
import json
import argparse
from pathlib import Path

# run.py is in src/
ROOT = Path(__file__).parent.parent
SRC = ROOT / "src"
APP = ROOT / "app"
TYPES = ROOT / "types"

# Project structure inside app/ for agents
APP_SRC = APP / "src"
APP_TESTS = APP / "tests"
APP_TASKS = APP / "tasks.json"
APP_REVIEW = APP / "REVIEW.md"

VALIDATE_PY = SRC / "validate.py"
SCHEMA_TS = TYPES / "schema.ts"

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
AGENT_USER = "gemini-agent"
HOST_USER = "hrutav-modha"
GEMINI_CLI = "/usr/local/nodejs/bin/gemini"
MAX_CYCLES = 10

class PermissionManager:
    @staticmethod
    def _run_acl(cmd):
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError:
            logging.error(f"Failed to execute ACL command: {' '.join(cmd)} — aborting!")
            sys.exit(1)

    @classmethod
    def lock(cls, path, is_dir=False):
        if Path(path).exists():
            cls._run_acl(["sudo", "setfacl", "-m", f"u:{AGENT_USER}:---", str(path)])
            if is_dir:
                cls._run_acl(["sudo", "setfacl", "-R", "-d", "-m", f"u:{AGENT_USER}:---", str(path)])
            logging.info(f"Locked: {path}")

    @classmethod
    def read_only(cls, path, is_dir=False):
        if Path(path).exists():
            perm = "rx" if is_dir else "r"
            cls._run_acl(["sudo", "setfacl", "-R", "-m", f"u:{AGENT_USER}:{perm}", str(path)])
            if is_dir:
                cls._run_acl(["sudo", "setfacl", "-R", "-d", "-m", f"u:{AGENT_USER}:{perm}", str(path)])
            logging.info(f"Read-Only: {path}")

    @classmethod
    def execute_only(cls, path):
        if Path(path).exists():
            cls._run_acl(["chmod", "+x", str(path)])
            cls._run_acl(["sudo", "setfacl", "-m", f"u:{AGENT_USER}:--x", str(path)])
            logging.info(f"Blind Execute Enabled: {path}")

    @classmethod
    def write_access(cls, path, is_dir=False):
        if Path(path).exists():
            cls._run_acl(["sudo", "setfacl", "-R", "-m", f"u:{AGENT_USER}:rwx", str(path)])
            if is_dir:
                cls._run_acl(["sudo", "setfacl", "-R", "-d", "-m", f"u:{AGENT_USER}:rwx", str(path)])
            logging.info(f"Write-Access: {path}")

    @classmethod
    def restore_all(cls):
        try:
            subprocess.run(["sudo", "setfacl", "-R", "-m", f"u:{HOST_USER}:rwx", "."], check=True, cwd=str(ROOT))
            subprocess.run(["sudo", "chown", "-R", f"{HOST_USER}:{HOST_USER}", "."], check=True, cwd=str(ROOT))
            logging.info("Host permissions restored fully.")
        except subprocess.CalledProcessError:
            logging.error("Failed to restore host permissions.")

def validate_tasks_json():
    try:
        # Runs against app/tasks.json
        result = subprocess.run(["python3", str(VALIDATE_PY)], capture_output=True, text=True, cwd=str(APP))
        if result.returncode != 0:
            if result.stdout: print(result.stdout)
            if result.stderr: print(result.stderr)
            return False
        return True
    except Exception as e:
        logging.error(f"Validator execution failed: {e}")
        return False

def init_planner_agent(goal):
    APP_TASKS.touch(exist_ok=True)
    PermissionManager.write_access(APP_TASKS)
    schema = SCHEMA_TS.read_text()
    prompt = (
        f"Planner. Goal: {goal}. Schema: {schema}. "
        "Create tasks.json in the current directory and run '../src/validate.py' until it passes. "
        "Do not create any markdown files."
    )
    run_agent("Planner", prompt)

def run_agent(agent_name, prompt):
    logging.info(f"Starting {agent_name} Agent...")
    cmd = [
        "sudo", "-u", AGENT_USER, 
        GEMINI_CLI, "-p", prompt, "--yolo"
    ]
    try:
        subprocess.run(cmd, check=True, cwd=str(APP))
    except subprocess.CalledProcessError:
        logging.warning(f"{agent_name} Agent encountered an error or exited non-zero.")

def init_dev_agent():
    PermissionManager.read_only(APP_REVIEW)
    PermissionManager.read_only(APP_TASKS)
    PermissionManager.write_access(APP_SRC, is_dir=True)
    PermissionManager.write_access(APP_TESTS, is_dir=True)
    PermissionManager.write_access(APP / "index.html")
    PermissionManager.write_access(APP / "package.json")
    PermissionManager.write_access(APP / "package-lock.json")
    
    prompt = (
        "1. You are Developer Agent. "
        "2. Check REVIEW.md: If there is a bug, fix it in src/ and write a test in tests/ to verify it, then STOP. "
        "3. Else, implement the first incomplete task from any phase EXCEPT 'Testing Phase' in tasks.json in src/. "
        "4. ALSO implement the corresponding test case from the 'Testing Phase' in tests/. "
        "5. Do not mark tasks as done. "
        "6. Write pure, functional code. No '// TODO' or partial implementations."
    )
    run_agent("Developer", prompt)

def init_reviewer_agent():
    PermissionManager.read_only(APP_SRC, is_dir=True)
    PermissionManager.read_only(APP / "index.html")
    PermissionManager.read_only(APP_TESTS, is_dir=True)
    PermissionManager.write_access(ROOT / ".git", is_dir=True)
    PermissionManager.write_access(APP_TASKS)
    PermissionManager.write_access(APP_REVIEW)
    
    prompt = (
        "You are Reviewer Agent. "
        "1. Run the tests using 'npm run test' or 'npx vitest run'. "
        "2. If tests FAIL: Check if REVIEW.md has the same bug. If yes, write 'Found same bug again' at the top of REVIEW.md and STOP. "
        "Else, write the new bug and logs to REVIEW.md. STOP. "
        "4. If tests PASS: Find the implemented task and its corresponding testing task in tasks.json. Mark BOTH as completed. "
        "5. Clear REVIEW.md, run 'git add .' and 'git commit -m \"feat: [task description]\"' and STOP."
    )
    run_agent("Reviewer", prompt)

def init_workflow():
    subprocess.run(['sudo', '-u', AGENT_USER, 'git', 'config', '--global', 'user.name', 'Hrutav Modha'], cwd=str(ROOT))
    subprocess.run(['sudo', '-u', AGENT_USER, 'git', 'config', '--global', 'user.email', 'modhahrutav@gmail.com'], cwd=str(ROOT))
    
    # Explicitly create directories in app/
    APP_SRC.mkdir(parents=True, exist_ok=True)
    APP_TESTS.mkdir(parents=True, exist_ok=True)
    
    if not APP_REVIEW.exists():
        APP_REVIEW.write_text("# Review\n")

    PermissionManager.lock(SRC, is_dir=True)
    PermissionManager.execute_only(VALIDATE_PY)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("goal", nargs="?")
    args = parser.parse_args()

    # Ensure app directory exists
    APP.mkdir(exist_ok=True)

    if args.goal and not APP_TASKS.exists():
        logging.info(f"Initializing project roadmap for goal: {args.goal}")
        init_planner_agent(args.goal)

    if not validate_tasks_json():
        logging.error("Validation failed. Check tasks.json structure.")
        sys.exit(1)

    for i in range(MAX_CYCLES):
        review_content = APP_REVIEW.read_text() if APP_REVIEW.exists() else ""
        if "Found same bug again" in review_content or "Cheating detected" in review_content:
            logging.warning("\n[STOP] Infinite Loop or AI Cheating detected in REVIEW.md. Breaking workflow.\n")
            break
        try:
            logging.info(f"\n--- Starting Iteration {i + 1} ---")
            init_workflow()
            init_dev_agent()
            init_reviewer_agent()
        except KeyboardInterrupt:
            logging.info("\nInterrupted by user. Cleaning up...")
            break
        finally:
            PermissionManager.restore_all()

    logging.info("\nWorkflow completely executed.")
    sys.exit(0)
