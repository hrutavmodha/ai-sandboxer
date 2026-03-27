import subprocess
import sys
import logging
import json
import argparse
from pathlib import Path

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
            cls._run_acl(["sudo", "setfacl", "-m", f"u:{AGENT_USER}:---", path])
            if is_dir:
                cls._run_acl(["sudo", "setfacl", "-R", "-d", "-m", f"u:{AGENT_USER}:---", path])
            logging.info(f"Locked: {path}")

    @classmethod
    def read_only(cls, path, is_dir=False):
        if Path(path).exists():
            perm = "rx" if is_dir else "r"
            cls._run_acl(["sudo", "setfacl", "-R", "-m", f"u:{AGENT_USER}:{perm}", path])
            if is_dir:
                cls._run_acl(["sudo", "setfacl", "-R", "-d", "-m", f"u:{AGENT_USER}:{perm}", path])
            logging.info(f"Read-Only: {path}")

    @classmethod
    def execute_only(cls, path):
        if Path(path).exists():
            cls._run_acl(["chmod", "+x", path])
            cls._run_acl(["sudo", "setfacl", "-m", f"u:{AGENT_USER}:--x", path])
            logging.info(f"Blind Execute Enabled: {path}")

    @classmethod
    def write_access(cls, path, is_dir=False):
        if Path(path).exists():
            cls._run_acl(["sudo", "setfacl", "-R", "-m", f"u:{AGENT_USER}:rwx", path])
            if is_dir:
                cls._run_acl(["sudo", "setfacl", "-R", "-d", "-m", f"u:{AGENT_USER}:rwx", path])
            logging.info(f"Write-Access: {path}")

    @classmethod
    def restore_all(cls):
        try:
            subprocess.run(["sudo", "setfacl", "-R", "-m", f"u:{HOST_USER}:rwx", "."], check=True)
            subprocess.run(["sudo", "chown", "-R", f"{HOST_USER}:{HOST_USER}", "."], check=True)
            logging.info("Host permissions restored fully.")
        except subprocess.CalledProcessError:
            logging.error("Failed to restore host permissions.")

def validate_tasks_json():
    try:
        result = subprocess.run(["python3", "validate.py"], capture_output=True, text=True)
        if result.returncode != 0:
            if result.stdout: print(result.stdout)
            if result.stderr: print(result.stderr)
            return False
        return True
    except Exception as e:
        logging.error(f"Validator execution failed: {e}")
        return False

def run_agent(agent_name, prompt):
    logging.info(f"Starting {agent_name} Agent...")
    cmd = [
        "sudo", "-u", AGENT_USER, 
        GEMINI_CLI, "-p", prompt, "--yolo"
    ]
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError:
        logging.warning(f"{agent_name} Agent encountered an error or exited non-zero.")


def init_planner_agent(goal):
    Path("tasks.json").touch(exist_ok=True)
    PermissionManager.write_access("tasks.json")
    schema = Path("schema.ts").read_text()
    prompt = (
        f"Planner. Goal: {goal}. Schema: {schema}. "
        "Create tasks.json and run './validate.py' until it passes. "
        "Do not create any markdown files."
    )
    run_agent("Planner", prompt)

def init_dev_agent():
    PermissionManager.read_only("REVIEW.md")
    PermissionManager.read_only("tasks.json")
    PermissionManager.write_access("src/", is_dir=True)
    PermissionManager.write_access("tests/", is_dir=True)
    PermissionManager.write_access("index.html")
    PermissionManager.write_access("package.json")
    PermissionManager.write_access("package-lock.json")
    
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
    PermissionManager.read_only("src/", is_dir=True)
    PermissionManager.read_only("index.html")
    PermissionManager.read_only("tests/", is_dir=True)
    PermissionManager.write_access(".git/", is_dir=True)
    PermissionManager.write_access("tasks.json")
    PermissionManager.write_access("REVIEW.md")
    
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
    subprocess.run(['sudo', '-u', AGENT_USER, 'git', 'config', '--global', 'user.name', 'Hrutav Modha'])
    subprocess.run(['sudo', '-u', AGENT_USER, 'git', 'config', '--global', 'user.email', 'modhahrutav@gmail.com'])
    
    Path("tests").mkdir(exist_ok=True)
    Path("src").mkdir(exist_ok=True)
    
    review_file = Path("REVIEW.md")
    if not review_file.exists():
        review_file.write_text("# Review\n")

    PermissionManager.lock("run.py")
    PermissionManager.execute_only("validate.py")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("goal", nargs="?")
    args = parser.parse_args()

    if args.goal and not Path("tasks.json").exists():
        logging.info(f"Initializing project roadmap for goal: {args.goal}")
        init_planner_agent(args.goal)

    if not validate_tasks_json():
        logging.error("Validation failed. Check tasks.json structure.")
        sys.exit(1)

    for i in range(MAX_CYCLES):
        review_content = Path("REVIEW.md").read_text() if Path("REVIEW.md").exists() else ""
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
