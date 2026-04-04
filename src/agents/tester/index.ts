import * as path from 'node:path';
import { type Config } from '../../../types/config.ts';
import { appDirectory } from '../../core/paths.ts';
import { grantWriteAccess } from '../../acl.ts';
import { loadPrompt } from '../../core/prompt-loader.ts';
import { runAgentProcess } from '../../core/runner.ts';

const defaultGeminiPath = 'gemini';

export async function spawnTesterAgent(config: Config, tests: string[]): Promise<void> {
  const agentUsername = config.system.agentUserName || 'nobody';
  const command = config.agents?.tester?.command || defaultGeminiPath;

  const appTestsDirectory = path.join(appDirectory, config.project.dirs.tests);
  grantWriteAccess(appTestsDirectory, true, agentUsername);

  const prompt = loadPrompt('tester', {
    testsDir: config.project.dirs.tests,
    testSpecs: tests.map(t => `- ${t}`).join('\n')
  });

  const result = await runAgentProcess('Tester', prompt, command, agentUsername);
  if (!result.ok) {
    console.error(`[WARN] Tester agent failed: ${result.error.message}`);
  }
}
