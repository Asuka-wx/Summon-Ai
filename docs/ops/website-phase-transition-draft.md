# SummonAI 官网阶段切换与入口逻辑方案（讨论稿 v3）

## 1. 文档定位

本文档仍是讨论稿，但以下关键方向已得到确认：

1. `/{locale}` 在所有阶段都继续是 landing
2. 完整产品统一通过 `/{locale}/app` 进入
3. 阶段 B 不开放公开产品浏览页
4. 登录顺序采用“先登录，再激活”
5. 阶段 C 的 landing 不再强调申请
6. 阶段 C 的 `early-access` 与 `success` 重定向回 landing

这份文档解决的是官网逻辑层问题，而不是页面视觉层问题。

## 2. 已确认前提

### 2.1 Landing 长期保留

landing 不是阶段 A 的临时页，而是 SummonAI 官网的长期公开前台。

也就是说：

- 阶段 A：`/{locale}` = landing
- 阶段 B：`/{locale}` = landing
- 阶段 C：`/{locale}` = landing

未来变化的是：

- landing 的内容
- CTA
- 用户从 landing 被分流到哪里

而不是 landing 是否消失。

### 2.2 阶段 B 不开放公开产品浏览页

在邀请码阶段，不开放完整产品的公开浏览页。

这意味着阶段 B 中以下页面即使继续开发，也不作为正式官网公开入口：

- `/showcase`
- `/agents`
- `/agents/[id]`
- `/leaderboard`

阶段 B 的公开说明层仍然依赖：

- landing
- 文案
- demo
- 邀请申请与登录分流

### 2.3 完整产品统一通过 `/{locale}/app` 进入

完整产品不由 `/{locale}` 承接，而由一个统一的认证后入口页承接。

已确认入口路径：

- `/{locale}/app`

它当前的职责是：

- 登录后首页
- 激活后首页
- buyer / seller 共用的产品入口页

当前阶段里，`/app` 先承担“统一入口页”职责，不等于立即把所有产品路径都改成 `/app/*`。

### 2.4 buyer / seller 不是互斥身份

同一个用户既可以是 buyer，也可以是 seller。

因此在产品层面：

- buyer / seller 是使用模式
- 不是必须互斥的账号身份

所以认证后的产品入口应优先设计成统一入口，再进入不同工作区。

### 2.5 admin 走权限体系，不做公开入口

admin 不属于官网公开前台的一部分。

建议策略：

- 不做公开 admin CTA
- 不在 landing 上暴露 admin 入口
- 继续通过角色与权限控制进入
- 可以保留 `/admin`
- 可以在认证后产品入口中仅对 admin 用户显示后台入口

### 2.6 激活页与产品入口页不是同一个东西

两者职责必须分开：

- `activate`
  - 是门
  - 只负责邀请码解锁

- `app`
  - 是大厅
  - 负责承接完整产品

所以未来结构上至少应区分三层：

1. 公开前台层：landing
2. 解锁层：activate
3. 完整产品层：app

## 3. 阶段模型

## 3.1 阶段 A：Prelaunch

定义：

- 当前阶段
- 官网对外运营阶段
- 以 early-access 收集和品牌建立为主

对外可见：

- `/{locale}` -> landing
- `/{locale}/early-access`
- `/{locale}/early-access/success`

完整产品：

- 不对外开放
- 仅内部用户通过直达方式使用

登录状态：

- 阶段 A 对外不存在公开登录主流程
- 但系统内部可以存在登录能力，供内部测试使用

## 3.2 阶段 B：Invite Only

定义：

- 完整产品开始对受邀用户开放
- 仍然需要邀请码激活
- 官网继续保持 landing 作为公开前台

对外可见：

- `/{locale}` -> landing
- `/{locale}/early-access`
- `/{locale}/early-access/success`
- `/{locale}/activate`

不对外开放：

- `/showcase`
- `/agents`
- `/agents/[id]`
- `/leaderboard`
- 其他完整产品公开浏览页

