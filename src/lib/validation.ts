import { z, type ZodTypeAny } from "zod";

import { createErrorResponse } from "@/lib/api-error";

function flattenZodIssues(error: z.ZodError) {
  const details: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "root";

    if (!(key in details)) {
      details[key] = issue.message;
    }
  }

  return details;
}

export function createValidationErrorResponse(
  error: z.ZodError,
  message = "Request validation failed.",
) {
  return createErrorResponse(400, "validation_error", message, flattenZodIssues(error));
}

export async function parseJsonBody<TSchema extends ZodTypeAny>(
  request: Request,
  schema: TSchema,
) {
  try {
    const body = await request.json();
    return schema.safeParse(body);
  } catch {
    return schema.safeParse(undefined);
  }
}

export function parseSearchParams<TSchema extends ZodTypeAny>(
  request: Request,
  schema: TSchema,
) {
  const { searchParams } = new URL(request.url);
  const payload = Object.fromEntries(searchParams.entries());

  return schema.safeParse(payload);
}
