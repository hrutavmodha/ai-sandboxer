import * as fs from 'node:fs';
import * as path from 'node:path';
import { srcDirectory } from './paths.ts';

/**
 * Loads a prompt template from an agent's directory and replaces variables.
 *
 * @param agentName - The name of the agent (e.g., 'planner').
 * @param variables - A record of key-value pairs to substitute.
 * @returns The final prompt string.
 */
export function loadPrompt(agentName: string, variables: Record<string, string>): string {
  const templatePath = path.join(srcDirectory, 'agents', agentName, 'prompt.md');
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
