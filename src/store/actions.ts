import type { Priority, FilterState, Todo } from '../types';
import { generateId, getNow } from '../utils';
import { setState } from './store';

export function addTodo(
  title: string,
  description: string,
  priority: Priority,
  dueDate: number | null
): void {
  setState((prev) => ({
    ...prev,
    todos: [
      ...prev.todos,
      {
        id: generateId(),
        title,
        description,
        priority,
        status: 'pending',
        createdAt: getNow(),
        completedAt: null,
        dueDate,
      },
    ],
  }));
}

export function removeTodo(id: string): void {
  setState((prev) => ({
    ...prev,
    todos: prev.todos.filter((todo) => todo.id !== id),
  }));
}

export function toggleTodo(id: string): void {
  setState((prev) => ({
    ...prev,
    todos: prev.todos.map((todo) => {
      if (todo.id !== id) return todo;
      const isCompleting = todo.status === 'pending';
      return {
        ...todo,
        status: isCompleting ? 'completed' : 'pending',
        completedAt: isCompleting ? getNow() : null,
      };
    }),
  }));
}

export function updateTodo(
  id: string,
  changes: Partial<Pick<Todo, 'title' | 'description' | 'priority' | 'dueDate'>>
): void {
  setState((prev) => ({
    ...prev,
    todos: prev.todos.map((todo) =>
      todo.id === id ? { ...todo, ...changes } : todo
    ),
  }));
}

export function setFilter(filter: Partial<FilterState>): void {
  setState((prev) => ({
    ...prev,
    filter: { ...prev.filter, ...filter },
  }));
}

export function setEditingId(id: string | null): void {
  setState((prev) => ({
    ...prev,
    editingId: id,
  }));
}
