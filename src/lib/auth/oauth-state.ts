export type OAuthPendingState = {
  returnUrl: string;
  context?: {
    broadcastId?: string;
    taskId?: string;
    draftPrompt?: string;
    selectedCategories?: string[];
  };
  timestamp: number;
};

export const OAUTH_STATE_KEY = "oauth_pending_state";

export function readOAuthPendingState(): OAuthPendingState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const fromLocalStorage = window.localStorage.getItem(OAUTH_STATE_KEY);
  const fromSessionStorage = window.sessionStorage.getItem(OAUTH_STATE_KEY);
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

export function clearOAuthPendingState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(OAUTH_STATE_KEY);
  window.sessionStorage.removeItem(OAUTH_STATE_KEY);
}

export function persistOAuthPendingState({
  returnUrl,
  context,
}: Omit<OAuthPendingState, "timestamp">) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: OAuthPendingState = {
    returnUrl,
    context,
    timestamp: Date.now(),
  };
  const raw = JSON.stringify(payload);

  window.localStorage.setItem(OAUTH_STATE_KEY, raw);
  window.sessionStorage.setItem(OAUTH_STATE_KEY, raw);
}
