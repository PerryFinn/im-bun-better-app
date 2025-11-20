import { publicProcedure, router } from "../index";
import { todoRouter } from "./todo";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  todo: todoRouter,
});
export type AppRouter = typeof appRouter;
