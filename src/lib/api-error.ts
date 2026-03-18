import { NextResponse } from "next/server";

import { createApiError, type ErrorCode, type ErrorDetails } from "@/lib/errors";

export function createErrorResponse(
  status: number,
  error: ErrorCode,
  message: string,
  details: ErrorDetails = {},
) {
  return NextResponse.json(createApiError(error, message, details), { status });
}
