# Early Access Notion Database

This database is designed for the SummonAI early-access intake flow.
It is optimized for three jobs:

1. Track all buyer and builder applications in one place
2. Filter for high-intent applicants quickly
3. Support later outreach, community invites, and onboarding

## Recommended Database Name

`SummonAI Early Access Applicants`

## Recommended Properties

| Property | Type | Purpose |
| --- | --- | --- |
| `Name` | Title | Applicant name |
| `Email` | Email | Primary outreach email |
| `Track` | Select | `Buyer`, `Builder` |
| `Locale` | Select | `zh`, `en` |
| `Source` | Rich text | Landing source / campaign |
| `Region` | Rich text | Applicant region |
| `Timezone` | Rich text | Applicant timezone |
| `Current Role` | Select | Founder / Product / Growth / etc. |
| `AI Tools` | Multi-select | ChatGPT / Claude / Cursor / etc. |
| `Agent Familiarity` | Select | Familiarity level |
| `Pay Per Use` | Select | Payment willingness |
| `Feedback Willingness` | Select | Feedback willingness |
| `Primary Use Case` | Rich text | Buyer: task description |
| `Urgency` | Select | Buyer urgency |
| `Desired Outcome` | Rich text | Buyer expected result |
| `Pilot Readiness` | Select | Buyer real-task willingness / Builder pilot timing |
| `Capability` | Rich text | Builder capability summary |
| `Input Output` | Rich text | Builder input -> output |
| `Availability` | Select | Builder online availability |
| `Response Speed` | Select | Builder response / start time |
| `Proof Types` | Multi-select | Case study / GitHub / demo / etc. |
| `Proof Link` | URL | Main proof link |
| `Best Fit Tasks` | Rich text | Builder strength area |
| `Not Fit Tasks` | Rich text | Builder boundary |
| `Expectation` | Rich text | What they expect from SummonAI |
| `Extra Notes` | Rich text | Optional extra info |
| `Submitted At` | Created time | Response timestamp |
| `Status` | Status | `New`, `Reviewing`, `Shortlist`, `Waiting`, `Community`, `Invited`, `Closed` |
| `Priority` | Select | `High`, `Medium`, `Low` |
| `Owner` | Person | Internal owner |
| `Community Invite` | Checkbox | Whether invited into community |
| `Contacted At` | Date | First outreach time |
| `Last Action` | Rich text | Latest internal note |

## Suggested Views

### 1. `Inbox`
- Filter: `Status` is `New`
- Sort: `Submitted At` descending

### 2. `Buyer Review`
- Filter: `Track` is `Buyer`
- Group by: `Status`

### 3. `Builder Review`
- Filter: `Track` is `Builder`
- Group by: `Status`

### 4. `High Intent`
- Filter:
  - `Pay Per Use` contains positive intent
  - `Feedback Willingness` is not negative
  - `Status` is not `Closed`

### 5. `Community Candidates`
- Filter:
  - `Community Invite` is unchecked
  - `Status` is `Shortlist` or `Waiting`

### 6. `Ready To Contact`
- Filter:
  - `Status` is `Shortlist`
  - `Contacted At` is empty

## Mapping Notes For Tally

### Buyer forms
- `你的名字` / `Your name` -> `Name`
- `工作邮箱` / `Work email` -> `Email`
- `所在地区` / `Region` -> `Region`
- `你的时区` / `Timezone` -> `Timezone`
- `你目前最接近哪类角色？` / `Which role are you closest to right now?` -> `Current Role`
- `你目前最常用的 AI 工具是哪些？` / `Which AI tools do you use most often?` -> `AI Tools`
- `你对 Agent 的熟悉度如何？` / `How familiar are you with agents?` -> `Agent Familiarity`
- `如果有高质量、能直接交付结果的 Agent 服务，你愿意按次付费吗？` / `If a high-quality agent could directly deliver outcomes, would you pay per use?` -> `Pay Per Use`
- `你愿意在内测阶段提供反馈吗？` / `Are you willing to provide feedback during closed beta?` -> `Feedback Willingness`
- `你最想先交给 Agent 的任务是什么？` / `What is the first real task you want to hand to an agent?` -> `Primary Use Case`
- `这个任务对你有多紧迫？` / `How urgent is this task?` -> `Urgency`
- `如果 SummonAI 做对了，你最希望拿到什么结果？` / `If SummonAI gets this right, what outcome do you want most?` -> `Desired Outcome`
- `如果我们开放内测，你愿意用真实任务试跑吗？` / `If we open beta access, would you run a real task through it?` -> `Pilot Readiness`
- `你对 SummonAI 最期待的是什么？` / `What do you most want SummonAI to become for you?` -> `Expectation`
- `其他补充信息（可选）` / `Anything else we should know?` -> `Extra Notes`
- hidden `locale` -> `Locale`
- hidden `source` -> `Source`
- hidden `role` -> `Track`

### Builder forms
- All shared fields map the same way
- `你最想封装成 Agent 的能力是什么？` / `What capability do you most want to package as an agent?` -> `Capability`
- `你能稳定地把什么输入，转成什么输出？` / `What input can you reliably turn into what output?` -> `Input Output`
- `你的 Agent 通常能稳定在线多久？` / `How stable is your agent's online availability?` -> `Availability`
- `你的典型响应 / 开始处理速度是？` / `What is your typical response or start time?` -> `Response Speed`
- `你能提供哪些证明材料？` / `What proof materials can you provide?` -> `Proof Types`
- `请贴上最能代表你的链接` / `Paste the single link that best represents you` -> `Proof Link`
- `你最适合承接哪类任务？` / `What tasks are you best suited for?` -> `Best Fit Tasks`
- `你明确不适合承接哪类任务？` / `What tasks are clearly not a fit for you?` -> `Not Fit Tasks`
- `如果进入下一阶段，你多久能开始试运行？` / `If we move into the next step, how soon could you start a pilot?` -> `Pilot Readiness`

## Workflow Recommendation

1. Connect each Tally form to the same Notion database
2. Map the hidden fields `locale`, `source`, and `role`
3. Enable `Export existing responses` if you want old submissions imported too
4. Use `Status` and `Priority` as the main triage properties
5. Use `Community Invite` to control pre-launch community outreach
