import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

describe('Task 1: Project Scaffolding', () => {
  it('should have index.html in the root', () => {
    const filePath = resolve(__dirname, '../index.html');
    expect(existsSync(filePath)).toBe(true);
  });

  it('should have src/main.ts', () => {
    const filePath = resolve(__dirname, '../src/main.ts');
    expect(existsSync(filePath)).toBe(true);
  });

  it('should pass typescript compilation (tsc --noEmit)', () => {
    try {
      execSync('npm exec tsc --noEmit', { stdio: 'pipe' });
    } catch (error: any) {
      throw new Error(`TypeScript compilation failed:
${error.stdout.toString()}`);
    }
  });
});
