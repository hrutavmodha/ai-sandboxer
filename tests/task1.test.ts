import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

describe('Task 1: Project Setup & Dev Environment', () => {
  it('should have index.html in the root', () => {
    expect(existsSync(join(process.cwd(), 'index.html'))).toBe(true);
  });

  it('should have src/main.ts', () => {
    expect(existsSync(join(process.cwd(), 'src/main.ts'))).toBe(true);
  });

  it('should pass TypeScript compilation with no errors', () => {
    try {
      execSync('npm exec tsc --noEmit', { stdio: 'pipe' });
    } catch (error: any) {
      throw new Error(`TypeScript compilation failed:
${error.stdout.toString()}`);
    }
  });
});
