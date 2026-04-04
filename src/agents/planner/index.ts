import * as fs from 'node:fs';
import { type Config } from '../../../types/config.ts';
import { tasksFilePath, schemaFilePath, srcDirectory, typesDirectory, tsNodePath } from '../../core/paths.ts';
import { grantReadAccess, grantWriteAccess, grantExecuteAccess } from '../../acl.ts';
import { loadPrompt } from '../../core/prompt-loader.ts';
import { runAgentProcess } from '../../core/runner.ts';

const defaultGeminiPath = 'gemini';

export async function spawnPlannerAgent(goal: string, config: Config): Promise<void> {
  const agentUsername = config.system.agentUserName || 'nobody';
  const command = config.agents?.planner?.command || defaultGeminiPath;

  // Planner needs to write the roadmap
  grantWriteAccess(tasksFilePath, false, agentUsername);
  
  // Planner needs to READ the validation script and its dependencies (types)
  grantReadAccess(srcDirectory, true, agentUsername);
  grantReadAccess(typesDirectory, true, agentUsername);
  
  // Planner needs to EXECUTE ts-node
  grantExecuteAccess(tsNodePath, agentUsername);
  
  const schemaContent = fs.existsSync(schemaFilePath) ? fs.readFileSync(schemaFilePath, 'utf8') : '';
  
  const customInstructions = config.agents?.planner?.customInstructions 
    ?? 'If your tasks include Vite, include instructions to MANUALLY scaffold the vite boilerplate, not using create-vite.'

  const prompt = loadPrompt('planner', {
    goal,
    schema: schemaContent,
    tsNodePath,
    customInstructions
  });

  const result = await runAgentProcess('Planner', prompt, command, agentUsername);
  if (!result.ok) {
    console.error(`[WARN] Planner agent failed: ${result.error.message}`);
  }
}
