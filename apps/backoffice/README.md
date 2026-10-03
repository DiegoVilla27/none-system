# @none-system/backoffice

Private web panel for **none-system** built with **Next.js 15 (App Router)** and **React 19**: review of AI-read receipts, receipt-less expenses, accounting export, plans and payments, and account management in compliance with **Law 1581 of 2012 (Habeas Data)**.

---

## 📖 Core Abstract & Functional Overview

| Feature | Route | Description |
|---|---|---|
| Dashboard | `/` | Monthly totals, category breakdown and a WhatsApp-ready summary to copy |
| AI scanning | `/scan` | Upload a photo or PDF (compressed to 5 MB), Gemini extraction and side-by-side verification; warns about possible duplicates |
| Manual expense | `/expenses/new` | Records receipt-less expenses (concept, amount, date, automatic category) |
| History | `/expenses` | Filters by type (invoices, transfers, manual), date and category; Excel/CSV export (paid plans) |
| Detail & editing | `/expenses/[id]` | Viewer for the encrypted supporting document (image or PDF) and accounting form; manual expenses are shown as "no supporting document" |
| Plans & payments | `/billing` · `/billing/result` | Receipt and written-expense quotas, Wompi checkout and payment confirmation |
| Sign-up | `/register` | Two steps: details + Law 1581 consent + Terms, then an OTP sent over WhatsApp |
| Session | `/login` · `/forgot-password` · `/reset-password` · `/verify-email` | Sign-in, WhatsApp-code password recovery and email verification |
| Profile | `/profile` | Phone verification, resend email verification, password change, sign out everywhere, data download (JSON) and account deletion |

---

## 🚀 Architectural Runtime Flow

```mermaid
flowchart LR
    B[Browser] -->|middleware.ts: none_auth_token cookie| P{Public route?}
    P -->|no and no cookie| LOGIN[/login]
    P -->|yes or with cookie| PAGE[App Router pages]
    PAGE --> CTX[AuthContext: GET /auth/me]
    PAGE --> RQ[TanStack Query hooks]
    RQ --> API[lib/api.ts · same-origin fetch]
    API -->|rewrites /api/v1 and /uploads| BE[Express backend :4000]
    BE -->|Set-Cookie HttpOnly| B
    PAGE -->|checkout| WOMPI[Wompi Web Checkout] -->|redirect ?id=| RESULT[/billing/result]
```

- The session lives in an **HttpOnly cookie** issued by the backend: the frontend never reads or stores the token (no `localStorage`).
- Calls go to the same origin (`/api/v1`, `/uploads`) and Next.js forwards them to the backend through `rewrites`, so the cookie is sent automatically and encrypted documents load in `<img>` and `<iframe>`.
- `middleware.ts` only checks that the cookie exists; the backend (`/auth/me`) decides whether it is valid, which prevents redirect loops when a session has been revoked.

---

## 🗂️ Directory Tree

```text
apps/backoffice/
├── next.config.mjs               # Security headers and rewrites to the backend
├── vitest.config.ts
└── src/
    ├── app/
    │   ├── page.tsx              # Dashboard
    │   ├── scan/                 # AI scanning
    │   ├── expenses/             # History, [id] detail and manual expense (new)
    │   ├── billing/              # Plans, Wompi checkout and result/
    │   ├── profile/              # Account, security and data subject rights
    │   ├── register/ · login/ · forgot-password/ · reset-password/ · verify-email/
    │   └── layout.tsx
    ├── components/               # Atomic Design
    │   ├── atoms/                # Badge (factura · transferencia · manual), Button, Input, Typography
    │   ├── molecules/            # FileUploader, ProgressBar, StatCard, UpgradeModal
    │   ├── organisms/            # ExpenseTable, MonthlySummaryCard, Navbar, SideBySideViewer
    │   └── templates/            # DashboardLayout
    ├── context/AuthContext.tsx   # Session based on /auth/me (HttpOnly cookie)
    ├── hooks/useExpenses.ts      # TanStack Query queries and mutations
    ├── lib/
    │   ├── api.ts                # HTTP client (auth, expenses, plans, payments)
    │   ├── export-excel.ts       # CSV with ';' and UTF-8 BOM
    │   ├── image-compressor.ts   # Pre-upload compression to 5 MB
    │   └── links.ts              # Links to the landing's /privacidad and /terminos
    ├── middleware.ts             # Private route guard and redirect protection
    ├── types/                    # Domain types (expenses, auth, plans)
    └── test/                     # MSW and test utilities
```

---

## ⚙️ Provisioning & Setup Guide · Environment Variables

Create `apps/backoffice/.env.local` only if you need to override the defaults:

| Variable | Default | Purpose |
|---|---|---|
| `INTERNAL_API_ORIGIN` | `http://localhost:4000` | Backend origin that `next.config.mjs` forwards `/api/v1/*` and `/uploads/*` to |
| `NEXT_PUBLIC_API_URL` | `/api/v1` | Base URL for browser calls. It must stay on the same origin (relative path) for the session cookie to work |
| `INTERNAL_API_URL` | `http://localhost:4000/api/v1` | Base URL for calls made from the Next.js server |
| `NEXT_PUBLIC_LANDING_URL` | `http://localhost:3001` | Links to the Data Processing Policy and the Terms |

Example for a deployment with the backend on another host:
```bash
INTERNAL_API_ORIGIN=https://api.internal.none-system.co
NEXT_PUBLIC_LANDING_URL=https://none-system.co
```

The backend must include the backoffice's public origin in `CORS_ORIGINS`, because that list is also used to validate the `Origin` of write requests (CSRF protection).

---

## 🛠️ Technical Stack & Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | `^15.1.7` | App Router, middleware and rewrites |
| `react` · `react-dom` | `^19.0.0` | UI |
| `@tanstack/react-query` | `^5.104.0` | Request caching and deduplication |
| `tailwindcss` | `^3.4.17` | Styling (turquoise/electric dark mode) |
| `lucide-react` | `^0.475.0` | Icons |
| `clsx` · `tailwind-merge` | `^2.1.1` · `^3.0.1` | Class composition |
| `vitest` | `^5.0.3` | Testing |
| `@testing-library/react` · `@testing-library/user-event` | `^16.3.3` · `^14.6.7` | Component testing |
| `msw` | `^3.0.1` | Backend mocking in tests |
| `jsdom` | `^30.1.1` | DOM test environment |

---

## 🛠️ Commands

```bash
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm start        # production server on port 3000
pnpm test         # 50 tests (Vitest + Testing Library + MSW)
pnpm test:watch   # watch mode
```

---

## 📈 Performance / Resilience

- **TanStack Query** deduplicates requests and invalidates lists and summaries after creating, editing or deleting records.
- **Image compression** in the browser before upload (max 5 MB) and a progress bar during AI extraction.
- **Friendly error messages**: `lib/api.ts` translates technical errors (AI overload, file too large) into clear messages and surfaces the backend's explanatory messages (quota exhausted, duplicate receipt).
- **Payment confirmation with retries**: `/billing/result` polls the Wompi transaction status until it reaches a final state.
- **Security headers** (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) and login redirects restricted to internal routes.

---

> This digital ecosystem has been designed, structured, and developed to high-performance standards by **[Cabuweb](https://cabuweb.com)** - **Software Developer: Diego Villa**.
