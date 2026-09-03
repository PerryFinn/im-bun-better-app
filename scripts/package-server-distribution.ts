#!/usr/bin/env bun

/**
 * 组装根目录 dist 下的跨平台服务端发布产物。
 *
 * 除独立可执行文件外，生产环境的自动迁移还依赖同级 db-migrations，
 * 因此这里统一清理并重建整个发布目录，避免遗漏或残留旧版本文件。
 */
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

// 路径锚定脚本位置，确保从仓库内任意工作目录调用都得到相同产物。
const INPUT_FILE = resolve(SCRIPT_DIR, "../apps/server/src/index.ts");
const OUTPUT_BASENAME = "im-debug";
const OUTDIR = resolve(SCRIPT_DIR, "..", "dist");

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
    compile: t.compile,
    entrypoints: [INPUT_FILE],
    outdir: OUTDIR,
    // 外置 sourcemap 保持可执行文件精简，同时保留排查生产问题所需的映射。
    sourcemap: "external",
  });

  if (!result.success) {
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
    // 各目标互不依赖，并行编译可缩短完整发布构建耗时。
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
  await cleanDist();
  await copyDbMigrations();
  await build();
}

main();
