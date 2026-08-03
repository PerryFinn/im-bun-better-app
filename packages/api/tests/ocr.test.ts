import { expect, mock, test } from "bun:test";
import type { Database } from "@im-debug-better-app/db";
import { createApiApp } from "../src/app";
import {
  createOcrClient,
  type OcrClient,
  type ProcessOcrFileInput,
} from "../src/services/ocr";

const successResult = {
  results: [],
  status: "success",
  text_summary: "合同文本",
};

test("上传文件接口将 OCR 参数转换后传给客户端", async () => {
  const processFile = mock(async (_input: ProcessOcrFileInput) =>
    Response.json(successResult)
  );
  const ocrClient: OcrClient = {
    processFile,
    processRemoteImage: async () => Response.json(successResult),
  };
  const app = createApiApp({ db: {} as Database, ocrClient });
  const form = new FormData();
  form.append("file", new File(["image"], "contract.png"));
  form.append("lang", "ch");
  form.append("seal_mode", "true");

  const response = await app.handle(
    new Request("http://localhost/api/ocr/process-image", {
      body: form,
      method: "POST",
    })
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(successResult);
  expect(processFile).toHaveBeenCalledTimes(1);
  const input = processFile.mock.calls[0]?.[0];
  expect(input?.file.name).toBe("contract.png");
  expect(input?.lang).toBe("ch");
  expect(input?.seal_mode).toBe(true);
});

test("OCR 客户端调用 Skill 定义的同步上传接口", async () => {
  const fetchMock = mock(
    async (_input: Request | string | URL, _init?: RequestInit) =>
      Response.json(successResult)
  );
  const client = createOcrClient({
    baseUrl: "https://ocr.internal/",
    fetch: fetchMock,
  });
  const file = new File(["pdf"], "contract.pdf", {
    type: "application/pdf",
  });

  const response = await client.processFile({ file, lang: "ch" });

  expect(response.status).toBe(200);
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe("https://ocr.internal/process_image");
  expect(init?.method).toBe("POST");
  const body = init?.body as FormData;
  expect((body.get("file") as File).name).toBe("contract.pdf");
  expect(body.get("lang")).toBe("ch");
});

test("OCR 客户端调用 Skill 定义的远程图片接口", async () => {
  const fetchMock = mock(
    async (_input: Request | string | URL, _init?: RequestInit) =>
      Response.json(successResult)
  );
  const client = createOcrClient({
    baseUrl: "https://ocr.internal",
    fetch: fetchMock,
  });

  await client.processRemoteImage({
    image_url: "https://example.com/receipt.png",
    prompt_mode: "prompt_ocr",
  });

  const [url, init] = fetchMock.mock.calls[0] ?? [];
  expect(url).toBe("https://ocr.internal/process_remote_image");
  expect(init?.headers).toEqual({ "content-type": "application/json" });
  expect(JSON.parse(String(init?.body))).toEqual({
    image_url: "https://example.com/receipt.png",
    prompt_mode: "prompt_ocr",
  });
});
