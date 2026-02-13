import { Elysia, t } from "elysia";
import {
  createTodo,
  deleteTodo,
  getAllTodos,
  toggleTodo,
} from "./services/todo";

export const createApiApp = () =>
  new Elysia({ prefix: "/api" })
    .get("/health", () => "OK")
    .get("/todos", async () => await getAllTodos())
    .post("/todos", async ({ body }) => await createTodo(body.text), {
      body: t.Object({
        text: t.String({ minLength: 1 }),
      }),
    })
    .patch(
      "/todos/:id",
      async ({ body, params }) => ({
        affectedRows: await toggleTodo(params.id, body.completed),
      }),
      {
        body: t.Object({
          completed: t.Boolean(),
        }),
        params: t.Object({
          id: t.Numeric(),
        }),
      }
    )
    .delete(
      "/todos/:id",
      async ({ params }) => ({
        affectedRows: await deleteTodo(params.id),
      }),
      {
        params: t.Object({
          id: t.Numeric(),
        }),
      }
    );

export type ApiApp = ReturnType<typeof createApiApp>;
