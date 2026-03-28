import { readFileSync } from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(".env.local");
const PROJECT_PATH = path.resolve(".vercel/project.json");
const VERCEL_API_BASE_URL = "https://api.vercel.com";

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

async function vercelRequest(token, pathname, init) {
  const response = await fetch(`${VERCEL_API_BASE_URL}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Vercel API ${init?.method ?? "GET"} ${pathname} failed (${response.status}): ${errorBody}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function getProjectConfig() {
  const raw = readFileSync(PROJECT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  return {
    projectId: ensure(parsed.projectId, "Missing projectId in .vercel/project.json"),
    teamId: parsed.orgId?.trim() || null,
  };
}

async function main() {
  const envValues = parseEnvFile(ENV_PATH);
  const vercelToken = ensure(
    process.env.VERCEL_TOKEN?.trim() || envValues.VERCEL_TOKEN?.trim(),
    "Missing VERCEL_TOKEN in environment or .env.local",
  );
  const notionToken = ensure(envValues.NOTION_API_TOKEN?.trim(), "Missing NOTION_API_TOKEN in .env.local");
  const webhookSecret = ensure(
    envValues.TALLY_WEBHOOK_SECRET?.trim(),
    "Missing TALLY_WEBHOOK_SECRET in .env.local",
  );
  const databaseId = ensure(
    envValues.NOTION_EARLY_ACCESS_DATABASE_ID?.trim(),
    "Missing NOTION_EARLY_ACCESS_DATABASE_ID in .env.local",
  );
  const webhookEnabled = envValues.EARLY_ACCESS_WEBHOOK_ENABLED?.trim() || "true";
  const { projectId, teamId } = getProjectConfig();
  const params = new URLSearchParams({ upsert: "true" });

  if (teamId) {
    params.set("teamId", teamId);
  }

  const requestBody = [
    {
      key: "TALLY_WEBHOOK_SECRET",
      value: webhookSecret,
      type: "encrypted",
      target: ["production"],
    },
    {
      key: "NOTION_API_TOKEN",
      value: notionToken,
      type: "encrypted",
      target: ["production"],
    },
    {
      key: "NOTION_EARLY_ACCESS_DATABASE_ID",
      value: databaseId,
      type: "encrypted",
      target: ["production"],
    },
    {
      key: "EARLY_ACCESS_WEBHOOK_ENABLED",
      value: webhookEnabled,
      type: "encrypted",
      target: ["production"],
    },
  ];

  await vercelRequest(vercelToken, `/v10/projects/${projectId}/env?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  console.log("Synced early-access webhook environment variables to Vercel production.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
