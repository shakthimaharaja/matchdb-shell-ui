/* ------------------------------------------------------------------ *
 *  ShellLayout — extracted types, constants & pure helpers            *
 * ------------------------------------------------------------------ */
import { ICONS, PI } from "matchdb-component-library";

/* ---- types shared with the Jobs MFE via CustomEvent ---- */
export interface SubNavItem {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
  depth?: number;
  tooltip?: string;
  onClick?: () => void;
}
export interface SubNavGroup {
  label: string;
  icon: string;
  items: SubNavItem[];
}

export interface SubMenu {
  id: string;
  label: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  section: string;
  port?: number;
  chipColor?: string;
  disabled?: boolean;
  subs?: SubMenu[];
}

export interface ShellLayoutProps {
  children: React.ReactNode;
  themeStyle: "legacy" | "modern";
  onThemeStyleChange: (style: "legacy" | "modern") => void;
}

/* ---- layout constants ---- */
export const SIDEBAR_EXPANDED = 210;
export const SIDEBAR_COLLAPSED = 40;

/* ---- Job type subdivisions (shown after login) ---- */
export const JOB_TYPE_SUBS = [
  { id: "c2c", label: "C2C" },
  { id: "w2", label: "W2" },
  { id: "c2h", label: "C2H" },
  { id: "fulltime", label: "Full Time" },
];

/* ---- Login-mode sub-items shown under Jobs when NOT logged in ---- */
export const LOGIN_MODES = [
  { id: "candidate", label: "Candidate Login", icon: ICONS.PERSON },
  { id: "vendor", label: "Vendor Login", icon: ICONS.OFFICE },
  { id: "marketer", label: "Marketer Login", icon: ICONS.CHART },
];

/*
 * 8 MFE entries in left nav.
 * Shell host = port 3000, MFEs on 3001..3008 (incremental).
 * Only "Jobs" (3001) is implemented;  the rest are disabled placeholders.
 */
export const MFE_NAV: NavItem[] = [
  {
    id: "jobs",
    label: "Jobs Database",
    icon: PI.BRIEFCASE,
    path: "/jobs",
    section: "MARKETPLACE",
    port: 3001,
    chipColor: "var(--mfe-chip-1)",
    disabled: false,
    subs: JOB_TYPE_SUBS,
  },
  {
    id: "sales",
    label: "Sales",
    icon: PI.SHOPPING_CART,
    path: "/sales",
    section: "MARKETPLACE",
    port: 3002,
    chipColor: "var(--mfe-chip-2)",
    disabled: true,
    subs: [
      { id: "new", label: "New" },
      { id: "used", label: "Used" },
      { id: "wholesale", label: "Wholesale" },
      { id: "clearance", label: "Clearance" },
    ],
  },
  {
    id: "rentals",
    label: "Rentals",
    icon: PI.HOME,
    path: "/rentals",
    section: "MARKETPLACE",
    port: 3003,
    chipColor: "var(--mfe-chip-3)",
    disabled: true,
    subs: [
      { id: "apartments", label: "Apartments" },
      { id: "houses", label: "Houses" },
      { id: "commercial", label: "Commercial" },
      { id: "vehicles", label: "Vehicles" },
    ],
  },
  {
    id: "auctions",
    label: "Auctions",
    icon: PI.MEGAPHONE,
    path: "/auctions",
    section: "MARKETPLACE",
    port: 3004,
    chipColor: "var(--mfe-chip-4)",
    disabled: true,
    subs: [
      { id: "live", label: "Live" },
      { id: "silent", label: "Silent" },
      { id: "online", label: "Online" },
      { id: "estate", label: "Estate" },
    ],
  },
  {
    id: "polling",
    label: "Polling",
    icon: PI.CHART_BAR,
    path: "/polling",
    section: "CONNECTIONS",
    port: 3005,
    chipColor: "var(--mfe-chip-5)",
    disabled: true,
    subs: [
      { id: "surveys", label: "Surveys" },
      { id: "elections", label: "Elections" },
      { id: "feedback", label: "Feedback" },
      { id: "quizzes", label: "Quizzes" },
    ],
  },
  {
    id: "matrimony",
    label: "Matrimony",
    icon: PI.HEART,
    path: "/matrimony",
    section: "CONNECTIONS",
    port: 3006,
    chipColor: "var(--mfe-chip-6)",
    disabled: true,
    subs: [
      { id: "profiles", label: "Profiles" },
      { id: "matches", label: "Matches" },
      { id: "horoscope", label: "Horoscope" },
      { id: "events", label: "Events" },
    ],
  },
  {
    id: "dating",
    label: "Dating",
    icon: PI.HEART_FILL,
    path: "/dating",
    section: "CONNECTIONS",
    port: 3007,
    chipColor: "var(--mfe-chip-7)",
    disabled: true,
    subs: [
      { id: "discover", label: "Discover" },
      { id: "matches", label: "Matches" },
      { id: "chat", label: "Chat" },
      { id: "events", label: "Events" },
    ],
  },
  {
    id: "personals",
    label: "Personals",
    icon: PI.USER,
    path: "/personals",
    section: "CONNECTIONS",
    port: 3008,
    chipColor: "var(--mfe-chip-8)",
    disabled: true,
    subs: [
      { id: "missed", label: "Missed Connections" },
      { id: "platonic", label: "Platonic" },
      { id: "activity", label: "Activity Partners" },
      { id: "casual", label: "Casual" },
    ],
  },
];

