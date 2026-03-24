export type EarlyAccessRole = "buyer" | "builder";
export type EarlyAccessLocale = "en" | "zh";

type EarlyAccessFormContext = {
  locale: EarlyAccessLocale;
  role?: EarlyAccessRole | null;
  source?: string | null;
};

type EarlyAccessFormConfig = {
  formId: string | null;
  publicUrl: string | null;
  embedUrl: string | null;
  isConfigured: boolean;
  canEmbed: boolean;
  source: string;
};

const DEFAULT_SOURCE = "summonai-landing";

function clean(value: string | undefined | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function appendQueryParams(
  input: string,
  params: Record<string, string | null | undefined>,
) {
  const url = new URL(input);

  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    url.searchParams.set(key, value);
  });

  return url.toString();
}

function extractTallyFormId(formUrl: string | null) {
  if (!formUrl) {
    return null;
  }

  try {
    const url = new URL(formUrl);
    const match = url.pathname.match(/^\/(?:r|embed)\/([^/?#]+)/);

    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function getLocalePrefix(locale: EarlyAccessLocale) {
  return locale === "zh" ? "ZH" : "EN";
}

function getRolePrefix(role: EarlyAccessRole) {
  return role === "buyer" ? "BUYER" : "BUILDER";
}

function readFormValue(kind: "URL" | "ID", locale: EarlyAccessLocale, role: EarlyAccessRole) {
  const localePrefix = getLocalePrefix(locale);
  const rolePrefix = getRolePrefix(role);
  const roleScoped = clean(
    process.env[`NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_${kind}_${localePrefix}_${rolePrefix}`],
  );

  if (roleScoped) {
    return roleScoped;
  }

  const legacy = clean(process.env[`NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_${kind}`]);

  return legacy;
}

export function getEarlyAccessFormConfig({
  locale,
  role,
  source,
}: EarlyAccessFormContext): EarlyAccessFormConfig {
  const normalizedSource = clean(source) ?? DEFAULT_SOURCE;

  if (!role) {
    return {
      formId: null,
      publicUrl: null,
      embedUrl: null,
      isConfigured: false,
      canEmbed: false,
      source: normalizedSource,
    };
  }

  const configuredUrl = readFormValue("URL", locale, role);
  const configuredId = readFormValue("ID", locale, role) ?? extractTallyFormId(configuredUrl);
  const shareUrlBase = configuredUrl ?? (configuredId ? `https://tally.so/r/${configuredId}` : null);
  const baseParams = {
    locale,
    role,
    source: normalizedSource,
  };
  const publicUrl = shareUrlBase ? appendQueryParams(shareUrlBase, baseParams) : null;
  const embedUrl = configuredId
    ? appendQueryParams(`https://tally.so/embed/${configuredId}`, {
        alignLeft: "1",
        hideTitle: "1",
        dynamicHeight: "1",
        ...baseParams,
      })
    : null;

  return {
    formId: configuredId,
    publicUrl,
    embedUrl,
    isConfigured: Boolean(publicUrl || embedUrl),
    canEmbed: Boolean(embedUrl),
    source: normalizedSource,
  };
}
