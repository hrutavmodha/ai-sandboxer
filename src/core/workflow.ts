import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { type Config } from '../../types/config.ts';
import { FeatureNotImplementedError } from '../utils/errors.ts';
import { tsNodePath } from './paths.ts';
import { 
  rootDirectory, 
  srcDirectory, 
  typesDirectory, 
  nodePath, 
  validateScriptPath, 
  appDirectory, 
  tasksFilePath, 
  reviewFilePath 
} from './paths.ts';
import { lockPath, grantExecuteAccess, restoreHostAccess } from '../acl.ts';
import { spawnDeveloperAgent } from '../agents/developer/index.ts';
import { spawnTesterAgent } from '../agents/tester/index.ts';
import { spawnReviewerAgent } from '../agents/reviewer/index.ts';
import { spawnPlannerAgent } from '../agents/planner/index.ts';

const maximumCycles = 1;

/**
 * Ensures the operating system is supported for ACL-based isolation.
 */
export function checkSystemSupport(): void {
  const platform = process.platform;
  if (platform !== 'linux') {
    // TODO: Implement ACL-based isolation for macOS (BSD ACLs) and Windows (icacls)
    throw new FeatureNotImplementedError(
      `The ACL-based agent isolation is currently only implemented for Linux. ` +
      `Your current platform '${platform}' is not yet supported.`
    );
  }
}

/**
 * Secures the workspace before a development cycle begins.
 */
export function secureWorkspace(config: Config): void {
  const agentUsername = config.system.agentUserName || 'nobody';

  spawnSync('sudo', ['-u', agentUsername, 'git', 'config', '--global', 'user.name', 'Hrutav Modha'], { cwd: rootDirectory });
  spawnSync('sudo', ['-u', agentUsername, 'git', 'config', '--global', 'user.email', 'modhahrutav@gmail.com'], { cwd: rootDirectory });

  lockPath(srcDirectory, true, agentUsername);
  lockPath(typesDirectory, true, agentUsername);
  
  // Grant execute to binaries
  grantExecuteAccess(nodePath, agentUsername);
  grantExecuteAccess(tsNodePath, agentUsername);
  
  // Grant traversal (x) to src/ and read (r) to validate.ts
  // We use sudo directly to be precise
  spawnSync('sudo', ['setfacl', '-m', `u:${agentUsername}:x`, srcDirectory], { cwd: rootDirectory });
  spawnSync('sudo', ['setfacl', '-m', `u:${agentUsername}:r`, validateScriptPath], { cwd: rootDirectory });
}

export async function runWorkflow(config: Config, targetGoal: string): Promise<void> {
  const hostUsername = config.system.hostUserName;

  if (!fs.existsSync(appDirectory)) {
    fs.mkdirSync(appDirectory, { recursive: true });
  }

  if (targetGoal && !fs.existsSync(tasksFilePath)) {
    console.log(`[INFO] Initializing project roadmap for goal: ${targetGoal}`);
    await spawnPlannerAgent(targetGoal, config);
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
    secureWorkspace(config);
    await spawnDeveloperAgent(config);

    if (fs.existsSync(tasksFilePath)) {
      const tasksData = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));
      const currentPhase = tasksData.roadmap.find((p: any) => p.tasks.some((t: any) => !t.completed));
      const currentTask = currentPhase?.tasks.find((t: any) => !t.completed);

      if (currentTask && Array.isArray(currentTask.tests) && currentTask.tests.length > 0) {
        console.log(`[INFO] Tests detected for task: ${currentTask.description}. Spawning Tester Agent...`);
        await spawnTesterAgent(config, currentTask.tests);
      }
    }
    await spawnReviewerAgent(config);
    restoreHostAccess(rootDirectory, hostUsername);
    if (appDirectory !== rootDirectory) restoreHostAccess(appDirectory, hostUsername);
  }
}
