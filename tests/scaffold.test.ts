import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

describe('Task 1: Scaffold Vite + TypeScript Project', () => {
  it('should have index.html in the root', () => {
    expect(existsSync('index.html')).toBe(true);
  });

  it('should have src/main.ts', () => {
    expect(existsSync(join('src', 'main.ts'))).toBe(true);
  });

  it('should pass type checking with tsc', () => {
    try {
      execSync('npm exec tsc --noEmit', { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Type checking failed: ${error.message}`);
    }
  });
});
