import * as fs from 'node:fs';
import { type Config } from '../../../types/config.ts';
import { tasksFilePath, schemaFilePath, srcDirectory } from '../../core/paths.ts';
import { grantWriteAccess } from '../../acl.ts';
import { loadPrompt } from '../../core/prompt-loader.ts';
import { runAgentProcess } from '../../core/runner.ts';

const defaultGeminiPath = 'gemini';

export function spawnPlannerAgent(goal: string, config: Config): void {
  const agentUsername = config.system.agentUserName || 'nobody';
  const command = config.agents?.planner?.command || defaultGeminiPath;

  grantWriteAccess(tasksFilePath, false, agentUsername);
  const schemaContent = fs.existsSync(schemaFilePath) ? fs.readFileSync(schemaFilePath, 'utf8') : '';
  grantWriteAccess(srcDirectory, false, agentUsername);
  
  const customInstructions = config.agents?.planner?.customInstructions 
    ?? 'If your tasks include Vite, include instructions to MANUALLY scaffold the vite boilerplate, not using create-vite.'

  const prompt = loadPrompt('planner', {
    goal,
    schema: schemaContent,
    nodePath: process.execPath,
    customInstructions
  });

  const result = runAgentProcess('Planner', prompt, command, agentUsername);
  if (!result.ok) {
    console.error(`[WARN] Planner agent failed: ${result.error.message}`);
  }
}
