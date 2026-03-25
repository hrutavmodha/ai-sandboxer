import { AppState } from '../types';

/**
 * Returns a new instance of the default application state.
 * This ensures that every call returns a fresh object to avoid shared mutable state.
 *
 * @returns {AppState} The default state object.
 */
export function getDefaultState(): AppState {
  return {
    todos: [],
    filter: {
      status: 'all',
      priority: 'all',
      searchQuery: '',
    },
    editingId: null,
  };
}
