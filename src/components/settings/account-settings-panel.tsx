"use client";

import { useState } from "react";

import { SessionExitButton } from "@/components/auth/session-exit-button";
import { AuthMethodsPanel } from "@/components/settings/auth-methods-panel";
import { Button } from "@/components/ui/button";

type AccountSettingsPanelProps = {
  locale: "en" | "zh";
  initialProfile: {
    display_name: string;
    email: string | null;
    bio: string | null;
    locale: string;
    twitter_handle: string | null;
    github_handle: string | null;
    payout_wallet: string | null;
  };
  badgeCount: number;
  limitedForInactive?: boolean;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      profileTitle: "个人资料",
      profileDescription: "更新显示名称、简介和界面语言。",
      displayName: "显示名称",
      bio: "简介",
      language: "界面语言",
      saveProfile: "保存资料",
      payoutTitle: "提现钱包",
      payoutDescription: "修改提现地址会进入 48 小时冷静期。",
      payoutWallet: "钱包地址",
      saveWallet: "更新钱包",
      socialTitle: "公开资料绑定",
      socialDescription: "这些绑定主要用于提升可信度展示，不等同于登录方式。",
      unbindTwitter: "解绑 Twitter",
      unbindGithub: "解绑 GitHub",
      exportsTitle: "数据与账户",
      exportData: "导出数据",
      requestData: "提交数据请求",
      deleteAccount: "注销账户",
      signoutTitle: "会话管理",
      signoutDescription: "如果你需要换账号、换邮箱或换登录方式，可以先退出当前会话。",
      limitedTitle: "当前账户尚未激活",
      limitedDescription:
        "在邀请码激活前，你可以先管理资料、登录方式和当前会话；钱包、公开资料绑定和账户级导出功能会在激活后开放。",
      deleting: "处理中...",
      requesting: "提交中...",
      saving: "保存中...",
      saved: "已更新。",
      failed: "操作失败，请稍后重试。",
      noHandle: "未绑定",
      badges: "已获得徽章",
      deleteConfirm: "确认注销当前账户？",
    };
  }

  return {
    profileTitle: "Profile",
    profileDescription: "Update your display name, bio and interface language.",
    displayName: "Display name",
    bio: "Bio",
    language: "Language",
    saveProfile: "Save profile",
    payoutTitle: "Payout wallet",
    payoutDescription: "Updating the payout wallet triggers a 48-hour cooldown.",
    payoutWallet: "Wallet address",
    saveWallet: "Update wallet",
    socialTitle: "Public profile bindings",
    socialDescription: "These bindings are for trust signals and public profile display, not sign-in.",
    unbindTwitter: "Unbind Twitter",
    unbindGithub: "Unbind GitHub",
    exportsTitle: "Data and account",
    exportData: "Export data",
    requestData: "Create data request",
    deleteAccount: "Delete account",
    signoutTitle: "Session management",
    signoutDescription: "Need another account, email, or sign-in method? Sign out first and switch cleanly.",
    limitedTitle: "This account is not activated yet",
    limitedDescription:
      "Before activation, you can still manage profile basics, sign-in methods, and the current session. Wallet, public bindings, and export controls unlock after activation.",
    deleting: "Working...",
    requesting: "Submitting...",
    saving: "Saving...",
    saved: "Updated successfully.",
    failed: "Action failed. Please try again.",
    noHandle: "Not connected",
    badges: "Badges earned",
    deleteConfirm: "Delete this account?",
  };
}

