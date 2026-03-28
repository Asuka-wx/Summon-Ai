type RedirectTargetInput = string | string[] | null | undefined;

function readFirstValue(value: RedirectTargetInput) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeInternalRedirectTarget(
  value: RedirectTargetInput,
  fallback: `/${string}`,
): `/${string}` {
  const candidate = readFirstValue(value)?.trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  return candidate as `/${string}`;
}
