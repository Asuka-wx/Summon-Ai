import { render } from "@react-email/render";
import { Resend } from "resend";

import { getNotificationContent } from "@/lib/notifications/content";
import { incrementEmailQuota, checkEmailQuota } from "@/lib/notifications/quota";
import { NotificationEmail } from "@/lib/notifications/templates/notification-email";
import { createUnsubscribeToken } from "@/lib/notifications/token";
import { NOTIFICATION_DEFINITIONS, type NotificationType } from "@/lib/notifications/types";
import { createAdminClient } from "@/lib/supabase/admin";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getNotificationPreferences(preferences: Record<string, unknown> | null) {
  const base = preferences ?? {};
  const emailTypes = (base.email_types ?? {}) as Record<string, boolean>;

  return {
    email: base.email !== false,
    inApp: base.in_app !== false,
    weeklyReport: base.weekly_report !== false,
    emailTypes,
  };
}

export async function sendNotification(
  userId: string,
  type: NotificationType,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createAdminClient();
  const definition = NOTIFICATION_DEFINITIONS[type];

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, locale, notification_preferences")
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new Error(`Failed to load user ${userId} for notification ${type}.`);
  }

  const locale = (user.locale === "zh" ? "zh" : "en") as "en" | "zh";
  const content = getNotificationContent({
    type,
    locale,
    metadata,
  });
  const preferences = getNotificationPreferences(
    (user.notification_preferences ?? null) as Record<string, unknown> | null,
  );

  if (preferences.inApp) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title: content.title,
      body: content.body,
      link: content.href,
      metadata,
      is_read: false,
    });
  }

  const emailTypeEnabled =
    preferences.emailTypes[type] !== undefined ? preferences.emailTypes[type] : true;

  if (!definition.emailEnabled || !preferences.email || !emailTypeEnabled || !user.email) {
    return {
      delivered: "in_app_only",
    };
  }

  const quota = await checkEmailQuota(definition.priority);

  if (!quota.allowed) {
    if (quota.fallbackMode) {
      await supabase.from("audit_logs").insert({
        event_type: "email_quota_fallback",
        user_id: userId,
        amount: 0,
        metadata: {
          notification_type: type,
          priority: definition.priority,
        },
      });
    }

    return {
      delivered: "quota_downgraded",
      daily_count: quota.dailyCount,
      monthly_count: quota.monthlyCount,
    };
  }

  const resend = getResendClient();

  if (!resend) {
    return {
      delivered: "missing_resend_config",
    };
  }

  const unsubscribeToken = await createUnsubscribeToken({
    userId,
    notificationType: type,
  });
  const unsubscribeHref = `${getAppUrl()}/api/notifications/unsubscribe?token=${encodeURIComponent(
    unsubscribeToken,
  )}`;
  const emailHtml = await render(
    NotificationEmail({
      title: content.title,
      body: content.body,
      actionLabel: locale === "zh" ? "查看详情" : "View details",
      href: `${getAppUrl()}${content.href}`,
      unsubscribeHref,
    }),
  );

  for (let attempt = 0; attempt <= Number(process.env.EMAIL_RETRY_MAX ?? 2); attempt += 1) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@summonai.xyz",
        to: user.email,
        subject: content.title,
        html: emailHtml,
      });

      await incrementEmailQuota();

      await supabase
        .from("notifications")
        .update({
          email_sent: true,
        })
        .eq("user_id", userId)
        .eq("type", type)
        .eq("title", content.title)
        .eq("body", content.body)
        .is("email_sent", false);

      return {
        delivered: "email_and_in_app",
      };
    } catch (error) {
      if (attempt === Number(process.env.EMAIL_RETRY_MAX ?? 2)) {
        await supabase.from("audit_logs").insert({
          event_type: "email_send_failed",
          user_id: userId,
          amount: 0,
          metadata: {
            notification_type: type,
            error: error instanceof Error ? error.message : "Unknown email error",
          },
        });
      }
    }
  }

  return {
    delivered: "in_app_only",
  };
}

export async function sendWeeklyReports() {
  const supabase = createAdminClient();
  const enabled = (process.env.WEEKLY_REPORT_ENABLED ?? "true") === "true";

  if (!enabled) {
    return {
      enabled: false,
      sent: 0,
    };
  }

  const { data: users } = await supabase
    .from("users")
    .select("id, locale, notification_preferences, email")
    .not("email", "is", null)
    .limit(50);

  let sent = 0;

  for (const user of users ?? []) {
    const preferences = getNotificationPreferences(
      (user.notification_preferences ?? null) as Record<string, unknown> | null,
    );

    if (!preferences.email || !preferences.weeklyReport || !user.email) {
      continue;
    }

    const quota = await checkEmailQuota("P2");
    if (!quota.allowed) {
      continue;
    }

    await sendNotification(user.id, "ranking_change", {
      leaderboard_scope: "weekly_report",
    });
    sent += 1;
  }

  await supabase.from("audit_logs").insert({
    event_type: "weekly_report_sent",
    amount: 0,
    metadata: {
      sent,
    },
  });

  return {
    enabled: true,
    sent,
  };
}
