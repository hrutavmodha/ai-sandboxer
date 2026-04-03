import * as path from 'node:path';
import { type Config } from '../../config.ts';
import { 
  appDirectory, 
  rootDirectory, 
  tasksFilePath, 
  reviewFilePath 
} from '../../core/paths.ts';
import { grantReadAccess, grantWriteAccess } from '../../acl.ts';
import { loadPrompt } from '../../core/prompt-loader.ts';
import { runAgentProcess } from '../../core/runner.ts';

const defaultGeminiPath = 'gemini';

export function spawnReviewerAgent(config: Config): void {
  const agentUsername = config.system.agentUserName || 'nobody';
  const command = config.agents?.reviewer?.command || defaultGeminiPath;

  const appSrcDirectory = path.join(appDirectory, config.project.dirs.src);
  const appTestsDirectory = path.join(appDirectory, config.project.dirs.tests);
  
  grantReadAccess(appSrcDirectory, true, agentUsername);
  grantReadAccess(appTestsDirectory, true, agentUsername);
  
  if (config.agents?.reviewer?.autoCommit) {
    grantWriteAccess(path.join(rootDirectory, '.git'), true, agentUsername);
  }
  
  grantWriteAccess(tasksFilePath, false, agentUsername);
  grantWriteAccess(reviewFilePath, false, agentUsername);

  const commitInstruction = config.agents?.reviewer?.autoCommit 
    ? "Since auto-commit is enabled, you must now stage all your changes using 'git add .' and create a commit with a message like 'feat: [task description]' before you finish."
    : "Auto-commit is disabled for this project, so you must NOT make any git commits. Just update the task status and stop.";

  const prompt = loadPrompt('reviewer', {
    commitInstruction
  });

  const result = runAgentProcess('Reviewer', prompt, command, agentUsername);
  if (!result.ok) {
    console.error(`[WARN] Reviewer agent failed: ${result.error.message}`);
  }
}
