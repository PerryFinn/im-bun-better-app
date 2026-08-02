# @im-debug-better-app/db 使用与迁移指南

> 目标：给当前仓库维护者一份可直接执行的 SQLite + Drizzle 流程说明，覆盖日常开发、发布升级、以及故障修复。

执行约定：本文所有命令都在“项目根目录”执行。

## 1. 运行模型（先理解）

这个项目的数据库运行模型是“应用启动时自动迁移”：

- `apps/server` 在启动阶段显式调用 `createDatabase()`。
- `createDatabase()` 会创建/连接本地 SQLite 文件，然后执行 `migrate(db, { migrationsFolder })`。
- 仅导入 `@im-debug-better-app/db` 不会创建文件或执行迁移。
- DB 文件路径优先取 `DB_FILE_NAME`，否则退回到可执行文件同级的 `local.db`。
- 迁移目录优先取可执行文件同级 `db-migrations`，开发态回退到 `packages/db/db-migrations`。

关键代码位置：

- `packages/db/src/index.ts`
- `packages/db/src/constants.ts`

命令：

```bash
bun run dev:server
```

预期结果：

- 应用连接 `DB_FILE_NAME` 指向的本地 SQLite 文件。
- 若 `db-migrations` 可用，启动阶段自动执行未应用迁移。
- 若迁移目录缺失，启动会报错（除非显式设置 `SKIP_DB_MIGRATIONS=1`）。

## 2. 环境变量与路径约定

至少确保 `apps/server/.env` 有 `DB_FILE_NAME`。

建议配置：

```dotenv
# apps/server/.env
DB_FILE_NAME=./local.db
```

命令：

```bash
rg -n "^DB_FILE_NAME" apps/server/.env
```

预期结果：

- 输出一行配置，指向 `apps/server/local.db`。
- 后续 `db:*` 与应用启动时访问的是同一份数据库文件。

## 3. 命令速查表

在仓库根目录执行：

- `bun run db:generate`：根据 `packages/db/src/schema` 生成 migration SQL 文件。
- `bun run db:migrate`：按 migration 历史执行数据库迁移。
- `bun run db:push`：直接把当前 schema 推送到数据库（不走版本化 SQL 流程）。
- `bun run db:studio`：打开 Drizzle Studio 查看表结构和数据。

命令：

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

预期结果：

- `db:generate`：在 `packages/db/db-migrations` 产生新 SQL 与 `meta` 信息。
- `db:migrate`：目标 DB 应用未执行迁移，`__drizzle_migrations` 记录新增。
- `db:push`：数据库结构被直接修改，但 migration 历史可能不同步。
- `db:studio`：可在 UI 中看到当前 DB 表和数据。

## 4. 路线 A：版本化迁移（generate + migrate）

这是推荐路线，适用于日常开发和发布。

步骤：

1. 修改 schema：`packages/db/src/schema/*.ts`
2. 生成 migration：`bun run db:generate`
3. 应用迁移：启动应用自动迁移，或手动 `bun run db:migrate`
4. 检查结果：`bun run db:studio`
5. 提交变更：schema 文件 + `packages/db/db-migrations/**` 一起提交

命令：

```bash
bun run db:generate
bun run dev:server
# 或者：bun run db:migrate
bun run db:studio
```

预期结果：

- `db-migrations` 中有可审阅的增量 SQL。
- 新旧环境都能通过同一组 migration 升级到相同结构。
- 应用启动时不会重复执行已完成迁移。

## 5. 路线 B：快速原型（db:push）

该路线可用，但有风险，仅建议原型/临时开发。

- 优点：快，不用先生成 migration 文件。
- 风险：数据库真实结构可能和 migration 历史不一致，后续自动迁移容易冲突。

命令：

```bash
bun run db:push
```

预期结果：

- 当前 DB 会直接变更到最新 schema。
- 但 `__drizzle_migrations` 可能无法准确反映结构演进历史。

警告（高风险）：

- 在长期维护分支、多人协作、或需要发布给用户升级时，不要把 `push` 作为主流程。
- 如果此前大量使用 `push`，切换到版本化迁移前要先做“基线对齐”。

## 6. 构建与用户升级流程

默认策略：用户不需要手动执行 `db:*`，升级后首次启动由应用自动迁移。

要求：

- 发布产物必须包含 `db-migrations` 目录。
- 用户数据库路径保持稳定（`DB_FILE_NAME` 不随版本漂移）。

命令：

```bash
bun run build:bun
ls -la dist
```

预期结果：

