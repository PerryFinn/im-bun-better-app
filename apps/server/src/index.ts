import "dotenv/config";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { serverTiming } from "@elysiajs/server-timing";
import { createApiApp } from "@im-debug-better-app/api";
import { configure, getConsoleSink } from "@logtape/logtape";
import { Elysia } from "elysia";
import getPort from "get-port";
import webHTML from "../../web/dist/index.html";
import { name as pkgName } from "../package.json";

await configure({
  sinks: {
    console: getConsoleSink(),
  },
  loggers: [
    {
      category: [pkgName],
      lowestLevel: process.env.NODE_ENV === "development" ? "trace" : "info",
      sinks: ["console"],
    },
    {
      category: [pkgName, "database"],
      lowestLevel: process.env.NODE_ENV === "development" ? "trace" : null, // 生产环境不记录数据库日志
      sinks: ["console"],
    },
  ],
});

console.log("process.env.NODE_ENV ", process.env.NODE_ENV);

const acceptsHtml = (request: Request): boolean => {
  const accept = request.headers.get("accept");
  if (!accept) {
    return false;
  }

  return (
    accept.includes("text/html") || accept.includes("application/xhtml+xml")
  );
};

const preferredHost = process.env.HOST || "localhost";
const preferredPort = 12_306;

const host = process.env.HOST || "localhost";
const port = await getPort({ host, port: preferredPort });

if (preferredPort !== port) {
  console.warn(`端口【${preferredPort}】被占用，使用端口【${port}】代替`);
}

let isClosing = false;

const app = new Elysia({ serve: { hostname: preferredHost } })
  .use(serverTiming({ enabled: process.env.NODE_ENV === "development" }))
  .use(openapi())
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST", "OPTIONS"],
    })
  )
  .use(createApiApp())
  .get("/", webHTML, {
    detail: { hide: true },
  })
  .get("/demo", () => "OK", {
    detail: {
      summary: "这是操作功能的简短摘要。",
      description: "对操作行为的详细说明。",
      deprecated: true,
    },
  })
  .get("/who", () => `pid=${process.pid}`, {
    detail: { hide: true },
  })
  .all(
    "/*",
    ({ request }) => {
      const isHtmlRequest = acceptsHtml(request);
      const isPageRequest =
        request.method === "GET" || request.method === "HEAD";
      if (!(isHtmlRequest && isPageRequest)) {
        return new Response("Not Found", { status: 404 });
      }

      return webHTML;
    },
    {
      detail: { hide: true },
    }
  )
  .listen(port, (server) => {
    console.log(
      `Server is running on http://${server?.hostname}:${server?.port}`
    );
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

export type ServerApp = typeof app;
