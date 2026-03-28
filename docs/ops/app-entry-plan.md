# SummonAI `/{locale}/app` 统一认证后入口页方案

## 1. 文档目的

本文档用于定义 `/{locale}/app` 的职责、信息架构、页面内容和与现有产品路由的关系。

它回答的问题是：

1. 为什么需要 `/{locale}/app`
2. `/{locale}/app` 不是谁的页面
3. `/{locale}/app` 到底展示什么
4. `/{locale}/app` 如何把用户继续分流到现有产品页面
5. 后续实现时如何不打断当前已有路由结构

## 2. 为什么需要 `/{locale}/app`

我们已经确认以下前提：

1. `/{locale}` 在所有阶段都继续是 landing
2. 阶段 B 不开放公开产品浏览页
3. 登录顺序是“先登录，再激活”
4. 激活后需要进入完整产品

在这个前提下，完整产品不能直接由首页承接。

所以必须存在一个统一的认证后入口页，来承担以下职责：

- 登录后首页
- 激活后首页
- buyer / seller 共用的产品入口
- admin 的权限分流起点

这个入口页就是：

- `/{locale}/app`

## 3. `/{locale}/app` 的定位

### 3.1 它是什么

`/{locale}/app` 是：

- 统一认证后入口页
- 产品大厅
- 登录后的第一站

### 3.2 它不是什么

`/{locale}/app` 不是：

- buyer 专属首页
- seller 专属 dashboard
- admin 控制台
- 公开浏览页
- marketing 页

### 3.3 它的设计目标

`/{locale}/app` 的目标是：

1. 让登录后的用户不需要先理解整个站点结构
2. 让同一个既是 buyer 又是 seller 的用户有一个统一起点
3. 让邀请制用户在激活成功后有一个自然承接页
4. 让未来阶段 C 能无缝承接“登录后直达产品”

## 4. `/{locale}/app` 与现有路由的关系

当前讨论稿中，`/{locale}/app` **不是**要立刻替换现有产品路由体系。

也就是说，现阶段它不要求我们马上把：

- `/dashboard/*`
- `/tasks/*`
- `/my/*`
- `/admin/*`

全部搬到 `/app/*`。

当前更合理的关系是：

- `/{locale}/app` 负责承接与分流
- 现有产品页继续按现有路径工作

例如：

- seller 工作台仍然在 `/dashboard`
- buyer 任务仍然在 `/tasks/*` 或 `/my/*`
- admin 仍然在 `/admin/*`

## 5. 认证后用户的分流逻辑

## 5.1 用户类型

在 `/{locale}/app` 中，我们不先假设“你只能是 buyer 或 seller”。

我们只区分：

1. 普通已激活用户
2. 同时使用 buyer / seller 能力的用户
3. admin

### 5.2 分流目标

进入 `/{locale}/app` 后，系统应引导用户前往：

- 发起任务
- 查看任务
- 管理 agent
- 查看收益 / 钱包
- 通知
- 设置
- admin（仅你）

## 6. 页面信息架构

我建议 `/{locale}/app` 采用“产品大厅”式信息架构，而不是像传统 dashboard 那样堆一页统计数字。

## 6.1 页面结构

推荐结构：

1. 顶部欢迎区
2. 核心动作区
3. 当前状态区
4. 工作区入口区
5. 个人与系统入口区

## 6.2 顶部欢迎区

作用：

- 告诉用户已经进入完整产品
- 给出当前账号状态
- 承担最上层品牌感与秩序感

建议内容：

- 标题
  - 例如：
    - Welcome back
    - 继续你的工作

- 副说明
  - 告诉用户现在可以：
    - 发任务
    - 管理 agent
    - 进入完整产品

## 6.3 核心动作区

这是整个 `/{locale}/app` 最关键的部分。

必须优先展示“现在最该做什么”，而不是一堆抽象导航。

建议固定保留 3 个核心动作：

1. 发起任务
2. 查看我的任务
3. 管理我的 Agent

原因：

- 这三项最能覆盖 buyer / seller 双模式
- 不要求用户先理解自己属于什么角色

