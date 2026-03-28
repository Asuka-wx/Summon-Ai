import { createHmac, timingSafeEqual } from "node:crypto";

import { TALLY_OPTION_LABEL_BY_ID } from "@/lib/integrations/tally/early-access-option-id-map";

type TallyField = {
  key: string;
  label: string;
  type: string;
  value: unknown;
};

type TallyFormResponseEvent = {
  eventId: string;
  eventType: string;
  createdAt: string;
  data: {
    responseId?: string;
    submissionId?: string;
    respondentId?: string;
    formId?: string;
    formName?: string;
    createdAt?: string;
    fields?: TallyField[];
  };
};

type EarlyAccessSubmission = {
  eventId: string;
  responseId: string | null;
  submissionId: string | null;
  respondentId: string | null;
  formId: string | null;
  formName: string | null;
  submittedAt: string | null;
  locale: "en" | "zh" | null;
  track: "Buyer" | "Builder" | null;
  source: string | null;
  name: string | null;
  email: string | null;
  region: string | null;
  timezone: string | null;
  currentRole: string | null;
  aiTools: string[];
  agentFamiliarity: string | null;
  payPerUse: string | null;
  feedbackWillingness: string | null;
  primaryUseCase: string | null;
  urgency: string | null;
  desiredOutcome: string | null;
  pilotReadiness: string | null;
  capability: string | null;
  inputOutput: string | null;
  availability: string | null;
  responseSpeed: string | null;
  proofTypes: string[];
  proofLink: string | null;
  bestFitTasks: string | null;
  notFitTasks: string | null;
  expectation: string | null;
  extraNotes: string | null;
};

type NotionPropertyType =
  | "title"
  | "rich_text"
  | "email"
  | "url"
  | "select"
  | "multi_select"
  | "status";

type NotionDatabaseProperty = {
  id: string;
  name: string;
  type: string;
};

type NotionDatabaseSchema = {
  titlePropertyName: string | null;
  properties: Record<string, NotionDatabaseProperty>;
};

const NOTION_API_VERSION = "2022-06-28";

const FIELD_ALIASES = {
  name: ["Your name", "你的名字", "Name"],
  email: ["Work email", "工作邮箱", "Email"],
  region: ["Region", "所在地区"],
  timezone: ["Timezone", "你的时区"],
  currentRole: [
    "Which role are you closest to right now?",
    "你目前最接近哪类角色？",
    "Current Role",
  ],
  aiTools: [
    "Which AI tools do you use most often?",
    "你目前最常用的 AI 工具是哪些？",
    "AI Tools",
  ],
  agentFamiliarity: [
    "How familiar are you with agents?",
    "你对 Agent 的熟悉度如何？",
    "Agent Familiarity",
  ],
  payPerUse: [
    "If a high-quality agent could directly deliver outcomes, would you pay per use?",
    "如果有高质量、能直接交付结果的 Agent 服务，你愿意按次付费吗？",
    "Pay Per Use",
  ],
  feedbackWillingness: [
    "Are you willing to provide feedback during closed beta?",
    "你愿意在内测阶段提供反馈吗？",
    "Feedback Willingness",
  ],
  primaryUseCase: [
    "What is the first real task you want to hand to an agent?",
    "你最想先交给 Agent 的任务是什么？",
    "Primary Use Case",
  ],
  urgency: ["How urgent is this task?", "这个任务对你有多紧迫？", "Urgency"],
  desiredOutcome: [
    "If SummonAI gets this right, what outcome do you want most?",
    "如果 SummonAI 做对了，你最希望拿到什么结果？",
    "Desired Outcome",
  ],
  pilotReadiness: [
    "If we open beta access, would you run a real task through it?",
    "如果我们开放内测，你愿意用真实任务试跑吗？",
    "If we move into the next step, how soon could you start a pilot?",
    "如果进入下一阶段，你多久能开始试运行？",
    "Pilot Readiness",
  ],
  capability: [
    "What capability do you most want to package as an agent?",
    "你最想封装成 Agent 的能力是什么？",
    "Capability",
  ],
  inputOutput: [
    "What input can you reliably turn into what output?",
    "你能稳定地把什么输入，转成什么输出？",
    "Input Output",
  ],
  availability: [
    "How stable is your agent's online availability?",
    "你的 Agent 通常能稳定在线多久？",
    "Availability",
  ],
  responseSpeed: [
    "What is your typical response or start time?",
    "你的典型响应 / 开始处理速度是？",
    "Response Speed",
  ],
  proofTypes: [
    "What proof materials can you provide?",
    "你能提供哪些证明材料？",
    "Proof Types",
  ],
  proofLink: [
    "Paste the single link that best represents you",
    "请贴上最能代表你的链接",
    "Proof Link",
  ],
  bestFitTasks: [
    "What tasks are you best suited for?",
    "你最适合承接哪类任务？",
    "Best Fit Tasks",
  ],
  notFitTasks: [
    "What tasks are clearly not a fit for you?",
    "你明确不适合承接哪类任务？",
    "Not Fit Tasks",
  ],
  expectation: [
    "What do you most want SummonAI to become for you?",
    "你对 SummonAI 最期待的是什么？",
    "Expectation",
  ],
  extraNotes: ["Anything else we should know?", "其他补充信息（可选）", "Extra Notes"],
} as const;

