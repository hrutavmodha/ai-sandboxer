import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Validates the structure of tasks.json against the expected schema.
 * This ensures that the Planner Agent produces a valid roadmap for the Developer and Reviewer Agents.
 */
function validate(): void {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const tasksPath = path.resolve(__dirname, '../app/tasks.json');

  if (!fs.existsSync(tasksPath)) {
    console.error(`Error: ${tasksPath} not found.`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(tasksPath, 'utf8');
    const data = JSON.parse(rawData);
    const errors: string[] = [];

    // Top-level field validation
    const requiredTopFields = ['name', 'description', 'techStacks', 'roadmap'];
    for (const field of requiredTopFields) {
      if (!(field in data)) {
        errors.push(`Missing required project field: '${field}'`);
      }
    }

    if (errors.length === 0) {
      if (!Array.isArray(data.techStacks)) {
        errors.push("Field 'techStacks' must be a list.");
      }
      if (!Array.isArray(data.roadmap)) {
        errors.push("Field 'roadmap' must be a list.");
      }
    }

    // Roadmap and Phase validation
    if (errors.length === 0) {
      const roadmap = data.roadmap;
      roadmap.forEach((phase: any, pIdx: number) => {
        const requiredPhaseFields = ['id', 'description', 'tasks'];
        for (const pField of requiredPhaseFields) {
          if (!(pField in phase)) {
            errors.push(`Phase ${pIdx} missing field: '${pField}'`);
          }
        }

        if ('tasks' in phase) {
          const tasks = phase.tasks;
          if (!Array.isArray(tasks)) {
            errors.push(`Phase ${pIdx} 'tasks' must be a list.`);
          } else {
            tasks.forEach((task: any, tIdx: number) => {
              const requiredTaskFields = ['id', 'description', 'details', 'completed'];
              for (const tField of requiredTaskFields) {
                if (!(tField in task)) {
                  errors.push(`Task ${tIdx} in Phase ${pIdx} missing field: '${tField}'`);
                }
              }

              if (typeof task.id !== 'number') {
                errors.push(`Task ${tIdx} in Phase ${pIdx} 'id' must be a number.`);
              }
              if (typeof task.description !== 'string') {
                errors.push(`Task ${tIdx} in Phase ${pIdx} 'description' must be a string.`);
              }
              if (!Array.isArray(task.details)) {
                errors.push(`Task ${tIdx} in Phase ${pIdx} 'details' must be a list.`);
              }
              if (typeof task.completed !== 'boolean') {
                errors.push(`Task ${tIdx} in Phase ${pIdx} 'completed' must be a boolean.`);
              }
            });
          }
        }
      });
    }

    // Optional Bug validation
    if ('bugs' in data) {
      const bugs = data.bugs;
      if (!Array.isArray(bugs)) {
        errors.push("Field 'bugs' must be a list.");
      } else {
        bugs.forEach((bug: any, bIdx: number) => {
          const requiredBugFields = ['id', 'description', 'details', 'suggestedSolution', 'fixed'];
          for (const bField of requiredBugFields) {
            if (!(bField in bug)) {
              errors.push(`Bug ${bIdx} missing field: '${bField}'`);
            }
          }

          if (typeof bug.id !== 'number') {
            errors.push(`Bug ${bIdx} 'id' must be a number.`);
          }
          if (typeof bug.description !== 'string') {
            errors.push(`Bug ${bIdx} 'description' must be a string.`);
          }
          if (!Array.isArray(bug.details)) {
            errors.push(`Bug ${bIdx} 'details' must be a list.`);
          }
          if (typeof bug.suggestedSolution !== 'string') {
            errors.push(`Bug ${bIdx} 'suggestedSolution' must be a string.`);
          }
          if (typeof bug.fixed !== 'boolean') {
            errors.push(`Bug ${bIdx} 'fixed' must be a boolean.`);
          }
        });
      }
    }

    if (errors.length > 0) {
      console.error("Schema Validation Failed:");
      errors.forEach(err => console.error(` - ${err}`));
      process.exit(1);
    }

    console.log("tasks.json verified successfully.");
    process.exit(0);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Failed to parse tasks.json: ${error.message}`);
    } else {
      console.error(`An unexpected error occurred during validation: ${error}`);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validate();
}

export { validate };
