import type { AppState } from '../types';

const STORAGE_KEY = 'todo-app-state';

/**
 * Serializes the application state and saves it to localStorage.
 * @param state The current AppState object.
 */
export function saveState(state: AppState): void {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
}

/**
 * Loads the application state from localStorage.
 * @returns The parsed AppState object, or null if not found or corrupted.
 */
export function loadState(): AppState | null {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return null;
    }
    return JSON.parse(serializedState) as AppState;
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    return null;
  }
}
