# MatchDB Shell UI — Copilot Rules

## Project Overview

This is the **host / shell micro-frontend** for the MatchDB staffing platform. It runs on **port 3000** (webpack dev server) + **port 4000** (proxy server). It renders the sidebar nav, header, dark mode toggle, login modal, pricing modal, and page layout. It dynamically loads the Jobs UI remote via **Webpack 5 Module Federation**.

**Stack:** React 18, TypeScript, Webpack 5 Module Federation, Redux Toolkit, Tailwind CSS, MUI, matchdb-component-library

---

## Scripts

| Command            | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Start webpack dev server + proxy concurrently |
| `npm run build`    | Production webpack build                      |
| `npm start`        | Proxy server only                             |
| `npm run lint`     | ESLint check                                  |
| `npm run lint:fix` | ESLint auto-fix                               |

## Running the Application

Use VS Code tasks (`Ctrl+Shift+B`) or the PowerShell script:

```powershell
.\start-matchdb.ps1
```

> **Important:** Start Jobs UI (port 3001) **before** Shell UI (port 3000) — the shell fetches `remoteEntry.js` from the Jobs remote at startup.

## Committing & Pushing

```powershell
.\push-all.ps1
```

---

## Code Conventions

### File Structure

```
src/
  App.tsx             # Root React component
  bootstrap.tsx       # Dynamic import entry point
  index.ts            # Webpack entry
  api/                # RTK Query API slices
  components/         # Shell-level components (ShellLayout, LoginModal, etc.)
  pages/              # Page components (PricingPage, WelcomePage)
  shared/             # Shared utilities
  store/              # Redux store configuration
  styles/             # Global CSS (index.css)
  types/              # TypeScript type definitions
server/
  index.ts            # Express proxy server
public/
  index.html          # HTML template
```

### Naming

- Components: `PascalCase.tsx` (e.g., `ShellLayout.tsx`, `LoginModal.tsx`)
- CSS files: Co-located with component (e.g., `ShellLayout.css`)
- API slices: `{domain}Api.ts`

### Styling Rules

- **Use CSS classes** from `matchdb-component-library` — never inline styles
- Import component library CSS globally:
  ```ts
  import "matchdb-component-library/src/styles/w97-theme.css";
  import "matchdb-component-library/src/styles/w97-base.css";
  import "matchdb-component-library/src/styles/components.css";
  ```
- Use CSS custom properties from the Win97 theme (e.g., `var(--w97-blue)`)
- Component-specific CSS goes in co-located `.css` files, not inline
- Tailwind for utility classes where appropriate

### Component Library

- Import UI primitives from `matchdb-component-library`:
  ```ts
  import {
    Button,
    Input,
    Select,
    DataTable,
    Toolbar,
    Panel,
  } from "matchdb-component-library";
  ```
- Never duplicate component library components locally

### Inter-MFE Communication

- Uses `CustomEvent` dispatch for shell ↔ jobs communication:
  - `matchdb:subnav` — nav state sync
  - `matchdb:openLogin` — trigger login modal
  - `matchdb:jobTypeFilter` — filter updates
  - `matchdb:openPricing` — trigger pricing modal
  - `matchdb:footerInfo` — footer status text

### Module Federation

- Shell is the **host** — exposes nothing
- Jobs UI is the **remote** — exposes `./JobsApp`
- Remote entry: `http://localhost:3001/remoteEntry.js`

---

## Do NOT

- Use inline `style={{}}` in JSX — use CSS classes
- Add components that belong in the component library
- Import directly from `@mui/material` for Win97-themed components — use the library
- Modify Module Federation config without updating Jobs UI remote config
- Skip `type="button"` on non-submit buttons
