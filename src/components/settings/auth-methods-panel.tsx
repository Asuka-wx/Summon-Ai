"use client";

import { Github, Link2, LoaderCircle, ShieldCheck, Unlink2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserIdentity } from "@supabase/supabase-js";

import { persistOAuthPendingState } from "@/lib/auth/oauth-state";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type AuthMethodsPanelProps = {
  locale: "en" | "zh";
  email: string | null;
  returnHref: `/${string}`;
};

type SupportedProvider = "github" | "google";

const SUPPORTED_PROVIDERS: SupportedProvider[] = ["google", "github"];

const COPY = {
  en: {
    title: "Sign-in methods",
    description:
      "Connect Google or GitHub so you can enter the same account with either sign-in method.",
    emailLabel: "Account email",
    loading: "Loading sign-in methods...",
    notConnected: "Not connected yet",
    connect: "Connect",
    connected: "Connected",
    disconnect: "Disconnect",
    redirecting: "Redirecting to provider...",
    lastUsed: "Last used",
    protected: "At least one sign-in method must remain connected.",
    connectFailed: "Unable to start the linking flow right now.",
    disconnectFailed: "Unable to disconnect this sign-in method right now.",
    manualDisabled:
      "Account linking is not enabled yet in the current auth configuration.",
    alreadyLinked: "This sign-in method is already linked to your account.",
    notFound: "This sign-in method is no longer available on your account.",
    confirmDisconnect: "Disconnect this sign-in method from your account?",
  },
  zh: {
    title: "登录方式",
    description: "把 Google 或 GitHub 连接到同一个账户后，你就可以用任一登录方式进入同一账号。",
    emailLabel: "账户邮箱",
    loading: "正在读取登录方式...",
    notConnected: "尚未连接",
    connect: "连接",
    connected: "已连接",
    disconnect: "断开",
    redirecting: "正在跳转到登录提供方...",
    lastUsed: "最近使用",
    protected: "至少要保留一种可用登录方式。",
    connectFailed: "暂时无法发起绑定流程。",
    disconnectFailed: "暂时无法断开这个登录方式。",
    manualDisabled: "当前认证配置还没有开启账号绑定能力。",
    alreadyLinked: "这个登录方式已经绑定到当前账户。",
    notFound: "这个登录方式已经不在当前账户上了。",
    confirmDisconnect: "确定要从当前账户断开这个登录方式吗？",
  },
} as const;

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.72-.06-1.25-.19-1.8H12v3.48h5.53c-.11.87-.71 2.19-2.04 3.07l-.02.12 2.84 2.2.2.02c1.84-1.7 3.09-4.19 3.09-7.09Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.89 6.61-2.42l-3.15-2.44c-.84.59-1.97 1-3.46 1-2.64 0-4.88-1.74-5.67-4.15l-.11.01-2.95 2.29-.04.1C4.87 19.86 8.14 22 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.33 13.99A5.95 5.95 0 0 1 6 12c0-.69.12-1.36.31-1.99l-.01-.13-2.99-2.33-.1.05A9.99 9.99 0 0 0 2 12c0 1.62.39 3.15 1.21 4.4l3.12-2.41Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.86c1.87 0 3.13.81 3.85 1.49l2.81-2.74C16.95 3.02 14.7 2 12 2 8.14 2 4.87 4.14 3.2 7.6l3.1 2.41C7.12 7.6 9.36 5.86 12 5.86Z"
      />
    </svg>
  );
}

function formatLastSignIn(locale: "en" | "zh", value?: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function readAuthErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

export function AuthMethodsPanel({
  locale,
  email,
  returnHref,
}: AuthMethodsPanelProps) {
  const copy = COPY[locale];
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<SupportedProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadIdentities() {
    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUserIdentities();

      if (error) {
        setMessage(copy.connectFailed);
        return;
      }

      setIdentities(data.identities);
    } catch {
      setMessage(copy.connectFailed);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadIdentities();
    // We only need the current auth identities when the panel mounts or after callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect(provider: SupportedProvider) {
    setBusyProvider(provider);
    setMessage(copy.redirecting);

    try {
      const supabase = createClient();
      persistOAuthPendingState({
        returnUrl: returnHref,
      });

      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: `${window.location.origin}/${locale}/auth/callback`,
        },
      });

      if (error) {
        const code = readAuthErrorCode(error);
        if (code === "manual_linking_disabled") {
          setMessage(copy.manualDisabled);
        } else if (code === "identity_already_exists") {
          setMessage(copy.alreadyLinked);
        } else {
          setMessage(copy.connectFailed);
        }
        setBusyProvider(null);
      }
    } catch {
      setMessage(copy.connectFailed);
      setBusyProvider(null);
    }
  }

  async function handleDisconnect(provider: SupportedProvider) {
    const identity = identities.find((item) => item.provider === provider);

    if (!identity) {
      setMessage(copy.notFound);
      return;
    }

    if (identities.length <= 1) {
      setMessage(copy.protected);
      return;
    }

    if (!window.confirm(copy.confirmDisconnect)) {
      return;
    }

    setBusyProvider(provider);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.unlinkIdentity(identity);

      if (error) {
        const code = readAuthErrorCode(error);
        if (
          code === "single_identity_not_deletable" ||
          code === "email_conflict_identity_not_deletable"
        ) {
          setMessage(copy.protected);
        } else if (code === "identity_not_found") {
          setMessage(copy.notFound);
        } else {
          setMessage(copy.disconnectFailed);
        }
        return;
      }

      await loadIdentities();
    } catch {
      setMessage(copy.disconnectFailed);
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
        {copy.title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.description}</p>
      <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-background/75 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{copy.emailLabel}:</span>{" "}
        {email ?? "—"}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {SUPPORTED_PROVIDERS.map((provider) => {
          const identity = identities.find((item) => item.provider === provider);
          const isConnected = Boolean(identity);
          const isBusy = busyProvider === provider;
          const lastSignIn = formatLastSignIn(locale, identity?.last_sign_in_at);

          return (
            <div
              key={provider}
              className="rounded-[1.5rem] border border-border/70 bg-background/75 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-foreground">
                    {provider === "google" ? <GoogleIcon /> : <Github className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {provider === "google" ? "Google" : "GitHub"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isConnected ? copy.connected : copy.notConnected}
                    </p>
                  </div>
                </div>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {copy.connected}
                  </span>
                ) : null}
              </div>

              {lastSignIn ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {copy.lastUsed}: {lastSignIn}
                </p>
              ) : null}

              <div className="mt-5 flex gap-3">
                {isConnected ? (
                  <Button
                    className="rounded-2xl"
                    disabled={isBusy || identities.length <= 1}
                    onClick={() => void handleDisconnect(provider)}
                    type="button"
                    variant="outline"
                  >
                    {isBusy ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink2 className="h-4 w-4" />
                    )}
                    {copy.disconnect}
                  </Button>
                ) : (
                  <Button
                    className="rounded-2xl"
                    disabled={isBusy}
                    onClick={() => void handleConnect(provider)}
                    type="button"
                    variant="outline"
                  >
                    {isBusy ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    {copy.connect}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.loading}</p>
      ) : null}
      {message ? (
        <div className="mt-4 rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </section>
  );
}
