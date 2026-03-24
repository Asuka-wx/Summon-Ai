import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

const ENV_PATH = path.resolve(".env.local");
const API_BASE_URL = "https://api.tally.so";

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    values[key] = value;
  }

  return { content, values };
}

function upsertEnvValues(content, updates) {
  const lines = content.split(/\r?\n/);

  for (const [key, value] of Object.entries(updates)) {
    const nextLine = `${key}=${value}`;
    const existingIndex = lines.findIndex((line) => line.startsWith(`${key}=`));

    if (existingIndex >= 0) {
      lines[existingIndex] = nextLine;
    } else {
      lines.push(nextLine);
    }
  }

  return `${lines.join("\n")}\n`;
}

function ensure(value, message) {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

async function tallyRequest(token, method, pathname, body) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tally API ${method} ${pathname} failed (${response.status}): ${errorBody}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function htmlParagraphs(lines) {
  return lines.map((line) => `<p>${line}</p>`).join("");
}

function formTitleBlock(title, submitLabel) {
  const uuid = randomUUID();

  return {
    uuid,
    type: "FORM_TITLE",
    groupUuid: uuid,
    groupType: "FORM_TITLE",
    payload: {
      title,
      html: title,
      button: {
        label: submitLabel,
      },
    },
  };
}

function textBlock(html) {
  const uuid = randomUUID();

  return {
    uuid,
    type: "TEXT",
    groupUuid: uuid,
    groupType: "TEXT",
    payload: {
      html,
    },
  };
}

function titleBlock(html) {
  const uuid = randomUUID();

  return {
    uuid,
    type: "TITLE",
    groupUuid: uuid,
    groupType: "QUESTION",
    payload: {
      html,
    },
  };
}

function inputQuestion({ title, type, placeholder = "", required = true }) {
  return [
    titleBlock(title),
    {
      uuid: randomUUID(),
      type,
      groupUuid: randomUUID(),
      groupType: type,
      payload: {
        isRequired: required,
        placeholder,
      },
    },
  ];
}

function choiceQuestion({
  title,
  required = true,
  type,
  options,
}) {
  const choiceGroupUuid = randomUUID();
  const groupType =
    type === "MULTIPLE_CHOICE_OPTION"
      ? "MULTIPLE_CHOICE"
      : type === "DROPDOWN_OPTION"
        ? "DROPDOWN"
        : "CHECKBOXES";

  return [
    titleBlock(title),
    ...options.map((option, index) => ({
      uuid: randomUUID(),
      type,
      groupUuid: choiceGroupUuid,
      groupType,
      payload: {
        index,
        isFirst: index === 0,
        isLast: index === options.length - 1,
        isRequired: required,
        ...(required
          ? {
              hasMinChoices: true,
              minChoices: 1,
            }
          : {}),
        ...(type !== "CHECKBOX"
          ? {
              hasMaxChoices: true,
              maxChoices: 1,
            }
          : {}),
        text: option,
      },
    })),
  ];
}

function hiddenFieldsBlock(names) {
  const uuid = randomUUID();

  return {
    uuid,
    type: "HIDDEN_FIELDS",
    groupUuid: uuid,
    groupType: "HIDDEN_FIELDS",
    payload: {
      hiddenFields: names.map((name) => ({
        uuid: randomUUID(),
        name,
      })),
    },
  };
}

function buildSuccessUrl(baseUrl, locale, role) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    role,
    source: `tally-${locale}-${role}`,
  });

  return `${normalizedBase}/${locale}/early-access/success?${params.toString()}`;
}

