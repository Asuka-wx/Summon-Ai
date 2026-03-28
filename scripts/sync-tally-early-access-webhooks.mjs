import { readFileSync } from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(".env.local");
const API_BASE_URL = "https://api.tally.so";
const EXTERNAL_SUBSCRIBER = "summonai-early-access-webhook";

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

  return values;
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
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Tally API ${method} ${pathname} failed (${response.status}): ${errorBody}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function listAllWebhooks(token) {
  const webhooks = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await tallyRequest(token, "GET", `/webhooks?page=${page}&limit=100`);
    webhooks.push(...(result.webhooks ?? []));
    hasMore = Boolean(result.hasMore);
    page += 1;
  }

  return webhooks;
}

async function deleteWebhook(token, webhookId) {
  await tallyRequest(token, "DELETE", `/webhooks/${webhookId}`);
}

async function createWebhook(token, body) {
  return tallyRequest(token, "POST", "/webhooks", body);
}

function getWebhookUrl(envValues) {
  const baseUrl =
    envValues.TALLY_EARLY_ACCESS_WEBHOOK_BASE_URL?.trim() ||
    envValues.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://summonai.xyz";

  return `${baseUrl.replace(/\/+$/, "")}/api/v1/integrations/tally/early-access`;
}

function getFormSpecs(envValues) {
  return [
    {
      label: "zh buyer",
      formId: ensure(
        envValues.NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_ZH_BUYER?.trim(),
        "Missing NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_ZH_BUYER in .env.local",
      ),
    },
    {
      label: "zh builder",
      formId: ensure(
        envValues.NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_ZH_BUILDER?.trim(),
        "Missing NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_ZH_BUILDER in .env.local",
      ),
    },
    {
      label: "en buyer",
      formId: ensure(
        envValues.NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_EN_BUYER?.trim(),
        "Missing NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_EN_BUYER in .env.local",
      ),
    },
    {
      label: "en builder",
      formId: ensure(
        envValues.NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_EN_BUILDER?.trim(),
        "Missing NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_EN_BUILDER in .env.local",
      ),
    },
  ];
}

async function syncWebhookForForm(token, existingWebhooks, webhookUrl, signingSecret, formSpec) {
  const staleWebhooks = existingWebhooks.filter(
    (webhook) =>
      webhook.formId === formSpec.formId &&
      (webhook.url === webhookUrl || webhook.externalSubscriber === EXTERNAL_SUBSCRIBER),
  );

  for (const webhook of staleWebhooks) {
    await deleteWebhook(token, webhook.id);
    console.log(`DELETED webhook ${webhook.id} for ${formSpec.label} (${formSpec.formId})`);
  }

  const created = await createWebhook(token, {
    formId: formSpec.formId,
    url: webhookUrl,
    eventTypes: ["FORM_RESPONSE"],
    signingSecret,
    externalSubscriber: EXTERNAL_SUBSCRIBER,
  });

  console.log(`CREATED webhook ${created.id} for ${formSpec.label} (${formSpec.formId}) -> ${webhookUrl}`);
}

async function main() {
  const envValues = parseEnvFile(ENV_PATH);
  const token = ensure(envValues.TALLY_API_KEY?.trim(), "Missing TALLY_API_KEY in .env.local");
  const signingSecret = ensure(
    envValues.TALLY_WEBHOOK_SECRET?.trim(),
    "Missing TALLY_WEBHOOK_SECRET in .env.local",
  );
  const webhookUrl = getWebhookUrl(envValues);
  const formSpecs = getFormSpecs(envValues);
  const existingWebhooks = await listAllWebhooks(token);

  for (const formSpec of formSpecs) {
    await syncWebhookForForm(token, existingWebhooks, webhookUrl, signingSecret, formSpec);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