## 3.3 阶段 C：Open Access

定义：

- 完整产品不再需要邀请码
- 官网继续保留 landing 作为公开前台

对外可见：

- `/{locale}` -> landing
- 完整产品允许登录后直接进入

此阶段关键变化：

- `/activate` 从正式流程中退役
- `/{locale}/early-access` 与 `/{locale}/early-access/success` 重定向到 `/{locale}`
- landing CTA 改成正式产品转化入口

## 4. 长期站点结构

## 4.1 公开前台层

长期存在：

- `/{locale}` -> landing
- `/{locale}/early-access`
- `/{locale}/early-access/success`

职责：

- 品牌
- demo
- 运营
- 转化

注：

- `early-access` 仅在阶段 A 和阶段 B 承担正式职责
- 阶段 C 退役并重定向

## 4.2 解锁层

主要在阶段 B 生效：

- `/{locale}/activate`

职责：

- 邀请码输入
- 访问权限解锁

它不是产品首页，也不是 landing 替代品。

## 4.3 完整产品层

长期存在：

- `/{locale}/app`

建议由它继续分流到已有产品区域，例如：

- dashboard
- tasks
- wallet
- notifications
- settings

当前讨论稿中的 `app` 定位为：

- 统一认证后入口
- 不是现阶段强制统一所有产品路径前缀

## 5. 首页与 CTA 规则

## 5.1 `/{locale}` 的长期定位

`/{locale}` 的长期定位不是产品首页，而是：

- 官网公开前台

它服务于所有阶段，承担：

- 品牌
- 说明
- 转化
- 分流

它不承担完整产品工作区职责。

## 5.2 阶段 A 的 landing

主 CTA：

- 申请抢先体验

次级 CTA：

- 可以没有
- 或保留弱化的“了解更多 / 查看演示”

重点：

- early-access 收集
- 品牌说明

## 5.3 阶段 B 的 landing

主 CTA：

- 申请邀请码

次级 CTA：

- 我已获邀请，去登录

重点：

- 邀请制说明
- 登录分流
- 继续用 demo 解释产品

## 5.4 阶段 C 的 landing

主 CTA：

- 立即开始

次级 CTA：

- 登录

重点：

- 正式产品价值
- 正式转化入口

不再强调：

- 申请
- 抢先体验
- 邀请码

## 6. 登录、激活、产品入口的跳转矩阵

## 6.1 访问 `/{locale}`

- 阶段 A
  - 所有公开访客 -> landing
  - 内部测试用户也不自动跳产品

- 阶段 B
  - 所有访客 -> landing
  - 由 landing CTA 分流到申请邀请码或登录

- 阶段 C
  - 所有访客 -> landing
  - 由 landing CTA 分流到立即开始或登录

结论：

- `/{locale}` 在所有阶段都稳定为官网前台

## 6.2 登录入口

推荐未来提供一个明确登录入口，例如：

- `/{locale}/login`

登录后的跳转规则建议：

- 阶段 A
  - 内部测试用户：
    - 未激活 -> `/activate`
    - 已激活 -> `/app`

- 阶段 B
  - 未激活 -> `/activate`
  - 已激活 -> `/app`

- 阶段 C
  - 直接 -> `/app`

## 6.3 访问 `/{locale}/activate`

建议规则：

- 未登录访问
  - 重定向到登录入口
  - 登录后返回 activate

- 已登录未激活访问
  - 阶段 A：允许，仅供内部测试
  - 阶段 B：允许，作为正式 invite-only 解锁页
  - 阶段 C：不再允许停留，直接跳转 `/app`

- 已登录已激活访问
  - 所有阶段都直接跳转 `/app`

结论：

- 阶段 C 中，激活页从正式流程里退役
- 工程上建议先重定向退役，再决定是否删除代码

## 6.4 访问 `/{locale}/app`

建议规则：

- 未登录
  - 跳转登录入口

