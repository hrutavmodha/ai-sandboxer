import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import type { Config } from './config.ts';

// Path Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const TYPES = path.join(ROOT, 'types');
const APP = path.join(ROOT, 'app');
const APP_TASKS = path.join(APP, 'tasks.json');
const APP_REVIEW = path.join(APP, 'REVIEW.md');
const VALIDATE_TS = path.join(SRC, 'validate.ts');
const SCHEMA_TS = path.join(TYPES, 'schema.ts');
const CONFIG_PATH = path.join(ROOT, 'vibe.config.ts');

// Environment Constants
const AGENT_USER = 'gemini-agent';
const HOST_USER = 'hrutav-modha';
const GEMINI_CLI = '/usr/local/nodejs/bin/gemini';
const NODE = '/usr/local/nodejs/bin/node';
const TS_NODE = '/usr/local/nodejs/bin/ts-node';
const MAX_CYCLES = 1;

let config: Config;

/**
 * Manages Linux ACL permissions to physically isolate agents.
 */
class PermissionManager {
  private static runAcl(args: string[]): void {
    try {
      const result = spawnSync('sudo', args, { stdio: 'ignore' });
      if (result.status !== 0) {
        console.error(`Failed to execute ACL command: sudo ${args.join(' ')} — aborting!`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Exception during ACL command: ${error}`);
      process.exit(1);
    }
  }

  static lock(filePath: string, isDir = false): void {
    if (fs.existsSync(filePath)) {
      this.runAcl(['setfacl', '-m', `u:${AGENT_USER}:---`, filePath]);
      if (isDir) {
        this.runAcl(['setfacl', '-R', '-d', '-m', `u:${AGENT_USER}:---`, filePath]);
      }
      console.log(`[INFO] Locked: ${filePath}`);
    }
  }

  static readOnly(filePath: string, isDir = false): void {
    if (fs.existsSync(filePath)) {
      const perm = isDir ? 'rx' : 'r';
      this.runAcl(['setfacl', '-R', '-m', `u:${AGENT_USER}:${perm}`, filePath]);
      if (isDir) {
        this.runAcl(['setfacl', '-R', '-d', '-m', `u:${AGENT_USER}:${perm}`, filePath]);
      }
      console.log(`[INFO] Read-Only: ${filePath}`);
    }
  }

  static executeOnly(filePath: string): void {
    if (fs.existsSync(filePath)) {
      spawnSync('chmod', ['+x', filePath]);
      this.runAcl(['setfacl', '-m', `u:${AGENT_USER}:--x`, filePath]);
      console.log(`[INFO] Blind Execute Enabled: ${filePath}`);
    }
  }

  static writeAccess(filePath: string, isDir = false): void {
    if (fs.existsSync(filePath)) {
      this.runAcl(['setfacl', '-R', '-m', `u:${AGENT_USER}:rwx`, filePath]);
      if (isDir) {
        this.runAcl(['setfacl', '-R', '-d', '-m', `u:${AGENT_USER}:rwx`, filePath]);
      }
      console.log(`[INFO] Write-Access: ${filePath}`);
    }
  }

  static restoreAll(): void {
    try {
      spawnSync('sudo', ['setfacl', '-R', '-m', `u:${HOST_USER}:rwx`, '.'], { cwd: ROOT });
      spawnSync('sudo', ['chown', '-R', `${HOST_USER}:${HOST_USER}`, '.'], { cwd: ROOT });
      console.log('[INFO] Host permissions restored fully.');
    } catch (error) {
      console.error(`[ERROR] Failed to restore host permissions: ${error}`);
    }
  }
}

/**
 * Runs a Gemini CLI agent with the provided prompt.
 */
function runAgent(agentName: string, prompt: string): void {
  console.log(`[INFO] Starting ${agentName} Agent...`);
  const args = ['-u', AGENT_USER, GEMINI_CLI, '-p', prompt, '--yolo'];
  
  try {
    const result = spawnSync('sudo', args, { 
      cwd: APP, 
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    if (result.status !== 0) {
      console.warn(`[WARN] ${agentName} Agent encountered an error or exited non-zero.`);
    }
  } catch (error) {
    console.error(`[ERROR] Failed to run agent ${agentName}: ${error}`);
  }
}

async function loadConfig(): Promise<Config> {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Error: Configuration file not found at ${CONFIG_PATH}`);
    process.exit(1);
  }

  try {
    const configModule = await import(pathToFileURL(CONFIG_PATH).href);
    return configModule.default;
  } catch (error) {
    console.error(`Error loading configuration: ${error}`);
    process.exit(1);
  }
}

function initPlannerAgent(goal: string): void {
  PermissionManager.writeAccess(APP_TASKS);
  const schema = fs.existsSync(SCHEMA_TS) ? fs.readFileSync(SCHEMA_TS, 'utf8') : '';
  PermissionManager.executeOnly(VALIDATE_TS);
  
  const customInstr = config.agents?.planner?.customInstructions ? `${config.agents.planner.customInstructions} ` : "";

  const prompt = (
    `1. You are Planner Agent. ` +
    `2. YOUR goal is '${goal}'. ` +
    `3. Schema: ${schema}. ` +
    "4. Create tasks.json which should contain the exhaustive, minutely implementable list of tasks. " +
    "5. Make sure that the tasks file should follow the provided schema. " +
    `6. ${customInstr}` +
    "7. Your tasks object must include the minimum of 5 steps of implementation details in `details` object. " +
    `8. Run ${TS_NODE} ../src/validate.ts after you create tasks.json file accurately. ` +
    "9. You have not read, nor write accesss to the validation script, you can only execute it after writing tasks.json. So, do not waste time in hallucinating the write or read access to the validation script. None of your tool will spot it because your tools are bound to OS, and this is OS-level lock. " +
    "10. Prioritize correctness over security, and security over efficiency. If correctness is achieved, try to achieve security. If correctness and security are achieved, try to achieve correctness. " +
    "11. While creating the tasks file, always assume that user is asking for production-grade code, not any side or toy project."
  );

  runAgent('Planner', prompt);
}

function initDevAgent(): void {
  PermissionManager.writeAccess(APP, true);
  
  const prompt = (
    "1. You are Developer Agent. " +
    `2. Check REVIEW.md: If there is a bug, fix it in ${config.project.dirs.src}/ and write a test in ${config.project.dirs.tests}/ to verify it, then STOP. ` +
    `3. Else, implement the first incomplete task from any phase EXCEPT 'Testing Phase' in tasks.json in ${config.project.dirs.src}/. ` +
    `4. If the phase is Testing Phase, write test cases in ${config.project.dirs.tests}/.` +
    "5. Do not mark tasks as done. " +
    "6. Write pure, functional code. No '// TODO' or partial implementations."
  );

  runAgent('Developer', prompt);
}

function initReviewerAgent(): void {
  const appSrc = path.join(APP, config.project.dirs.src);
  const appTests = path.join(APP, config.project.dirs.tests);
  
  PermissionManager.readOnly(appSrc, true);
  PermissionManager.readOnly(appTests, true);
  PermissionManager.writeAccess(path.join(ROOT, '.git'), true);
  PermissionManager.writeAccess(APP_TASKS);
  PermissionManager.writeAccess(APP_REVIEW);

  const prompt = (
    "1. You are Reviewer Agent. " +
    `2. Run the tests using '${config.project.commands.test}'. ` +
    "3. If tests FAIL: Check if REVIEW.md has the same bug. If yes, write 'Found same bug again' at the top of REVIEW.md and STOP. " +
    "4. Else, write the new bug and logs to REVIEW.md. STOP. " +
    "5. If tests PASS: Find the implemented task and its corresponding testing task in tasks.json. Mark BOTH as completed. " +
    "6. Clear REVIEW.md, run 'git add .' and 'git commit -m \"feat: [task description]\"' and STOP."
  );

  runAgent('Reviewer', prompt);
}

function initWorkflow(): void {
  spawnSync('sudo', ['-u', AGENT_USER, 'git', 'config', '--global', 'user.name', 'Hrutav Modha'], { cwd: ROOT });
  spawnSync('sudo', ['-u', AGENT_USER, 'git', 'config', '--global', 'user.email', 'modhahrutav@gmail.com'], { cwd: ROOT });

  PermissionManager.lock(SRC, true);
  PermissionManager.lock(TYPES, true);
  PermissionManager.executeOnly(NODE);
  PermissionManager.executeOnly(TS_NODE);
  PermissionManager.executeOnly(VALIDATE_TS);
}

/**
 * Main execution loop.
 */
async function main() {
  config = await loadConfig();
  
  const args = process.argv.slice(2);
  let promptGoal = '';

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '-p' || args[i] === '--prompt') && args[i + 1]) {
      promptGoal = args[i + 1];
      break;
    }
  }

  if (!fs.existsSync(APP)) {
    fs.mkdirSync(APP, { recursive: true });
  }

  if (promptGoal && !fs.existsSync(APP_TASKS)) {
    console.log(`[INFO] Initializing project roadmap for goal: ${promptGoal}`);
    initPlannerAgent(promptGoal);
  }

  process.on('SIGINT', () => {
    console.log('\n[INFO] Interrupted by user. Cleaning up...');
    PermissionManager.restoreAll();
    process.exit(0);
  });

  for (let i = 0; i < MAX_CYCLES; i++) {
    const reviewContent = fs.existsSync(APP_REVIEW) ? fs.readFileSync(APP_REVIEW, 'utf8') : '';
    if (reviewContent.includes('Found same bug again') || reviewContent.includes('Cheating detected')) {
      console.warn('\n[STOP] Infinite Loop or AI Cheating detected in REVIEW.md. Breaking workflow.\n');
      break;
    }

    try {
      console.log(`\n--- Starting Iteration ${i + 1} ---`);
      initWorkflow();
      initDevAgent();
      initReviewerAgent();
    } catch (error) {
      console.error(`[ERROR] Unexpected error in cycle: ${error}`);
      break;
    } finally {
      PermissionManager.restoreAll();
    }
  }

  console.log('\n[INFO] Workflow completely executed.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
