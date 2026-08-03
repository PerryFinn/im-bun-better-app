import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDatabase,
  type DatabaseConnection,
} from "@im-debug-better-app/db";
import { createApiApp } from "../src/app";
import type { OcrClient } from "../src/services/ocr";

let app: ReturnType<typeof createApiApp>;
let databaseConnection: DatabaseConnection;
let testDatabaseDirectory: string;
const ocrClient: OcrClient = {
  processFile: async () => Response.json({ status: "success" }),
  processRemoteImage: async () => Response.json({ status: "success" }),
};

beforeEach(async () => {
  testDatabaseDirectory = await mkdtemp(join(tmpdir(), "im-bun-better-api-"));
  databaseConnection = await createDatabase({
    filename: join(testDatabaseDirectory, "test.db"),
  });
  app = createApiApp({ db: databaseConnection.db, ocrClient });
});

afterEach(async () => {
  databaseConnection.close();
  await rm(testDatabaseDirectory, { force: true, recursive: true });
});

test("创建的 Todo 可以通过列表接口读取", async () => {
  const createResponse = await app.handle(
    new Request("http://localhost/api/todos", {
      body: JSON.stringify({ text: "验证 package seam" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );

  expect(createResponse.status).toBe(200);

  const listResponse = await app.handle(
    new Request("http://localhost/api/todos")
  );

  expect(listResponse.status).toBe(200);
  expect(await listResponse.json()).toEqual([
    {
      completed: false,
      id: 1,
      text: "验证 package seam",
    },
  ]);
});

test("Todo 的完成状态可以更新", async () => {
  await app.handle(
    new Request("http://localhost/api/todos", {
      body: JSON.stringify({ text: "待完成事项" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );

  const toggleResponse = await app.handle(
    new Request("http://localhost/api/todos/1", {
      body: JSON.stringify({ completed: true }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    })
  );

  expect(toggleResponse.status).toBe(200);
  expect(await toggleResponse.json()).toEqual({ affectedRows: 1 });

  const listResponse = await app.handle(
    new Request("http://localhost/api/todos")
  );

  expect(await listResponse.json()).toEqual([
    {
      completed: true,
      id: 1,
      text: "待完成事项",
    },
  ]);
});

test("删除的 Todo 不再出现在列表中", async () => {
  await app.handle(
    new Request("http://localhost/api/todos", {
      body: JSON.stringify({ text: "待删除事项" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );

  const deleteResponse = await app.handle(
    new Request("http://localhost/api/todos/1", {
      method: "DELETE",
    })
  );

  expect(deleteResponse.status).toBe(200);
  expect(await deleteResponse.json()).toEqual({ affectedRows: 1 });

  const listResponse = await app.handle(
    new Request("http://localhost/api/todos")
  );

  expect(await listResponse.json()).toEqual([]);
});
