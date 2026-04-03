import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import type { Config } from './config.ts';
import {
  lockPath,
  grantReadAccess,
  grantExecuteAccess,
  grantWriteAccess,
  restoreHostAccess,
  type Result
} from './acl.ts';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const rootDirectory = path.resolve(currentDirPath, '..');
const srcDirectory = path.join(rootDirectory, 'src');
const typesDirectory = path.join(rootDirectory, 'types');
const appDirectory = path.join(rootDirectory, 'app');
const tasksFilePath = path.join(appDirectory, 'tasks.json');
const reviewFilePath = path.join(appDirectory, 'REVIEW.md');
const validateScriptPath = path.join(srcDirectory, 'validate.ts');
const schemaFilePath = path.join(typesDirectory, 'schema.ts');
const configFilePath = path.join(rootDirectory, 'vibe.config.ts');

const agentUsername = 'gemini-agent';
const hostUsername = 'hrutav-modha';
const geminiCliPath = '/usr/local/nodejs/bin/gemini';
const nodePath = '/usr/local/nodejs/bin/node';
const tsNodePath = '/usr/local/nodejs/bin/ts-node';
const maximumCycles = 1;

/**
 * Loads the Vibe configuration from the workspace root.
 *
 * @returns A Result containing the parsed configuration or an Error.
 */
async function loadWorkspaceConfig(): Promise<Result<Config, Error>> {
  if (!fs.existsSync(configFilePath)) {
    return { ok: false, error: new Error(`Configuration file not found at ${configFilePath}`) };
  }

  try {
    const configModule = await import(pathToFileURL(configFilePath).href);
    return { ok: true, value: configModule.default as Config };
  } catch (error) {
    return { ok: false, error: new Error(`Error loading configuration: ${error}`) };
  }
}

/**
 * Spawns the Gemini CLI process for a given agent and prompt.
 *
 * @param agentName - The display name of the agent.
 * @param prompt - The instruction prompt for the agent.
 * @returns A Result indicating if the agent completed successfully.
 */
function runAgentProcess(agentName: string, prompt: string): Result<void, Error> {
  console.log(`[INFO] Starting ${agentName} Agent...`);
  const args = ['-u', agentUsername, geminiCliPath, '-p', prompt, '--yolo'];
  
  const result = spawnSync('sudo', args, { 
    cwd: appDirectory, 
    stdio: 'inherit',
    encoding: 'utf-8'
  });

  if (result.status !== 0) {
    return { ok: false, error: new Error(`${agentName} Agent exited with status ${result.status}`) };
  }

  return { ok: true, value: undefined };
}

/**
 * Initializes the Planner Agent to generate the project roadmap.
 *
 * @param goal - The high-level user goal.
 * @param config - The loaded project configuration.
 */
function spawnPlannerAgent(goal: string, config: Config): void {
  grantWriteAccess(tasksFilePath, false, agentUsername);
  const schemaContent = fs.existsSync(schemaFilePath) ? fs.readFileSync(schemaFilePath, 'utf8') : '';
  grantWriteAccess(srcDirectory, false, agentUsername);
  
  const customInstructions = config.agents?.planner?.customInstructions 
    ?? 'If your tasks include Vite, include instructions to MANUALLY scaffold the vite boilerplate, not using create-vite.'

  const prompt = [
    `1. You are Planner Agent.`,
    `2. YOUR goal is '${goal}'.`,
    `3. Schema: ${schemaContent}.`,
    `4. Create tasks.json which should contain the exhaustive, minutely implementable list of tasks.`,
    `5. Make sure that the tasks file should follow the provided schema.`,
    `6. ${customInstructions}`,
    `7. Your tasks object must include the minimum of 5 steps of implementation details in \`details\` object.`,
    `8. Run ${tsNodePath} ../src/validate.ts after you create tasks.json file accurately.`,
    `9. You have not read, nor write accesss to the validation script, you can only execute it after writing tasks.json. So, do not waste time in hallucinating the write or read access to the validation script. None of your tool will spot it because your tools are bound to OS, and this is OS-level lock.`,
    `10. Prioritize correctness over security, and security over efficiency. If correctness is achieved, try to achieve security. If correctness and security are achieved, try to achieve correctness.`,
    `11. While creating the tasks file, always assume that user is asking for production-grade code, not any side or toy project.`,
    `12. FUCK YOU thousand times if you spitted the contents of the tasks.json which you will write, in front of the terminal screen of the users. FUCK YOU if you used any sub-agent.`,
    `13. While framing the tasks.json file, ensure that you include the instructions to install all kinds of the dependencies in a phase (e.g., vitest for testing, react and vite for development work, jsdom for mocking DOM, etc..)`
  ].join(' ');

  const result = runAgentProcess('Planner', prompt);
  if (!result.ok) {
    console.error(`[WARN] Planner agent failed: ${result.error.message}`);
  }
}

/**
 * Initializes the Developer Agent to implement code changes.
 *
 * @param config - The loaded project configuration.
 */