- 已登录未激活
  - 阶段 A：内部测试场景可跳 activate
  - 阶段 B：跳 activate
  - 阶段 C：原则上已不再需要该门槛

- 已登录已激活
  - 允许进入

## 6.5 访问完整产品页

适用页面例如：

- `/[locale]/dashboard/*`
- `/[locale]/my/*`
- `/[locale]/tasks/*`
- `/[locale]/broadcasts/*`
- `/[locale]/admin/*`

建议统一规则：

- 未登录 -> 登录入口
- 已登录未激活
  - 阶段 A：内部测试场景可控
  - 阶段 B：跳 activate
  - 阶段 C：不再因邀请码挡住

- 已登录已激活 -> 放行
- 非 admin 访问 admin -> `/app`

## 6.6 访问 `/{locale}/early-access`

建议规则：

- 阶段 A
  - 正常公开访问

- 阶段 B
  - 继续公开访问
  - 用于邀请码申请

- 阶段 C
  - `/{locale}/early-access` -> 重定向到 `/{locale}`
  - `/{locale}/early-access/success` -> 重定向到 `/{locale}`

## 7. 本地、预览、生产的区别

## 7.1 本地开发

本地开发应允许：

- 绕过站点封闭策略
- 查看完整产品页面
- 调试 `app` / `activate` / dashboard / admin 路由

但本地仍可保留：

- 登录校验
- admin 校验
- 激活校验

也就是说：

- 本地放开的是站点封闭策略
- 不是取消业务权限逻辑

## 7.2 预览环境

预览环境应承担：

- 阶段切换测试
- landing CTA 测试
- activate 流程测试
- `app` 入口测试

## 7.3 生产环境

生产环境按 `site_stage` 决定站点行为。

当前生产仍等价于：

- 阶段 A

## 8. 对现有代码的重构启示

基于这版讨论稿，后续我们不应继续把现有中间件逻辑视为长期方案。

当前中间件的核心思路是：

- 除 landing / early-access 外全部挡回 `/{locale}`

这只适合阶段 A。

未来应改造成：

1. 先读取站点阶段配置
2. 再读取当前用户状态
3. 决定是否：
   - 放行 landing
   - 放行 activate
   - 放行 app
   - 把未激活用户导向 activate
   - 把已激活用户导向 app
   - 把阶段 C 的 early-access 重定向回 landing

## 9. 推荐的平台配置

建议未来引入一个平台配置键：

- `site_stage`

可选值：

- `prelaunch`
- `invite_only`
- `open`

这是阶段切换的最小主配置。

## 10. 当前已经确认的正式结论

截至当前，这份讨论稿里已经可以视为确认的结论是：

1. 官网首页长期固定为 landing
2. 邀请码阶段不开放公开产品浏览页
3. 登录顺序是“先登录，再激活”
4. 激活页与产品入口页不是同一个东西
5. 完整产品统一通过 `/{locale}/app` 进入
6. `app` 当前是统一入口页，不等于立即重写所有产品路径
7. 阶段 C 的 landing 不再强调申请
8. 阶段 C 的 `early-access` 与 `success` 重定向回 landing

## 11. 当前仍待讨论的问题

这版 v3 已经非常收敛，但仍有少量问题可继续讨论。

### 11.1 `/{locale}/app` 未来是否演进为完整产品前缀

当前已确认：

- 现阶段它先作为统一认证后入口页

待后续讨论：

- 是否未来把更多产品路径逐步收敛到 `/app/*`

### 11.2 阶段 B 的 landing 最终文案与 CTA 结构

当前已确认：

- 继续保留 landing 作为首页
- 继续保留邀请码申请逻辑

待后续讨论：

- 文案层次
- CTA 排序
- demo 呈现方式

## 12. 当前建议的下一步

我建议下一步开始把这份讨论稿收口成正式方案，并反向更新：

- phase 1 plan
- middleware 策略
- activate 流程
- `app` 入口设计
