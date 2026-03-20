"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type OAuthPendingState = {
  returnUrl: string;
  context?: {
    broadcastId?: string;
    taskId?: string;
    draftPrompt?: string;
    selectedCategories?: string[];
  };
  timestamp: number;
};

const STORAGE_KEY = "oauth_pending_state";

function readPendingState(): OAuthPendingState | null {
  const fromLocalStorage = window.localStorage.getItem(STORAGE_KEY);
  const fromSessionStorage = window.sessionStorage.getItem(STORAGE_KEY);
  const raw = fromLocalStorage ?? fromSessionStorage;

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OAuthPendingState;
  } catch {
    return null;
  }
}

function clearPendingState() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function OAuthCallback() {
  const [message, setMessage] = useState("Restoring your session...");

  useEffect(() => {
    let mounted = true;

    async function restore() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => null);
      }

      const pendingState = readPendingState();

      if (
        pendingState &&
        Date.now() - Number(pendingState.timestamp ?? 0) <= 10 * 60 * 1000
      ) {
        setMessage("Returning you to where you left off...");
        clearPendingState();
        window.location.replace(pendingState.returnUrl);
        return;
      }

      clearPendingState();
      if (mounted) {
        setMessage("Session restored. Redirecting home...");
      }
      window.location.replace("/en");
    }

    void restore();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-border/70 bg-card/90 p-8 text-center shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          OAuth Callback
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-foreground">
          Completing sign in
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