const NOTION_PROPERTY_ALIASES = {
  track: ["Track", "Track Text"],
  locale: ["Locale", "Locale Text"],
  source: ["Source"],
  region: ["Region"],
  timezone: ["Timezone"],
  currentRole: ["Current Role"],
  aiTools: ["AI Tools"],
  agentFamiliarity: ["Agent Familiarity"],
  payPerUse: ["Pay Per Use"],
  feedbackWillingness: ["Feedback Willingness"],
  primaryUseCase: ["Primary Use Case"],
  urgency: ["Urgency"],
  desiredOutcome: ["Desired Outcome"],
  pilotReadiness: ["Pilot Readiness"],
  capability: ["Capability"],
  inputOutput: ["Input Output"],
  availability: ["Availability"],
  responseSpeed: ["Response Speed"],
  proofTypes: ["Proof Types"],
  proofLink: ["Proof Link"],
  bestFitTasks: ["Best Fit Tasks"],
  notFitTasks: ["Not Fit Tasks"],
  expectation: ["Expectation"],
  extraNotes: ["Extra Notes"],
  email: ["Email"],
  status: ["Status"],
} as const;

type OptionNormalizationRule = {
  canonical: string;
  aliases: readonly string[];
};

const DEFAULT_NOTION_STATUS = "\u65b0\u63d0\u4ea4";

const AI_TOOL_RULES: readonly OptionNormalizationRule[] = [
  { canonical: "ChatGPT", aliases: ["ChatGPT"] },
  { canonical: "Claude", aliases: ["Claude"] },
  { canonical: "Gemini", aliases: ["Gemini"] },
  { canonical: "Cursor", aliases: ["Cursor"] },
  { canonical: "Perplexity", aliases: ["Perplexity"] },
  {
    canonical: "Midjourney / image tools",
    aliases: ["Midjourney / image tools", "Midjourney / \u56fe\u50cf\u5de5\u5177", "\u56fe\u50cf\u5de5\u5177"],
  },
  { canonical: "Make / Zapier / n8n", aliases: ["Make / Zapier / n8n"] },
  {
    canonical: "Custom workflow / scripts",
    aliases: [
      "Custom workflow / scripts",
      "\u81ea\u5efa\u5de5\u4f5c\u6d41 / \u811a\u672c",
      "\u81ea\u5efa\u5de5\u4f5c\u6d41",
    ],
  },
  { canonical: "Other", aliases: ["Other", "\u5176\u4ed6"] },
] as const;

const AGENT_FAMILIARITY_RULES: readonly OptionNormalizationRule[] = [
  {
    canonical: "Beginner",
    aliases: ["Beginner", "not really used them", "\u53ea\u4e86\u89e3\u8fc7", "\u6ca1\u771f\u6b63\u4f7f\u7528"],
  },
  {
    canonical: "Tried some agent tools",
    aliases: ["Tried some agent tools", "tried some agent products or workflows", "\u8bd5\u8fc7\u4e00\u4e9b"],
  },
  {
    canonical: "Uses agents in work",
    aliases: ["Uses agents in work", "already use them in my work", "\u5de5\u4f5c\u4e2d\u4f7f\u7528"],
  },
  {
    canonical: "Builds or deploys agents",
    aliases: [
      "Builds or deploys agents",
      "build or deploy agents myself",
      "\u642d\u5efa / \u90e8\u7f72 Agent",
      "\u642d\u5efa",
      "\u90e8\u7f72 Agent",
    ],
  },
] as const;

