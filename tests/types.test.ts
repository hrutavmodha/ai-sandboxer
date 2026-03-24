import { describe, it, expect } from 'vitest';
import type { Priority, TodoStatus, Todo, FilterState, AppState } from '../src/types/index';

describe('Core TypeScript Types and Interfaces', () => {
  it('should have Priority type defined correctly', () => {
    const low: Priority = 'low';
    const medium: Priority = 'medium';
    const high: Priority = 'high';

    expect(low).toBe('low');
    expect(medium).toBe('medium');
    expect(high).toBe('high');

    // @ts-expect-error - invalid priority
    const invalid: Priority = 'invalid';
    expect(invalid).toBe('invalid');
  });

  it('should have TodoStatus type defined correctly', () => {
    const pending: TodoStatus = 'pending';
    const completed: TodoStatus = 'completed';

    expect(pending).toBe('pending');
    expect(completed).toBe('completed');

    // @ts-expect-error - invalid status
    const invalid: TodoStatus = 'invalid';
    expect(invalid).toBe('invalid');
  });

  it('should have Todo interface with all required fields', () => {
    const mockTodo: Todo = {
      id: '1',
      title: 'Test Todo',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null,
      dueDate: null,
    };

    expect(mockTodo).toHaveProperty('id');
    expect(mockTodo).toHaveProperty('title');
    expect(mockTodo).toHaveProperty('description');
    expect(mockTodo).toHaveProperty('priority');
    expect(mockTodo).toHaveProperty('status');
    expect(mockTodo).toHaveProperty('createdAt');
    expect(mockTodo).toHaveProperty('completedAt');
    expect(mockTodo).toHaveProperty('dueDate');

    expect(typeof mockTodo.id).toBe('string');
    expect(typeof mockTodo.title).toBe('string');
    expect(typeof mockTodo.description).toBe('string');
    expect(typeof mockTodo.createdAt).toBe('number');
  });

  it('should have FilterState interface with correctly typed values', () => {
    const mockFilter: FilterState = {
      status: 'all',
      priority: 'high',
      searchQuery: 'search',
    };

    expect(mockFilter.status).toBe('all');
    expect(mockFilter.priority).toBe('high');
    expect(typeof mockFilter.searchQuery).toBe('string');

    const anotherFilter: FilterState = {
      status: 'pending',
      priority: 'all',
      searchQuery: '',
    };
    expect(anotherFilter.status).toBe('pending');
    expect(anotherFilter.priority).toBe('all');
  });

  it('should have AppState interface with correct fields', () => {
    const mockState: AppState = {
      todos: [],
      filter: {
        status: 'all',
        priority: 'all',
        searchQuery: '',
      },
      editingId: null,
    };

    expect(Array.isArray(mockState.todos)).toBe(true);
    expect(mockState.filter).toBeDefined();
    expect(mockState.editingId).toBe(null);
    
    mockState.editingId = '123';
    expect(mockState.editingId).toBe('123');
  });
});
