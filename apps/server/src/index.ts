import "dotenv/config";
import { resolve, sep } from "node:path";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { serverTiming } from "@elysiajs/server-timing";
import { createApiApp } from "@im-debug-better-app/api";
import { createDatabase } from "@im-debug-better-app/db";
import { configure, getConsoleSink } from "@logtape/logtape";
import Bun from "bun";
import { Elysia } from "elysia";
import getPort from "get-port";
import { name as pkgName } from "../package.json";
import { appLogger } from "./utils/logger";

const isDevelopment = process.env.NODE_ENV === "development";
const webDistDir = resolve(import.meta.dir, "../../web/dist");
const webAssetsDir = resolve(webDistDir, "assets");
const webIndex = Bun.file(resolve(webDistDir, "index.html"));
const getWebIndex = () => new Response(webIndex);

const getWebAsset = async (assetPath: string) => {
  const resolvedAssetPath = resolve(webAssetsDir, assetPath);
  if (!resolvedAssetPath.startsWith(`${webAssetsDir}${sep}`)) {
    return new Response("Not Found", { status: 404 });
  }

  const asset = Bun.file(resolvedAssetPath);
  if (!(await asset.exists())) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(asset);
};

await configure({
  loggers: [
    {
      category: [pkgName],
      lowestLevel: isDevelopment ? "trace" : "info",
      sinks: ["console"],
    },
    {
      category: [pkgName, "database"],
      lowestLevel: isDevelopment ? "trace" : null, // 生产环境不记录数据库日志
      sinks: ["console"],
    },
  ],
  sinks: {
    console: getConsoleSink(),
  },
});

const databaseConnection = await createDatabase({
  filename: process.env.DB_FILE_NAME,
  runMigrations: process.env.SKIP_DB_MIGRATIONS !== "1",
});

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

if (isDevelopment) {
  appLogger.debug(
    "OpenAPI Docs is ready on http://{preferredHost}:{port}/openapi",
    { port, preferredHost }
  );
}

const app = new Elysia({ serve: { hostname: preferredHost } })
  .use(serverTiming({ enabled: isDevelopment }))
  .use(openapi())
  .use(
    cors({
      methods: ["GET", "POST", "OPTIONS"],
      origin: process.env.CORS_ORIGIN || "*",
    })
  )
  .use(createApiApp({ db: databaseConnection.db }))
  .get("/", getWebIndex, {
    detail: { hide: true },
  })
  .get("/assets/*", ({ params }) => getWebAsset(params["*"]), {
    detail: { hide: true },
  })
  .get("/demo", () => "OK", {
    detail: {
      deprecated: true,
      description: "对操作行为的详细说明。",
      summary: "这是操作功能的简短摘要。",
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

      return getWebIndex();
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
  databaseConnection.close();
  console.log(`Server is shutting down on ${signal}`);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export type ServerApp = typeof app;
