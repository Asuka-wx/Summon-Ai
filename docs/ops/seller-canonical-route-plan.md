# SummonAI Seller Canonical 路由与页面结构方案

## 1. 文档目的

本文档用于确定 SummonAI 在正式产品开发阶段中，seller 侧的 canonical 路由、页面归属、访问规则与后续收口顺序。

它解决三个问题：

1. seller 到底以哪一套路由为主
2. 当前哪些页面重复、哪些页面应保留
3. 阶段 2 应该按什么顺序收口 seller 闭环

## 2. 当前现状

当前 seller 侧存在两套并行入口：

1. `/[locale]/dashboard/*`
2. `/[locale]/seller/*`

当前实际对应关系：

- `/[locale]/dashboard`
  - seller dashboard 主页
- `/[locale]/dashboard/agents/new`
  - new agent wizard
- `/[locale]/dashboard/agents/[id]`
  - agent editor
- `/[locale]/dashboard/connect-lab`
  - connectivity / runtime test
- `/[locale]/dashboard/earnings`
  - earnings
- `/[locale]/dashboard/withdraw`
  - withdraw

同时还存在：

- `/[locale]/seller/dashboard`
  - 与 dashboard 主页重复
- `/[locale]/seller/connect-lab`
  - 与 dashboard connect-lab 重复
- `/[locale]/seller/agents/[id]`
  - seller 自己 agent 的详情查看页
- `/[locale]/seller/test-room/[id]`
  - seller test room

## 3. 当前问题

### 3.1 路由语义重复

当前 seller 主入口存在两套语义重复路径：

- `dashboard`
- `seller`

这会导致：

- 导航难以统一
- 文档难以统一
- 权限保护难以统一
- 用户路径难以收口

### 3.2 页面保护不一致

当前 `dashboard/*` 页面普遍更接近正式主工作台语义，并已有登录保护倾向；而 `seller/*` 里部分页面在页面层没有完全一致的保护策略。

这不适合继续长期共存。

### 3.3 信息架构不清晰

当前 seller 的页面其实已经覆盖了完整闭环，但入口分散后会让结构显得混乱：

- 是先去 dashboard？
- 还是先去 seller？
- connect-lab 属于 seller 还是 dashboard？

这在正式产品阶段必须被消除。

## 4. Canonical 决策

### 4.1 结论

Seller 的 canonical 主工作台统一采用：

- `/[locale]/dashboard/*`

### 4.2 采用 dashboard 的原因

1. 当前 seller 最关键的主流程已经主要落在 `dashboard/*`
   - dashboard 首页
   - agents/new
   - agents/[id]
   - connect-lab
   - earnings
   - withdraw

2. `dashboard` 语义更符合“卖方工作台”
   - 它是主控制面、主运营面、主配置面

3. 后续 buyer / seller / admin 三侧信息架构更清晰
   - buyer 以浏览和任务为主
   - seller 以 dashboard 为主
   - admin 以 admin 为主

### 4.3 seller 路由的定位

`/[locale]/seller/*` 不再作为 seller 主入口长期扩展。

后续处理原则：

- 已有且必要的 seller 页面，可在阶段 2 判断是否并入 `dashboard/*`
- 重复页面不再继续新增
- `seller/*` 在过渡期内可作为兼容入口，但不作为新的 canonical 体系

## 5. Seller 页面结构

阶段 2 开始后，seller canonical 结构定义如下：

### 5.1 Dashboard 首页

- 路由：
  - `/[locale]/dashboard`

职责：

- seller 总览入口
- 展示 agent 数量、在线状态、隐藏状态、关键提醒
- 提供进入：
  - new agent
  - agent detail
  - connect-lab
  - earnings
  - withdraw

### 5.2 New Agent Wizard

- 路由：
  - `/[locale]/dashboard/agents/new`

职责：

- seller onboarding 主入口
- 串起：
  - 创建 agent
  - 添加 demo
  - 获取 one-time API key
  - 配置 env
  - 跑 connectivity test
  - go live

这是 seller 阶段的第一闭环核心页。

### 5.3 Agent Editor / Detail

- 路由：
  - `/[locale]/dashboard/agents/[id]`

职责：

- 编辑 agent profile
- 管理 demo
- 管理状态
- 查看 runtime 指标
- 查看测试结果

后续建议：

- seller 自己的 agent 详情页最终以 dashboard 下的 detail/editor 为主
- 当前 `/seller/agents/[id]` 作为过渡页看待

### 5.4 Connect Lab

- 路由：
  - `/[locale]/dashboard/connect-lab`

职责：

- seller 运行期接入验证
- test runs 展示
- test room 跳转

结论：

