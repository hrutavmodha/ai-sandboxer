import { spawnSync } from 'node:child_process';
import { appDirectory } from './paths.ts';
import { type Result } from '../../types/result.ts';

/**
 * Resolves the absolute path of an executable using the 'which' command.
 */
export function resolveExecutablePath(command: string): string {
  const result = spawnSync('which', [command], { encoding: 'utf-8' });
  if (result.status !== 0 || !result.stdout) {
    throw new Error(`Could not resolve absolute path for command: ${command}`);
  }
  return result.stdout.trim();
}

/**
 * Spawns the agent process for a given agent and prompt.
 *
 * @param agentName - The display name of the agent.
 * @param prompt - The instruction prompt for the agent.
 * @param cliCommand - Path to the CLI for this agent.
 * @param agentUsername - The username to run the agent as.
 * @returns A Result indicating if the agent completed successfully.
 */
export function runAgentProcess(agentName: string, prompt: string, cliCommand: string, agentUsername: string): Result<void, Error> {
  const cliPath = resolveExecutablePath(cliCommand);
  console.log(`[INFO] Starting ${agentName} Agent using ${cliPath}...`);
  const args = ['-u', agentUsername, cliPath, '-p', prompt, '--yolo'];
  
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
