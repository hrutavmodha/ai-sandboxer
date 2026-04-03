/**
 * Configuration schema for the workflow.
 * Provides type safety and intellisense for project-specific settings.
 */
export interface Config {
  project: {
    /** Name of the application being built */
    name: string;
    /** The technology stack (e.g., "Python/FastAPI", "Rust/Axum") */
    techStack: Array<string>;
    /** Directory structure for the generated application */
    dirs: {
      /** Where source code lives relative to the app root */
      src: string;
      /** Where tests live relative to the app root */
      tests: string;
    };
    /** Commands to manage the application lifecycle */
    commands: {
      /** Command to run tests (e.g., "pytest", "cargo test") */
      test: string;
      /** Optional command to build/install dependencies */
      build?: string;
      /** Optional command to run linting */
      lint?: string;
    };
  };
  /** Configuration for individual AI agents */
  agents?: {
    planner?: {
      /** Extra domain-specific instructions for the Planner Agent */
      customInstructions?: string;
    };
    reviewer?: {
      /** Whether to automatically commit changes on passing tests */
      autoCommit?: boolean;
    };
  };
}

/**
 * Helper function to provide type intellisense in vibe.config.ts.
 */
export function defineConfig(config: Config): Config {
  return config;
}
