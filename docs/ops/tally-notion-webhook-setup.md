# Tally -> 自建 Webhook -> Notion 接入说明

## 1. 目标

不再依赖不稳定的 `Tally -> Notion` 原生 property mapping，改为走这条链路：

- `Tally form submission`
- `-> /api/v1/integrations/tally/early-access`
- `-> Notion database`

这样可以把 live 提交的稳定性掌握在我们自己手里，同时保留签名校验和正文备份。

## 2. 当前已确认的 Notion 目标库

- 数据库名称：`SummonAI Early Access Applicants`
- 数据库 URL：`https://www.notion.so/d02d19f443a04c0b98293a6f10dbe6d7`
- `NOTION_EARLY_ACCESS_DATABASE_ID`：
  - `d02d19f4-43a0-4c0b-9829-3a6f10dbe6d7`

当前真实库里关键字段如下：

- `Name` (`title`)
- `Email`
- `Track Text`
- `Locale Text`
- `Source`
- `Region`
- `Timezone`
- `Current Role`
- `AI Tools`
- `Agent Familiarity`
- `Pay Per Use`
- `Feedback Willingness`
- `Primary Use Case`
- `Urgency`
- `Desired Outcome`
- `Pilot Readiness`
- `Capability`
- `Input Output`
- `Availability`
- `Response Speed`
- `Proof Types`
- `Proof Link`
- `Best Fit Tasks`
- `Not Fit Tasks`
- `Expectation`
- `Extra Notes`
- `Status`

说明：

- 当前真实库没有公开使用中的 `Track` / `Locale` select 字段，实际在用的是 `Track Text` / `Locale Text`
- webhook 已兼容 `Track` / `Track Text` 与 `Locale` / `Locale Text` 两组字段名
- 当前真实库里的默认状态不是 `New`，而是 `新提交`

## 3. 环境变量

服务端至少需要以下变量：

- `TALLY_WEBHOOK_SECRET`
- `EARLY_ACCESS_WEBHOOK_ENABLED=true`
- `NOTION_API_TOKEN`
- `NOTION_EARLY_ACCESS_DATABASE_ID=d02d19f4-43a0-4c0b-9829-3a6f10dbe6d7`

说明：

- `TALLY_WEBHOOK_SECRET`
  - 用于校验 Tally webhook 签名，必须和 Tally 后台保持一致
- `NOTION_API_TOKEN`
  - 用于服务端写 Notion API
- `NOTION_EARLY_ACCESS_DATABASE_ID`
  - 指向上面的 early-access 数据库
- `EARLY_ACCESS_WEBHOOK_ENABLED`
  - 需要保持为 `true`

## 4. 当前 webhook 能力

已经实现：

- Tally webhook 签名校验
- buyer / builder 表单共用接入
- 中英文字段标签兼容解析
- 按真实 Notion schema 写入 page properties
- 在 Notion 页面正文追加 `Submission Backup`
- 默认把 `Status` 初始化为 `新提交`
- 对 select / multi-select 答案做规范化，避免因为中英文或文案差异把数据库 option 写脏

当前刻意不做：

- 幂等去重
- 重试队列
- 后台审计页
- 原始 payload 落库 Supabase

## 5. Tally 侧最终配置步骤

### 5.1 停止依赖原生 Notion mapping

对所有 early-access 表单：

- 断开或停用 Tally 原生 Notion integration
- 不再依赖左侧 field mapping

保留它只会让链路处于“双写但一边不稳定”的状态，后续排障反而更难。

### 5.2 配置 webhook

对 4 个 early-access 表单逐个执行：

1. 打开对应表单设置
2. 找到 `Webhooks`
3. 新增 webhook
4. URL 填：
   - 本地联调：`http://localhost:3000/api/v1/integrations/tally/early-access`
   - 正式生产：`https://summonai.xyz/api/v1/integrations/tally/early-access`
5. Secret 填同一个 `TALLY_WEBHOOK_SECRET`
6. 保存后，用该表单实际提交一条测试数据

## 6. 写入兼容性结论

这次对库结构核对后的结论是：

- 字段名层面可兼容
  - `Track Text` / `Locale Text` 已被当前代码兼容
- 核心风险不在字段缺失，而在选项值不一致
  - 比如 `Status` 真实值是 `新提交`，不能再写 `New`
  - 多个 Tally 表单答案文案比 Notion option 更长，必须先规范化
- 因此当前最稳方案是“保持 Notion 库不动，代码适配现有真实 schema”

## 7. 最小联调步骤

1. 在 `.env.local` 中配置：
   - `TALLY_WEBHOOK_SECRET`
   - `NOTION_API_TOKEN`
   - `NOTION_EARLY_ACCESS_DATABASE_ID=d02d19f4-43a0-4c0b-9829-3a6f10dbe6d7`
   - `EARLY_ACCESS_WEBHOOK_ENABLED=true`
2. 运行：
   - `pnpm dev`
3. 先挑 1 个表单接 webhook
4. 提交 1 条真实测试数据
5. 检查：
   - Notion 是否创建了新页面
   - `Name` / `Email` / `Track Text` / `Locale Text` / `Source` 是否有值
   - `Status` 是否为 `新提交`
   - 页面正文是否出现 `Submission Backup`

## 8. 可直接执行的脚本

仓库里现在已经补了两条脚本，方便把外部平台配置尽量自动化：

- 批量同步 4 个 Tally 表单 webhook：
  - `node ./scripts/sync-tally-early-access-webhooks.mjs`
- 批量同步 Vercel 生产环境变量：
  - `node ./scripts/sync-vercel-early-access-env.mjs`

使用前提：

- `.env.local` 里已经存在：
  - `TALLY_API_KEY`
  - `TALLY_WORKSPACE_ID`
  - `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_*`
  - `TALLY_WEBHOOK_SECRET`
  - `NOTION_API_TOKEN`
  - `NOTION_EARLY_ACCESS_DATABASE_ID`
- 如果要同步到 Vercel，还需要：
  - `VERCEL_TOKEN`

说明：

- `sync-tally-early-access-webhooks.mjs` 会为 4 个 early-access 表单删除旧的 SummonAI webhook，然后按当前目标 URL 重新创建
- `sync-vercel-early-access-env.mjs` 会基于 `.vercel/project.json` 把 4 个关键变量 upsert 到 Vercel `production`

## 9. 推荐切换顺序

建议不要四个表单一次性全切，按这个顺序推进：

1. 先切一个 buyer 表单
2. 跑通后再切另一个 buyer 表单
3. 再切 builder 表单
4. 四个都跑通后，统一确认原生 Notion mapping 已全部停用
