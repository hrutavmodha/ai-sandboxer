import { describe, it, expect, vi } from 'vitest';
import { getState, setState, subscribe } from '../src/store/index';
import type { Todo } from '../src/types/index';

describe('State Store', () => {
  it('should call setState with an updater that appends a todo and getState should reflect the change', () => {
    const mockTodo: Todo = {
      id: '123',
      title: 'New Todo',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null,
      dueDate: null,
    };

    setState((prev) => ({
      ...prev,
      todos: [...prev.todos, mockTodo],
    }));

    const state = getState();
    expect(state.todos).toContainEqual(mockTodo);
  });

  it('should subscribe a callback and invoke it when setState is called', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);

    setState((prev) => ({ ...prev }));

    expect(callback).toHaveBeenCalledTimes(1);
    
    unsubscribe();
  });

  it('should not invoke callback after unsubscribe is called', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);

    unsubscribe();
    setState((prev) => ({
      ...prev,
      editingId: '123' // Use something else than just returning prev to be sure state changed if that matters
    }));

    expect(callback).not.toHaveBeenCalled();
  });
});
