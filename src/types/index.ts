export type Priority = 'low' | 'medium' | 'high';
export type TodoStatus = 'pending' | 'completed';

export interface Todo {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TodoStatus;
  createdAt: number;
  completedAt: number | null;
  dueDate: number | null;
}

export interface FilterState {
  status: TodoStatus | 'all';
  priority: Priority | 'all';
  searchQuery: string;
}

export interface AppState {
  todos: Todo[];
  filter: FilterState;
  editingId: string | null;
}