function getLocalizedCommonFields(locale) {
  if (locale === "zh") {
    return [
      ...inputQuestion({
        title: "你的名字",
        type: "INPUT_TEXT",
        placeholder: "请输入你的名字",
      }),
      ...inputQuestion({
        title: "工作邮箱",
        type: "INPUT_EMAIL",
        placeholder: "name@company.com",
      }),
      ...inputQuestion({
        title: "所在地区",
        type: "INPUT_TEXT",
        placeholder: "例如：Shanghai, China",
      }),
      ...inputQuestion({
        title: "你的时区",
        type: "INPUT_TEXT",
        placeholder: "例如：UTC+8 / Asia/Shanghai",
      }),
      ...choiceQuestion({
        title: "你目前最接近哪类角色？",
        type: "DROPDOWN_OPTION",
        options: [
          "Founder / Business Owner",
          "Product",
          "Growth / Marketing",
          "Operations",
          "Engineer / Developer",
          "Designer",
          "Consultant / Agency",
          "Research / Analyst",
          "Creator / Educator",
          "Other",
        ],
      }),
      ...choiceQuestion({
        title: "你目前最常用的 AI 工具是哪些？",
        type: "CHECKBOX",
        options: [
          "ChatGPT",
          "Claude",
          "Gemini",
          "Cursor",
          "Perplexity",
          "Midjourney / 图像工具",
          "Make / Zapier / n8n",
          "自建工作流 / 脚本",
          "Other",
        ],
      }),
      ...choiceQuestion({
        title: "你对 Agent 的熟悉度如何？",
        type: "MULTIPLE_CHOICE_OPTION",
        options: [
          "只了解过，还没真正使用",
          "试过一些 Agent 产品或工作流",
          "已经在工作中使用过",
          "我自己就在搭建 / 部署 Agent",
        ],
      }),
      ...choiceQuestion({
        title: "如果有高质量、能直接交付结果的 Agent 服务，你愿意按次付费吗？",
        type: "MULTIPLE_CHOICE_OPTION",
        options: [
          "愿意，只要结果真的好",
          "可以考虑，取决于任务和质量",
          "想先试试看",
          "目前不考虑",
        ],
      }),
      ...choiceQuestion({
        title: "你愿意在内测阶段提供反馈吗？",
        type: "MULTIPLE_CHOICE_OPTION",
        options: [
          "愿意，我可以提供详细反馈",
          "愿意，但希望尽量轻量",
          "可能可以",
          "不太方便",
        ],
      }),
    ];
  }

  return [
    ...inputQuestion({
      title: "Your name",
      type: "INPUT_TEXT",
      placeholder: "Enter your name",
    }),
    ...inputQuestion({
      title: "Work email",
      type: "INPUT_EMAIL",
      placeholder: "name@company.com",
    }),
    ...inputQuestion({
      title: "Region",
      type: "INPUT_TEXT",
      placeholder: "For example: San Francisco, USA",
    }),
    ...inputQuestion({
      title: "Timezone",
      type: "INPUT_TEXT",
      placeholder: "For example: PST / UTC-8 / America/Los_Angeles",
    }),
    ...choiceQuestion({
      title: "Which role are you closest to right now?",
      type: "DROPDOWN_OPTION",
      options: [
        "Founder / Business Owner",
        "Product",
        "Growth / Marketing",
        "Operations",
        "Engineer / Developer",
        "Designer",
        "Consultant / Agency",
        "Research / Analyst",
        "Creator / Educator",
        "Other",
      ],
    }),
    ...choiceQuestion({
      title: "Which AI tools do you use most often?",
      type: "CHECKBOX",
      options: [
        "ChatGPT",
        "Claude",
        "Gemini",
        "Cursor",
        "Perplexity",
        "Midjourney / image tools",
        "Make / Zapier / n8n",
        "Custom workflow / scripts",
        "Other",
      ],
    }),
    ...choiceQuestion({
      title: "How familiar are you with agents?",
      type: "MULTIPLE_CHOICE_OPTION",
      options: [
        "I have only looked into them, but not really used them",
        "I have tried some agent products or workflows",
        "I already use them in my work",
        "I build or deploy agents myself",
      ],
    }),
    ...choiceQuestion({
      title: "If a high-quality agent could directly deliver outcomes, would you pay per use?",
      type: "MULTIPLE_CHOICE_OPTION",
      options: [
        "Yes, if the outcome is genuinely strong",
        "Maybe, depending on the task and quality",
        "I would rather try first",
        "Not for now",
      ],
    }),
    ...choiceQuestion({
      title: "Are you willing to provide feedback during closed beta?",
      type: "MULTIPLE_CHOICE_OPTION",
      options: [
        "Yes, I can provide detailed feedback",
        "Yes, but I want it to stay lightweight",
        "Maybe",
        "Not easily",
      ],
    }),
  ];
}

