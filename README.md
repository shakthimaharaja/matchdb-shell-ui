# matchdb-shell-ui

Host (shell) microfrontend for the MatchDB staffing platform. Acts as the application shell — renders the sidebar navigation, header, dark-mode toggle, login modal, pricing modal, and dynamically loads the Jobs remote MFE via Webpack 5 Module Federation.

---

## Tech Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Runtime      | React 18 + TypeScript                                |
| Bundler      | Webpack 5 (Module Federation — host: `matchdbShell`) |
| State        | Redux Toolkit (`authSlice`)                          |
| Routing      | React Router v6                                      |
| UI Libraries | MUI 5, PrimeReact 10, Tailwind CSS 3                 |
| UI Shared    | matchdb-component-library (local npm link)           |
| HTTP         | Axios                                                |
| Proxy Server | Express + http-proxy-middleware (port 4000)          |
| Theme        | Windows 97 retro theme, blue-grey palette (#235A81)  |

---

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
│   ├── App.tsx                  # Router setup (MUI theme provider)
│   ├── components/
│   │   ├── index.ts             # Barrel export (ShellLayout, LoginModal, JobsAppWrapper)
│   │   ├── ShellLayout.tsx      # Main layout — sidebar, header, footer, pricing modal
│   │   ├── ShellLayout.css      # Shell layout styles (references global CSS vars)
│   │   ├── JobsAppWrapper.tsx   # Lazy loader for Jobs remote MFE
│   │   ├── LoginModal.tsx       # Login / register modal
│   │   └── LoginModal.css       # Login modal styling
│   ├── pages/
│   │   ├── PricingPage.tsx      # W97-themed subscription + candidate package pricing
│   │   ├── PricingPage.css      # Pricing modal styling (684 lines, full W97 theme)
│   │   ├── OAuthCallbackPage.tsx # Google OAuth redirect handler
│   │   ├── ResumeViewPage.tsx   # Public candidate resume view (/resume/:username)
│   │   ├── WelcomePage.tsx      # Welcome / landing page
│   │   └── WelcomePage.css      # Welcome page styling
│   ├── store/
│   │   ├── index.ts             # Redux store config
│   │   └── authSlice.ts         # Auth state, login/register/OAuth thunks
│   ├── shared/
│   │   └── index.ts             # Re-exports DataTable & types from component library
│   ├── styles/
│   │   └── index.css            # Barrel — imports theme, base & component styles from library
│   └── types/
│       └── federation.d.ts      # Module Federation type declarations
├── env/
│   └── .env.development         # Local env vars
├── webpack.config.js            # Webpack + Module Federation config
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── tsconfig.json
```

---

## Architecture

```
Browser :3000  ─── webpack-dev-server ───┐
                                         │  /api/auth, /api/payments
                                         ├──► Express proxy :4000 ──► shell-services :8000
                                         │  /api/jobs
                                         ├──► Express proxy :4001 ──► jobs-services :8001
                                         │  /ws (WebSocket)
                                         └──► jobs-services :8001

Shell (host)  ──── Module Federation ──── Jobs MFE (remote :3001)
```

- The shell webpack dev server proxies `/api/auth` and `/api/payments` to the Node proxy on port 4000, which forwards to `matchdb-shell-services` on port 8000.
- `/api/jobs` calls are proxied to the Jobs Node proxy on port 4001, then to `matchdb-jobs-services` on port 8001.
- `/ws` WebSocket connections are proxied directly to `matchdb-jobs-services` on port 8001 (for live counts and public data feeds).
- The Jobs MFE (`matchdbJobs`) is loaded at runtime from `http://localhost:3001/remoteEntry.js`.

---

## Module Federation

```js
// webpack.config.js
new ModuleFederationPlugin({
  name: 'matchdbShell',
  remotes: {
    matchdbJobs: 'matchdbJobs@http://localhost:3001/remoteEntry.js',
  },
  shared: { react, 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit' },
});
```

---

## Routes

| Path                | Component         | Auth | Description                   |
| ------------------- | ----------------- | ---- | ----------------------------- |
| `/oauth-callback`   | OAuthCallbackPage | No   | Google OAuth redirect handler |
| `/resume/:username` | ResumeViewPage    | No   | Public candidate resume view  |
| `/*`                | JobsAppWrapper    | No   | Main app (loads Jobs MFE)     |

---

## Inter-MFE Events (CustomEvent)

| Event Name              | Direction    | Payload                                |
| ----------------------- | ------------ | -------------------------------------- |
| `matchdb:subnav`        | Jobs → Shell | `{ groups: SubNavGroup[] }`            |
| `matchdb:breadcrumb`    | Jobs → Shell | `{ label: string }`                    |
| `matchdb:openLogin`     | Jobs → Shell | `{ context, mode }`                    |
| `matchdb:jobTypeFilter` | Shell → Jobs | `{ jobType: string }`                  |
| `matchdb:loginContext`  | Shell → Jobs | `{ loginType: 'candidate'\|'vendor' }` |

---

## Sidebar Navigation

The shell renders 8 MFE navigation entries (only **Jobs** is currently active). Under Jobs:

- **Before login**: the Jobs MFE renders a `PublicJobsView` with live WebSocket data (jobs & profiles tables)
- **After login**: shows job-type filters (C2C, W2, C2H, Full Time) based on user visibility

---

## Pricing Modal

The pricing page is rendered as an inline modal within `ShellLayout` (not a separate route). It supports:

- **Vendor plans:** Free / Pro / Enterprise subscriptions with job & poke limits
- **Candidate packages:** One-time visibility purchases with domain/subdomain selection
- **Role-gated tabs:** Vendors see only vendor plans, candidates see only candidate packages, guests can switch
- **Package-first flow:** Candidates select a package, then choose domains/subdomains from a map
- **Stripe integration:** Redirects to Stripe checkout, auto-opens modal on return via URL query params

---

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

---

## Global Styles (`src/styles/`)

The Windows 97 theme CSS has been extracted to the **matchdb-component-library** package. The shell imports theme, base, and component styles from the library:

```css
/* src/styles/index.css */
@import "matchdb-component-library/src/styles/w97-theme.css";
@import "matchdb-component-library/src/styles/w97-base.css";
@import "matchdb-component-library/src/styles/components.css";
```

| File             | Purpose                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| `w97-theme.css`  | 50+ `--w97-*` CSS custom properties for light & dark mode color palettes  |
| `w97-base.css`   | Shared utility classes: `.w97-raised`, `.w97-sunken`, `.w97-scroll`, etc. |
| `components.css` | Component-level styles (DataTable, Panel, Toolbar, etc.)                  |

---

## Shared Components (`src/shared/`)

The `shared/index.ts` barrel re-exports `DataTable` and related types from `matchdb-component-library`, making them available to components that import from `../shared`.
| `index.css` | Barrel — imports both theme and base CSS in one import |

---

## Utilities

Shared utility functions (`authHeader`, `downloadBlob`, `fmtCurrency`, `fmtDate`) have been extracted to the **matchdb-component-library** package. The shell imports them from the library as needed.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- `matchdb-shell-services` running on port 8000 (for auth)
- `matchdb-jobs-ui` running on port 3001 (remote MFE)
- `matchdb-jobs-services` running on port 8001 (for jobs data)

### Environment Variables

Create `env/.env.development`:

```env
SHELL_SERVICES_URL=http://localhost:8000
JOBS_SERVICES_URL=http://localhost:8001
NODE_SERVER_PORT=4000
```

### Install & Run

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

---

## Scripts

| Script           | Description                       |
| ---------------- | --------------------------------- |
| `npm start`      | Webpack dev server on port 3000   |
| `npm run server` | Express proxy server on port 4000 |
| `npm run dev`    | Both webpack + proxy concurrently |
| `npm run build`  | Production build to `dist/`       |

---

## License

MIT
