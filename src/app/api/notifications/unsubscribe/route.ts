import { verifyUnsubscribeToken } from "@/lib/notifications/token";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return Response.json(
      {
        ok: false,
        message: "Missing unsubscribe token.",
      },
      { status: 400 },
    );
  }

  try {
    const { userId, notificationType } = await verifyUnsubscribeToken(token);
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users")
      .select("notification_preferences")
      .eq("id", userId)
      .single();

    const preferences = {
      ...(user?.notification_preferences ?? {}),
      email_types: {
        ...((user?.notification_preferences as Record<string, unknown> | null)?.email_types as
          | Record<string, boolean>
          | undefined),
        [notificationType]: false,
      },
    };

    await supabase
      .from("users")
      .update({
        notification_preferences: preferences,
      })
      .eq("id", userId);

    return Response.json({
      ok: true,
      notification_type: notificationType,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        message: "Invalid unsubscribe token.",
      },
      { status: 401 },
    );
  }
}
