import { describe, it, expect } from 'vitest';
import { getDefaultState } from '../src/store/defaultState';

describe('Default Application State Utility', () => {
  it('should return the default state correctly', () => {
    const state = getDefaultState();
    
    expect(state).toEqual({
      todos: [],
      filter: {
        status: 'all',
        priority: 'all',
        searchQuery: '',
      },
      editingId: null,
    });
  });

  it('should return a new object reference on every call', () => {
    const state1 = getDefaultState();
    const state2 = getDefaultState();

    // Assert that the two returned objects are deeply equal
    expect(state1).toEqual(state2);
    
    // Assert that they are not the same reference (!==)
    expect(state1).not.toBe(state2);
    
    // Additional check for deep nesting if needed (though not explicitly required)
    expect(state1.filter).not.toBe(state2.filter);
  });
});
