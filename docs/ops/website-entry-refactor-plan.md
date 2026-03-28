# SummonAI 官网入口逻辑重构实施方案

## 1. 文档目的

本文档用于把官网阶段切换与入口逻辑讨论稿落成可实施的工程方案。

它不是最终代码，而是明确：

1. 未来要改哪些层
2. 每一层负责什么
3. 应该按什么顺序改
4. 哪些改动先做，哪些改动后做

## 2. 当前状态

当前已确认的产品方向：

1. `/{locale}` 在所有阶段都继续是 landing
2. 完整产品统一通过 `/{locale}/app` 进入
3. 阶段 B 不开放公开产品浏览页
4. 登录顺序是“先登录，再激活”
5. 激活页与产品入口页不是同一个东西
6. 阶段 C 的 `early-access` 与 `success` 重定向回 landing

当前代码状态：

- 中间件：[src/middleware.ts](D:/Summon-Ai/src/middleware.ts)
  - 现在仍以“除 landing / early-access 外全部挡回首页”为核心逻辑
- 激活页：[page.tsx](D:/Summon-Ai/src/app/[locale]/(product)/activate/page.tsx)
- 激活表单：[activate-form.tsx](D:/Summon-Ai/src/components/activation/activate-form.tsx)
- 激活 API：[route.ts](D:/Summon-Ai/src/app/api/v1/activate/route.ts)
- 页面保护：[page-auth.ts](D:/Summon-Ai/src/lib/server/page-auth.ts)
- 激活保护：[activation-guard.tsx](D:/Summon-Ai/src/components/activation/activation-guard.tsx)
- 当前没有正式的登录入口页
- 当前没有 `/{locale}/app` 页面

## 3. 目标架构

未来官网逻辑拆成 4 层：

1. Public front layer
   - `/{locale}`
   - `/{locale}/early-access`
   - `/{locale}/early-access/success`

2. Auth layer
   - `/{locale}/login`
   - `auth/callback`

3. Unlock layer
   - `/{locale}/activate`

4. Product entry layer
   - `/{locale}/app`

说明：

- 完整产品实际工作区仍可先保留现有路径
- `/app` 先做统一入口页，不立刻强制迁移所有产品路由

## 4. 各层职责

## 4.1 中间件层

职责：

- 只负责站点阶段级别的公开/封闭入口判断
- 不负责完整业务权限判断

它未来应该回答：

- 当前 `site_stage` 是什么
- 当前请求是 public layer、unlock layer、还是 product layer
- 当前是否需要全站封闭
- 当前是否需要把 `early-access` 在阶段 C 重定向回首页

它不应该负责：

- admin 权限判断
- seller / buyer 身份判断
- 具体业务动作权限判断

## 4.2 登录层

职责：

- 提供正式登录入口
- 登录成功后，根据阶段与激活状态继续分流

它未来应该回答：

- 登录后去 `activate` 还是 `app`
- 阶段 A 内部测试用户如何进入系统

## 4.3 激活层

职责：

- 邀请码解锁
- 只服务于“已登录但未激活”的用户

它未来应该回答：

- 未登录访问时怎么处理
- 已激活访问时怎么处理
- 阶段 C 退役时怎么处理

## 4.4 认证后产品入口层

职责：

- 承接已登录、可进入完整产品的用户
- 作为 buyer / seller 共用的产品大厅
- 作为 admin 的权限分流起点

它未来应该回答：

- 用户现在最适合去哪个工作区
- 给用户哪些主入口
- 是否显示 admin shortcut

## 4.5 页面权限层

职责：

- 真正做业务权限判断

例如：

- `requirePageUser`
- `requirePageAdmin`
- `ActivationGuard`

它未来应该继续存在，但要与中间件层职责拆清楚。

## 5. 具体改造项

## 5.1 引入站点阶段配置

目标：

- 用统一配置表示站点当前处于：
  - `prelaunch`
  - `invite_only`
  - `open`

建议：

- 使用 `platform_config`
- 配置键：`site_stage`

相关文件：

- [service.ts](D:/Summon-Ai/src/lib/platform-config/service.ts)

第一版可以先只做读取，不急着做完整后台编辑 UI。

## 5.2 重构中间件

目标：

- 把当前“一刀切挡回 landing”的逻辑改造成“按阶段与路径类型判断”

未来中间件建议处理：

1. `prelaunch`
   - 生产继续只公开 landing / early-access
   - 内部环境允许开发访问产品层

2. `invite_only`
   - landing 公开
   - activate 可用
   - 产品层放行，但仍由登录/激活层决定能否进入

3. `open`
   - landing 公开
   - `early-access` 重定向回 landing
   - activate 退役

相关文件：

- [middleware.ts](D:/Summon-Ai/src/middleware.ts)

