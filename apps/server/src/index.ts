import "dotenv/config";
import { cors } from "@elysiajs/cors";
import { createContext } from "@im-debug-better-app/api/context";
import { appRouter } from "@im-debug-better-app/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Elysia } from "elysia";
import getPort from "get-port";

const port = await getPort({ host: "localhost", port: 12_306 });

let isClosing = false;

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "",
      methods: ["GET", "POST", "OPTIONS"],
    })
  )
  .all("/trpc/*", async (context) => {
    const res = await fetchRequestHandler({
      endpoint: "/trpc",
      router: appRouter,
      req: context.request,
      createContext: () => createContext({ context }),
    });
    return res;
  })
  .get("/", () => "OK")
  .listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

const shutdown = async (signal: string) => {
  if (isClosing) {
    return;
  }
  isClosing = true;
  await app.stop();
  console.log(`Server is shutting down on ${signal}`);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
