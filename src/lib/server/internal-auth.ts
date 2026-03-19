export function isInternalRelayRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";

  return Boolean(token && process.env.CRON_SECRET && token === process.env.CRON_SECRET);
}
