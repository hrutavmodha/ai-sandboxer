import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveState, loadState } from '../src/store/persistence';
import type { AppState } from '../src/types/index';

describe('LocalStorage Persistence Utilities', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
  })();

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save and then load the state correctly', () => {
    const mockState: AppState = {
      todos: [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          priority: 'medium',
          status: 'pending',
          createdAt: Date.now(),
          completedAt: null,
          dueDate: null,
        },
      ],
      filter: {
        status: 'all',
        priority: 'all',
        searchQuery: '',
      },
      editingId: null,
    };

    saveState(mockState);
    const loadedState = loadState();

    expect(loadedState).toEqual(mockState);
  });

  it('should return null when loading from a fresh localStorage', () => {
    const loadedState = loadState();
    expect(loadedState).toBeNull();
  });

  it('should return null and console.error when localStorage has corrupt JSON', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('todo-app-state', '{ invalid-json }');

    const loadedState = loadState();

    expect(loadedState).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should console.error when saveState fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Force setItem to throw
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    const mockState: AppState = {
      todos: [],
      filter: { status: 'all', priority: 'all', searchQuery: '' },
      editingId: null,
    };

    // Should not throw, but log error
    expect(() => saveState(mockState)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
