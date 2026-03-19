import { jwtVerify, SignJWT } from "jose";

const encoder = new TextEncoder();

function getNotificationTokenSecret() {
  const secret = process.env.DATA_ENCRYPTION_MASTER_KEY ?? process.env.RELAY_SECRET;

  if (!secret) {
    throw new Error("Missing notification token secret.");
  }

  return encoder.encode(secret);
}

export async function createUnsubscribeToken({
  userId,
  notificationType,
}: {
  userId: string;
  notificationType: string;
}) {
  return new SignJWT({
    user_id: userId,
    notification_type: notificationType,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getNotificationTokenSecret());
}

export async function verifyUnsubscribeToken(token: string) {
  const { payload } = await jwtVerify(token, getNotificationTokenSecret());

  return {
    userId: String(payload.user_id),
    notificationType: String(payload.notification_type),
  };
}
