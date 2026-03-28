# SummonAI 正式产品开发阶段 - 阶段 1 执行方案

## 1. 文档目的

本文档用于定义 SummonAI 在“正式产品完善开发阶段”的第一阶段执行方案。

阶段 1 不以新增大量业务功能为目标，而是先统一以下三件事：

1. 主站 UI 设计基线
2. 产品信息架构
3. 环境与访问策略

只有这三件事先明确，后续 seller、buyer、admin 三侧的开发才能稳定推进，避免出现风格分裂、入口重复、权限混乱的问题。

## 2. 当前基线

当前正式线上状态：

- 正式域名仅公开以下链路：
  - `/[locale]`
  - `/[locale]/early-access`
  - `/[locale]/early-access/success`
- 主体产品页和 `/api/*` 当前仍被中间件挡住，不对外开放
- Web 生产部署位于 Vercel 项目 `summon-ai-vercel`

当前代码基线判断：

- landing / early-access 已稳定上线，且必须优先保护
- seller 侧已有一条接近闭环的真实链路：
  - `agent 创建 -> demo -> SDK test -> test room -> go live -> withdraw`
- buyer 侧已有一条接近闭环的真实链路：
  - `Agent 列表/详情 -> direct task -> task room -> rating`
- admin 与平台支撑层已有真实基础能力：
  - invitation codes
  - activation
  - maintenance mode
  - notifications
  - payments
  - realtime
  - admin console

阶段 1 的任务不是重写这些内容，而是为后续开发建立统一规则。

## 3. 阶段 1 目标

阶段 1 的目标只有三个：

1. 把当前 landing 的品牌感沉淀为主站统一视觉语言
2. 把 buyer / seller / admin 的入口和页面归属定义清楚
3. 把本地、预览、生产三种环境下的访问规则定义清楚

阶段 1 结束时，我们应该得到的是“统一规则”和“明确执行边界”，而不是一堆零散页面。

## 4. 阶段 1 非目标

以下内容不属于阶段 1 的目标：

- 不在阶段 1 大规模新增 seller / buyer 新页面
- 不在阶段 1 放开正式域名主体产品
- 不在阶段 1 改动公开 landing / early-access 的开放策略
- 不在阶段 1 重构全部 API
- 不在阶段 1 先做大面积 UI 美化后再想结构

## 5. 主站 UI 基线

### 5.1 总体视觉方向

主站 UI 以当前 landing 的品牌语言为母版，统一方向如下：

- 基调：高级、克制、现代、可信，不做廉价 AI 风格
- 主色：以品牌紫为核心高光色，不扩大为大面积廉价紫底
- 背景：深色优先，使用层次化暗底，而不是纯黑一片
- 组件：圆角、大留白、轻玻璃感、弱边框、克制发光
- 信息密度：产品页允许更高密度，但必须保留 landing 的秩序感

### 5.2 视觉原则

所有后续产品页遵守以下原则：

1. 品牌色只用于强调，不用于把整页刷成紫色
2. 大块内容用深灰卡片承载，不直接浮在背景上
3. 标题、正文、辅助文案必须形成稳定层级
4. Hover、focus、active 必须统一，不可各页自行发挥
5. 所有产品页面优先继承品牌语言，而不是默认 shadcn 原始风格

### 5.3 页面类型定义

主站页面按五类统一设计：

1. Marketing 页面
   - 例如 landing、early-access、success
   - 强品牌、强情绪、强视觉节奏

2. Buyer 浏览页
   - 例如 showcase、agents、agent detail、leaderboard
   - 强信息筛选、强转化、弱后台感

3. Seller 工作台页
   - 例如 dashboard、connect-lab、agent editor、withdraw
   - 更偏操作台，但仍需品牌一致

4. Task 交互页
   - 例如 task room、test room、broadcast
   - 强状态感、强流程感、强反馈

5. Admin 控制页
   - 例如 admin console、system、maintenance
   - 强信息清晰度，弱营销感，但不能脱离主站品牌

### 5.4 设计令牌方向

阶段 1 内要收口的不是“视觉感觉”，而是明确令牌层规则：

- 颜色：
  - 主品牌紫
  - 紫色 hover / active / ring
  - 深背景层级 1/2/3
  - 卡片背景层级
  - 文本主/次/弱层级
  - 状态色：success / warning / error / info

- 形状：
  - 主按钮圆角
  - 卡片圆角
  - 输入框圆角
  - modal / drawer 圆角

- 阴影：
  - Hero 级 glow
  - 普通卡片阴影
  - 浮层阴影
  - 紫色强调阴影

- 文本：
  - Hero 标题
  - 页面标题
  - Section 标题
  - 正文
  - 辅助说明
  - 数据标签

### 5.5 组件基线

阶段 1 要明确统一标准的组件如下：

- Primary button
- Secondary button
- Ghost button
- Form input
- Textarea
- Search input
- Select / tabs
- Card
- Status badge
- Stat block
- Table
- Empty state
- Toast / inline feedback
- Modal / drawer

### 5.6 对当前代码的直接要求

从阶段 2 开始，后续新页面和重构页面必须优先复用统一的主站组件，而不是继续在各处直接写一套新的 Tailwind 类名风格。

## 6. 产品信息架构

### 6.1 当前问题

当前代码中最明显的信息架构问题：

- seller 入口重复：
  - `/dashboard/*`
  - `/seller/*`
- buyer 主入口未收口：
  - `showcase`
  - `agents`
  - `broadcasts`
  - `tasks`
  - `my/*`
  - 缺少统一承接页