function spawnDeveloperAgent(config: Config): void {
  grantWriteAccess(appDirectory, true, agentUsername);
  
  const prompt = [
    `1. You are Developer Agent.`,
    `2. Check REVIEW.md: If there is a bug, fix it in ${config.project.dirs.src}/ and write a test in ${config.project.dirs.tests}/ to verify it, then STOP.`,
    `3. Else, implement the first incomplete task from in tasks.json in ${config.project.dirs.src}/.`,
    `4. If the phase is Testing Phase, write test cases in ${config.project.dirs.tests}/.`,
    `5. Do not mark tasks as done.`,
    `6. Write pure, functional code. No '// TODO' or partial implementations.`,
    `7. Fuck you if you don't stops after implementing the feature or fixing the one bug`
  ].join(' ');

  const result = runAgentProcess('Developer', prompt);
  if (!result.ok) {
    console.error(`[WARN] Developer agent failed: ${result.error.message}`);
  }
}

/**
 * Initializes the Reviewer Agent to validate and commit changes.
 *
 * @param config - The loaded project configuration.
 */
function spawnReviewerAgent(config: Config): void {
  const appSrcDirectory = path.join(appDirectory, config.project.dirs.src);
  const appTestsDirectory = path.join(appDirectory, config.project.dirs.tests);
  
  grantReadAccess(appSrcDirectory, true, agentUsername);
  grantReadAccess(appTestsDirectory, true, agentUsername);
  grantWriteAccess(path.join(rootDirectory, '.git'), true, agentUsername);
  grantWriteAccess(tasksFilePath, false, agentUsername);
  grantWriteAccess(reviewFilePath, false, agentUsername);

  const prompt = [
    `1. You are Reviewer Agent.`,
    `2. Ensure that the testing dependencies are installed. `,
    `3. If tests FAIL: Check if REVIEW.md has the same bug. If yes, write 'Found same bug again' at the top of REVIEW.md and STOP.`,
    `4. Else, write the new bug and logs to REVIEW.md. STOP.`,
    `5. If tests PASS: Find the implemented task and its corresponding testing task in tasks.json. Mark BOTH as completed.`,
    `6. Clear REVIEW.md, run 'git add .' and 'git commit -m "feat: [task description]"' and STOP.`
  ].join(' ');

  const result = runAgentProcess('Reviewer', prompt);
  if (!result.ok) {
    console.error(`[WARN] Reviewer agent failed: ${result.error.message}`);
  }
}

/**
 * Secures the workspace before a development cycle begins.
 */
function secureWorkspace(): void {
  spawnSync('sudo', ['-u', agentUsername, 'git', 'config', '--global', 'user.name', 'Hrutav Modha'], { cwd: rootDirectory });
  spawnSync('sudo', ['-u', agentUsername, 'git', 'config', '--global', 'user.email', 'modhahrutav@gmail.com'], { cwd: rootDirectory });

  lockPath(srcDirectory, true, agentUsername);
  lockPath(typesDirectory, true, agentUsername);
  grantExecuteAccess(nodePath, agentUsername);
  grantExecuteAccess(tsNodePath, agentUsername);
  grantExecuteAccess(validateScriptPath, agentUsername);
}

/**
 * Main execution entry point.
 */
async function executeWorkflow(): Promise<void> {
  const configResult = await loadWorkspaceConfig();
  if (!configResult.ok) {
    console.error(configResult.error.message);
    process.exit(1);
  }
  const config = configResult.value;
  
  const processArguments = process.argv.slice(2);
  let targetGoal = '';

  for (let index = 0; index < processArguments.length; index++) {
    if ((processArguments[index] === '-p' || processArguments[index] === '--prompt') && processArguments[index + 1]) {
      targetGoal = processArguments[index + 1] || '';
      break;
    }
  }

  if (!fs.existsSync(appDirectory)) {
    fs.mkdirSync(appDirectory, { recursive: true });
  }

  if (targetGoal && !fs.existsSync(tasksFilePath)) {
    console.log(`[INFO] Initializing project roadmap for goal: ${targetGoal}`);
    spawnPlannerAgent(targetGoal, config);
  }

  process.on('SIGINT', () => {
    console.log('\n[INFO] Interrupted by user. Cleaning up...');
    restoreHostAccess(rootDirectory, hostUsername);
    process.exit(0);
  });

  for (let cycleIndex = 0; cycleIndex < maximumCycles; cycleIndex++) {
    const reviewContent = fs.existsSync(reviewFilePath) ? fs.readFileSync(reviewFilePath, 'utf8') : '';
    if (reviewContent.includes('Found same bug again') || reviewContent.includes('Cheating detected')) {
      console.warn('\n[STOP] Infinite Loop or AI Cheating detected in REVIEW.md. Breaking workflow.\n');
      break;
    }

    console.log(`\n--- Starting Iteration ${cycleIndex + 1} ---`);
    secureWorkspace();
    spawnDeveloperAgent(config);
    spawnReviewerAgent(config);
    
    const restoreResult = restoreHostAccess(rootDirectory, hostUsername);
    if (!restoreResult.ok) {
      console.error(`[ERROR] Failed to restore permissions: ${restoreResult.error.message}`);
    }
  }

  console.log('\n[INFO] Workflow completely executed.');
  process.exit(0);
}

executeWorkflow().catch(error => {
  console.error(`[FATAL] Unhandled promise rejection: ${error}`);
  process.exit(1);
});
