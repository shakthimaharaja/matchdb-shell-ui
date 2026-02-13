# matchdb-shell-ui

Host (shell) microfrontend for the MatchDB staffing platform. Acts as the application shell — renders the sidebar navigation, header, dark-mode toggle, login modal, and dynamically loads the Jobs remote MFE via Webpack 5 Module Federation.

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
│   │   ├── ShellLayout.tsx      # Main layout — sidebar, header, footer
│   │   ├── ShellLayout.css      # Master theme (CSS custom properties)
│   │   ├── JobsAppWrapper.tsx   # Lazy loader for Jobs remote MFE
│   │   └── LoginModal.tsx       # Login / register modal
│   ├── pages/
│   │   ├── LoginPage.tsx        # Standalone login page
│   │   ├── LoginPage.css
│   │   ├── RegisterPage.tsx     # Standalone register page
│   │   └── PricingPage.tsx      # Subscription pricing page
│   ├── store/
│   │   ├── index.ts             # Redux store config
│   │   └── authSlice.ts         # Auth state, login/register thunks
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

## Sidebar Navigation

The shell renders 8 MFE navigation entries (only **Jobs** is currently active). Under Jobs:

- **Before login**: shows "Candidate Login" and "Vendor Login" sub-rows
- **After login**: shows job-type filters (C2C, W2, C2H, Full Time) based on user visibility
