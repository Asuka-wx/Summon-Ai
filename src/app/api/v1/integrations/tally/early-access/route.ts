import { createErrorResponse } from "@/lib/api-error";
import {
  syncEarlyAccessSubmissionToNotion,
  validateAndReadTallyWebhookPayload,
} from "@/lib/integrations/tally/early-access";

export async function POST(request: Request) {
  if (process.env.EARLY_ACCESS_WEBHOOK_ENABLED === "false") {
    return createErrorResponse(
      503,
      "not_found",
      "Early-access webhook sync is currently disabled.",
    );
  }

  try {
    const rawBody = await request.text();
    const payload = validateAndReadTallyWebhookPayload(
      rawBody,
      request.headers.get("tally-signature"),
    );
    const submission = await syncEarlyAccessSubmissionToNotion(payload);

    return Response.json({
      ok: true,
      eventId: submission.eventId,
      submissionId: submission.submissionId,
      formId: submission.formId,
      locale: submission.locale,
      track: submission.track,
      source: submission.source,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("[tally-early-access-sync] failed", {
        message: error.message,
      });

      if (error.message === "unauthorized") {
        return createErrorResponse(401, "unauthorized", "Missing or invalid Tally webhook signature.");
      }

      if (error.message === "validation_error") {
        return createErrorResponse(400, "validation_error", "Tally webhook payload is invalid.");
      }

      if (error.message === "unsupported_tally_event") {
        return Response.json({ ok: true, ignored: true });
      }

      if (
        error.message === "notion_not_configured" ||
        error.message === "notion_title_property_missing" ||
        error.message === "tally_webhook_not_configured"
      ) {
        return createErrorResponse(503, "not_found", "Webhook sync is not configured correctly.");
      }
    }

    return createErrorResponse(500, "validation_error", "Failed to sync Tally submission to Notion.");
  }
}
