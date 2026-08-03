import "dotenv/config";
import { resolve, sep } from "node:path";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { serverTiming } from "@elysiajs/server-timing";
import { createApiApp } from "@im-debug-better-app/api";
import { createOcrClient } from "@im-debug-better-app/api/ocr";
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

// Scalar 的 Multipart 调试表格使用四列 Grid，最后一列原本为 auto。
// 选择长文件名后，文件名会同时出现在值列和上传列，并按内容宽度撑开整个表格。
// 以下覆盖仅匹配该四列表格，避免影响 Cookies、Headers 等普通三列表格。
const openApiCustomCss = `
/* 允许字段值列收缩，并限制文件上传列的最大宽度。 */
.scalar-data-table > table[style*="36px 1fr 1fr auto"] {
  grid-template-columns: 36px minmax(9rem, 0.75fr) minmax(0, 1.25fr) minmax(8rem, 12rem) !important;
  width: 100%;
}

.scalar-data-table > table[style*="36px 1fr 1fr auto"] tr > td:nth-child(2),
.scalar-data-table > table[style*="36px 1fr 1fr auto"] tr > td:nth-child(3),
.scalar-data-table > table[style*="36px 1fr 1fr auto"] tr > td:nth-child(4) {
  min-width: 0;
  overflow: hidden;
}

/* Scalar 会在值编辑器和上传列各渲染一次文件名，两处都需要截断。 */
.scalar-data-table > table[style*="36px 1fr 1fr auto"] .code-input-lite__editor {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scalar-data-table > table[style*="36px 1fr 1fr auto"] .filemask > span {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;

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

const ocrClient = createOcrClient({
  baseUrl: process.env.OCR_BASE_URL,
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
  .use(
    openapi({
      documentation: {
        info: {
          description:
            "im-bun-better-app 后端接口文档。OCR 接口对接内网 PaddleOCR PP-OCRv5 服务，采用同步调用并直接返回识别结果。",
          title: "应用后端 OpenAPI 文档",
          version: "1.0.0",
        },
        tags: [
          {
            description:
              "对接内网 PaddleOCR PP-OCRv5 服务，支持上传图片/PDF 与远程图片 URL 识别。",
            name: "OCR 文字识别",
          },
        ],
      },
      scalar: {
        customCss: openApiCustomCss,
      },
    })
  )
  .use(
    cors({
      methods: ["GET", "POST", "OPTIONS"],
      origin: process.env.CORS_ORIGIN || "*",
    })
  )
  .use(createApiApp({ db: databaseConnection.db, ocrClient }))
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
