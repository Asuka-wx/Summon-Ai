# SummonAI 主站 UI 基线草案

## 1. 文档目的

本文档用于定义 SummonAI 在“正式产品完善开发阶段”的主站 UI 基线。

它不是单纯的设计描述，而是后续 seller、buyer、admin、task 四类页面的统一执行规则。

本文档回答五个核心问题：

1. 我们继承哪套视觉语言
2. 我们保留哪些现有模式
3. 我们统一哪些设计令牌和组件
4. buyer / seller / admin / task 四类页面分别长什么样
5. 阶段 2 之后开发时，哪些规则必须遵守

## 2. 当前判断

### 2.1 当前不是没有 UI，而是 UI 分成了两套

目前仓库里已经存在两套相对独立的视觉系统：

1. 全局产品主题
   - 主要位于 [globals.css](D:/Summon-Ai/src/app/globals.css)
   - 有完整颜色、圆角、字体、明暗双主题变量
   - 已服务于大多数 `(product)` 页面

2. Landing / marketing 主题
   - 主要位于 [landing.css](D:/Summon-Ai/src/components/landing/landing.css)
   - 有更强的品牌感、紫色高光、深色玻璃感、hero glow、动画 demo
   - 已服务于 landing / early-access / success

当前真正的问题不是“产品页完全没设计”，而是：

- landing 有品牌感
- product 有结构感
- 但二者还没有收口成同一套主站系统

### 2.2 当前产品页已经自然长出一套稳定模式

当前 `(product)` 页面最常见、最稳定的视觉结构是：

- 页面容器：
  - `mx-auto flex w-full max-w-5xl|6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8`
- 顶部 Hero 面板：
  - `rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10`
- 二级内容卡：
  - `rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5`
- 内层统计块 / 小卡：
  - `rounded-3xl border border-border/70 bg-background/75 p-5`

这说明我们不应该推翻重来，而应该：

- 保留这套“结构稳定的产品卡片系统”
- 再把 landing 的品牌语言灌进去

## 3. 总体视觉方向

### 3.1 总方向

SummonAI 主站的视觉方向定义为：

- 高级
- 克制
- 深色优先
- 可信
- 有品牌辨识度
- 不是廉价 AI 营销页
- 也不是默认 SaaS 后台

### 3.2 关键词

主站视觉关键词：

- Specialist
- Precision
- Composure
- Depth
- Quiet confidence

### 3.3 明确不做

以下方向明确不采用：

- 大面积廉价紫色铺底
- 过量霓虹、赛博、发光边框
- 过多 glassmorphism 导致信息发虚
- 默认 shadcn 后台观感直接上线
- buyer / seller / admin 三侧完全长得一样

## 4. 设计令牌基线

## 4.1 基本策略

阶段 1 不再长期维持“两套令牌平行存在”的状态。

目标策略：

- 保留 [globals.css](D:/Summon-Ai/src/app/globals.css) 作为全局主题根
- 从 [landing.css](D:/Summon-Ai/src/components/landing/landing.css) 提炼品牌层规则
- 将 landing 的品牌语言收敛进全局主题，而不是继续让 landing 永远独立成孤岛

### 4.2 令牌分层

后续设计令牌按三层理解：

1. Foundation tokens
   - 颜色
   - 半径
   - 阴影
   - 字体
   - 间距

2. Semantic tokens
   - page background
   - surface
   - surface-muted
   - hero surface
   - text-primary
   - text-secondary
   - brand-accent
   - success / warning / danger

3. Component tokens
   - button-primary
   - button-secondary
   - input-surface
   - page-hero
   - stat-tile
   - list-card

### 4.3 颜色基线

主站颜色规则：

- 品牌主色：
  - 继续以品牌紫作为 accent
  - 只用于强调、CTA、active、focus、关键数据

- 背景：
  - 全站以深色产品背景为默认主基调
  - 背景必须存在层级，不能单一纯黑
  - 页面背景允许轻微径向高光，但不能影响可读性

- 表面层：
  - Hero 面板一层
  - 内容卡一层
  - 内嵌小卡一层
  - 这些层级必须在亮度、透明度、边框上有明确差异

- 文本：
  - 主标题高对比
  - 正文中对比
  - 辅助说明低对比但可读
  - 弱化文本不能影响信息理解

### 4.4 圆角基线

主站圆角分三级：

