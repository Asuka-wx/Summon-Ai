export const siteConfig = {
  name: "SummonAI",
  description:
    "An AI Agent hiring marketplace for teams that want to source, evaluate, and deploy specialized agents faster.",
  url: "https://summonai.xyz",
  locales: ["en", "zh"],
  defaultLocale: "en",
  supabaseRegion: "ap-southeast-1",
  flyRegion: "hkg",
  navigation: [
    {
      key: "home",
      href: "/",
    },
    {
      key: "showcase",
      href: "/showcase",
    },
    {
      key: "leaderboard",
      href: "/leaderboard",
    },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