/* ---- pure helpers ---- */

export const isPathActive = (
  itemPath: string,
  currentPath: string,
): boolean => {
  if (itemPath === "/") return currentPath === "/";
  return currentPath.startsWith(itemPath);
};

export const USER_TYPE_LABELS: Record<string, string> = {
  vendor: "Vendor",
  marketer: "Marketer",
  candidate: "Candidate",
};

export function userTypeLabel(ut?: string) {
  return (ut && USER_TYPE_LABELS[ut]) || "Candidate";
}

/* ---- US states for country derivation ---- */
export const US_STATES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

/* ---- Badge computation ---- */
export interface Badge {
  label: string;
  color: "green" | "yellow" | "orange" | "red";
  tooltip: string;
}

export function computeAccountAgeBadge(
  createdAt?: string | null,
): Badge | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  const now = new Date();
  const days = Math.floor((now.getTime() - created.getTime()) / 86400000);
  let label: string;
  let color: Badge["color"];
  if (days < 30) {
    label = `${days}d`;
    color = "green";
  } else if (days < 90) {
    label = `${Math.floor(days / 30)}mo`;
    color = "green";
  } else if (days < 180) {
    label = `${Math.floor(days / 30)}mo`;
    color = "yellow";
  } else if (days < 365) {
    label = `${Math.floor(days / 30)}mo`;
    color = "orange";
  } else {
    label = `${Math.floor(days / 365)}yr`;
    color = "red";
  }
  return {
    label,
    color,
    tooltip: `Account created ${created.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`,
  };
}

export function computeProfileFreshBadge(
  updatedAt?: string | null,
): Badge | null {
  if (!updatedAt) return null;
  const updated = new Date(updatedAt);
  const now = new Date();
  const days = Math.floor((now.getTime() - updated.getTime()) / 86400000);
  let label: string;
  let color: Badge["color"];
  if (days < 7) {
    label = "Fresh";
    color = "green";
  } else if (days < 30) {
    label = `${days}d ago`;
    color = "yellow";
  } else if (days < 90) {
    label = `${Math.floor(days / 30)}mo ago`;
    color = "orange";
  } else {
    const m = Math.floor(days / 30);
    label = m < 12 ? `${m}mo ago` : `${Math.floor(days / 365)}yr ago`;
    color = "red";
  }
  return {
    label,
    color,
    tooltip: `Profile updated ${updated.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`,
  };
}

export function deriveProfileCountry(location: string): string {
  if (!location) return "";
  const parts = location.split(",").map((s: string) => s.trim());
  const lastPart = parts.at(-1)?.toUpperCase();
  if (lastPart && US_STATES.has(lastPart)) return "🇺🇸 United States";
  return location;
}