export function AccountSettingsPanel({
  locale,
  initialProfile,
  badgeCount,
  limitedForInactive = false,
}: AccountSettingsPanelProps) {
  const copy = getCopy(locale);
  const [profile, setProfile] = useState({
    display_name: initialProfile.display_name,
    bio: initialProfile.bio ?? "",
    locale: initialProfile.locale === "zh" ? "zh" : "en",
  });
  const [payoutWallet, setPayoutWallet] = useState(initialProfile.payout_wallet ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [isRequestingData, setIsRequestingData] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function saveProfile() {
    setIsSavingProfile(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setMessage(copy.saved);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function saveWallet() {
    setIsSavingWallet(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/users/payout-wallet", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          wallet_address: payoutWallet,
        }),
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setMessage(copy.saved);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSavingWallet(false);
    }
  }

  async function unbind(platform: "twitter" | "github") {
    setMessage(null);

    try {
      const response = await fetch("/api/v1/users/me/unbind-social", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform,
        }),
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setMessage(copy.saved);
    } catch {
      setMessage(copy.failed);
    }
  }

  async function requestData() {
    setIsRequestingData(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/users/me/data-request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "access_export",
        }),
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setMessage(copy.saved);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsRequestingData(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm(copy.deleteConfirm)) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/users/me", {
        method: "DELETE",
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      window.location.assign(`/${locale}`);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid gap-6">
      {limitedForInactive ? (
        <section className="rounded-[1.75rem] border border-primary/20 bg-primary/5 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.limitedTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {copy.limitedDescription}
          </p>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {copy.profileTitle}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {copy.profileDescription}
        </p>
        <div className="mt-6 grid gap-4">
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            onChange={(event) =>
              setProfile((current) => ({ ...current, display_name: event.target.value }))
            }
            placeholder={copy.displayName}
            value={profile.display_name}
          />
          <textarea
            className="min-h-28 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            onChange={(event) =>
              setProfile((current) => ({ ...current, bio: event.target.value }))
            }
            placeholder={copy.bio}
            value={profile.bio}
          />
          <select
            aria-label={copy.language}
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            onChange={(event) =>
              setProfile((current) => ({ ...current, locale: event.target.value as "en" | "zh" }))
            }
            value={profile.locale}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
          <Button disabled={isSavingProfile} onClick={() => void saveProfile()} type="button">
            {isSavingProfile ? copy.saving : copy.saveProfile}
          </Button>
        </div>
      </section>

      <AuthMethodsPanel
        email={initialProfile.email}
        locale={locale}
        returnHref={`/${locale}/my/settings`}
      />

      {limitedForInactive ? null : (
        <>
          <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {copy.payoutTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {copy.payoutDescription}
            </p>
            <div className="mt-6 grid gap-4">
              <input
                className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                onChange={(event) => setPayoutWallet(event.target.value)}
                placeholder={copy.payoutWallet}
                value={payoutWallet}
              />
              <Button disabled={isSavingWallet} onClick={() => void saveWallet()} type="button">
                {isSavingWallet ? copy.saving : copy.saveWallet}
              </Button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {copy.socialTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {copy.socialDescription}
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
                <p className="text-sm text-muted-foreground">
                  Twitter: {initialProfile.twitter_handle ?? copy.noHandle}
                </p>
                <Button className="mt-4" onClick={() => void unbind("twitter")} type="button" variant="outline">
                  {copy.unbindTwitter}
                </Button>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
                <p className="text-sm text-muted-foreground">
                  GitHub: {initialProfile.github_handle ?? copy.noHandle}
                </p>
                <Button className="mt-4" onClick={() => void unbind("github")} type="button" variant="outline">
                  {copy.unbindGithub}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {copy.exportsTitle}
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              {copy.badges}: {badgeCount}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => window.location.assign("/api/v1/users/me/export")}
                type="button"
                variant="outline"
              >
                {copy.exportData}
              </Button>
              <Button disabled={isRequestingData} onClick={() => void requestData()} type="button" variant="outline">
                {isRequestingData ? copy.requesting : copy.requestData}
              </Button>
              <Button disabled={isDeleting} onClick={() => void deleteAccount()} type="button" variant="outline">
                {isDeleting ? copy.deleting : copy.deleteAccount}
              </Button>
            </div>
          </section>
        </>
      )}

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {copy.signoutTitle}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {copy.signoutDescription}
        </p>
        <SessionExitButton
          className="mt-6 h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground hover:bg-accent"
          locale={locale}
          mode="signout"
          nextHref={`/${locale}/my/settings`}
        />
      </section>

      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </div>
  );
}
