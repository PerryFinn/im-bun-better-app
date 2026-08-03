import type { Database } from "@im-debug-better-app/db";
import { Elysia, t } from "elysia";
import type { OcrClient } from "./services/ocr";
import {
  createTodo,
  deleteTodo,
  getAllTodos,
  toggleTodo,
} from "./services/todo";

type ApiDependencies = {
  db: Database;
  ocrClient: OcrClient;
};

const ocrFileOptionsSchema = {
  cls: t.Optional(
    t.BooleanString({ default: true, description: "是否进行文字方向分类" })
  ),
  det: t.Optional(
    t.BooleanString({ default: true, description: "是否检测文字区域" })
  ),
  lang: t.Optional(
    t.String({
      default: "ch",
      description: "识别语言代码，例如 ch、en、korean、japan",
      examples: ["ch"],
    })
  ),
  rec: t.Optional(
    t.BooleanString({ default: true, description: "是否识别文字内容" })
  ),
  return_word_box: t.Optional(
    t.BooleanString({ default: false, description: "是否返回单字级识别框" })
  ),
  seal_mode: t.Optional(
    t.BooleanString({ description: "是否启用印章识别专用管线；处理速度更慢" })
  ),
};

const ocrUploadBodySchema = t.Object({
  file: t.File({
    description: "需要识别的图片（JPG/PNG/BMP 等）或 PDF 文件",
  }),
  ...ocrFileOptionsSchema,
});

const ocrRemoteImageBodySchema = t.Object({
  image_url: t.String({
    description: "可由 OCR 服务访问的 HTTP/HTTPS 图片 URL；不支持 PDF",
    examples: ["https://example.com/receipt.png"],
    format: "uri",
  }),
  prompt_mode: t.Optional(
    t.String({
      description: "部分部署支持的提示模式，例如 prompt_ocr",
      examples: ["prompt_ocr"],
    })
  ),
});

const ocrResultItemSchema = t.Object(
  {
    page: t.Optional(
      t.Number({ description: "PDF 页码，从 1 开始；图片结果通常不包含" })
    ),
  },
  { additionalProperties: true, description: "单条 OCR 识别结果" }
);

const ocrResponseSchema = t.Object(
  {
    cache_hit: t.Optional(t.Boolean({ description: "是否命中服务端缓存" })),
    input_type: t.Optional(t.String({ description: "输入类型；PDF 返回 pdf" })),
    page_count: t.Optional(t.Number({ description: "PDF 总页数" })),
    processing_time: t.Optional(t.Number({ description: "服务端处理耗时" })),
    results: t.Array(ocrResultItemSchema, { description: "详细识别结果" }),
    status: t.String({ description: "OCR 处理状态" }),
    text_summary: t.String({ description: "汇总后的识别文本" }),
  },
  { additionalProperties: true, description: "OCR 同步识别结果" }
);

const errorSchema = t.Object(
  {
    detail: t.Optional(
      t.Unknown({ description: "上游服务返回的中文错误详情" })
    ),
    details: t.Optional(
      t.Array(t.Unknown(), { description: "参数校验错误明细" })
    ),
    error: t.Optional(t.String({ description: "错误摘要" })),
    status: t.Optional(t.String({ description: "错误状态" })),
  },
  { additionalProperties: true, description: "请求失败详情" }
);

export const createApiApp = ({ db, ocrClient }: ApiDependencies) =>
  new Elysia({ prefix: "/api" })
    .get("/health", () => "OK")
    .get("/todos", async function getAllTodosHandler() {
      return await getAllTodos(db);
    })
    .post("/todos", async ({ body }) => await createTodo(db, body.text), {
      body: t.Object({
        text: t.String({ minLength: 1 }),
      }),
    })
    .patch(
      "/todos/:id",
      async ({ body, params }) => ({
        affectedRows: await toggleTodo(db, params.id, body.completed),
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
        affectedRows: await deleteTodo(db, params.id),
      }),
      {
        params: t.Object({
          id: t.Numeric(),
        }),
      }
    )
    .post("/ocr/process-image", ({ body }) => ocrClient.processFile(body), {
      body: ocrUploadBodySchema,
      detail: {
        description:
          "同步上传图片或 PDF 到内网 PaddleOCR 服务并返回识别结果。PDF 按页顺序识别，结果中的 page 从 1 开始。普通图片建议客户端超时不少于 120 秒；多页 PDF 建议不少于 300 秒，并按上游限制控制页数、文件大小和图片尺寸。",
        summary: "识别上传的图片或 PDF",
        tags: ["OCR 文字识别"],
      },
      parse: "formdata",
      response: {
        200: ocrResponseSchema,
        400: errorSchema,
        500: errorSchema,
        502: errorSchema,
        503: errorSchema,
        504: errorSchema,
      },
    })
    .post(
      "/ocr/process-remote-image",
      ({ body }) => ocrClient.processRemoteImage(body),
      {
        body: ocrRemoteImageBodySchema,
        detail: {
          description:
            "同步下载并识别远程图片。该入口仅支持 JPG、PNG、BMP 等图片，不支持 PDF；下载大小、图片像素与单边长度受上游服务限制。部分部署的上游路径可能为 /ocr/process_remote_image，可通过 OCR_BASE_URL 结合实际网关前缀配置。",
          summary: "识别远程图片",
          tags: ["OCR 文字识别"],
        },
        parse: "json",
        response: {
          200: ocrResponseSchema,
          400: errorSchema,
          500: errorSchema,
          502: errorSchema,
          503: errorSchema,
          504: errorSchema,
        },
      }
    );

export type ApiApp = ReturnType<typeof createApiApp>;
