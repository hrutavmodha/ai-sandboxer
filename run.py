import os
import sys

def mark_read_only(folder):
    if os.path.exists(folder):
        os.system(f"setfacl -R -m u:gemini-agent:rx {folder}")
        print(f"{folder} made read-only for gemini-agent")

def mark_write_access(folder):
    if os.path.exists(folder):
        os.system(f"setfacl -R -m u:gemini-agent:rwx {folder}")
        print(f"{folder} made write-access for gemini-agent")

def mark_no_access(folder):
    if os.path.exists(folder):
        os.system(f"setfacl -R -m u:gemini-agent:--- {folder}")
        print(f"{folder} locked for gemini-agent")

def init_dev_agent():
    mark_no_access("tests/")
    mark_read_only("REVIEW.md")
    mark_read_only("TASKS.md")
    mark_write_access("src/")
    mark_write_access("index.html")
    print("Starting Developer Agent")
    os.system('sudo -u gemini-agent /usr/local/nodejs/bin/gemini -p "You are Developer Agent working on coding the functional To Do List Application. Read the TASKS.md. Find out the first unticked task from TASKS.md. Implement it in src/ directory ans STOP! Your MAIN GOAL: The functional and correctly working code." --yolo')

def init_test_agent():
    mark_no_access("src/")
    mark_no_access("index.html")
    mark_read_only("REVIEW.md")
    mark_read_only("TASKS.md")
    mark_write_access("tests/")
    print("Starting Tester Agent")
    os.system('sudo -u gemini-agent /usr/local/nodejs/bin/gemini -p "You are Tester Agent working on writing extensive test cases the To Do List Application. Read the TASKS.md. Find out the very next task unticked after the last ticked task. Implement the tests for it in tests/ directory which should be the sibling directory to the src/ directory and STOP! Your MAIN GOAL: Write the test cases which exposes the functionality of the code. DO NOT RUN THE TESTS MANUALLY, JUST WRITE" --yolo')

def init_reviewer_agent():
    mark_read_only("src/")
    mark_read_only("index.html")
    mark_read_only("tests/")
    mark_write_access("TASKS.md")
    mark_write_access("REVIEW.md")
    print("Starting Reviewer Agent")
    os.system('sudo -u gemini-agent /usr/local/nodejs/bin/gemini -p "You are Reviewer Agent working on testing the functionality of a To Do List Application. Read the TASKS.md. Run the tests. If tests passes, verify that tests aren\'t altered to be passed according to the code written in src/ and commit to Git only if the mentioned condition matches. If so, or tests fails, DO NOT ATTEMPT TO FIX THE TESTS OR IMPLEMENTATION. Instead, write your review and suggestions in REVIEW.md accordingly, and STOP!" --yolo')

def init_workflow():
    if not os.path.exists("tests"):
        os.makedirs("tests")
    if not os.path.exists("src"):
        os.makedirs("src")
    if not os.path.exists("REVIEW.md"):
        with open("REVIEW.md", "w") as f:
            f.write("# Review\n")

def restore_permissions():
    print("Cleaning up permissions...")
    os.system("setfacl -R -m u:hrutav-modha:rwx .")

for i in range(1):
    try:
        mark_no_access("run.py")
        init_workflow()
        print(f"\nStarting iteration {i + 1}\n")
        init_dev_agent()
        init_test_agent()
        init_reviewer_agent()
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        break
    finally:
        restore_permissions()

print("\nAll iterations completed.")
sys.exit(0)
