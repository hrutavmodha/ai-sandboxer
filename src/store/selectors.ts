import { AppState, Todo } from '../types';

export const getFilteredTodos = (state: AppState): Todo[] => {
  const { todos, filter } = state;
  const { status, priority, searchQuery } = filter;

  let filtered = todos;

  // Apply status filter
  if (status !== 'all') {
    filtered = filtered.filter((todo) => todo.status === status);
  }

  // Apply priority filter
  if (priority !== 'all') {
    filtered = filtered.filter((todo) => todo.priority === priority);
  }

  // Apply searchQuery filter
  if (searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (todo) =>
        todo.title.toLowerCase().includes(query) ||
        todo.description.toLowerCase().includes(query)
    );
  }

  // Separate pending and completed for sorting
  const pending = filtered.filter((todo) => todo.status === 'pending');
  const completed = filtered.filter((todo) => todo.status === 'completed');

  // Sort pending by createdAt descending
  pending.sort((a, b) => b.createdAt - a.createdAt);

  // Sort completed by completedAt descending
  completed.sort((a, b) => {
    const timeA = a.completedAt ?? 0;
    const timeB = b.completedAt ?? 0;
    return timeB - timeA;
  });

  return [...pending, ...completed];
};