- `dist` 目录下可看到应用产物与 `db-migrations` 目录。
- 用户安装新版本并首次启动后，未执行迁移会自动补齐。

## 7. 故障排查（完整修复）

### 场景 A：`table already exists`

常见原因：表已存在，但 `__drizzle_migrations` 为空或历史不匹配。

命令（先检查）：

```bash
bun -e "import { Database } from 'bun:sqlite'; const db = new Database('apps/server/local.db'); console.log(db.query('SELECT name FROM sqlite_master WHERE type=\"table\" ORDER BY name').all()); console.log(db.query('SELECT * FROM __drizzle_migrations').all());"
```

预期结果：

- 若看到业务表存在但迁移表为空，说明迁移基线不一致。

修复步骤（推荐）：

1. 先备份旧库。
2. 重建一份干净数据库。
3. 用当前 migration 从 0 初始化。
4. 必要时再做数据回灌。

命令：

```bash
cp apps/server/local.db apps/server/local.db.bak.$(date +%Y%m%d%H%M%S)
rm -f apps/server/local.db
bun run dev:server
```

预期结果：

- 新库由 migration 自动建表，启动不再报 `table already exists`。

警告（高风险）：

- 删除旧库前必须先备份；生产环境禁止直接删除数据库文件。

### 场景 B：`__drizzle_migrations` 为空

命令：

```bash
bun -e "import { Database } from 'bun:sqlite'; const db = new Database('apps/server/local.db'); console.log(db.query('SELECT * FROM __drizzle_migrations').all());"
```

预期结果：

- 若为空且业务表已存在，说明历史多半通过 `db:push` 建成。

修复建议：

- 开发环境：优先备份后重建 DB，再通过 migration 初始化。
- 需要保留数据：先导出数据，再重建，再按表回灌。

### 场景 C：`db-migrations` 缺失

命令：

```bash
find packages/db/db-migrations -maxdepth 3 -type f
```

预期结果：

- 至少包含 SQL 文件和 `meta/_journal.json`。
- 若目录为空或缺 meta，应用启动无法正常迁移。

修复建议：

- 重新执行 `bun run db:generate` 生成 migration。
- 将 `packages/db/db-migrations/**` 纳入版本控制并随发布产物分发。

### 场景 D：启动报“找不到迁移目录”

命令：

```bash
bun run dev:server
```

预期结果：

- 错误信息会列出候选迁移路径；可据此确认部署包是否缺少 `db-migrations`。

修复建议：

- 开发态：确认 `packages/db/db-migrations/meta/_journal.json` 存在。
- 发布态：确认可执行文件同级有 `db-migrations`。

## 8. 当前仓库的“重置后首次初始化”步骤

前提：你已清空 `packages/db/db-migrations`。

步骤：

1. 处理旧本地库：先备份，再决定是否重建。
2. 重新生成初始 migration。
3. 启动应用触发自动迁移。
4. 验证表结构和迁移记录。

命令：

```bash
# 1) 备份旧库（如存在）
cp apps/server/local.db apps/server/local.db.bak.$(date +%Y%m%d%H%M%S) 2>/dev/null || true

# 2) 重新生成初始 migration
bun run db:generate

# 3) 如需全新初始化，可删除旧库后启动
rm -f apps/server/local.db
bun run dev:server

# 4) 检查迁移记录
bun -e "import { Database } from 'bun:sqlite'; const db = new Database('apps/server/local.db'); console.log(db.query('SELECT * FROM __drizzle_migrations ORDER BY created_at').all());"
```

预期结果：

- `packages/db/db-migrations` 重新出现初始 SQL 与 meta 文件。
- 启动后数据库可用，`__drizzle_migrations` 有记录。

警告（高风险）：

- `rm -f .../local.db` 会清空本地数据，只适合确认可丢失数据的开发环境。

## 9. 每次改表前后的检查清单

改表前：

- [ ] 确认当前分支与任务一致。
- [ ] 确认 `apps/server/.env` 的 `DB_FILE_NAME` 指向预期 DB。
- [ ] 评估这次是否允许走 `push`（默认不允许，优先走版本化迁移）。

改表后：

- [ ] 已修改 schema 并执行 `bun run db:generate`。
- [ ] 已通过启动自动迁移或 `bun run db:migrate` 验证。
- [ ] 已用 `bun run db:studio` 检查关键表结构。
- [ ] 已提交 schema + `packages/db/db-migrations/**`。

命令：

```bash
bun run db:generate
bun run db:migrate
bun run db:studio
```

预期结果：

- migration 历史与数据库结构一致。
- 发布后用户可通过应用启动自动完成升级。
