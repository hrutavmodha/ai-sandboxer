import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { type Result } from '../types/result.ts';

/**
 * Domain error for Access Control List failures.
 */
export class AclError extends Error {
  public readonly command: string;
  constructor(message: string, command: string) {
    super(message);
    this.command = command;
  }
}

/**
 * Executes a shell command synchronously and returns a Result.
 *
 * @param command - The command to execute.
 * @param args - The arguments for the command.
 * @param workingDirectory - Optional directory to run the command in.
 * @returns A Result indicating success or failure.
 */
function executeCommand(command: string, args: string[], workingDirectory?: string): Result<void, AclError> {
  const result = spawnSync(command, args, {
    cwd: workingDirectory,
    stdio: 'ignore'
  });

  if (result.status !== 0) {
    const fullCommand = `${command} ${args.join(' ')}`;
    return {
      ok: false,
      error: new AclError(`Command failed with status ${result.status}`, fullCommand)
    };
  }

  return { ok: true, value: undefined };
}

/**
 * Revokes all access for the agent user on the specified path.
 *
 * @param targetPath - The path to lock.
 * @param isDirectory - Whether the path is a directory (applies recursive rules).
 * @param agentUser - The username of the agent.
 * @returns A Result indicating success or failure.
 */
export function lockPath(targetPath: string, isDirectory: boolean, agentUser: string): Result<void, AclError> {
  if (!fs.existsSync(targetPath)) {
    return { ok: true, value: undefined };
  }

  const setAclResult = executeCommand('sudo', ['setfacl', '-m', `u:${agentUser}:---`, targetPath]);
  if (!setAclResult.ok) return setAclResult;

  if (isDirectory) {
    return executeCommand('sudo', ['setfacl', '-R', '-d', '-m', `u:${agentUser}:---`, targetPath]);
  }

  return { ok: true, value: undefined };
}

/**
 * Grants read-only access for the agent user on the specified path.
 *
 * @param targetPath - The path to grant read access to.
 * @param isDirectory - Whether the path is a directory.
 * @param agentUser - The username of the agent.
 * @returns A Result indicating success or failure.
 */
export function grantReadAccess(targetPath: string, isDirectory: boolean, agentUser: string): Result<void, AclError> {
  if (!fs.existsSync(targetPath)) {
    return { ok: true, value: undefined };
  }

  const permission = isDirectory ? 'r-x' : 'r--';
  const setAclResult = executeCommand('sudo', ['setfacl', '-R', '-m', `u:${agentUser}:${permission}`, targetPath]);
  if (!setAclResult.ok) return setAclResult;

  if (isDirectory) {
    return executeCommand('sudo', ['setfacl', '-R', '-d', '-m', `u:${agentUser}:${permission}`, targetPath]);
  }

  return { ok: true, value: undefined };
}

/**
 * Grants read and execute access for the agent user, required for interpreters.
 *
 * @param targetPath - The file path to grant execute access to.
 * @param agentUser - The username of the agent.
 * @returns A Result indicating success or failure.
 */
export function grantExecuteAccess(targetPath: string, agentUser: string): Result<void, AclError> {
  if (!fs.existsSync(targetPath)) {
    return { ok: true, value: undefined };
  }

  const chmodResult = executeCommand('chmod', ['+x', targetPath]);
  if (!chmodResult.ok) return chmodResult;

  return executeCommand('sudo', ['setfacl', '-m', `u:${agentUser}:r-x`, targetPath]);
}

/**
 * Grants full read, write, and execute access for the agent user.
 *
 * @param targetPath - The path to grant write access to.
 * @param isDirectory - Whether the path is a directory.
 * @param agentUser - The username of the agent.
 * @returns A Result indicating success or failure.
 */
export function grantWriteAccess(targetPath: string, isDirectory: boolean, agentUser: string): Result<void, AclError> {
  if (!fs.existsSync(targetPath)) {
    return { ok: true, value: undefined };
  }

  const setAclResult = executeCommand('sudo', ['setfacl', '-R', '-m', `u:${agentUser}:rwx`, targetPath]);
  if (!setAclResult.ok) return setAclResult;

  if (isDirectory) {
    return executeCommand('sudo', ['setfacl', '-R', '-d', '-m', `u:${agentUser}:rwx`, targetPath]);
  }

  return { ok: true, value: undefined };
}

/**
 * Restores full ownership and permissions to the host user.
 *
 * @param rootPath - The root directory of the workspace.
 * @param hostUser - The username of the host.
 * @returns A Result indicating success or failure.
 */
export function restoreHostAccess(rootPath: string, hostUser: string): Result<void, AclError> {
  const aclResult = executeCommand('sudo', ['setfacl', '-R', '-m', `u:${hostUser}:rwx`, '.'], rootPath);
  if (!aclResult.ok) return aclResult;

  return executeCommand('sudo', ['chown', '-R', `${hostUser}:${hostUser}`, '.'], rootPath);
}