- `/[locale]/seller/connect-lab` 视为重复入口
- 未来统一收口到 `/dashboard/connect-lab`

### 5.5 Test Room

- 路由：
  - `/[locale]/seller/test-room/[id]`

职责：

- seller 测试任务交互页

结论：

- 该页可以继续保留在 `seller/*`
- 因为它是 seller 专属实时测试空间，不属于主工作台导航层级
- 但导航入口必须从 dashboard 进入

也就是说：

- 主入口属于 dashboard
- 深层测试房间可以保留 seller 语义

### 5.6 Earnings

- 路由：
  - `/[locale]/dashboard/earnings`

职责：

- seller 收益概览
- 后续扩展 earnings breakdown

### 5.7 Withdraw

- 路由：
  - `/[locale]/dashboard/withdraw`

职责：

- 提现申请
- 提现历史
- payout wallet 相关入口

## 6. Seller 页面分层

阶段 2 开始后，seller 页面分三层：

### 6.1 主工作台层

- `/dashboard`
- `/dashboard/agents/new`
- `/dashboard/agents/[id]`
- `/dashboard/connect-lab`
- `/dashboard/earnings`
- `/dashboard/withdraw`

特点：

- 主导航可见
- seller 主路径
- 强调工作流与配置

### 6.2 深层实时空间

- `/seller/test-room/[id]`

特点：

- 深层工作空间
- 不属于主导航一级入口
- 从 dashboard 进入

### 6.3 兼容 / 待收口层

- `/seller/dashboard`
- `/seller/connect-lab`
- `/seller/agents/[id]`

特点：

- 暂时存在
- 不继续扩展
- 阶段 2 中逐步收口

## 7. 访问规则

Seller 页面访问规则定义如下：

### 7.1 Auth required

以下 seller 页面必须登录：

- `/dashboard`
- `/dashboard/agents/new`
- `/dashboard/agents/[id]`
- `/dashboard/connect-lab`
- `/dashboard/earnings`
- `/dashboard/withdraw`
- `/seller/test-room/[id]`

### 7.2 Activated required

以下 seller 关键动作建议必须完成激活后才可用：

- go live
- connect-lab 正式测试
- withdraw
- 真实 runtime 切换到 online

### 7.3 页面保护原则

阶段 2 中必须完成：

1. canonical dashboard 页面保护一致
2. 深层 seller 页面保护一致
3. 不再出现“API 拦了，但页面入口没统一拦”的情况

## 8. Seller 阶段 UI 家族定义

Seller 页面的 UI 家族定义为：

- 品牌一致
- 偏工作台
- 强状态反馈
- 强流程感
- 强可执行性

Seller 页面不应长成：

- buyer 浏览页那种市场页风格
- admin 控制台那种高密度读数页

Seller 页面应强调：

- 当前能做什么
- 当前状态是什么
- 下一步怎么完成

## 9. 阶段 2 实施顺序

Seller 阶段建议严格按以下顺序推进：

### 9.1 第一步：入口收口

目标：

- 确定 `dashboard/*` 为 seller 主路径
- 处理 `seller/*` 重复入口
- 统一登录保护

### 9.2 第二步：onboarding 收口

目标：

- 把 `/dashboard/agents/new` 做成 seller 第一闭环

包括：

- create agent
- save demo
- emit one-time API key
- env 配置说明
- run test
- open test room
- go live

### 9.3 第三步：agent 管理收口

目标：

- 让 `/dashboard/agents/[id]` 成为 seller 的稳定 agent 控制页

包括：

- profile 编辑
- demo 编辑
- 状态切换
- runtime 指标
- test history

### 9.4 第四步：身份与可信度补齐

目标：

- 把 GitHub / Twitter 验证从“只有 API”补成“真实产品入口”

### 9.5 第五步：财务面收口

目标：

- earnings
- withdraw
- payout wallet

形成 seller 财务闭环

## 10. 阶段 2 完成标准

满足以下条件时，seller 阶段才算真正完成：

1. seller 主入口只有一套明确 canonical 路径
2. seller onboarding 可顺滑完成
3. agent 管理页不再分裂
4. connect-lab 与 test room 串联自然
5. social verification 有真实入口
6. earnings / withdraw 形成稳定财务路径

## 11. 不在阶段 2 优先做的事

以下事项不作为 seller 阶段最优先工作：

- 大量新增 seller 周边页面
- 先重做所有视觉而不收口路径
- 先做复杂报表再补 onboarding
- 先扩 API 范围而不先把入口和闭环打顺

## 12. 下一步

seller canonical 方案确定后，下一步最合理进入的是：

`阶段 2 - seller 闭环实施计划`
