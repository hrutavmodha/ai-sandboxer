import os
import sys

def lock_file(path):
    if os.path.exists(path):
        ret = os.system(f"sudo setfacl -m u:gemini-agent:--- {path}")
        if ret != 0:
            print(f"[ERROR] Failed to lock {path} — aborting!")
            sys.exit(1)
        print(f"{path} locked for gemini-agent")

def read_file(path):
    if os.path.exists(path):
        ret = os.system(f"sudo setfacl -m u:gemini-agent:r {path}")
        if ret != 0:
            print(f"[ERROR] Failed to read-only {path} — aborting!")
            sys.exit(1)
        print(f"{path} read-only for gemini-agent")

def write_file(path):
    if os.path.exists(path):
        ret = os.system(f"sudo setfacl -m u:gemini-agent:rwx {path}")
        if ret != 0:
            print(f"[ERROR] Failed to write-access {path} — aborting!")
            sys.exit(1)
        print(f"{path} write-access for gemini-agent")

def lock_dir(path):
    if os.path.exists(path):
        ret  = os.system(f"sudo setfacl -R -m u:gemini-agent:--- {path}")
        ret2 = os.system(f"sudo setfacl -R -d -m u:gemini-agent:--- {path}")
        if ret != 0 or ret2 != 0:
            print(f"[ERROR] Failed to lock {path} — aborting!")
            sys.exit(1)
        print(f"{path} locked for gemini-agent")

def read_dir(path):
    if os.path.exists(path):
        ret  = os.system(f"sudo setfacl -R -m u:gemini-agent:rx {path}")
        ret2 = os.system(f"sudo setfacl -R -d -m u:gemini-agent:rx {path}")
        if ret != 0 or ret2 != 0:
            print(f"[ERROR] Failed to read-only {path} — aborting!")
            sys.exit(1)
        print(f"{path} read-only for gemini-agent")

def write_dir(path):
    if os.path.exists(path):
        ret  = os.system(f"sudo setfacl -R -m u:gemini-agent:rwx {path}")
        ret2 = os.system(f"sudo setfacl -R -d -m u:gemini-agent:rwx {path}")
        if ret != 0 or ret2 != 0:
            print(f"[ERROR] Failed to write-access {path} — aborting!")
            sys.exit(1)
        print(f"{path} write-access for gemini-agent")

def init_dev_agent():
    lock_dir("tests/")
    read_file("REVIEW.md")
    read_file("TASKS.md")
    write_dir("src/")
    write_file("index.html")
    print("Starting Developer Agent")
    os.system(
        'sudo -u gemini-agent '
        '/usr/local/nodejs/bin/gemini -p '
        '"You are Developer Agent. '
        '1. Check REVIEW.md: If it contains a bug description, fix that bug in src/ and STOP. '
        '2. Otherwise, find the FIRST unticked task in TASKS.md and implement it in src/. '
        'DO NOT mark the task as done in TASKS.md. '
        '3. Do not execute or write the test cases. '
        'GOAL: Implement functional code for the next task or fix. STOP after completing one task" '
        '--yolo'
    )

def init_test_agent():
    lock_dir("src/")
    lock_file("index.html")
    read_file("REVIEW.md")
    read_file("TASKS.md")
    write_dir("tests/")
    print("Starting Tester Agent")
    os.system(
        'sudo -u gemini-agent '
        '/usr/local/nodejs/bin/gemini -p '
        '"You are Tester Agent. '
        '1. Check REVIEW.md: If it contains a bug description, write test cases in tests/ that reproduce that bug and STOP. '
        '2. Otherwise, find the FIRST unticked task in TASKS.md and strictly implement the test cases defined in its \'Tests:\' section. '
        'DO NOT read src/. STOP after writing tests for one bug or task." '
        '--yolo'
    )

def init_reviewer_agent():
    read_dir("src/")
    read_file("index.html")
    read_dir("tests/")
    write_dir(".git/")
    write_file("TASKS.md")
    write_file("REVIEW.md")
    print("Starting Reviewer Agent")
    os.system(
        'sudo -u gemini-agent '
        '/usr/local/nodejs/bin/gemini -p '
        '"You are Reviewer Agent. '
        '1. Run the test suite (e.g., \'npx vitest run\'). '
        '2. If tests FAIL: Compare the failure/error to the current content of REVIEW.md. '
        'If it is the SAME bug or failure, write REVIEW.md starting with \'Found same bug again\' followed by the description. '
        'Otherwise, write the new bug description and logs to REVIEW.md. STOP. '
        '3. If tests PASS: Mark the first unticked task in TASKS.md as done ([x]), clear REVIEW.md, '
        'run \'git add .\' and \'git commit -m \\\"feat: complete task X\\\"\' and STOP. '
        'DO NOT modify src/ or tests/." '
        '--yolo'
    )

def init_workflow():
    os.system('sudo -u gemini-agent git config --global user.name "Hrutav Modha"')
    os.system('sudo -u gemini-agent git config --global user.email "modhahrutav@gmail.com"')
    if not os.path.exists("tests"):
        os.makedirs("tests")
    if not os.path.exists("src"):
        os.makedirs("src")
    if not os.path.exists("REVIEW.md"):
        with open("REVIEW.md", "w") as f:
            f.write("# Review\n")
    if os.path.exists("node_modules"):
        os.system("sudo setfacl -R -m u:gemini-agent:rx node_modules/")

    lock_file("run.py")

def restore_permissions():
    os.system("sudo setfacl -R -m u:hrutav-modha:rwx .")
    os.system("sudo chown -R hrutav-modha:hrutav-modha .")
    print("Permissions restored.")

for i in range(10):
    if os.path.exists("REVIEW.md"):
        with open("REVIEW.md", "r") as f:
            if "Found same bug again" in f.read():
                print("\n[STOP] Same bug found again in REVIEW.md. Breaking workflow.\n")
                break
    try:
        init_workflow()
        print(f"\nStarting iteration {i + 1}\n")
        init_dev_agent()
        init_test_agent()
        init_reviewer_agent()
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
        break
    finally:
        restore_permissions()

print("\nAll iterations completed.")
sys.exit(0)