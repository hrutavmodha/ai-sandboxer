import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Represents a successful or failed operation.
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Domain error for validation failures.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Type guard to check if an unknown value is a plain object.
 *
 * @param val - The value to check.
 * @returns True if the value is a non-null object, false otherwise.
 */
function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Parses JSON content safely, returning a Result instead of throwing.
 *
 * @param content - The raw JSON string.
 * @returns A Result containing the parsed object or a ValidationError.
 */
function parseJson(content: string): Result<unknown, ValidationError> {
  try {
    return { ok: true, value: JSON.parse(content) };
  } catch (error) {
    return { ok: false, error: new ValidationError(`Failed to parse tasks.json: ${error}`) };
  }
}

/**
 * Validates the core required fields of the project root.
 *
 * @param payload - The parsed root JSON object.
 * @returns A Result indicating success or a validation error.
 */
function validateRootFields(payload: Record<string, unknown>): Result<void, ValidationError> {
  const requiredTopFields = ['name', 'description', 'techStacks', 'roadmap'];
  for (const field of requiredTopFields) {
    if (!(field in payload)) {
      return { ok: false, error: new ValidationError(`Missing required project field: '${field}'`) };
    }
  }

  if (!Array.isArray(payload.techStacks)) {
    return { ok: false, error: new ValidationError("Field 'techStacks' must be an array.") };
  }

  if (!Array.isArray(payload.roadmap)) {
    return { ok: false, error: new ValidationError("Field 'roadmap' must be an array.") };
  }

  return { ok: true, value: undefined };
}

/**
 * Validates an individual task within a phase.
 *
 * @param task - The task object to validate.
 * @param taskIndex - The index of the task.
 * @param phaseIndex - The index of the parent phase.
 * @returns A Result indicating success or a validation error.
 */
function validateTask(task: unknown, taskIndex: number, phaseIndex: number): Result<void, ValidationError> {
  if (!isObject(task)) {
    return { ok: false, error: new ValidationError(`Task ${taskIndex} in Phase ${phaseIndex} must be an object.`) };
  }

  const requiredFields = ['id', 'description', 'details', 'tests', 'completed'];
  for (const field of requiredFields) {
    if (!(field in task)) {
      return { ok: false, error: new ValidationError(`Task ${taskIndex} in Phase ${phaseIndex} missing field: '${field}'`) };
    }
  }

  if (typeof task.id !== 'number') {
    return { ok: false, error: new ValidationError(`Task ${taskIndex} in Phase ${phaseIndex} 'id' must be a number.`) };
  }
  if (typeof task.description !== 'string') {
    return { ok: false, error: new ValidationError(`Task ${taskIndex} in Phase ${phaseIndex} 'description' must be a string.`) };
  }
  if (!Array.isArray(task.details)) {
    return { ok: false, error: new ValidationError(`Task ${taskIndex} in Phase ${phaseIndex} 'details' must be an array.`) };
  }
  if (!Array.isArray(task.tests)) {
    return { ok: false, error: new ValidationError(`Task ${taskIndex} in Phase ${phaseIndex} 'tests' must be an array.`) };
  }
  if (typeof task.completed !== 'boolean') {
    return { ok: false, error: new ValidationError(`Task ${taskIndex} in Phase ${phaseIndex} 'completed' must be a boolean.`) };
  }

  return { ok: true, value: undefined };
}

/**
 * Validates an individual phase within the roadmap.
 *
 * @param phase - The phase object to validate.
 * @param phaseIndex - The index of the phase.
 * @returns A Result indicating success or a validation error.
 */
function validatePhase(phase: unknown, phaseIndex: number): Result<void, ValidationError> {
  if (!isObject(phase)) {
    return { ok: false, error: new ValidationError(`Phase ${phaseIndex} must be an object.`) };
  }

  const requiredPhaseFields = ['id', 'description', 'tasks', 'tests'];
  for (const field of requiredPhaseFields) {
    if (!(field in phase)) {
      return { ok: false, error: new ValidationError(`Phase ${phaseIndex} missing field: '${field}'`) };
    }
  }

  if (!Array.isArray(phase.tasks)) {
    return { ok: false, error: new ValidationError(`Phase ${phaseIndex} 'tasks' must be an array.`) };
  }

  if (!Array.isArray(phase.tests)) {
    return { ok: false, error: new ValidationError(`Phase ${phaseIndex} 'tests' must be an array.`) };
  }

  for (let taskIndex = 0; taskIndex < phase.tasks.length; taskIndex++) {
    const taskResult = validateTask(phase.tasks[taskIndex], taskIndex, phaseIndex);
    if (!taskResult.ok) {
      return taskResult;
    }
  }

  return { ok: true, value: undefined };
}

