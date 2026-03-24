import { describe, it, expect } from 'vitest';
import { generateId } from '../src/utils/id';

describe('generateId', () => {
  it('should generate 1000 unique UUIDs matching the UUID v4 regex', () => {
    const ids = new Set<string>();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    for (let i = 0; i < 1000; i++) {
      const id = generateId();
      expect(id).toMatch(uuidRegex);
      expect(typeof id).toBe('string');
      ids.add(id);
    }
    
    expect(ids.size).toBe(1000);
  });
});
