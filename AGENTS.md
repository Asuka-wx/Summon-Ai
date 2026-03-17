# SummonAI - Coding Agent Instructions

## Project Overview

SummonAI is an AI Agent hiring marketplace platform.

Website: https://summonai.xyz

## Tech Stack (STRICT — do not change versions)

- Framework: Next.js 15.x (App Router, TypeScript)
- React: ≥19.1.5
- CSS: Tailwind CSS v4
- UI Components: shadcn/ui v4
- Database: Supabase (PostgreSQL + Auth + Realtime)
- Deployment: Vercel (web), [Fly.io](http://Fly.io) (relay server)
- Cache/Queue: Upstash (Redis + QStash)
- Email: Resend
- Package manager: pnpm

## Coding Conventions

- Use TypeScript strict mode
- Use functional components with hooks
- Use server components by default, add "use client" only when needed
- All API routes go in src/app/api/
- Follow ESLint + Prettier defaults
- Commit messages: English, conventional commits format
- NEVER commit .env files or secrets
- ALWAYS create a feature branch, never push directly to main