function buildFormSpec(locale, role, redirectBaseUrl) {
  const isZh = locale === "zh";
  const isBuyer = role === "buyer";
  const successUrl = buildSuccessUrl(redirectBaseUrl, locale, role);
  const title = isZh
    ? isBuyer
      ? "SummonAI 需求方抢先体验申请"
      : "SummonAI Builder 抢先体验申请"
    : isBuyer
      ? "SummonAI Buyer Early Access Application"
      : "SummonAI Builder Early Access Application";
  const submitLabel = isZh ? "提交申请" : "Submit application";
  const introLines = isZh
    ? isBuyer
      ? [
          "这不是普通联系表单，而是 SummonAI 的早期申请入口。",
          "我们想先认识那些有真实任务想试一试、也愿意在产品完善过程中给我们反馈的需求方。",
          "从提交到第一次联系，可能需要数周，这通常取决于产品准备进度。",
        ]
      : [
          "这不是普通联系表单，而是 SummonAI 的早期申请入口。",
          "我们想先认识那些有明确专长、愿意把能力沉淀成 Agent，并愿意一起打磨体验的 Builder。",
          "从提交到第一次联系，可能需要数周，这通常取决于产品准备进度。",
        ]
    : isBuyer
      ? [
          "This is not a generic contact form. It is the early access intake for SummonAI.",
          "We want to hear first from buyers with real tasks they genuinely want to try, and who are open to sharing feedback as the product improves.",
          "The first outreach may take several weeks, depending on product readiness.",
        ]
      : [
          "This is not a generic contact form. It is the early access intake for SummonAI.",
          "We want to hear first from builders with a clear specialty, some proof of work, and an openness to shaping the experience with us early.",
          "The first outreach may take several weeks, depending on product readiness.",
        ];

  const closingLines = isZh
    ? [
        "我们会随着产品准备进度分批整理申请。",
        "当有明确下一步时，我们会直接通过邮箱联系你。",
        "正式上线前，我们也可能先通过社区同步进展并邀请一部分申请者更早参与共建。",
      ]
    : [
        "We review applications in waves as the product becomes more ready.",
        "When there is a concrete next step, we will reach out by email directly.",
        "Before full launch, we may also use a community layer to share progress and invite some applicants into earlier collaboration.",
      ];

  const commonBlocks = getLocalizedCommonFields(locale);
  const buyerBlocks = isZh
    ? [
        ...inputQuestion({
          title: "你最想先交给 Agent 的任务是什么？",
          type: "TEXTAREA",
          placeholder:
            "请尽量写清楚任务本身，而不是泛泛地说想提升效率。例如：把用户访谈整理成结构化洞察；把产品素材做成可投放内容。",
        }),
        ...choiceQuestion({
          title: "这个任务对你有多紧迫？",
          type: "MULTIPLE_CHOICE_OPTION",
          options: ["这周就要开始", "两周内", "本月内", "只是先了解"],
        }),
        ...inputQuestion({
          title: "如果 SummonAI 做对了，你最希望拿到什么结果？",
          type: "TEXTAREA",
          placeholder:
            "例如：直接拿到可用交付物；减少外包沟通成本；缩短从需求到结果的时间。",
        }),
        ...choiceQuestion({
          title: "如果我们开放内测，你愿意用真实任务试跑吗？",
          type: "MULTIPLE_CHOICE_OPTION",
          options: ["愿意，马上可以", "愿意，但需要先沟通", "暂时不确定"],
        }),
      ]
    : [
        ...inputQuestion({
          title: "What is the first real task you want to hand to an agent?",
          type: "TEXTAREA",
          placeholder:
            "Be concrete. For example: turn user interviews into structured insights, turn product assets into publishable content, or hand off repetitive ops execution.",
        }),
        ...choiceQuestion({
          title: "How urgent is this task?",
          type: "MULTIPLE_CHOICE_OPTION",
          options: ["This week", "Within 2 weeks", "This month", "Just exploring"],
        }),
        ...inputQuestion({
          title: "If SummonAI gets this right, what outcome do you want most?",
          type: "TEXTAREA",
          placeholder:
            "For example: directly usable deliverables, lower coordination overhead, or a much shorter path from task to outcome.",
        }),
        ...choiceQuestion({
          title: "If we open beta access, would you run a real task through it?",
          type: "MULTIPLE_CHOICE_OPTION",
          options: ["Yes, immediately", "Yes, but I need a quick conversation first", "Not sure yet"],
        }),
      ];
  const builderBlocks = isZh
    ? [
        ...inputQuestion({
          title: "你最想封装成 Agent 的能力是什么？",
          type: "TEXTAREA",
          placeholder: "请写你最擅长、最稳定、最适合被调用的一项能力。",
        }),
        ...inputQuestion({
          title: "你能稳定地把什么输入，转成什么输出？",
          type: "TEXTAREA",
          placeholder:
            "请尽量用“输入 -> 输出”的方式描述。例如：输入为产品资料、用户反馈和录屏；输出为可直接发布的短视频脚本、分镜和字幕。",
        }),
        ...choiceQuestion({
          title: "你的 Agent 通常能稳定在线多久？",
          type: "MULTIPLE_CHOICE_OPTION",
          options: [
            "每天少于 2 小时",
            "每天 2-4 小时",
            "每天 4-8 小时",
            "每天 8 小时以上",
            "可覆盖大部分工作日时段",
            "可接近全天候稳定响应",
          ],
        }),
        ...choiceQuestion({
          title: "你的典型响应 / 开始处理速度是？",
          type: "MULTIPLE_CHOICE_OPTION",
          options: ["10 分钟内", "1 小时内", "4 小时内", "24 小时内", "不固定"],
        }),
        ...choiceQuestion({
          title: "你能提供哪些证明材料？",
          type: "CHECKBOX",
          options: [
            "案例 / Case studies",
            "作品集 / Portfolio",
            "GitHub",
            "Notion / 文档说明",
            "Demo / 录屏",
            "Landing page",
            "历史客户结果",
            "Other",
          ],
        }),
        ...inputQuestion({
          title: "请贴上最能代表你的链接",
          type: "INPUT_LINK",
          placeholder: "例如：作品集、GitHub、Notion、录屏、官网链接",
        }),
        ...inputQuestion({
          title: "你最适合承接哪类任务？",
          type: "INPUT_TEXT",
          placeholder: "请尽量具体，例如：英文 SaaS 落地页文案、用户研究整理、AI 工作流搭建",
        }),
        ...inputQuestion({
          title: "你明确不适合承接哪类任务？",
          type: "TEXTAREA",
          placeholder: "这有助于我们更准确地为你匹配任务。",
        }),
        ...choiceQuestion({
          title: "如果进入下一阶段，你多久能开始试运行？",
          type: "MULTIPLE_CHOICE_OPTION",
          options: ["这周就可以", "两周内", "本月内", "更晚一些"],
        }),
      ]
    : [
        ...inputQuestion({
          title: "What capability do you most want to package as an agent?",
          type: "TEXTAREA",
          placeholder: "Describe the one capability that is both your sharpest and most repeatable.",
        }),
        ...inputQuestion({
          title: "What input can you reliably turn into what output?",
          type: "TEXTAREA",
          placeholder:
            "Describe it in an input -> output format. For example: product brief, user feedback, and recordings -> publishable short-form script, shot list, and subtitles.",
        }),
        ...choiceQuestion({
          title: "How stable is your agent's online availability?",
          type: "MULTIPLE_CHOICE_OPTION",
          options: [
            "Less than 2 hours per day",
            "2-4 hours per day",
            "4-8 hours per day",
            "8+ hours per day",
            "Most working-day hours",
            "Near full-day stable coverage",
          ],
        }),
        ...choiceQuestion({
          title: "What is your typical response or start time?",
          type: "MULTIPLE_CHOICE_OPTION",
          options: ["Within 10 minutes", "Within 1 hour", "Within 4 hours", "Within 24 hours", "Not fixed"],
        }),
        ...choiceQuestion({
          title: "What proof materials can you provide?",
          type: "CHECKBOX",
          options: [
            "Case studies",
            "Portfolio",
            "GitHub",
            "Notion / documentation",
            "Demo / recording",
            "Landing page",
            "Past client outcomes",
            "Other",
          ],
        }),
        ...inputQuestion({
          title: "Paste the single link that best represents you",
          type: "INPUT_LINK",
          placeholder: "Portfolio, GitHub, Notion, demo recording, or landing page",
        }),
        ...inputQuestion({
          title: "What tasks are you best suited for?",
          type: "INPUT_TEXT",
          placeholder: "Be specific. For example: English SaaS landing page copy, user research synthesis, or AI workflow implementation.",
        }),
        ...inputQuestion({
          title: "What tasks are clearly not a fit for you?",
          type: "TEXTAREA",
          placeholder: "This helps us avoid weak matches and protect your positioning.",
        }),
        ...choiceQuestion({
          title: "If we move into the next step, how soon could you start a pilot?",
          type: "MULTIPLE_CHOICE_OPTION",
          options: ["This week", "Within 2 weeks", "This month", "Later"],
        }),
      ];
  const closingBlocks = isZh
    ? [
        ...inputQuestion({
          title: "你对 SummonAI 最期待的是什么？",
          type: "TEXTAREA",
          placeholder: "你希望这个产品最终帮你解决什么？现有工具为什么还不够？",
        }),
        ...inputQuestion({
          title: "其他补充信息（可选）",
          type: "TEXTAREA",
          required: false,
          placeholder: "如果有任何额外补充，可以写在这里。",
        }),
      ]
    : [
        ...inputQuestion({
          title: "What do you most want SummonAI to become for you?",
          type: "TEXTAREA",
          placeholder: "What do you hope this product eventually solves for you, and why are current tools still falling short?",
        }),
        ...inputQuestion({
          title: "Anything else we should know? (optional)",
          type: "TEXTAREA",
          required: false,
          placeholder: "Add any context here if it helps us review your application.",
        }),
      ];

  return {
    key: `${locale}_${role}`.toUpperCase(),
    locale,
    role,
    title,
    redirectUrl: successUrl,
    blocks: [
      formTitleBlock(title, submitLabel),
      textBlock(htmlParagraphs(introLines)),
      ...commonBlocks,
      ...(isBuyer ? buyerBlocks : builderBlocks),
      ...closingBlocks,
      textBlock(htmlParagraphs(closingLines)),
      hiddenFieldsBlock(["locale", "source", "role"]),
    ],
    settings: {
      language: locale === "zh" ? "zh" : "en",
      redirectOnCompletion: {
        html: successUrl,
        mentions: [],
      },
      styles: {
        theme: "CUSTOM",
        color: {
          background: "#121216",
          text: "#f4f4f5",
          accent: "#8b5cf6",
          buttonBackground: "#8b5cf6",
          buttonText: "#ffffff",
        },
        direction: "ltr",
      },
    },
  };
}

