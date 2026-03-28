import { readFileSync } from "node:fs";
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

  return values;
}

function ensure(value, message) {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

async function tallyRequest(token, pathname) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Tally API GET ${pathname} failed (${response.status})`);
  }

  return response.json();
}

function readTitle(block) {
  const schema = block?.payload?.safeHTMLSchema;

  if (Array.isArray(schema) && Array.isArray(schema[0])) {
    return schema[0][0];
  }

  return null;
}

async function main() {
  const env = parseEnvFile(ENV_PATH);
  const token = ensure(env.TALLY_API_KEY, "Missing TALLY_API_KEY in .env.local");
  const forms = [
    ["zh_buyer", env.NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_ZH_BUYER],
    ["zh_builder", env.NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_ZH_BUILDER],
    ["en_buyer", env.NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_EN_BUYER],
    ["en_builder", env.NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_ID_EN_BUILDER],
  ];

  for (const [label, formId] of forms) {
    const form = await tallyRequest(token, `/forms/${formId}`);
    let currentTitle = null;

    console.log(`FORM ${label} ${formId}`);

    for (const block of form.blocks ?? []) {
      if (block.type === "TITLE") {
        currentTitle = readTitle(block);
        continue;
      }

      if (!["CHECKBOX", "MULTIPLE_CHOICE_OPTION", "DROPDOWN_OPTION"].includes(block.type)) {
        continue;
      }

      console.log(
        JSON.stringify({
          question: currentTitle,
          type: block.type,
          uuid: block.uuid,
          text: block.payload?.text,
        }),
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
