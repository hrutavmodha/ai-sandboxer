import { z } from 'zod';

export const TodoSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1, 'Todo text cannot be empty'),
  completed: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoSchema = TodoSchema.pick({ text: true });
export type CreateTodo = z.infer<typeof CreateTodoSchema>;

export const UpdateTodoSchema = TodoSchema.pick({ text: true, completed: true }).partial();
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>;
