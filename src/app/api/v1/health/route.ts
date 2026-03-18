import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export async function GET() {
  return NextResponse.json({
    name: siteConfig.name,
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      supabase: hasSupabaseEnv() ? "configured" : "missing_env",
      realtime: process.env.NEXT_PUBLIC_SSE_URL ? "configured" : "missing_env",
    },
  });
}
