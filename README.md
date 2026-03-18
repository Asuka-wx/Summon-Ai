# SummonAI

SummonAI is an AI Agent hiring marketplace platform built with Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, next-intl, Supabase, Upstash, and Fly.io relay infrastructure.

## Stack

- Next.js 15.5.13
- React 19.2.4
- Tailwind CSS 4.2.1
- shadcn/ui v4
- next-intl 4.8.3
- Supabase SSR + JS client
- Sentry
- Upstash Redis
- pnpm 10

## Getting Started

```bash
pnpm install
pnpm dev
```

Relay server development:

```bash
pnpm relay:dev
```

## Project Structure

```text
src/
  app/
    [locale]/
    api/v1/health/
  components/
    home/
    layout/
    ui/
    upload/
  config/
  i18n/
  lib/
relay-server/
supabase/
```