const PAY_PER_USE_RULES: readonly OptionNormalizationRule[] = [
  {
    canonical: "Yes",
    aliases: ["Yes", "genuinely strong", "\u613f\u610f\uff0c\u53ea\u8981\u7ed3\u679c\u771f\u7684\u597d"],
  },
  {
    canonical: "Maybe",
    aliases: ["Maybe", "depending on the task and quality", "\u53ef\u4ee5\u8003\u8651"],
  },
  {
    canonical: "Try first",
    aliases: ["Try first", "rather try first", "\u5148\u8bd5\u8bd5\u770b"],
  },
  {
    canonical: "No",
    aliases: ["No", "not for now", "\u76ee\u524d\u4e0d\u8003\u8651"],
  },
] as const;

const FEEDBACK_WILLINGNESS_RULES: readonly OptionNormalizationRule[] = [
  {
    canonical: "Detailed feedback",
    aliases: ["Detailed feedback", "provide detailed feedback", "\u8be6\u7ec6\u53cd\u9988"],
  },
  {
    canonical: "Lightweight feedback",
    aliases: ["Lightweight feedback", "stay lightweight", "\u5c3d\u91cf\u8f7b\u91cf"],
  },
  { canonical: "Maybe", aliases: ["Maybe", "\u53ef\u80fd\u53ef\u4ee5"] },
  {
    canonical: "Not convenient",
    aliases: ["Not convenient", "not easily", "\u4e0d\u592a\u65b9\u4fbf"],
  },
] as const;

const URGENCY_RULES: readonly OptionNormalizationRule[] = [
  { canonical: "This week", aliases: ["This week", "\u8fd9\u5468\u5c31\u8981\u5f00\u59cb"] },
  { canonical: "Within 2 weeks", aliases: ["Within 2 weeks", "\u4e24\u5468\u5185"] },
  { canonical: "This month", aliases: ["This month", "\u672c\u6708\u5185"] },
  { canonical: "Just exploring", aliases: ["Just exploring", "\u5148\u4e86\u89e3"] },
] as const;

const PILOT_READINESS_RULES: readonly OptionNormalizationRule[] = [
  {
    canonical: "Immediate",
    aliases: ["Immediate", "yes, immediately", "\u9a6c\u4e0a\u53ef\u4ee5", "this week", "\u8fd9\u5468"],
  },
  {
    canonical: "Need conversation first",
    aliases: ["Need conversation first", "conversation first", "quick conversation first", "\u9700\u8981\u5148\u6c9f\u901a"],
  },
  { canonical: "Within 2 weeks", aliases: ["Within 2 weeks", "\u4e24\u5468\u5185"] },
  { canonical: "This month", aliases: ["This month", "\u672c\u6708\u5185"] },
  { canonical: "Later", aliases: ["Later", "\u66f4\u665a\u4e00\u4e9b"] },
  { canonical: "Not sure yet", aliases: ["Not sure yet", "\u6682\u65f6\u4e0d\u786e\u5b9a"] },
] as const;

const AVAILABILITY_RULES: readonly OptionNormalizationRule[] = [
  {
    canonical: "Less than 2h/day",
    aliases: ["Less than 2h/day", "Less than 2 hours per day", "\u5c11\u4e8e 2 \u5c0f\u65f6"],
  },
  { canonical: "2-4h/day", aliases: ["2-4h/day", "2-4 hours per day", "2-4 \u5c0f\u65f6"] },
  { canonical: "4-8h/day", aliases: ["4-8h/day", "4-8 hours per day", "4-8 \u5c0f\u65f6"] },
  { canonical: "8+h/day", aliases: ["8+h/day", "8+ hours per day", "8 \u5c0f\u65f6\u4ee5\u4e0a"] },
  {
    canonical: "Most workday hours",
    aliases: ["Most workday hours", "Most working-day hours", "\u5927\u90e8\u5206\u5de5\u4f5c\u65e5"],
  },
  {
    canonical: "Near full-day coverage",
    aliases: ["Near full-day coverage", "Near full-day stable coverage", "\u5168\u5929\u5019\u7a33\u5b9a"],
  },
] as const;

