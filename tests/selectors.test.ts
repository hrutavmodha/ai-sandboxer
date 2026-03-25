import { describe, it, expect } from 'vitest';
import type { AppState, Todo } from '../src/types/index';
import { getFilteredTodos } from '../src/store/selectors';

describe('getFilteredTodos selector', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      title: 'Buy Groceries',
      description: 'Milk and eggs',
      priority: 'high',
      status: 'pending',
      createdAt: 100,
      completedAt: null,
      dueDate: null,
    },
    {
      id: '2',
      title: 'Workout',
      description: 'Morning yoga',
      priority: 'medium',
      status: 'completed',
      createdAt: 50,
      completedAt: 200,
      dueDate: null,
    },
    {
      id: '3',
      title: 'Read Book',
      description: 'Science fiction',
      priority: 'low',
      status: 'pending',
      createdAt: 150,
      completedAt: null,
      dueDate: null,
    },
    {
      id: '4',
      title: 'Fix Bug',
      description: 'Critical issue',
      priority: 'high',
      status: 'completed',
      createdAt: 300,
      completedAt: 400,
      dueDate: null,
    },
    {
      id: '5',
      title: 'Water Plants',
      description: 'Garden and indoor',
      priority: 'medium',
      status: 'pending',
      createdAt: 250,
      completedAt: null,
      dueDate: null,
    },
  ];

  const baseState: AppState = {
    todos: mockTodos,
    filter: {
      status: 'all',
      priority: 'all',
      searchQuery: '',
    },
    editingId: null,
  };

  it('should return all todos when no filters are applied', () => {
    const result = getFilteredTodos(baseState);
    expect(result).toHaveLength(5);
  });

  it('should filter by status', () => {
    const pendingState = { ...baseState, filter: { ...baseState.filter, status: 'pending' as const } };
    const pendingResult = getFilteredTodos(pendingState);
    expect(pendingResult).toHaveLength(3);
    expect(pendingResult.every(t => t.status === 'pending')).toBe(true);

    const completedState = { ...baseState, filter: { ...baseState.filter, status: 'completed' as const } };
    const completedResult = getFilteredTodos(completedState);
    expect(completedResult).toHaveLength(2);
    expect(completedResult.every(t => t.status === 'completed')).toBe(true);
  });

  it('should filter by priority', () => {
    const highPriorityState = { ...baseState, filter: { ...baseState.filter, priority: 'high' as const } };
    const highPriorityResult = getFilteredTodos(highPriorityState);
    expect(highPriorityResult).toHaveLength(2);
    expect(highPriorityResult.every(t => t.priority === 'high')).toBe(true);

    const lowPriorityState = { ...baseState, filter: { ...baseState.filter, priority: 'low' as const } };
    const lowPriorityResult = getFilteredTodos(lowPriorityState);
    expect(lowPriorityResult).toHaveLength(1);
    expect(lowPriorityResult[0].id).toBe('3');
  });

  it('should filter by search query (title)', () => {
    const searchState = { ...baseState, filter: { ...baseState.filter, searchQuery: 'Fix' } };
    const result = getFilteredTodos(searchState);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Fix Bug');
  });

  it('should filter by search query (description)', () => {
    const searchState = { ...baseState, filter: { ...baseState.filter, searchQuery: 'yoga' } };
    const result = getFilteredTodos(searchState);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Morning yoga');
  });

  it('should filter by search query (case-insensitive)', () => {
    const searchState = { ...baseState, filter: { ...baseState.filter, searchQuery: 'GROCERIES' } };
    const result = getFilteredTodos(searchState);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Buy Groceries');
  });

  it('should combine multiple filters', () => {
    const combinedState: AppState = {
      ...baseState,
      filter: {
        status: 'pending',
        priority: 'high',
        searchQuery: 'Buy',
      }
    };
    const result = getFilteredTodos(combinedState);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should sort correctly: pending todos by createdAt descending, then completed by completedAt descending', () => {
    // Current Pending todos:
    // id 5: createdAt 250
    // id 3: createdAt 150
    // id 1: createdAt 100
    // Current Completed todos:
    // id 4: completedAt 400
    // id 2: completedAt 200

    const result = getFilteredTodos(baseState);
    
    // Expected order: 5, 3, 1, 4, 2
    expect(result.map(t => t.id)).toEqual(['5', '3', '1', '4', '2']);
  });

  it('should always show completed todos at the end regardless of createdAt', () => {
    // Todo 4 has createdAt 300 (highest), but status is completed.
    // It should appear after all pending todos.
    const result = getFilteredTodos(baseState);
    const pendingTodos = result.filter(t => t.status === 'pending');
    const completedTodos = result.filter(t => t.status === 'completed');
    
    expect(result).toEqual([...pendingTodos, ...completedTodos]);
  });
});
