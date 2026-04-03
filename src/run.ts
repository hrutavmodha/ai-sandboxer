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

/**
 * Recursively searches for 'vibe.config.ts' starting from the current directory.
 * Also checks the 'app' subdirectory as a default.
 */
function findVibeConfig(startDir: string): string | null {
  let current = startDir;
  while (true) {
    const configPath = path.join(current, 'vibe.config.ts');
    if (fs.existsSync(configPath)) return configPath;
    
    const appConfigPath = path.join(current, 'app', 'vibe.config.ts');
    if (fs.existsSync(appConfigPath)) return appConfigPath;

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

const configFilePath = findVibeConfig(process.cwd()) || path.join(rootDirectory, 'app', 'vibe.config.ts');
const appDirectory = path.dirname(configFilePath);
const srcDirectory = path.join(rootDirectory, 'src');
const typesDirectory = path.join(rootDirectory, 'types');
const tasksFilePath = path.join(appDirectory, 'tasks.json');
const reviewFilePath = path.join(appDirectory, 'REVIEW.md');
const validateScriptPath = path.join(srcDirectory, 'validate.ts');
const schemaFilePath = path.join(typesDirectory, 'schema.ts');

const agentUsername = 'gemini-agent';
const hostUsername = 'hrutav-modha';
const geminiCliPath = '/usr/local/nodejs/bin/gemini';
const nodePath = '/usr/local/nodejs/bin/node';
const tsNodePath = '/usr/local/nodejs/bin/ts-node';
const maximumCycles = 1;

/**
 * Loads a prompt template from the prompts directory and replaces variables.
 *
 * @param templateName - The name of the markdown file (e.g., 'PLANNER.md').
 * @param variables - A record of key-value pairs to substitute.
 * @returns The final prompt string.
 */
function loadPrompt(templateName: string, variables: Record<string, string>): string {
  const templatePath = path.join(srcDirectory, 'prompts', templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Prompt template not found at ${templatePath}`);
  }

  let content = fs.readFileSync(templatePath, 'utf8');
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(placeholder, value);
  }

  return content;
}

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

  const prompt = loadPrompt('PLANNER.md', {
    goal,
    schema: schemaContent,
    tsNodePath,
    customInstructions
  });

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
  
  const prompt = loadPrompt('DEVELOPER.md', {
    srcDir: config.project.dirs.src,
    testsDir: config.project.dirs.tests
  });

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

  const prompt = loadPrompt('REVIEWER.md', {});

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
    if (appDirectory !== rootDirectory) restoreHostAccess(appDirectory, hostUsername);
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
    
    restoreHostAccess(rootDirectory, hostUsername);
    if (appDirectory !== rootDirectory) restoreHostAccess(appDirectory, hostUsername);
  }

  console.log('\n[INFO] Workflow completely executed.');
  process.exit(0);
}

executeWorkflow().catch(error => {
  console.error(`[FATAL] Unhandled promise rejection: ${error}`);
  process.exit(1);
});