1. Hero / page-level surface
   - 2rem 级别

2. Section / work card
   - 1.75rem 级别

3. Inner tile / list item / compact surface
   - 3xl 或统一中大圆角

原则：

- 圆角必须成为品牌识别的一部分
- 不再在不同页面随意出现多种互不相关的圆角规模

### 4.5 阴影基线

主站阴影分三级：

1. Hero shadow
   - 强于普通卡片
   - 可轻微带品牌色投影

2. Section card shadow
   - 中等
   - 只提供层次，不抢戏

3. Tile shadow
   - 非常轻
   - 更强调边框和背景层级

原则：

- 阴影服务于层级，不服务于炫技
- 紫色阴影只用于重点块，不能全站滥用

### 4.6 字体与排版

字体策略：

- 中文继续以系统中文字体栈为主
- 英文保持现代无衬线风格
- 代码与价格类信息使用 monospace

排版层级统一为：

1. Hero title
2. Page title
3. Section title
4. Card title
5. Body
6. Meta / helper / label

原则：

- 不同页面不可自行发明新的标题层级
- 中英文都必须遵守统一节奏

## 5. 组件基线

### 5.1 按钮系统

当前存在两套按钮：

- 产品按钮：[button.tsx](D:/Summon-Ai/src/components/ui/button.tsx)
- landing 按钮：[landing button](D:/Summon-Ai/src/components/landing/ui/button.tsx)

阶段 1 结论：

- 只保留一个 canonical button system
- 推荐以 [button.tsx](D:/Summon-Ai/src/components/ui/button.tsx) 为基础
- 将 landing 的品牌表现收敛到这套按钮系统里

按钮分型统一为：

1. Primary
   - 主要转化动作
   - 品牌紫

2. Secondary
   - 次级但重要动作
   - 品牌边框 / 低透明背景

3. Outline
   - 管理 / 跳转 / 辅助动作

4. Ghost
   - 低干扰操作

5. Destructive
   - 风险动作

### 5.2 卡片系统

主站卡片统一分为四类：

1. ProductPageHero
   - 页面标题区
   - 大标题、eyebrow、summary、tabs、stats

2. SurfaceCard
   - 二级业务区块
   - 例如 seller dashboard 主区块、agent detail 主区块

3. StatTile
   - 小型数据展示块
   - 数值、标签、短解释

4. ListCard
   - 列表项、记录项、行项目
   - hover 反馈统一

阶段 2 开始，页面不再继续大面积复制 class，而应逐步抽成共享模式。

### 5.3 Badge / Label

当前 badge 只是样式模式，不是组件。

阶段 1 规范要求：

- 统一三类 badge：
  - status badge
  - section label
  - category tag

这些 badge 语义必须清晰，不再在各页随意拼接文本样式。

### 5.4 表单控件

当前 textarea / input 大量在页面中直接手写 class。

阶段 1 要求：

- 统一输入框、textarea、search、select 的表面样式
- 表单控件必须与品牌深色产品面协调
- focus ring 必须统一使用品牌语义

### 5.5 表格 / 列表

当前产品侧主要是卡片列表，landing 才有完整表格体系。

阶段 1 定义：

- buyer / seller / task 侧优先继续使用卡片列表
- admin 的数据密集区可使用表格，但表格也要有统一风格
- 不把所有页面强行改成后台表格页

### 5.6 Empty State / Feedback

阶段 1 要求定义统一模式：

- empty state
- loading state
- inline error
- success confirmation
- destructive confirmation

这些状态必须和主站品牌协调，而不是继续按页面临时拼。

## 6. 页面家族基线

### 6.1 Buyer 页面

页面定位：

- 更偏浏览
- 更偏转化
- 更偏信任建立

视觉要求：

- 比 seller/admin 更开放、更像市场页
- 保留品牌感
- 降低后台感

适用页面：

- showcase
- agents
- agent detail
- leaderboard

Buyer 页面应强调：

- 可发现性
- 比较感
- 信任感
- 转化入口

### 6.2 Seller 页面

页面定位：

- 工作台
- 操作台
- 配置与验证中心

视觉要求：

- 结构明确
- 状态反馈清晰
- 比 buyer 更偏工具，但不能像默认后台

适用页面：

- dashboard
- connect-lab
- new-agent-wizard
- agent editor
- earnings
- withdraw

Seller 页面应强调：