const RESPONSE_SPEED_RULES: readonly OptionNormalizationRule[] = [
  { canonical: "Within 10 minutes", aliases: ["Within 10 minutes", "10 minutes", "10 \u5206\u949f\u5185"] },
  { canonical: "Within 1 hour", aliases: ["Within 1 hour", "1 hour", "1 \u5c0f\u65f6\u5185"] },
  { canonical: "Within 4 hours", aliases: ["Within 4 hours", "4 hours", "4 \u5c0f\u65f6\u5185"] },
  { canonical: "Within 24 hours", aliases: ["Within 24 hours", "24 hours", "24 \u5c0f\u65f6\u5185"] },
  { canonical: "Not fixed", aliases: ["Not fixed", "\u4e0d\u56fa\u5b9a"] },
] as const;

const PROOF_TYPE_RULES: readonly OptionNormalizationRule[] = [
  { canonical: "Case studies", aliases: ["Case studies", "\u6848\u4f8b"] },
  { canonical: "Portfolio", aliases: ["Portfolio", "\u4f5c\u54c1\u96c6"] },
  { canonical: "GitHub", aliases: ["GitHub"] },
  {
    canonical: "Notion / docs",
    aliases: ["Notion / docs", "Notion / documentation", "Notion / \u6587\u6863\u8bf4\u660e"],
  },
  {
    canonical: "Demo / recording",
    aliases: ["Demo / recording", "Demo / \u5f55\u5c4f", "\u5f55\u5c4f"],
  },
  { canonical: "Landing page", aliases: ["Landing page"] },
  {
    canonical: "Past client outcomes",
    aliases: ["Past client outcomes", "\u5386\u53f2\u5ba2\u6237\u7ed3\u679c"],
  },
  { canonical: "Other", aliases: ["Other", "\u5176\u4ed6"] },
] as const;

function normalizeScalarValue(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

function resolveTallyOptionId(value: string | null) {
  if (!value) {
    return null;
  }

  return TALLY_OPTION_LABEL_BY_ID[value] ?? value;
}

function normalizeOptionScalarValue(value: unknown): string | null {
  if (typeof value === "string") {
    return resolveTallyOptionId(normalizeScalarValue(value));
  }

  if (value && typeof value === "object") {
    if ("label" in value) {
      return normalizeOptionScalarValue(value.label);
    }

    if ("text" in value) {
      return normalizeOptionScalarValue(value.text);
    }

    if ("id" in value) {
      return normalizeOptionScalarValue(value.id);
    }

    if ("value" in value) {
      return normalizeOptionScalarValue(value.value);
    }
  }

  return normalizeScalarValue(value);
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        return normalizeOptionScalarValue(item);
      })
      .filter((item): item is string => Boolean(item));
  }

  const scalar = normalizeOptionScalarValue(value);

  if (!scalar) {
    return [];
  }

  return scalar
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTrack(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "buyer") {
    return "Buyer" as const;
  }

  if (normalized === "builder") {
    return "Builder" as const;
  }

  return null;
}

function normalizeLocale(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "zh" || normalized === "en") {
    return normalized;
  }

  return null;
}

function createLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeOptionValue(value: string | null, rules: readonly OptionNormalizationRule[]) {
  if (!value) {
    return null;
  }

  const lookupValue = createLookupValue(value);

  for (const rule of rules) {
    const matched = rule.aliases.some((alias) => {
      const lookupAlias = createLookupValue(alias);
      return lookupValue === lookupAlias || lookupValue.includes(lookupAlias);
    });

    if (matched) {
      return rule.canonical;
    }
  }

  return value;
}

function normalizeOptionValues(values: string[], rules: readonly OptionNormalizationRule[]) {
  const normalizedValues = values.map((value) => normalizeOptionValue(value, rules) ?? value);
  return Array.from(new Set(normalizedValues));
}

function labelMatches(label: string, aliases: readonly string[]) {
  return aliases.some((alias) => alias.trim().toLowerCase() === label.trim().toLowerCase());
}

