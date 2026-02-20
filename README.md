# matchdb-shell-ui

Host (shell) microfrontend for the MatchDB staffing platform. Acts as the application shell — renders the sidebar navigation, header, dark-mode toggle, login modal, pricing modal, and dynamically loads the Jobs remote MFE via Webpack 5 Module Federation.

## Tech Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Runtime      | React 18 + TypeScript                                |
| Bundler      | Webpack 5 (Module Federation — host: `matchdbShell`) |
| State        | Redux Toolkit (`authSlice`)                          |
| Routing      | React Router v6                                      |
| UI Libraries | MUI 5, PrimeReact 10, Tailwind CSS 3                 |
| HTTP         | Axios                                                |
| Proxy Server | Express + http-proxy-middleware (port 4000)          |
| Theme        | Windows 97 retro theme, blue-grey palette (#235A81)  |

## Project Structure

```
matchdb-shell-ui/
├── public/
│   └── index.html               # HTML template
├── server/
│   ├── index.ts                 # Express proxy server (port 4000)
│   └── index.js                 # Compiled proxy (fallback)
├── src/
│   ├── index.ts                 # Webpack entry point
│   ├── bootstrap.tsx            # React root render
│   ├── App.tsx                  # Router setup
│   ├── components/
│   │   ├── index.ts             # ★ Barrel export (ShellLayout, LoginModal, JobsAppWrapper)
│   │   ├── ShellLayout.tsx      # Main layout — sidebar, header, footer, pricing modal
│   │   ├── ShellLayout.css      # Shell layout styles (references global CSS vars)
│   │   ├── JobsAppWrapper.tsx   # Lazy loader for Jobs remote MFE
│   │   ├── LoginModal.tsx       # Login / register modal
│   │   └── LoginModal.css      # Login modal styling
│   ├── pages/
│   │   ├── LoginPage.tsx        # Standalone login page
│   │   ├── LoginPage.css
│   │   ├── RegisterPage.tsx     # Standalone register page
│   │   ├── PricingPage.tsx      # W97-themed subscription + candidate package pricing
│   │   ├── PricingPage.css      # Pricing modal styling (684 lines, full W97 theme)
│   │   ├── OAuthCallbackPage.tsx # Google OAuth redirect handler
│   │   └── ResumeViewPage.tsx   # Public candidate resume view (/resume/:username)
│   ├── store/
│   │   ├── index.ts             # Redux store config
│   │   └── authSlice.ts         # Auth state, login/register/OAuth thunks
│   ├── styles/
│   │   ├── index.css            # ★ Barrel — imports w97-theme + w97-base
│   │   ├── w97-theme.css        # ★ Global CSS custom properties (light + dark mode)
│   │   └── w97-base.css         # ★ Shared utility classes (raised, sunken, titlebar, scroll)
│   ├── types/
│   │   └── federation.d.ts      # Module Federation type declarations
│   └── utils/
│       └── index.ts             # ★ Shared helpers (authHeader, downloadBlob, fmtCurrency, fmtDate)
├── env/
│   └── .env.development         # Local env vars
├── webpack.config.js            # Webpack + Module Federation config
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── tsconfig.json
```

## Architecture

```
Browser :3000  ─── webpack-dev-server ───┐
                                         │  /api/auth, /api/payments
                                         ├──► Express proxy :4000 ──► shell-services :8000
                                         │  /api/jobs
                                         └──► Express proxy :4001 ──► jobs-services :8001

Shell (host)  ──── Module Federation ──── Jobs MFE (remote :3001)
```

- The shell webpack dev server proxies `/api/auth` and `/api/payments` to the Node proxy on port 4000, which forwards to `matchdb-shell-services` on port 8000.
- `/api/jobs` calls are proxied to the Jobs Node proxy on port 4001, then to `matchdb-jobs-services` on port 8001.
- The Jobs MFE (`matchdbJobs`) is loaded at runtime from `http://localhost:3001/remoteEntry.js`.

## Routes

| Path                | Component         | Auth | Description                   |
| ------------------- | ----------------- | ---- | ----------------------------- |
| `/oauth-callback`   | OAuthCallbackPage | No   | Google OAuth redirect handler |
| `/resume/:username` | ResumeViewPage    | No   | Public candidate resume view  |
| `/*`                | JobsAppWrapper    | No   | Main app (loads Jobs MFE)     |

## Inter-MFE Events (CustomEvent)

| Event Name              | Direction    | Payload                                |
| ----------------------- | ------------ | -------------------------------------- |
| `matchdb:subnav`        | Jobs → Shell | `{ groups: SubNavGroup[] }`            |
| `matchdb:openLogin`     | Jobs → Shell | `{ context, mode }`                    |
| `matchdb:jobTypeFilter` | Shell → Jobs | `{ jobType: string }`                  |
| `matchdb:loginContext`  | Shell → Jobs | `{ loginType: 'candidate'\|'vendor' }` |

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- `matchdb-shell-services` running on port 8000 (for auth)
- `matchdb-jobs-ui` running on port 3001 (remote MFE)
- `matchdb-jobs-services` running on port 8001 (for jobs data)

## Environment Variables

Create `env/.env.development`:

```env
SHELL_SERVICES_URL=http://localhost:8000
JOBS_SERVICES_URL=http://localhost:8001
NODE_SERVER_PORT=4000
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the proxy server (port 4000)
npm run server

# 3. Start webpack dev server (port 3000) — in a second terminal
npm start

# Or run both concurrently:
npm run dev
```

The app is available at **http://localhost:3000**.

## Available Scripts

| Script           | Description                       |
| ---------------- | --------------------------------- |
| `npm start`      | Webpack dev server on port 3000   |
| `npm run server` | Express proxy server on port 4000 |
| `npm run dev`    | Both webpack + proxy concurrently |
| `npm run build`  | Production build to `dist/`       |

## Pricing Modal

The pricing page is rendered as an inline modal within `ShellLayout` (not a separate route). It supports:

- **Vendor plans:** Free / Pro / Enterprise subscriptions with job & poke limits
- **Candidate packages:** One-time visibility purchases with domain/subdomain selection
- **Role-gated tabs:** Vendors see only vendor plans, candidates see only candidate packages, guests can switch
- **Package-first flow:** Candidates select a package, then choose domains/subdomains from a map
- **Stripe integration:** Redirects to Stripe checkout, auto-opens modal on return via URL query params

## Module Federation Props (→ Jobs MFE)

| Prop                     | Type                              | Description                      |
| ------------------------ | --------------------------------- | -------------------------------- |
| `token`                  | `string \| null`                  | JWT access token                 |
| `userType`               | `string \| null`                  | `candidate` or `vendor`          |
| `userId`                 | `string \| null`                  | User ID                          |
| `userEmail`              | `string \| null`                  | User email                       |
| `username`               | `string \| undefined`             | URL-safe username slug           |
| `plan`                   | `string \| undefined`             | Subscription plan                |
| `membershipConfig`       | `Record<string,string[]> \| null` | Visibility domains/subdomains    |
| `hasPurchasedVisibility` | `boolean \| undefined`            | Whether candidate has visibility |

## Sidebar Navigation

The shell renders 8 MFE navigation entries (only **Jobs** is currently active). Under Jobs:

- **Before login**: shows "Candidate Login" and "Vendor Login" sub-rows
- **After login**: shows job-type filters (C2C, W2, C2H, Full Time) based on user visibility

## Global Styles (`src/styles/`)

The Windows 97 theme is centralized into global style files imported once in `bootstrap.tsx`:

| File            | Purpose                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| `w97-theme.css` | 50+ `--w97-*` CSS custom properties for light & dark mode color palettes  |
| `w97-base.css`  | Shared utility classes: `.w97-raised`, `.w97-sunken`, `.w97-scroll`, etc. |
| `index.css`     | Barrel — imports both theme and base CSS in one import                    |

## Utilities (`src/utils/`)

| Export           | Description                                       |
| ---------------- | ------------------------------------------------- |
| `authHeader()`   | Builds `{ Authorization: 'Bearer …' }` header     |
| `downloadBlob()` | Triggers a file download from a Blob response     |
| `fmtCurrency()`  | Formats a number as currency or returns "—"       |
| `fmtDate()`      | Formats an ISO date string to short readable form |
