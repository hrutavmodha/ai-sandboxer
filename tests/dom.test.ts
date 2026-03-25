import { describe, it, expect, vi } from 'vitest';
import { createElement } from '../src/utils/dom';

// Setup basic DOM mocks if document is not defined (standard for this project)
if (typeof document === 'undefined') {
  const mockSetAttribute = vi.fn();
  const mockGetAttribute = vi.fn((key) => {
    if (key === 'data-id') return '123';
    if (key === 'aria-label') return 'Close';
    return null;
  });

  (global as any).document = {
    createElement: vi.fn((tag: string) => ({
      tagName: tag.toUpperCase(),
      className: '',
      setAttribute: mockSetAttribute,
      getAttribute: mockGetAttribute,
      _attributes: {} as Record<string, string>,
    })),
  };
  (global as any).HTMLElement = class {};
  (global as any).HTMLButtonElement = class extends (global as any).HTMLElement {};
}

describe('createElement DOM Utility', () => {
  it('should create an element with the correct tag, classes, and attributes', () => {
    const tag = 'button';
    const classes = ['btn', 'btn-primary'];
    const attributes = {
      'data-id': '123',
      'aria-label': 'Close'
    };

    const el = createElement(tag, classes, attributes);

    // Assert the returned element is (or behaves like) an HTMLButtonElement
    // We check tagName since our simple mock uses it.
    expect(el.tagName).toBe('BUTTON');
    
    // Assert it has className 'btn btn-primary'
    expect(el.className).toBe('btn btn-primary');

    // Assert it has the correct attribute values
    if (vi.isMockFunction(el.setAttribute)) {
      expect(el.setAttribute).toHaveBeenCalledWith('data-id', '123');
      expect(el.setAttribute).toHaveBeenCalledWith('aria-label', 'Close');
    } else {
      // If we're in a real/JSDOM environment
      expect(el.getAttribute('data-id')).toBe('123');
      expect(el.getAttribute('aria-label')).toBe('Close');
    }
  });

  it('should handle empty classes and attributes correctly', () => {
    const el = createElement('div', [], {});
    expect(el.tagName).toBe('DIV');
    expect(el.className).toBe('');
  });

  it('should handle null or undefined classes and attributes', () => {
    // Note: The signature says classes?: string[], attributes?: Record<string, string>
    const el = createElement('span');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toBe('');
  });
});
