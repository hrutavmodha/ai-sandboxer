/**
 * Configuration schema for the workflow.
 * Provides type safety and intellisense for project-specific settings.
 */
export interface Config {
  /** System configuration for agent execution */
  system: {
    /** The username of the host (e.g., "hrutav-modha") */
    hostUserName: string;
    /** The username to run agents as (e.g., "gemini-agent"). If empty, defaults to 'nobody'. */
    agentUserName?: string;
  };
  project: {
    /** Name of the application being built */
    name: string;
    /** The technology stack (e.g., ["Node.js", "TypeScript"]) */
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
      /** Command to run tests (e.g., "npm test") */
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
      /** The command to invoke the Planner agent (e.g., "gemini", "claude") */
      command?: string;
      /** Extra domain-specific instructions for the Planner Agent */
      customInstructions?: string;
    };
    developer?: {
      /** The command to invoke the Developer agent (e.g., "gemini", "claude") */
      command?: string;
    };
    tester?: {
      /** The command to invoke the Tester agent (e.g., "gemini", "claude") */
      command?: string;
    };
    reviewer?: {
      /** The command to invoke the Reviewer agent (e.g., "gemini", "claude") */
      command?: string;
      /** Whether to automatically commit changes on passing tests */
      autoCommit?: boolean;
    };
  };
}