- admin 自成体系，但与前台导航关系还未定义清楚

### 6.2 阶段 1 需要确认的 canonical 入口

阶段 1 确认如下 canonical 入口：

1. Public marketing 入口
   - `/[locale]`
   - `/[locale]/early-access`
   - `/[locale]/early-access/success`

2. Seller canonical 入口
   - 推荐采用 `/[locale]/dashboard/*` 作为 seller 主工作台
   - 原因：
     - 当前 onboarding、earnings、withdraw 都已在该路径下
     - 现有保护逻辑也更多围绕 `dashboard/*`
   - `/[locale]/seller/*` 在阶段 2 作为待收口或兼容入口处理

3. Buyer canonical 入口
   - 当前闭门开发阶段，不新增与 landing 冲突的产品根页
   - 阶段 2、3 内部产品主入口建议为：
     - 浏览入口：`/[locale]/showcase`
     - 交易入口：`/[locale]/my/tasks` 或 `/[locale]/tasks`
   - buyer 首页组件可以先内部挂载到非根路径，后续再决定公开策略

4. Admin canonical 入口
   - `/[locale]/admin/*`

### 6.3 导航结构建议

正式产品开发期间，内部产品导航按以下结构收口：

- Buyer
  - Showcase
  - Agents
  - My Tasks
  - Notifications
  - Settings

- Seller
  - Dashboard
  - Agents
  - Connect Lab
  - Earnings
  - Withdraw

- Admin
  - Console
  - Users
  - Agents
  - Tasks
  - Reports
  - Maintenance
  - System

### 6.4 路由收口原则

1. 一个角色一套主入口，不长期并行两套语义相同路径
2. 新页面优先挂到 canonical 入口体系下
3. 旧路径如需兼容，必须明确是临时兼容，不可长期共存
4. 正式域名未开放前，产品 IA 可以在内部环境先收口，不要求立即对外暴露

## 7. 环境与访问策略

### 7.1 本地开发

本地开发环境规则：

- 允许开发者访问完整产品页面
- 允许联调 seller / buyer / admin 全链路
- 可以关闭或绕过“生产型公开限制”，但不能改坏生产保护逻辑
- 所有环境变量配置必须明确区分本地值与生产值

### 7.2 预览环境

预览环境规则：

- 用于产品联调、UI 验收、流程回归
- 默认允许内部访问主体产品
- 不自动等同于对外开放
- 所有预览部署必须保留与生产分离的环境变量与链接策略

### 7.3 生产环境

生产环境规则：

- 正式域名继续只开放 landing / early-access
- 不自动开放主体产品页
- `/api/*` 和主体产品页继续由中间件保护
- 所有“是否放开生产访问”的动作，必须单独评估并明确批准

### 7.4 页面访问分层

阶段 1 先定义访问分层，不急于一次性实现所有代码收口。

建议分层如下：

1. Public
   - landing
   - early-access
   - success

2. Internal product public-like browse
   - showcase
   - agents
   - agent detail
   - leaderboard
   - creators
   - 这些页面在预览环境可开放给内部测试，不等于生产公开

3. Auth required
   - my/*
   - tasks/*
   - broadcasts/*
   - dashboard/*
   - seller/*

4. Activated required
   - direct task creation
   - broadcast creation
   - seller go live
   - withdraw
   - 高风险交易动作

5. Admin required
   - admin/*

## 8. 阶段 1 输出物

阶段 1 必须产出以下输出物：

1. 本文档
2. 主站视觉规范草案
3. canonical 路由表
4. 页面访问分层表
5. 后续阶段 2、3、4 的进入条件

## 9. 阶段 2 / 3 / 4 的进入条件

### 9.1 进入阶段 2 前

必须先确认：

- seller canonical 入口已确定
- 主站 UI 基线已确定
- dashboard / seller 的收口方向已确定
- 不会误伤生产 landing

### 9.2 进入阶段 3 前

必须先确认：

- seller onboarding 闭环已打顺
- seller agent 管理路径已收口
- buyer 主入口挂载方案已确定
- task 列表页与 broadcast 收口方向已明确

### 9.3 进入阶段 4 前

必须先确认：

- seller、buyer 两侧核心链路已能内部联调
- admin 的控制面需求已明确是“控盘优先”而非“功能越多越好”
- system / health / cron / maintenance 的观测面需求已明确

## 10. 阶段 1 完成标准

满足以下条件时，阶段 1 才算完成：

1. 主站 UI 方向明确，并可转成组件与设计令牌
2. buyer / seller / admin 的 canonical 入口明确
3. 本地 / 预览 / 生产三环境访问策略明确
4. 后续阶段 2、3、4 的进入条件明确
5. 团队在后续开发中不再需要反复讨论“页面到底应该长什么样、挂到哪里、谁能访问”

## 11. 阶段 1 之后的直接执行顺序

阶段 1 完成后，严格按以下顺序推进：

1. 阶段 2：seller 核心闭环
2. 阶段 3：buyer 核心闭环
3. 阶段 4：admin 控制面与观测性
4. 阶段 5：横向支撑稳定
5. 阶段 6：预览联调、灰度准备

## 12. 当前阶段 1 的明确建议

基于现有代码基线，阶段 1 接下来的具体执行建议如下：

1. 先整理主站 UI 基线草案
2. 再输出 canonical 路由与访问分层表
3. 最后开始阶段 2 的 seller 收口实施

换句话说，下一步最适合进入的是：

`主站 UI 基线草案`
