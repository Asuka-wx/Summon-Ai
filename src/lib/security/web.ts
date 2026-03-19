export const SECURITY_HEADERS = {
  "content-security-policy":
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https: wss:;",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
} as const;

export function applySecurityHeaders(response: Response) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export function isAllowedOrigin(origin: string | null) {
  if (!origin) {
    return true;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const relayUrl = process.env.RELAY_INTERNAL_URL;

  return [appUrl, relayUrl].filter(Boolean).some((allowed) => origin.startsWith(String(allowed)));
}
