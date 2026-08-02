#!/usr/bin/env bun
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Bun from "bun";
import { dirname, resolve } from "pathe";

const GREEN = "\x1b[32m";
const BLUE = "\x1b[34m";
const RED = "\x1b[31m";
const NC = "\x1b[0m";

const log = (color: string, msg: string) => console.log(`${color}${msg}${NC}`);
const err = (msg: string) => console.error(`${RED}${msg}${NC}`);

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

// 你原脚本的输入/输出
const INPUT_FILE = resolve(SCRIPT_DIR, "../apps/server/src/index.ts");
const OUTPUT_BASENAME = "im-debug";
const OUTDIR = resolve(SCRIPT_DIR, "..", "dist");

// 目标：macOS arm64、macOS x64、Windows x64
const targets = [
  {
    compile: {
      outfile: `${OUTPUT_BASENAME}-arm64-[Apple Silicon]`,
      target: "bun-darwin-arm64",
    },
    label: "macOS (Apple Silicon, arm64)",
  },
  {
    compile: {
      outfile: `${OUTPUT_BASENAME}-x64-[Intel]`,
      target: "bun-darwin-x64",
    },
    label: "macOS (Intel, x64)",
  },
  {
    compile: { outfile: `${OUTPUT_BASENAME}.exe`, target: "bun-windows-x64" },
    label: "Windows (x64)",
  },
] as const;

async function buildOne(t: (typeof targets)[number]) {
  log(BLUE, `正在构建 ${t.label}...`);

  const result = await Bun.build({
    // 需要更方便本地调试可改成 "linked"
    // sourcemap: "linked",

    compile: t.compile,
    entrypoints: [INPUT_FILE],
    outdir: OUTDIR,

    // 你原脚本带了 --sourcemap；这里用 Bun.build 的 sourcemap 选项
    // 可选值包括 "inline" / "external" / "linked" / "none"
    sourcemap: "external",
  });

  if (!result.success) {
    // result.logs 里会有详细构建日志；直接打印更实用
    err(`构建失败：${t.label}`);
    for (const l of result.logs) {
      console.error(l);
    }
    throw new Error(`Build failed: ${t.label}`);
  }

  log(GREEN, `构建成功：${resolve(OUTDIR, t.compile.outfile)}`);
}

async function build() {
  await mkdir(OUTDIR, { recursive: true });

  log(BLUE, "开始构建 macOS 和 Windows 版本...");

  try {
    await Promise.all(targets.map(buildOne));
    log(GREEN, "构建完成!");
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

async function copyDbMigrations() {
  log(BLUE, "复制 db-migrations 目录...");
  const dbMigrationsDir = resolve(
    SCRIPT_DIR,
    "..",
    "packages",
    "db",
    "db-migrations"
  );
  const outDbMigrationsDir = resolve(OUTDIR, "db-migrations");
  await mkdir(outDbMigrationsDir, { recursive: true });
  await cp(dbMigrationsDir, outDbMigrationsDir, { recursive: true });
}

async function cleanDist() {
  log(GREEN, "清理 dist 目录...");
  await rm(OUTDIR, { force: true, recursive: true });
}

async function main() {
  // 1. 清理 dist 目录
  await cleanDist();
  // 2. 复制 db-migrations 目录
  await copyDbMigrations();
  // 3. 构建
  await build();
}

main();