async function ensureWorkspaceAccess(token, workspaceId) {
  await tallyRequest(token, "GET", `/workspaces/${workspaceId}`);
}

async function upsertForm(token, workspaceId, spec, existingId) {
  const body = {
    workspaceId,
    status: "PUBLISHED",
    blocks: spec.blocks,
    settings: spec.settings,
  };

  if (existingId) {
    const updated = await tallyRequest(token, "PATCH", `/forms/${existingId}`, body);

    return {
      id: updated.id,
      url: `https://tally.so/r/${updated.id}`,
      action: "updated",
    };
  }

  const created = await tallyRequest(token, "POST", "/forms", body);

  return {
    id: created.id,
    url: `https://tally.so/r/${created.id}`,
    action: "created",
  };
}

async function main() {
  const { content, values } = parseEnvFile(ENV_PATH);
  const token = ensure(values.TALLY_API_KEY, "Missing TALLY_API_KEY in .env.local");
  const workspaceId = ensure(values.TALLY_WORKSPACE_ID, "Missing TALLY_WORKSPACE_ID in .env.local");
  const redirectBaseUrl = values.TALLY_EARLY_ACCESS_REDIRECT_URL || values.NEXT_PUBLIC_APP_URL;

  ensure(
    redirectBaseUrl,
    "Missing TALLY_EARLY_ACCESS_REDIRECT_URL or NEXT_PUBLIC_APP_URL in .env.local",
  );

  await ensureWorkspaceAccess(token, workspaceId);

  const specs = [
    buildFormSpec("zh", "buyer", redirectBaseUrl),
    buildFormSpec("zh", "builder", redirectBaseUrl),
    buildFormSpec("en", "buyer", redirectBaseUrl),
    buildFormSpec("en", "builder", redirectBaseUrl),
  ];
  const envUpdates = {};

  for (const spec of specs) {
    const idEnvKey = `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_${spec.key}`;
    const urlEnvKey = `NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_URL_${spec.key}`;
    const existingId = values[idEnvKey] || "";
    const result = await upsertForm(token, workspaceId, spec, existingId);

    envUpdates[idEnvKey] = result.id;
    envUpdates[urlEnvKey] = result.url;

    console.log(`${result.action.toUpperCase()}: ${spec.title} -> ${result.url}`);
  }

  const nextContent = upsertEnvValues(content, envUpdates);
  writeFileSync(ENV_PATH, nextContent, "utf8");

  console.log("Updated .env.local with locale + role specific Tally form URLs and IDs.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
