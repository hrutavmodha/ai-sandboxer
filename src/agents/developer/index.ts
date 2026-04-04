import { type Config } from '../../../types/config.ts';
import { appDirectory } from '../../core/paths.ts';
import { grantWriteAccess } from '../../acl.ts';
import { loadPrompt } from '../../core/prompt-loader.ts';
import { runAgentProcess } from '../../core/runner.ts';

const defaultGeminiPath = 'gemini';

export async function spawnDeveloperAgent(config: Config): Promise<void> {
  const agentUsername = config.system.agentUserName || 'nobody';
  const command = config.agents?.developer?.command || defaultGeminiPath;

  grantWriteAccess(appDirectory, true, agentUsername);
  
  const prompt = loadPrompt('developer', {
    srcDir: config.project.dirs.src,
    testsDir: config.project.dirs.tests
  });

  const result = await runAgentProcess('Developer', prompt, command, agentUsername);
  if (!result.ok) {
    console.error(`[WARN] Developer agent failed: ${result.error.message}`);
  }
}
