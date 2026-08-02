import type { Database } from "@im-debug-better-app/db";
import { todo } from "@im-debug-better-app/db/schema/todo";
import { eq } from "drizzle-orm";

export const getAllTodos = async (db: Database) => await db.select().from(todo);

export const createTodo = async (db: Database, text: string) => {
  const [createdTodo] = await db.insert(todo).values({ text }).returning();

  if (!createdTodo) {
    throw new Error("创建 Todo 失败");
  }

  return createdTodo;
};

export const toggleTodo = async (
  db: Database,
  id: number,
  completed: boolean
) => {
  const updatedRows = await db
    .update(todo)
    .set({ completed })
    .where(eq(todo.id, id))
    .returning({ id: todo.id });

  return updatedRows.length;
};

export const deleteTodo = async (db: Database, id: number) => {
  const deletedRows = await db
    .delete(todo)
    .where(eq(todo.id, id))
    .returning({ id: todo.id });

  return deletedRows.length;
};
