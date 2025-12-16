import type { Context as ElysiaContext } from "elysia";

export type CreateContextOptions = {
  context: ElysiaContext;
};

export function createContext({ context }: CreateContextOptions) {
  void context;
  // No auth configured
  return {
    session: null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
