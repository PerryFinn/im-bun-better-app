import { db } from "@im-debug-better-app/db";
import { todo } from "@im-debug-better-app/db/schema/todo";
import { eq } from "drizzle-orm";

export const getAllTodos = async () => await db.select().from(todo);

export const createTodo = async (text: string) => {
  const [createdTodo] = await db.insert(todo).values({ text }).returning();

  if (!createdTodo) {
    throw new Error("创建 Todo 失败");
  }

  return createdTodo;
};

export const toggleTodo = async (id: number, completed: boolean) => {
  const updatedRows = await db
    .update(todo)
    .set({ completed })
    .where(eq(todo.id, id))
    .returning({ id: todo.id });

  return updatedRows.length;
};

export const deleteTodo = async (id: number) => {
  const deletedRows = await db
    .delete(todo)
    .where(eq(todo.id, id))
    .returning({ id: todo.id });

  return deletedRows.length;
};
