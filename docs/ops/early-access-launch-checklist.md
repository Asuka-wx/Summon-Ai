# SummonAI Early-Access 上线检查清单

本清单对应当前仓库的“early-access-only”公网发布模式。

## 1. 对外暴露范围

当前代码已经按中间件白名单收口，公网只应允许访问以下页面：

- `/`
- `/en`
- `/zh`
- `/en/early-access`
- `/zh/early-access`
- `/en/early-access/success`
- `/zh/early-access/success`

以下内容在本轮上线中应视为“禁止对外暴露”：

- 所有主体产品页面，例如 `/en/agents`、`/en/showcase`、`/en/dashboard`
- 所有 `/api/*`
- `/auth/callback`

## 2. 正式域名

本轮默认正式域名基准为：

- Web: `https://summonai.xyz`

如继续保留二级域名配置，也只作为未来主体产品/实时服务预留：

- WS: `wss://ws.summonai.xyz`
- SSE: `https://sse.summonai.xyz`

如果本轮只上线落地页，这两个实时域名不是关键路径，不应阻塞上线。

## 3. Vercel 生产环境变量

至少需要核对以下与落地页申请链路直接相关的变量：

- `NEXT_PUBLIC_APP_URL=https://summonai.xyz`
- `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_URL_ZH_BUYER`
- `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_ZH_BUYER`
- `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_URL_ZH_BUILDER`
- `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_ZH_BUILDER`
- `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_URL_EN_BUYER`
- `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_EN_BUYER`
- `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_URL_EN_BUILDER`
- `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_EN_BUILDER`

注意：

- 按当前仓库结构，主体产品代码仍然存在于构建产物中，只是被中间件挡在公网之外。
- 因此，生产环境仍建议保留当前 web 项目的完整环境变量集，避免构建阶段因为产品代码依赖缺失而出现不可预期问题。
- 如果后续要把“落地页部署”与“主体产品部署”彻底拆开，再单独做代码层拆分会更稳。

## 4. Tally 同步脚本所需变量

如果需要用脚本批量校正 4 个 Tally 表单的回跳地址，需在本地准备：

- `TALLY_API_KEY`
- `TALLY_WORKSPACE_ID`
- `TALLY_EARLY_ACCESS_REDIRECT_URL=https://summonai.xyz`

脚本位置：

- [scripts/sync-tally-early-access.mjs](/D:/Summon-Ai/scripts/sync-tally-early-access.mjs)

脚本会优先使用 `TALLY_EARLY_ACCESS_REDIRECT_URL`，否则退回 `NEXT_PUBLIC_APP_URL`。

## 5. Tally 回跳目标

4 个真实表单提交后都应回到自有 success page，目标格式应为：

- `https://summonai.xyz/zh/early-access/success?role=buyer&source=tally-zh-buyer`
- `https://summonai.xyz/zh/early-access/success?role=builder&source=tally-zh-builder`
- `https://summonai.xyz/en/early-access/success?role=buyer&source=tally-en-buyer`
- `https://summonai.xyz/en/early-access/success?role=builder&source=tally-en-builder`

## 6. 部署后 Smoke Check

上线后至少验证以下项目：

允许访问：

- `https://summonai.xyz` 会进入英文首页
- `https://summonai.xyz/en`
- `https://summonai.xyz/zh`
- `https://summonai.xyz/en/early-access`
- `https://summonai.xyz/zh/early-access`
- 4 个角色切换都能正确加载对应 Tally 表单
- 表单提交后能回到对应语言/角色的 success page

必须被拦截：

- `https://summonai.xyz/en/agents`
- `https://summonai.xyz/en/showcase`
- `https://summonai.xyz/en/dashboard`
- `https://summonai.xyz/auth/callback`
- `https://summonai.xyz/api/v1/agents`
- `https://summonai.xyz/api/v1/health`

期望结果：

- 页面型入口被重定向回对应 locale 首页
- API 返回 404，且响应体包含 `EARLY_ACCESS_ONLY`

## 7. 本轮上线完成标准

满足以下条件后，可视为达到“可正式部署上线”状态：

- 公网只剩 landing / early-access / success 链路可访问
- 正式域名已在 Vercel 指向生产项目
- 4 个 Tally 表单回跳全部指向正式域名
- 生产环境变量已核对完成
- `pnpm lint` 通过
- `pnpm build` 通过
- smoke check 通过
