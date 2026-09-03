# im-debug-better-app

基于 Bun + Turborepo 的全栈 TypeScript Monorepo，前端使用 React 19 + Vite + TanStack Router，后端使用 Elysia + Eden，数据库使用 Drizzle + SQLite。

## 技术栈

- Bun（运行时与包管理）
- Turborepo（Monorepo 任务编排）
- React 19 + Vite + TanStack Router（前端）
- Elysia + Eden（后端 API）
- Drizzle ORM + SQLite（数据层）
- Biome + Ultracite（格式化与静态检查）

## 快速开始

1. 安装依赖：

    ```bash
    bun install
    ```

2. 配置环境变量：

    - 前端：创建或更新 `apps/web/.env`

    ```dotenv
    VITE_SERVER_URL=http://localhost:12306
    ```

    - 后端：基于 `apps/server/.env.example` 创建 `apps/server/.env`，至少建议配置：

    ```dotenv
    DB_FILE_NAME=./local.db
    ```

3. 启动开发环境：

```bash
bun run dev
```

## 访问地址与端口

- 前端开发地址：<http://localhost:3001>
- 后端默认地址：<http://localhost:12306>

说明：后端默认优先使用 `12306` 端口；如果该端口被占用，会自动选择可用端口（由 `get-port` 实现）。

## 可用命令

- `bun run dev`：启动所有应用开发模式
- `bun run dev:web`：仅启动前端
- `bun run dev:server`：仅启动后端
- `bun run build`：构建所有工作区
- `bun run build:bun`：执行 Bun 打包构建脚本
- `bun run clean:node_modules`：清理各工作区及根目录的 `node_modules`
- `bun run clean:build`：清理各工作区及根目录的构建产物与 TypeScript 增量构建信息
- `bun run clean:turbo`：清理各工作区及根目录的 Turborepo 缓存
- `bun run check`：执行 Ultracite 检查
- `bun run check:types`：执行全仓库 TypeScript 类型检查
- `bun run verify`：执行 `bun run check` 和 `bun run check:types`
- `bun run db:push`：将 schema 直接推送到数据库
- `bun run db:generate`：生成 Drizzle 迁移文件
- `bun run db:migrate`：执行 Drizzle 迁移
- `bun run db:studio`：打开 Drizzle Studio

## 项目结构

```text
im-debug-better-app/
├── apps/
│   ├── web/         # React 19 + Vite 前端
│   └── server/      # Elysia + Eden 后端
├── packages/
│   ├── api/         # 前后端共享 API/router/context
│   ├── db/          # Drizzle schema 与迁移
│   └── config/      # 共享 TypeScript 配置
└── scripts/         # 根目录构建辅助脚本
```

## 数据库与进阶文档

- 数据库常用流程可通过根命令执行：`db:push`、`db:generate`、`db:migrate`、`db:studio`
- 数据库迁移、发布升级与排障细节见：`packages/db/README.md`
