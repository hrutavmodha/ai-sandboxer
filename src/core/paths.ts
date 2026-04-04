import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
export const rootDirectory = path.resolve(currentDirPath, '..', '..');

/**
 * Recursively searches for 'vibe.config.ts' starting from the current directory.
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

export const configFilePath = findVibeConfig(process.cwd()) || path.join(rootDirectory, 'app', 'vibe.config.ts');
export const appDirectory = path.dirname(configFilePath);
export const srcDirectory = path.join(rootDirectory, 'src');
export const typesDirectory = path.join(rootDirectory, 'types');
export const tasksFilePath = path.join(appDirectory, 'tasks.json');
export const reviewFilePath = path.join(appDirectory, 'REVIEW.md');
export const validateScriptPath = path.join(srcDirectory, 'validate.ts');
export const schemaFilePath = path.join(typesDirectory, 'schema.ts');

export const nodePath = process.execPath;
export const tsNodePath = '/usr/local/nodejs/bin/ts-node';
