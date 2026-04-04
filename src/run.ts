import * as fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { type Config } from '../types/config.ts';
import { type Result } from '../types/result.ts';
import { configFilePath } from './core/paths.ts';
import { checkSystemSupport, runWorkflow } from './core/workflow.ts';

async function loadWorkspaceConfig(): Promise<Result<Config, Error>> {
  if (!fs.existsSync(configFilePath)) {
    return { ok: false, error: new Error(`Configuration file not found at ${configFilePath}`) };
  }
  try {
    const configModule = await import(pathToFileURL(configFilePath).href);
    return { ok: true, value: configModule.default as Config };
  } catch (error) {
    return { ok: false, error: new Error(`Error loading configuration: ${error}`) };
  }
}
 
async function main(): Promise<void> {
  checkSystemSupport();

  const configResult = await loadWorkspaceConfig();
  if (!configResult.ok) {
    console.error(configResult.error.message);
    process.exit(1);
  }

  const processArguments = process.argv.slice(2);
  let targetGoal = '';
  for (let index = 0; index < processArguments.length; index++) {
    if ((processArguments[index] === '-p' || processArguments[index] === '--prompt') && processArguments[index + 1]) {
      targetGoal = processArguments[index + 1] || '';
      break;
    }
  }

  await runWorkflow(configResult.value, targetGoal);

  console.log('\n[INFO] Workflow completely executed.');
  process.exit(0);
}

main().catch(error => {
  console.error(`[FATAL] Unhandled promise rejection: ${error}`);
  process.exit(1);
});
