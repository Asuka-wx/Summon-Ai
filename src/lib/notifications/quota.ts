import { getRedisClient } from "@/lib/upstash/client";
import type { NotificationPriority } from "@/lib/notifications/types";

function getQuotaKeys() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const month = now.toISOString().slice(0, 7);

  return {
    dailyKey: `email:daily:${day}`,
    monthlyKey: `email:monthly:${month}`,
  };
}

export async function checkEmailQuota(priority: NotificationPriority) {
  const redis = getRedisClient();

  if (!redis) {
    return {
      allowed: priority === "P0",
      fallbackMode: true,
      dailyCount: 0,
      monthlyCount: 0,
    };
  }

  const { dailyKey, monthlyKey } = getQuotaKeys();
  const [dailyCountRaw, monthlyCountRaw] = await Promise.all([
    redis.get<number>(dailyKey),
    redis.get<number>(monthlyKey),
  ]);

  const dailyCount = Number(dailyCountRaw ?? 0);
  const monthlyCount = Number(monthlyCountRaw ?? 0);

  if (priority === "P0") {
    return {
      allowed: dailyCount <= 99,
      fallbackMode: false,
      dailyCount,
      monthlyCount,
    };
  }

  if (priority === "P1") {
    return {
      allowed: dailyCount <= 80,
      fallbackMode: false,
      dailyCount,
      monthlyCount,
    };
  }

  return {
    allowed: dailyCount <= 60,
    fallbackMode: false,
    dailyCount,
    monthlyCount,
  };
}

export async function incrementEmailQuota() {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  const { dailyKey, monthlyKey } = getQuotaKeys();
  await Promise.all([
    redis.incr(dailyKey),
    redis.expire(dailyKey, 48 * 60 * 60),
    redis.incr(monthlyKey),
    redis.expire(monthlyKey, 35 * 24 * 60 * 60),
  ]);
}
