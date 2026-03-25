import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  addTodo, 
  removeTodo, 
  toggleTodo, 
  updateTodo, 
  setFilter, 
  setEditingId, 
  getState, 
  setState,
  getDefaultState
} from '../src/store/index';
import * as idUtils from '../src/utils/id';
import * as dateUtils from '../src/utils/date';

describe('Todo Mutation Actions', () => {
  beforeEach(() => {
    // Reset state before each test
    setState(() => getDefaultState());
    vi.restoreAllMocks();
  });

  describe('addTodo', () => {
    it('should add a new todo to the state', () => {
      const mockId = 'test-id';
      const mockNow = 123456789;
      vi.spyOn(idUtils, 'generateId').mockReturnValue(mockId);
      vi.spyOn(dateUtils, 'getNow').mockReturnValue(mockNow);

      addTodo('Test Title', 'Test Description', 'high', null);

      const state = getState();
      expect(state.todos).toHaveLength(1);
      expect(state.todos[0]).toEqual({
        id: mockId,
        title: 'Test Title',
        description: 'Test Description',
        priority: 'high',
        status: 'pending',
        createdAt: mockNow,
        completedAt: null,
        dueDate: null,
      });
    });
  });

  describe('removeTodo', () => {
    it('should remove a todo by id', () => {
      const todoId = 'to-remove';
      setState((prev) => ({
        ...prev,
        todos: [
          {
            id: todoId,
            title: 'Remove Me',
            description: '',
            priority: 'medium',
            status: 'pending',
            createdAt: Date.now(),
            completedAt: null,
            dueDate: null,
          }
        ]
      }));

      removeTodo(todoId);

      const state = getState();
      expect(state.todos).toHaveLength(0);
    });

    it('should not change the state if the id does not exist', () => {
      const existingTodo = {
        id: 'exists',
        title: 'Exists',
        description: '',
        priority: 'medium',
        status: 'pending',
        createdAt: Date.now(),
        completedAt: null,
        dueDate: null,
      };
      setState((prev) => ({
        ...prev,
        todos: [existingTodo]
      }));

      removeTodo('non-existent');

      const state = getState();
      expect(state.todos).toHaveLength(1);
      expect(state.todos[0]).toEqual(existingTodo);
    });
  });

  describe('toggleTodo', () => {
    it('should flip status from pending to completed and set completedAt', () => {
      const todoId = 'toggle-me';
      const mockNow = 987654321;
      vi.spyOn(dateUtils, 'getNow').mockReturnValue(mockNow);

      setState((prev) => ({
        ...prev,
        todos: [
          {
            id: todoId,
            title: 'Toggle Me',
            description: '',
            priority: 'medium',
            status: 'pending',
            createdAt: Date.now(),
            completedAt: null,
            dueDate: null,
          }
        ]
      }));

      toggleTodo(todoId);

      const state = getState();
      expect(state.todos[0].status).toBe('completed');
      expect(state.todos[0].completedAt).toBe(mockNow);
    });

    it('should flip status from completed to pending and reset completedAt', () => {
      const todoId = 'toggle-me-back';
      setState((prev) => ({
        ...prev,
        todos: [
          {
            id: todoId,
            title: 'Toggle Me Back',
            description: '',
            priority: 'medium',
            status: 'completed',
            createdAt: Date.now(),
            completedAt: 12345,
            dueDate: null,
          }
        ]
      }));

      toggleTodo(todoId);

      const state = getState();
      expect(state.todos[0].status).toBe('pending');
      expect(state.todos[0].completedAt).toBeNull();
    });

    it('should return to pending with null completedAt after being toggled twice', () => {
      const todoId = 'double-toggle';
      setState((prev) => ({
        ...prev,
        todos: [
          {
            id: todoId,
            title: 'Double Toggle',
            description: '',
            priority: 'medium',
            status: 'pending',
            createdAt: Date.now(),
            completedAt: null,
            dueDate: null,
          }
        ]
      }));

      toggleTodo(todoId);
      toggleTodo(todoId);

      const state = getState();
      expect(state.todos[0].status).toBe('pending');
      expect(state.todos[0].completedAt).toBeNull();
    });
  });

  describe('updateTodo', () => {
    it('should merge changes into the matching todo', () => {
      const todoId = 'update-me';
      setState((prev) => ({
        ...prev,
        todos: [
          {
            id: todoId,
            title: 'Original Title',
            description: 'Original Description',
            priority: 'low',
            status: 'pending',
            createdAt: Date.now(),
            completedAt: null,
            dueDate: null,
          }
        ]
      }));

      updateTodo(todoId, { title: 'New Title', priority: 'high' });

      const state = getState();
      expect(state.todos[0].title).toBe('New Title');
      expect(state.todos[0].priority).toBe('high');
      expect(state.todos[0].description).toBe('Original Description');
    });
  });

  describe('setFilter', () => {
    it('should merge filter changes into state.filter', () => {
      setFilter({ status: 'completed' });
      let state = getState();
      expect(state.filter.status).toBe('completed');
      expect(state.filter.priority).toBe('all');

      setFilter({ priority: 'high', searchQuery: 'search' });
      state = getState();
      expect(state.filter.status).toBe('completed');
      expect(state.filter.priority).toBe('high');
      expect(state.filter.searchQuery).toBe('search');
    });
  });

  describe('setEditingId', () => {
    it('should set state.editingId', () => {
      setEditingId('edit-this');
      let state = getState();
      expect(state.editingId).toBe('edit-this');

      setEditingId(null);
      state = getState();
      expect(state.editingId).toBeNull();
    });
  });
});