## 5.3 新增正式登录入口

目标：

- 不再依赖隐式 OAuth 触发点
- 提供明确登录入口，例如：
  - `/{locale}/login`

当前状态：

- 只有 `auth/callback`
- 部分 OAuth 行为散落在页面组件中

建议：

- 增加一个正式登录页
- 在 landing 的不同阶段 CTA 中引导到该页

相关文件：

- [page.tsx](D:/Summon-Ai/src/app/auth/callback/page.tsx)
- [oauth-callback.tsx](D:/Summon-Ai/src/components/auth/oauth-callback.tsx)
- [marketplace-home.tsx](D:/Summon-Ai/src/components/home/marketplace-home.tsx)

## 5.4 重构激活流

目标：

- 让 activate 成为明确的 invite-only 解锁页
- 不再承担别的职责

需要调整的点：

1. 未登录访问 activate
   - 重定向到登录页

2. 已登录已激活访问 activate
   - 直接去 `/app`

3. 激活成功后的默认落点
   - 当前 `activate-form` 默认回 `/{locale}`
   - 未来应默认去 `/{locale}/app`

4. 阶段 C
   - activate 不再展示表单
   - 直接重定向到 `/{locale}/app`

相关文件：

- [page.tsx](D:/Summon-Ai/src/app/[locale]/(product)/activate/page.tsx)
- [activate-form.tsx](D:/Summon-Ai/src/components/activation/activate-form.tsx)
- [route.ts](D:/Summon-Ai/src/app/api/v1/activate/route.ts)
- [activation-guard.tsx](D:/Summon-Ai/src/components/activation/activation-guard.tsx)

## 5.5 新增 `/{locale}/app`

目标：

- 增加统一认证后入口页

第一版功能范围：

1. welcome hero
2. quick actions
3. workspace entry cards
4. personal activity summary
5. admin shortcut（条件显示）

第一版不做：

- 大量复杂数据聚合
- 图表
- 全部通知流
- 财务全量明细

原因：

- 它是入口页，不是超级 dashboard

## 5.6 调整页面访问重定向规则

目标：

- 未登录访问产品页 -> login
- 已登录未激活访问产品页 -> activate
- 已登录已激活访问产品页 -> 放行
- 非 admin 访问 admin -> app

需要收口的地方：

- `requirePageUser`
- `requirePageAdmin`
- `ActivationGuard`

相关文件：

- [page-auth.ts](D:/Summon-Ai/src/lib/server/page-auth.ts)
- [activation-guard.tsx](D:/Summon-Ai/src/components/activation/activation-guard.tsx)

## 5.7 调整 Header 语言切换与导航

目标：

- 语言切换不能再固定跳 `/`
- 需要尽量保留当前产品路径

当前问题：

- 从产品页切中文/英文时，容易回到 landing

这会与未来 `app / activate / dashboard / tasks` 的完整逻辑冲突。

相关文件：

- [site-header.tsx](D:/Summon-Ai/src/components/layout/site-header.tsx)

## 5.8 处理阶段 C 的 `early-access` 退役

目标：

- 阶段 C 中，不再让 `early-access` 留在正式流程里

建议实现：

- `/{locale}/early-access` -> `/{locale}`
- `/{locale}/early-access/success` -> `/{locale}`

实现层：

- 最优先放在中间件层或阶段判断层处理

## 6. 分阶段实施顺序

为了降低风险，我建议按 5 步实施，不要一次性重做所有入口。

## 第一步：站点阶段配置与中间件重构

目标：

- `site_stage`
- middleware 按阶段判断

这一步只收口站点入口，不碰大量页面 UI。

## 第二步：正式登录入口与激活流收口

目标：

- 明确 login
- 激活默认跳 app
- activate 职责收口

## 第三步：新增 `/{locale}/app`

目标：

- 建立统一认证后入口页
- 成为 invite-only 与 open 阶段的认证后承接页

## 第四步：权限重定向收口

目标：

- page-auth
- activation-guard
- admin 入口重定向

## 第五步：Header / landing CTA / 语言切换收口

目标：

- 让官网、登录、激活、app、产品页形成完整闭环

## 7. 当前最值得先实现的最小切片

如果下一步要从文档进入代码，我建议最小切片是：

1. 增加 `site_stage` 读取
2. 增加 `/{locale}/app` 路由页
3. 激活成功默认跳 `/app`
4. 阶段 A / 本地环境下不破坏现有生产策略

这一切片的价值最高，因为它最先把“逻辑层”从讨论稿变成真实结构。

## 8. 当前建议的下一步

下一步最合理的是：

- 开始写 `/{locale}/app` 的页面结构草图与模块清单

然后我们再决定是否直接进入第一版代码实现。
