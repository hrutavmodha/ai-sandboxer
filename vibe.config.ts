import { defineConfig } from './src/config.ts';

export default defineConfig({
  project: {
    name: "Vibe-Coded To-Do List",
    stack: "Node.js (TypeScript + Vite + Vitest)",
    dirs: {
      src: "src",
      tests: "tests"
    },
    commands: {
      test: "npm exec vitest run .",
      build: "npm install"
    }
  },
  agents: {
    planner: {
      customInstructions: "If your tasks include Vite, include instructions to MANUALLY scaffold the vite boilerplate, not using create-vite."
    },
    reviewer: {
      autoCommit: true
    }
  }
});