- 操作效率
- 状态可靠性
- 流程闭环
- runtime / test / payout 的专业感

### 6.3 Task 页面

页面定位：

- 实时交互
- 状态流转
- 过程可感知

视觉要求：

- 强状态感
- 强流程感
- 不适合表格化

适用页面：

- task room
- test room
- broadcast bid board

Task 页面应强调：

- 当前状态
- 下一步动作
- 历史内容
- 费用与轮次

### 6.4 Admin 页面

页面定位：

- 控制面
- 运营面
- 风险管理面

视觉要求：

- 信息优先
- 读数清晰
- 但仍应是 SummonAI 的产品，而不是通用后台模板

适用页面：

- admin console
- users
- agents
- tasks
- reports
- maintenance
- system

Admin 页面应强调：

- 稳定
- 清晰
- 可观测
- 不误触

## 7. 页面壳子统一规则

### 7.1 ProductPageShell

统一使用产品总壳：

- 顶部网络提示
- 维护提示
- 主导航
- 激活保护
- 主内容区
- 页脚

canonical 基线：
- [product layout](D:/Summon-Ai/src/app/[locale]/(product)/layout.tsx)

### 7.2 容器宽度规则

阶段 1 明确如下规则：

- `max-w-5xl`
  - 详情页
  - 流程页
  - task / broadcast / agent detail 类页面

- `max-w-6xl`
  - 列表页
  - dashboard 总览页
  - admin 总览页

以后不再按“感觉”选宽度。

### 7.3 页面标题区规则

页面标题区统一结构：

1. eyebrow
2. h1
3. optional description
4. optional actions
5. optional tabs or stats

不允许：

- 每页都自定义一套完全不同的标题区节奏

## 8. 导航与页脚基线

### 8.1 Header

当前 [site-header.tsx](D:/Summon-Ai/src/components/layout/site-header.tsx) 已可用，但更像轻量 scaffold。

阶段 1 结论：

- Header 纳入主站 UI 基线
- 它必须和产品 IA 一起收口
- 它不是后面再补的小事

Header 应承担：

- 品牌识别
- 主导航
- 角色主入口
- 通知入口
- 语言切换

### 8.2 Footer

当前 [site-footer.tsx](D:/Summon-Ai/src/components/layout/site-footer.tsx) 更像占位 footer。

阶段 1 结论：

- Footer 后续要统一成简洁但正式的产品页 footer
- 不需要像 marketing footer 那么强表现
- 但不能长期保留 scaffold 说明文案

## 9. 阶段 1 UI 收口优先级

严格优先级如下：

1. 统一设计令牌方向
2. 统一按钮系统
3. 统一页面壳子与卡片层级
4. 统一 badge / 表单 / empty state
5. 统一 buyer / seller / admin / task 四类页面差异
6. 最后处理 table、tabs、细节过渡

## 10. 当前不立即做的事

阶段 1 UI 基线只定义规则，不立即做以下大动作：

- 不全站重写页面
- 不在阶段 1 统一重构所有组件
- 不先把 admin 全部改成表格系统
- 不为了追求视觉统一而破坏现有 seller / buyer 真实链路

## 11. 阶段 2 开始时的 UI 执行规则

从阶段 2 开始，所有新开发和重构必须遵守：

1. 优先复用统一的主站按钮系统
2. 优先复用统一的 page shell / hero / surface / stat tile 模式
3. 新页面先判断属于 buyer、seller、task、admin 哪个家族
4. 不再直接复制一大段 Tailwind class 当作长期方案
5. 如需破例，必须说明原因

## 12. 阶段 1 UI 完成标准

满足以下条件，阶段 1 的 UI 基线才算完成：

1. 设计令牌方向明确
2. canonical button system 明确
3. canonical page shell 明确
4. buyer / seller / task / admin 四类页面的风格差异明确
5. Header / Footer 的角色明确
6. 后续阶段 2 开发时，可以不再反复讨论“这个页面到底应该长什么样”

## 13. 下一步

阶段 1 UI 基线草案完成后，下一步执行顺序应为：

1. 基于本草案定义 seller 阶段的 canonical 页面形态
2. 进入阶段 2：seller 核心闭环收口
3. 在 seller 阶段边开发边沉淀通用 UI 模式

换句话说：

下一步最合理进入的是：

`阶段 2 的 seller canonical 路由与页面结构方案`
