# Repository Guidelines（仓库指南）

## 项目结构与模块组织

本仓库是基于 Bun + Turborepo 的 monorepo。

- `apps/web`：React 19 + Vite 前端（TanStack Router），源码位于 `apps/web/src`。
- `apps/server`：Elysia + tRPC 后端，入口为 `apps/server/src/index.ts`，测试位于 `apps/server/tests`。
- `packages/api`：供前后端共享的 API/router/context 类型与逻辑。
- `packages/db`：Drizzle 数据库 schema 与迁移文件（`packages/db/src`、`packages/db/db-migrations`）。
- `packages/config`：共享 TypeScript 配置。
- `scripts`：根目录构建辅助脚本（如 `scripts/build.ts`）。

## 构建、测试与开发命令

- `bun install`：安装所有工作区依赖。
- `bun run dev`：通过 Turbo 同时启动所有应用的开发模式。
- `bun run dev:web` / `bun run dev:server`：仅启动前端或后端。
- `bun run build`：构建所有工作区。
- `bun run verify`：执行一键校验（等价于 `bun run check && bun run check:types`）。
- `bun run check:types`：执行全仓库 TypeScript 类型检查。
- `bun run check`：执行 Ultracite/Biome 格式化与 lint 修复。
- `bun run db:push|db:generate|db:migrate|db:studio`：执行 `@im-debug-better-app/db` 的 Drizzle 数据库流程。
- `cd apps/server && bun test`：运行 Bun 测试（当前测试位于 `apps/server/tests`）。

## 任务完成的定义

在完成代码变更（新增/修改/重构等）后，无需运行 `bun dev`，**只需要**运行 `bun run verify` 确保代码质量与规范，如果有错误信息，尝试进行修复，修复后重新运行 `bun run verify`。

## 代码风格与命名规范

- 语言：TypeScript（ESM），共享 tsconfig 启用严格模式。
- 格式化/Lint：Biome + Ultracite（见 `biome.jsonc` 与 `ultracite` 预设）。
- 缩进：2 空格；与现有代码保持一致，优先双引号与分号。
- 命名：React 组件使用 PascalCase（如 `Header.tsx`）；工具与路由文件使用小写（如 `index.tsx`、`todos.tsx`、`utils.ts`）。
- 跨应用共享逻辑优先放在 `packages/*`，避免在 `apps/*` 重复实现。

## 测试指南

- 测试框架：Bun 测试运行器（`bun:test`）。
- 测试文件命名使用 `*.test.ts`，并尽量放在所属应用或包附近。
- 后端改动优先补齐 API/router/数据库行为测试；前端新增复杂交互时补充相应测试。
- 当前未设置强制覆盖率门禁；新增功能需提供有意义的测试。

## 提交与 Pull Request 规范

- 提交信息遵循 Conventional Commits：`feat: ...`、`fix: ...`、`chore: ...`、`refactor: ...`（仓库历史中中英文均可）。
- 提交应小而聚焦，避免将重构与功能改动混在同一个提交。
- 提交 PR 前请至少运行：`bun run verify`（内部包含 `bun run check` 与 `bun run check:types`）。
- PR 描述需包含：变更目的、影响路径、测试步骤/结果、关联 Issue（如有）、UI 变更截图（如适用）。

## 安全与配置建议

- 基于 `apps/server` 与 `apps/web` 下的 `.env.example` 创建本地环境变量，严禁提交真实密钥。
- 在共享环境执行迁移前，先审阅生成的 SQL 迁移内容。

## Agent skills

### Issue tracker

Issues are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five canonical labels without overrides. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a multi-context layout. See `docs/agents/domain.md`.