/**
 * Validates the full roadmap array structure.
 *
 * @param roadmap - The array of phases.
 * @returns A Result indicating success or a validation error.
 */
function validateRoadmap(roadmap: unknown[]): Result<void, ValidationError> {
  for (let phaseIndex = 0; phaseIndex < roadmap.length; phaseIndex++) {
    const phaseResult = validatePhase(roadmap[phaseIndex], phaseIndex);
    if (!phaseResult.ok) {
      return phaseResult;
    }
  }
  return { ok: true, value: undefined };
}

/**
 * Validates the optional bugs array.
 *
 * @param bugs - The bugs array to validate.
 * @returns A Result indicating success or a validation error.
 */
function validateBugs(bugs: unknown): Result<void, ValidationError> {
  if (!Array.isArray(bugs)) {
    return { ok: false, error: new ValidationError("Field 'bugs' must be an array.") };
  }

  for (let bugIndex = 0; bugIndex < bugs.length; bugIndex++) {
    const bug = bugs[bugIndex];
    if (!isObject(bug)) {
      return { ok: false, error: new ValidationError(`Bug ${bugIndex} must be an object.`) };
    }

    const requiredFields = ['id', 'description', 'details', 'suggestedSolution', 'fixed'];
    for (const field of requiredFields) {
      if (!(field in bug)) {
        return { ok: false, error: new ValidationError(`Bug ${bugIndex} missing field: '${field}'`) };
      }
    }

    if (typeof bug.id !== 'number') {
      return { ok: false, error: new ValidationError(`Bug ${bugIndex} 'id' must be a number.`) };
    }
    if (typeof bug.description !== 'string') {
      return { ok: false, error: new ValidationError(`Bug ${bugIndex} 'description' must be a string.`) };
    }
    if (!Array.isArray(bug.details)) {
      return { ok: false, error: new ValidationError(`Bug ${bugIndex} 'details' must be an array.`) };
    }
    if (typeof bug.suggestedSolution !== 'string') {
      return { ok: false, error: new ValidationError(`Bug ${bugIndex} 'suggestedSolution' must be a string.`) };
    }
    if (typeof bug.fixed !== 'boolean') {
      return { ok: false, error: new ValidationError(`Bug ${bugIndex} 'fixed' must be a boolean.`) };
    }
  }

  return { ok: true, value: undefined };
}

/**
 * Main entry point to validate tasks.json file.
 *
 * @param filePath - The absolute path to tasks.json.
 * @returns A Result indicating if the entire file matches the schema.
 */
export function validateTasksJson(filePath: string): Result<void, ValidationError> {
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: new ValidationError(`File ${filePath} not found.`) };
  }

  const rawContent = fs.readFileSync(filePath, 'utf8');
  const parsedResult = parseJson(rawContent);
  
  if (!parsedResult.ok) {
    return parsedResult;
  }

  const payload = parsedResult.value;
  if (!isObject(payload)) {
    return { ok: false, error: new ValidationError("Root of tasks.json must be an object.") };
  }

  const rootResult = validateRootFields(payload);
  if (!rootResult.ok) return rootResult;

  const roadmapResult = validateRoadmap(payload.roadmap as unknown[]);
  if (!roadmapResult.ok) return roadmapResult;

  if ('bugs' in payload) {
    const bugsResult = validateBugs(payload.bugs);
    if (!bugsResult.ok) return bugsResult;
  }

  return { ok: true, value: undefined };
}

// CLI Execution Wrapper
if (import.meta.url === `file://${process.argv[1]}`) {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirPath = path.dirname(currentFilePath);
  const tasksPath = path.resolve(currentDirPath, '../app/tasks.json');
  
  const result = validateTasksJson(tasksPath);
  if (!result.ok) {
    console.error("Schema Validation Failed:");
    console.error(` - ${result.error.message}`);
    process.exit(1);
  }
  
  console.log("tasks.json verified successfully.");
  process.exit(0);
}
