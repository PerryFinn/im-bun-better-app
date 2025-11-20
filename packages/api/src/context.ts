import type { Context as ElysiaContext } from "elysia";

export type CreateContextOptions = {
  context: ElysiaContext;
};

export function createContext({ context }: CreateContextOptions) {
  // No auth configured
  console.log("createContext :>> ", context);
  return {
    session: null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
