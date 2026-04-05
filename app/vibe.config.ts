import { defineConfig } from '../src/config.ts';

export default defineConfig({
  system: {
    hostUserName: "hrutav-modha",
    agentUserName: "gemini-agent"
  },
  project: {
    name: "Vibe-Coded To-Do List",
    techStack: ["Node.js", "TypeScript", "Vite", "Vitest"],
    dirs: {
      src: "src",
      tests: "tests"
    },
    commands: {
      test: "npm exec vitest run .",
      build: "npm install"
    }
  },
  git: {
    username: "Hrutav Modha",
    email: "modhahrutav@gmail.com"
  },
  agents: {
    planner: {
      command: "gemini",
      customInstructions: "Include steps to manually scaffold vite project boilerplate code if using vite, instead of using `create-vite`"
    },
    developer: {
      command: "gemini"
    },
    tester: {
      command: "gemini"
    },
    reviewer: {
      command: "gemini",
      autoCommit: true
    }
  }
});
