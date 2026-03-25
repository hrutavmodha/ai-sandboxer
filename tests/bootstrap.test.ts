import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocking the DOM environment since jsdom is not available
if (typeof document === 'undefined') {
  const dom: any = {
    body: { innerHTML: '' },
    getElementById: vi.fn((id: string) => {
      if (id === 'app' && dom.body.innerHTML.includes('id="app"')) {
        return { tagName: 'DIV', id: 'app', innerHTML: '' } as any;
      }
      return null;
    }),
  };
  global.document = dom;
  (global as any).HTMLElement = class {};
}

describe('Bootstrap Root HTML Shell', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear the document body to simulate a fresh state
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should find the root element with id "app" after index.html parsing', () => {
    // Simulate index.html content
    document.body.innerHTML = '<div id="app"></div>';
    
    const app = document.getElementById('app');
    expect(app).not.toBeNull();
    expect(app?.id).toBe('app');
  });

  it('should throw "Root element #app not found" error if the element is missing', async () => {
    // Ensure the #app element is missing
    document.body.innerHTML = '';
    
    // Attempt to import src/main.ts and expect it to throw an error during bootstrap
    // We expect src/main.ts to have logic like:
    // const app = document.getElementById('app');
    // if (!app) throw new Error('Root element #app not found');
    await expect(async () => {
      await import('../src/main');
    }).rejects.toThrow('Root element #app not found');
  });
});