function getFieldValue(fields: TallyField[], aliases: readonly string[]) {
  const matched = fields.find((field) => labelMatches(field.label, aliases));

  return matched?.value;
}

function getHiddenFieldValue(fields: TallyField[], name: string) {
  const matched = fields.find(
    (field) =>
      field.type === "HIDDEN_FIELDS" &&
      (
        field.label.trim().toLowerCase() === name.trim().toLowerCase() ||
        field.key.trim().toLowerCase() === name.trim().toLowerCase()
      ),
  );

  return normalizeScalarValue(matched?.value);
}

function verifyTallySignature(payload: TallyFormResponseEvent, receivedSignature: string | null) {
  const secret = process.env.TALLY_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error("tally_webhook_not_configured");
  }

  if (!receivedSignature) {
    return false;
  }

  const calculated = createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("base64");

  const calculatedBuffer = Buffer.from(calculated);
  const receivedBuffer = Buffer.from(receivedSignature);

  if (calculatedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(calculatedBuffer, receivedBuffer);
}

async function notionRequest<T>(pathname: string, init: RequestInit) {
  const token = process.env.NOTION_API_TOKEN?.trim();

  if (!token) {
    throw new Error("notion_not_configured");
  }

  const response = await fetch(`https://api.notion.com/v1${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`notion_request_failed:${response.status}:${body}`);
  }

  return (await response.json()) as T;
}

async function getNotionDatabaseSchema(databaseId: string): Promise<NotionDatabaseSchema> {
  const result = await notionRequest<{
    properties: Record<string, { id: string; name: string; type: string }>;
  }>(`/databases/${databaseId}`, {
    method: "GET",
  });

  const properties = Object.fromEntries(
    Object.entries(result.properties ?? {}).map(([name, property]) => [
      name,
      {
        id: property.id,
        name: property.name ?? name,
        type: property.type,
      },
    ]),
  );

  const titleProperty = Object.entries(properties).find(([, property]) => property.type === "title");

  return {
    titlePropertyName: titleProperty?.[0] ?? null,
    properties,
  };
}

function findPropertyName(
  schema: NotionDatabaseSchema,
  aliases: readonly string[],
  allowedTypes: readonly NotionPropertyType[],
) {
  for (const alias of aliases) {
    const direct = schema.properties[alias];

    if (direct && allowedTypes.includes(direct.type as NotionPropertyType)) {
      return alias;
    }

    const fallback = Object.entries(schema.properties).find(
      ([name, property]) =>
        name.trim().toLowerCase() === alias.trim().toLowerCase() &&
        allowedTypes.includes(property.type as NotionPropertyType),
    );

    if (fallback) {
      return fallback[0];
    }
  }

  return null;
}

function createRichTextProperty(value: string) {
  return {
    rich_text: [
      {
        type: "text",
        text: {
          content: value.slice(0, 2000),
        },
      },
    ],
  };
}

function createTitleProperty(value: string) {
  return {
    title: [
      {
        type: "text",
        text: {
          content: value.slice(0, 2000),
        },
      },
    ],
  };
}

function assignScalarProperty(
  properties: Record<string, unknown>,
  schema: NotionDatabaseSchema,
  propertyAliases: readonly string[],
  value: string | null,
  allowedTypes: readonly NotionPropertyType[],
) {
  if (!value) {
    return;
  }

  const propertyName = findPropertyName(schema, propertyAliases, allowedTypes);

  if (!propertyName) {
    return;
  }

  const property = schema.properties[propertyName];

  switch (property.type) {
    case "email":
      properties[propertyName] = { email: value };
      break;
    case "url":
      properties[propertyName] = { url: value };
      break;
    case "select":
      properties[propertyName] = { select: { name: value } };
      break;
    case "status":
      properties[propertyName] = { status: { name: value } };
      break;
    case "rich_text":
      properties[propertyName] = createRichTextProperty(value);
      break;
    default:
      break;
  }
}

function assignMultiSelectProperty(
  properties: Record<string, unknown>,
  schema: NotionDatabaseSchema,
  propertyAliases: readonly string[],
  values: string[],
) {
  if (values.length === 0) {
    return;
  }

  const propertyName = findPropertyName(schema, propertyAliases, ["multi_select", "rich_text"]);

  if (!propertyName) {
    return;
  }

  const property = schema.properties[propertyName];

  if (property.type === "multi_select") {
    properties[propertyName] = {
      multi_select: values.slice(0, 20).map((value) => ({ name: value.slice(0, 100) })),
    };
    return;
  }

  properties[propertyName] = createRichTextProperty(values.join(", "));
}

function buildBackupChildren(submission: EarlyAccessSubmission) {
  const backupLines = [
    ["Track", submission.track],
    ["Locale", submission.locale],
    ["Source", submission.source],
    ["Name", submission.name],
    ["Email", submission.email],
    ["Region", submission.region],
    ["Timezone", submission.timezone],
    ["Current Role", submission.currentRole],
    ["AI Tools", submission.aiTools.join(", ") || null],
    ["Agent Familiarity", submission.agentFamiliarity],
    ["Pay Per Use", submission.payPerUse],
    ["Feedback Willingness", submission.feedbackWillingness],
    ["Primary Use Case", submission.primaryUseCase],
    ["Urgency", submission.urgency],
    ["Desired Outcome", submission.desiredOutcome],
    ["Pilot Readiness", submission.pilotReadiness],
    ["Capability", submission.capability],
    ["Input Output", submission.inputOutput],
    ["Availability", submission.availability],
    ["Response Speed", submission.responseSpeed],
    ["Proof Types", submission.proofTypes.join(", ") || null],
    ["Proof Link", submission.proofLink],
    ["Best Fit Tasks", submission.bestFitTasks],
    ["Not Fit Tasks", submission.notFitTasks],
    ["Expectation", submission.expectation],
    ["Extra Notes", submission.extraNotes],
    ["Tally Submission ID", submission.submissionId],
    ["Tally Form ID", submission.formId],
    ["Submitted At", submission.submittedAt],
  ].filter(([, value]) => Boolean(value));

  return [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "Submission Backup",
            },
          },
        ],
      },
    },
    ...backupLines.map(([label, value]) => ({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content: `${label}: ${value}`,
            },
          },
        ],
      },
    })),
  ];
}

export function parseEarlyAccessSubmission(payload: TallyFormResponseEvent): EarlyAccessSubmission {
  const fields = Array.isArray(payload.data?.fields) ? payload.data.fields : [];
  const hiddenLocale = getHiddenFieldValue(fields, "locale");
  const hiddenTrack = getHiddenFieldValue(fields, "role");

  return {
    eventId: payload.eventId,
    responseId: normalizeScalarValue(payload.data?.responseId),
    submissionId: normalizeScalarValue(payload.data?.submissionId),
    respondentId: normalizeScalarValue(payload.data?.respondentId),
    formId: normalizeScalarValue(payload.data?.formId),
    formName: normalizeScalarValue(payload.data?.formName),
    submittedAt: normalizeScalarValue(payload.data?.createdAt),
    locale: normalizeLocale(hiddenLocale),
    track: normalizeTrack(hiddenTrack),
    source: getHiddenFieldValue(fields, "source"),
    name: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.name)),
    email: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.email)),
    region: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.region)),
    timezone: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.timezone)),
    currentRole: normalizeOptionScalarValue(getFieldValue(fields, FIELD_ALIASES.currentRole)),
    aiTools: normalizeOptionValues(normalizeStringArray(getFieldValue(fields, FIELD_ALIASES.aiTools)), AI_TOOL_RULES),
    agentFamiliarity: normalizeOptionValue(
      normalizeOptionScalarValue(getFieldValue(fields, FIELD_ALIASES.agentFamiliarity)),
      AGENT_FAMILIARITY_RULES,
    ),
    payPerUse: normalizeOptionValue(
      normalizeOptionScalarValue(getFieldValue(fields, FIELD_ALIASES.payPerUse)),
      PAY_PER_USE_RULES,
    ),
    feedbackWillingness: normalizeOptionValue(
      normalizeOptionScalarValue(getFieldValue(fields, FIELD_ALIASES.feedbackWillingness)),
      FEEDBACK_WILLINGNESS_RULES,
    ),
    primaryUseCase: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.primaryUseCase)),
    urgency: normalizeOptionValue(
      normalizeOptionScalarValue(getFieldValue(fields, FIELD_ALIASES.urgency)),
      URGENCY_RULES,
    ),
    desiredOutcome: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.desiredOutcome)),
    pilotReadiness: normalizeOptionValue(
      normalizeOptionScalarValue(getFieldValue(fields, FIELD_ALIASES.pilotReadiness)),
      PILOT_READINESS_RULES,
    ),
    capability: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.capability)),
    inputOutput: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.inputOutput)),
    availability: normalizeOptionValue(
      normalizeOptionScalarValue(getFieldValue(fields, FIELD_ALIASES.availability)),
      AVAILABILITY_RULES,
    ),
    responseSpeed: normalizeOptionValue(
      normalizeOptionScalarValue(getFieldValue(fields, FIELD_ALIASES.responseSpeed)),
      RESPONSE_SPEED_RULES,
    ),
    proofTypes: normalizeOptionValues(
      normalizeStringArray(getFieldValue(fields, FIELD_ALIASES.proofTypes)),
      PROOF_TYPE_RULES,
    ),
    proofLink: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.proofLink)),
    bestFitTasks: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.bestFitTasks)),
    notFitTasks: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.notFitTasks)),
    expectation: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.expectation)),
    extraNotes: normalizeScalarValue(getFieldValue(fields, FIELD_ALIASES.extraNotes)),
  };
}

export async function syncEarlyAccessSubmissionToNotion(payload: TallyFormResponseEvent) {
  if (payload.eventType !== "FORM_RESPONSE") {
    throw new Error("unsupported_tally_event");
  }

  const databaseId = process.env.NOTION_EARLY_ACCESS_DATABASE_ID?.trim();

  if (!databaseId) {
    throw new Error("notion_not_configured");
  }

  const schema = await getNotionDatabaseSchema(databaseId);
  const submission = parseEarlyAccessSubmission(payload);
  const properties: Record<string, unknown> = {};
  const titlePropertyName = schema.titlePropertyName;

  if (!titlePropertyName) {
    throw new Error("notion_title_property_missing");
  }

  properties[titlePropertyName] = createTitleProperty(
    submission.name ??
      submission.email ??
      `${submission.track ?? "Applicant"} ${submission.submissionId ?? ""}`.trim(),
  );

  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.email, submission.email, ["email", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.track, submission.track, ["select", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.locale, submission.locale, ["select", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.source, submission.source, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.region, submission.region, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.timezone, submission.timezone, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.currentRole, submission.currentRole, ["select", "rich_text"]);
  assignMultiSelectProperty(properties, schema, NOTION_PROPERTY_ALIASES.aiTools, submission.aiTools);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.agentFamiliarity, submission.agentFamiliarity, ["select", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.payPerUse, submission.payPerUse, ["select", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.feedbackWillingness, submission.feedbackWillingness, ["select", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.primaryUseCase, submission.primaryUseCase, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.urgency, submission.urgency, ["select", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.desiredOutcome, submission.desiredOutcome, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.pilotReadiness, submission.pilotReadiness, ["select", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.capability, submission.capability, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.inputOutput, submission.inputOutput, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.availability, submission.availability, ["select", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.responseSpeed, submission.responseSpeed, ["select", "rich_text"]);
  assignMultiSelectProperty(properties, schema, NOTION_PROPERTY_ALIASES.proofTypes, submission.proofTypes);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.proofLink, submission.proofLink, ["url", "rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.bestFitTasks, submission.bestFitTasks, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.notFitTasks, submission.notFitTasks, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.expectation, submission.expectation, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.extraNotes, submission.extraNotes, ["rich_text"]);
  assignScalarProperty(properties, schema, NOTION_PROPERTY_ALIASES.status, DEFAULT_NOTION_STATUS, ["status", "select"]);

  await notionRequest("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: {
        database_id: databaseId,
      },
      properties,
      children: buildBackupChildren(submission),
    }),
  });

  return submission;
}

export function validateAndReadTallyWebhookPayload(rawBody: string, signature: string | null) {
  const payload = JSON.parse(rawBody) as TallyFormResponseEvent;

  if (!verifyTallySignature(payload, signature)) {
    throw new Error("unauthorized");
  }

  if (!payload?.eventId || !payload?.eventType || !payload?.data) {
    throw new Error("validation_error");
  }

  return payload;
}