## 6.4 当前状态区

这一块用于承接“产品正在发生什么”。

建议内容可以包括：

- 活跃任务数量
- 待处理事项
- 在线 Agent 数量
- 最近通知

这部分不应该变成 admin 式读数墙，而应偏“个人工作状态”。

## 6.5 工作区入口区

这一块相当于产品分区导航。

建议入口包括：

- Tasks
- Dashboard
- Wallet / Earnings
- Notifications
- Settings

仅当用户具备 admin 身份时，再额外显示：

- Admin Console

## 7. 页面内容建议

## 7.1 推荐的首批模块

第一版 `/{locale}/app` 建议只做 5 个模块：

1. Welcome hero
2. Quick actions
3. Personal activity summary
4. Workspaces
5. Admin shortcut（条件显示）

### 7.2 不建议第一版就做的内容

以下内容不建议在第一版 `app` 入口页里堆进去：

- 大量复杂图表
- 全部通知列表
- 细粒度财务明细
- 所有历史任务列表
- 复杂筛选器

这些应该留在各自工作区页面。

`app` 要做的是“入口页”，不是“所有业务功能汇总页”。

## 8. 与阶段模型的关系

## 8.1 阶段 A

`/{locale}/app` 可以存在，但仅供内部用户使用。

路径逻辑：

- 未登录用户不会从官网进入它
- 内部测试用户登录后可进入

## 8.2 阶段 B

`/{locale}/app` 成为邀请码阶段的正式认证后入口。

路径逻辑：

- 已登录未激活 -> `/activate`
- 激活成功 -> `/app`
- 已激活用户登录 -> `/app`

## 8.3 阶段 C

`/{locale}/app` 成为正式开放阶段的登录后首页。

路径逻辑：

- 注册/登录成功 -> `/app`
- `/activate` 退役

## 9. 权限与重定向规则

## 9.1 未登录访问 `/app`

建议：

- 重定向到登录入口

## 9.2 已登录未激活访问 `/app`

建议：

- 阶段 A：内部测试环境可导向 activate
- 阶段 B：重定向到 activate
- 阶段 C：不再挡住

## 9.3 admin 访问 `/app`

建议：

- 正常进入 `/app`
- 页面中显示 admin shortcut
- 不强制直接跳 `/admin`

原因：

- admin 也是完整产品用户
- `/app` 应该是全体认证用户的一致入口

## 10. 与 seller canonical 方案的关系

当前 seller 方案已经确定：

- seller 主工作台 canonical 路由仍为 `/dashboard/*`

所以 `/{locale}/app` 与 seller canonical 的关系是：

- `/app` 是 seller 的入口页
- `/dashboard/*` 是 seller 的工作台页

进入方式：

- landing -> login -> activate -> app -> dashboard

而不是：

- landing -> dashboard

## 11. 与 buyer 路径的关系

未来 buyer 路径也应通过 `/{locale}/app` 分流。

进入方式建议：

- landing -> login -> activate（如需要）-> app -> tasks / other buyer workspace

这样 buyer 与 seller 可以在同一个产品入口下共存。

## 12. UI 方向

`/{locale}/app` 的 UI 不能像：

- landing
- 纯 seller dashboard
- admin console

它更像：

- 产品大厅
- 认证后总入口
- 低摩擦分流页

所以 UI 上应满足：

- 品牌一致
- 结构清晰
- 动作优先
- 不堆复杂数据

## 13. 第一版实现范围建议

如果后续进入实现阶段，我建议第一版 `/{locale}/app` 只做以下内容：

1. 页面路由与 auth/activation 保护
2. welcome hero
3. quick actions
4. workspace entry cards
5. 条件显示 admin 入口

不建议第一版就做：

- 大量动态聚合查询
- 超复杂 personalized dashboard
- 统计图表墙

## 14. 当前建议的下一步

在这份方案之后，下一步最合理的是：

1. 写 `/{locale}/app` 的页面结构与模块草图
2. 再写 middleware / auth / activate 的重构实施方案
3. 然后才进入代码实现
