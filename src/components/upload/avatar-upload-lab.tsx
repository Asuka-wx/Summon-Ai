"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  AvatarUploadConfig,
  getImageDimensions,
  validateAvatarFile,
  validateImageDimensions,
} from "@/lib/upload";

type AvatarUploadLabProps = {
  locale: "en" | "zh";
};

export function AvatarUploadLab({ locale: _locale }: AvatarUploadLabProps) {
  const t = useTranslations("uploadLab");
  const lastAvatarStorageKey = `summonai:last-avatar-url:${_locale}`;
  const [message, setMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadEnabled = useMemo(() => hasSupabaseEnv(), []);

  useEffect(() => {
    const lastUrl = window.localStorage.getItem(lastAvatarStorageKey);
    if (lastUrl) {
      setUploadedUrl(lastUrl);
    }
  }, [lastAvatarStorageKey]);

  useEffect(() => {
    if (!selectedFile) {
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [selectedFile]);

  async function handleFileChange(file: File | null) {
    setMessage(null);
    setSelectedFile(null);

    if (!file) {
      return;
    }

    const validationError = validateAvatarFile(file);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    const dimensions = await getImageDimensions(file);
    const dimensionError = validateImageDimensions(dimensions, AvatarUploadConfig);

    if (dimensionError) {
      setMessage(dimensionError);
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setMessage(t("messages.selectFirst"));
      return;
    }

    if (!uploadEnabled) {
      setMessage(t("messages.envMissing"));
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage(getErrorMessage("unauthorized", _locale));
        return;
      }

      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase() ?? "webp";
      const objectPath = `users/${user.id}/avatar.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(objectPath, selectedFile, {
          contentType: selectedFile.type,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(objectPath);

      window.localStorage.setItem(lastAvatarStorageKey, publicUrl);
      setUploadedUrl(publicUrl);
      setMessage(t("messages.uploaded"));
    } catch (error) {
      setMessage(
        error instanceof Error ? `${t("messages.failed")}: ${error.message}` : t("messages.failed"),
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("cardTitle")}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{t("cardDescription")}</p>
          {!uploadEnabled ? (
            <p className="rounded-2xl border border-amber-300/50 bg-amber-100/70 px-4 py-3 text-sm text-amber-950">
              {t("messages.envMissing")}
            </p>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          <input
            accept="image/jpeg,image/png,image/webp"
            className="block w-full rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleFileChange(file);
            }}
            type="file"
          />

          <Button disabled={!selectedFile || isUploading} onClick={handleUpload}>
            {isUploading ? t("actions.uploading") : t("actions.upload")}
          </Button>

          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("previewTitle")}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("previewDescription")}</p>

        <div className="mt-6 grid gap-6">
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="mb-3 text-sm font-medium">{t("previewSelected")}</p>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={t("previewAlt")}
                className="size-40 rounded-3xl object-cover"
                src={previewUrl}
              />
            ) : (
              <div className="flex size-40 items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted-foreground">
                {t("emptyState")}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="mb-3 text-sm font-medium">{t("previewUploaded")}</p>
            {uploadedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={t("previewAlt")}
                className="size-40 rounded-3xl object-cover"
                src={uploadedUrl}
              />
            ) : (
              <div className="flex size-40 items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted-foreground">
                {t("noUploadYet")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
