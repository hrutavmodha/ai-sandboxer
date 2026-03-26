import subprocess
import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
AGENT_USER = "gemini-agent"
HOST_USER = "hrutav-modha"
GEMINI_CLI = "/usr/local/nodejs/bin/gemini"
MAX_CYCLES = 1

class PermissionManager:
    @staticmethod
    def _run_acl(cmd: list):
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except subprocess.CalledProcessError:
            logging.error(f"Failed to execute ACL command: {' '.join(cmd)} — aborting!")
            sys.exit(1)

    @classmethod
    def lock(cls, path: str, is_dir=False):
        if Path(path).exists():
            cls._run_acl(["sudo", "setfacl", "-m", f"u:{AGENT_USER}:---", path])
            if is_dir:
                cls._run_acl(["sudo", "setfacl", "-R", "-d", "-m", f"u:{AGENT_USER}:---", path])
            logging.info(f"Locked: {path}")

    @classmethod
    def read_only(cls, path: str, is_dir=False):
        if Path(path).exists():
            perm = "rx" if is_dir else "r"
            cls._run_acl(["sudo", "setfacl", "-R", "-m", f"u:{AGENT_USER}:{perm}", path])
            if is_dir:
                cls._run_acl(["sudo", "setfacl", "-R", "-d", "-m", f"u:{AGENT_USER}:{perm}", path])
            logging.info(f"Read-Only: {path}")

    @classmethod
    def write_access(cls, path: str, is_dir=False):
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

def run_agent(agent_name: str, prompt: str):
    logging.info(f"Starting {agent_name} Agent...")
    cmd = [
        "sudo", "-u", AGENT_USER, 
        GEMINI_CLI, "-p", prompt, "--yolo"
    ]
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError:
        logging.warning(f"{agent_name} Agent encountered an error or exited non-zero.")

def init_dev_agent():
    PermissionManager.lock("tests/", is_dir=True)
    PermissionManager.read_only("REVIEW.md")
    PermissionManager.read_only("TASKS.md")
    PermissionManager.write_access("src/", is_dir=True)
    PermissionManager.write_access("index.html")
    
    prompt = (
        "1. You are Developer Agent. "
        "2. Check REVIEW.md: If there is a bug, fix it in src/ and STOP. "
        "3. Else, implement the first unticked task from TASKS.md in src/. "
        "4. Do not mark the task as done. "
        "5. Write pure, functional code. No '// TODO' or partial implementations. "
        "6. Do not implement whatever is given in `Tests` section of the **Task**"
    )
    run_agent("Developer", prompt)

def init_test_agent():
    PermissionManager.lock("src/", is_dir=True)
    PermissionManager.lock("index.html")
    PermissionManager.read_only("REVIEW.md")
    PermissionManager.read_only("TASKS.md")
    PermissionManager.write_access("tests/", is_dir=True)
    
    prompt = (
        "1. You are Tester Agent. "
        "2. Check REVIEW.md: If there's a bug, write tests in tests/ to reproduce it and STOP. " 
        "3. Else, strictly implement the test cases for the first unticked task in TASKS.md. "
        "4. Stop after writing tests. Do not run the test suite."
    )
    run_agent("Tester", prompt)

def init_reviewer_agent():
    PermissionManager.read_only("src/", is_dir=True)
    PermissionManager.read_only("index.html")
    PermissionManager.read_only("tests/", is_dir=True)
    PermissionManager.write_access(".git/", is_dir=True)
    PermissionManager.write_access("TASKS.md")
    PermissionManager.write_access("REVIEW.md")
    
    prompt = (
        "You are Reviewer Agent. "
        "1. Run the tests using 'npm run test' or 'npx vitest run'. "
        "2. If tests FAIL: Check if REVIEW.md has the same bug. If yes, write 'Found same bug again' at the top of REVIEW.md and STOP."
        "Else, write the new bug and logs to REVIEW.md. STOP. "
        "4. If tests PASS: Mark task as done ([x]) in TASKS.md, clear REVIEW.md, "
        "run 'git add .' and 'git commit -m \"feat: [task description]\"' and STOP."
    )
    run_agent("Reviewer", prompt)

def init_workflow():
    subprocess.run(['sudo', '-u', AGENT_USER, 'git', 'config', '--global', 'user.name', 'AI Agent Orchestrator'])
    subprocess.run(['sudo', '-u', AGENT_USER, 'git', 'config', '--global', 'user.email', 'ai@orchestrator.local'])
    
    Path("tests").mkdir(exist_ok=True)
    Path("src").mkdir(exist_ok=True)
    
    review_file = Path("REVIEW.md")
    if not review_file.exists():
        review_file.write_text("# Review\n")
        
    if Path("node_modules").exists():
        PermissionManager.read_only("node_modules/", is_dir=True)

    PermissionManager.lock("run.py")

if __name__ == "__main__":
    for i in range(MAX_CYCLES):
        review_content = Path("REVIEW.md").read_text() if Path("REVIEW.md").exists() else ""
        if "Found same bug again" in review_content or "Cheating detected" in review_content:
            logging.warning("\n[STOP] Infinite Loop or AI Cheating detected in REVIEW.md. Breaking workflow.\n")
            break
            
        try:
            logging.info(f"\n--- Starting Iteration {i + 1} ---")
            init_workflow()
            init_dev_agent()
            init_test_agent()
            init_reviewer_agent()
        except KeyboardInterrupt:
            logging.info("\nInterrupted by user. Cleaning up...")
            break
        finally:
            PermissionManager.restore_all()

    logging.info("\nWorkflow completely executed.")
    sys.exit(0)