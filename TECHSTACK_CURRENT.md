# TECHSTACK_CURRENT

Last updated: 2026-04-23
Scope: Entire Sales Tracker workspace

## 1) Implemented Tech Stack (Current Reality)

### Core App Architecture
- Next.js App Router application
- React client application with server routes under Next.js
- TypeScript-first codebase in the Next app
- Legacy single-file React implementation also present for reference/migration

### Frontend
- Next.js 16.2.4
- React 19.2.4
- React DOM 19.2.4
- TypeScript 5 (strict mode enabled)
- Tailwind CSS v4
- PostCSS with @tailwindcss/postcss
- Lucide React for icons
- Google Fonts via CSS import (Inter and JetBrains Mono)

### Authentication & Security (NEW ✅)
- Supabase Auth (PostgreSQL-backed)
- Email/Password authentication
- Google OAuth 2.0
- GitHub OAuth 2.0
- Mandatory MFA (TOTP-based)
- HTTP-only cookie session management
- Next.js middleware for session refresh
- Route-level protection (`ProtectedPage` component)
- API-level protection (auth middleware)

### State and Persistence
- Zustand 5 for application state
- zustand/middleware subscribeWithSelector
- localforage for persistent browser data storage
- localStorage for UI preference persistence (dark mode)
- Supabase PostgreSQL for user data & MFA settings

### Backend/API Layer
- Next.js Route Handlers
- API endpoint for label parsing
- API endpoint for listing available AI models
- Auth callback handler for OAuth
- Auth logout endpoint
- All API routes now require authentication

### AI Integration
- Google Gemini Generative Language API (HTTP)
- Configurable model selection via environment variable
- Default fallback model set to gemini-2.0-flash
- Structured JSON extraction using response schema
- Exponential backoff retry handling for 429/503

### Offline and PWA
- @ducanh2912/next-pwa integration
- Manifest configured for installable app behavior
- App icons and manifest metadata in public assets

### Data Export
- xlsx package (SheetJS) for Excel export
- CSV export functionality in app logic

### Tooling and Quality
- ESLint 9
- eslint-config-next (core-web-vitals and TypeScript rules)
- Next.js build/dev/start scripts via npm
- Windows helper launch scripts (PowerShell and BAT)

### Runtime and Platform
- Node.js runtime (required by Next.js)
- npm dependency management
- Windows-friendly startup scripts included

## 2) Planned/Documented Stack (Not Fully Implemented Yet)

From project docs, the following are planned or proposed:
- TOTP generation & QR code library (speakeasy, qrcode)
- Prisma ORM
- PostgreSQL via Supabase or Neon
- Queue stack (Inngest or Upstash QStash)
- Shadcn UI components
- Additional auth layers (session timeout config, recovery codes)

These items are documented in planning files but are not fully present as active implementation in the current code structure.

## 3) Not Detected in Current Codebase

No concrete implementation files/config were found for:
- Prisma schema/client setup
- Active PostgreSQL connection/configuration
- Shadcn component scaffolding
- Inngest/QStash queue integration files
- Full authentication provider wiring (OAuth/OIDC/MFA)

## 4) Evidence Map (Where This Stack Was Verified)

- nextapp/package.json
- nextapp/tsconfig.json
- nextapp/eslint.config.mjs
- nextapp/postcss.config.mjs
- nextapp/next.config.ts
- nextapp/app/layout.tsx
- nextapp/app/page.tsx
- nextapp/app/globals.css
- nextapp/components/SalesTrackerApp.tsx
- nextapp/lib/store.ts
- nextapp/app/api/parse-label/route.ts
- nextapp/app/api/list-models/route.ts
- nextapp/public/manifest.json
- start.ps1
- start.bat
- tech_stack.md
- Sales_Tracker_PRD.md
- TODO.md

## 5) One-Line Summary

Current production-ready stack is Next.js + React + TypeScript + Tailwind v4 + Zustand + localforage + Next API routes + Supabase Auth (email/OAuth/MFA) + Gemini API integration + PWA support + xlsx export, with Prisma/PostgreSQL/Shadcn/queue systems still in planning stage.
