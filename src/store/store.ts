import type { AppState } from '../types';
import { loadState, saveState } from './persistence';
import { getDefaultState } from './defaultState';

let state: AppState = loadState() ?? getDefaultState();

const subscribers = new Set<() => void>();

export function getState(): AppState {
  return { ...state };
}

export function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function setState(updater: (prev: AppState) => AppState): void {
  state = updater(state);
  saveState(state);
  subscribers.forEach((cb) => cb());
}
