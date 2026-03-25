import { describe, it, expect, vi } from 'vitest';
import Header from '../src/components/Header';

// Mocking the DOM environment since a full JSDOM is not available in the devDependencies
if (typeof document === 'undefined') {
  (global as any).document = {
    createElement: vi.fn((tag: string) => {
      const el: any = {
        tagName: tag.toUpperCase(),
        className: '',
        textContent: '',
        children: [] as any[],
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
        appendChild: vi.fn((child: any) => {
          el.children.push(child);
          return child;
        }),
        querySelector: vi.fn((selector: string) => {
          if (selector === 'h1') return el.children.find((c: any) => c.tagName === 'H1');
          if (selector === 'p') return el.children.find((c: any) => c.tagName === 'P');
          return null;
        }),
        querySelectorAll: vi.fn((selector: string) => {
          if (selector === 'h1') return el.children.filter((c: any) => c.tagName === 'H1');
          if (selector === 'p') return el.children.filter((c: any) => c.tagName === 'P');
          return [];
        })
      };
      return el;
    }),
  };
  (global as any).HTMLElement = class {};
}

describe('Header Component (Task 11)', () => {
  it('should return a <header> element', () => {
    const header = Header();
    expect(header.tagName).toBe('HEADER');
  });

  it('should contain exactly one <h1> with textContent === "My Todos"', () => {
    const header = Header();
    
    // In our mock, children are added via appendChild and tracked in the children array
    const h1s = (header as any).querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent).toBe('My Todos');
  });

  it('should contain the subtitle <p> with the correct text', () => {
    const header = Header();
    const p = (header as any).querySelector('p');
    expect(p).not.toBeNull();
    expect(p.textContent).toBe('Stay organized, stay productive.');
  });

  it('should return different object references on each call', () => {
    const header1 = Header();
    const header2 = Header();
    expect(header1).not.toBe(header2);
    expect(header1).not.toEqual(header2 === header1); // Basic check for different instances
  });
});
