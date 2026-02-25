import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { useAppDispatch, useAppSelector } from "../store";
import { logout, refreshUserData } from "../store/authSlice";
import PricingPage from "../pages/PricingPage";
import "./ShellLayout.css";

/* ---- types shared with the Jobs MFE via CustomEvent ---- */
interface SubNavItem {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
  depth?: number;
  tooltip?: string; // custom tooltip text (e.g. profile URL for copy action)
  onClick?: () => void;
}
interface SubNavGroup {
  label: string;
  icon: string;
  items: SubNavItem[];
}

const SIDEBAR_EXPANDED = 210;
const SIDEBAR_COLLAPSED = 40;

/* ---- Job type subdivisions (shown after login) ---- */
const JOB_TYPE_SUBS = [
  { id: "c2c", label: "C2C" },
  { id: "w2", label: "W2" },
  { id: "c2h", label: "C2H" },
  { id: "fulltime", label: "Full Time" },
];

/* ---- Login-mode sub-items shown under Jobs when NOT logged in ---- */
const LOGIN_MODES = [
  { id: "candidate", label: "Candidate Login", icon: "👤" },
  { id: "vendor", label: "Vendor Login", icon: "🏢" },
];

interface SubMenu {
  id: string;
  label: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  section: string;
  port?: number; // which MFE port this maps to
  chipColor?: string; // CSS variable name for sidebar color chip
  disabled?: boolean; // true = MFE not yet implemented
  subs?: SubMenu[]; // sub-menu items under this MFE
}

/*
 * 8 MFE entries in left nav.
 * Shell host = port 3000, MFEs on 3001..3008 (incremental).
 * Only "Jobs" (3001) is implemented;  the rest are disabled placeholders.
 */
const MFE_NAV: NavItem[] = [
  {
    id: "jobs",
    label: "Jobs Database",
    icon: "pi pi-briefcase",
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
    icon: "pi pi-shopping-cart",
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
    icon: "pi pi-home",
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
    icon: "pi pi-megaphone",
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
    icon: "pi pi-chart-bar",
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
    icon: "pi pi-heart",
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
    icon: "pi pi-heart-fill",
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
    icon: "pi pi-user",
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

interface Props {
  children: React.ReactNode;
}

const isPathActive = (itemPath: string, currentPath: string): boolean => {
  if (itemPath === "/") return currentPath === "/";
  return currentPath.startsWith(itemPath);
};

const ShellLayout: React.FC<Props> = ({ children }) => {
  const { user, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [subNavGroups, setSubNavGroups] = useState<SubNavGroup[]>([]);
  const [mfeBreadcrumb, setMfeBreadcrumb] = useState<string[]>([]);
  const [footerInfo, setFooterInfo] = useState("");
  const [activeJobType, setActiveJobType] = useState<string>("");
  /** null = no sub-item selected (user is on /jobs or elsewhere) */
  const loginTypeFromPath = location.pathname.startsWith("/jobs/vendor")
    ? "vendor"
    : location.pathname.startsWith("/jobs/candidate")
      ? "candidate"
      : null;
  const [activeLoginType, setActiveLoginType] = useState<
    "candidate" | "vendor" | null
  >(loginTypeFromPath);

  /* Keep activeLoginType in sync when URL changes (e.g. back/forward) */
  useEffect(() => {
    setActiveLoginType(loginTypeFromPath);
  }, [location.pathname]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("matchdb_dark") === "1";
  });
  const [expandedMFEs, setExpandedMFEs] = useState<Record<string, boolean>>({});

  const isLoggedIn = !!token;

  /* ---- Dark mode persistence ---- */
  useEffect(() => {
    localStorage.setItem("matchdb_dark", darkMode ? "1" : "0");
    // Also set on <body> so MFE CSS can read it
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  /* ── Pricing modal (triggered by Jobs MFE via custom event OR URL params) ── */
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingModalTab, setPricingModalTab] = useState<
    "vendor" | "candidate"
  >("vendor");
  /**
   * Set to true when pricing modal is opened after a successful candidate payment.
   * When the modal closes, we fire matchdb:openProfile so the profile form opens next.
   */
  const [pendingProfileOpen, setPendingProfileOpen] = useState(false);

  const handleOpenPricing = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    setPricingModalTab(detail?.tab === "candidate" ? "candidate" : "vendor");
    // If the event includes triggerProfile flag, sequence profile modal after pricing
    if (detail?.triggerProfile) setPendingProfileOpen(true);
    setPricingModalOpen(true);
  }, []);

  const handleClosePricing = useCallback(() => {
    setPricingModalOpen(false);
    window.dispatchEvent(new CustomEvent("matchdb:pricingClosed"));
    if (pendingProfileOpen) {
      setPendingProfileOpen(false);
      // Small delay so pricing overlay fully unmounts before profile modal appears
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("matchdb:openProfile"));
      }, 80);
    }
  }, [pendingProfileOpen]);

  useEffect(() => {
    window.addEventListener("matchdb:openPricing", handleOpenPricing);
    return () =>
      window.removeEventListener("matchdb:openPricing", handleOpenPricing);
  }, [handleOpenPricing]);

  /* Auto-open pricing modal on Stripe post-checkout redirects (e.g. /?success=true) */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSuccess = params.get("success") === "true";
    const isCandSucc = params.get("candidate_success") === "true";
    const isCanceled = params.get("canceled") === "true";
    if (isSuccess || isCandSucc || isCanceled) {
      const tab = isCandSucc
        ? "candidate"
        : user?.user_type === "candidate"
          ? "candidate"
          : "vendor";
      setPricingModalTab(tab);
      if (isCandSucc) {
        // Refresh user data from server so hasPurchasedVisibility reflects the completed payment,
        // then sequence the profile form after the pricing confirmation modal closes.
        if (token) dispatch(refreshUserData(token));
        setPendingProfileOpen(true);
      }
      setPricingModalOpen(true);
      // Clean up the URL so the modal doesn't re-open on navigation
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user?.user_type]);

  /* Listen for sub-nav events emitted by the Jobs MFE */
  const handleSubNav = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    setSubNavGroups(Array.isArray(detail) ? detail : []);
  }, []);

  const handleBreadcrumb = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    setMfeBreadcrumb(Array.isArray(detail) ? detail : []);
  }, []);

  useEffect(() => {
    window.addEventListener("matchdb:subnav", handleSubNav);
    window.addEventListener("matchdb:breadcrumb", handleBreadcrumb);
    const handleFooterInfo = (e: Event) => {
      const text = (e as CustomEvent).detail?.text || "";
      setFooterInfo(text);
    };
    window.addEventListener("matchdb:footerInfo", handleFooterInfo);
    return () => {
      window.removeEventListener("matchdb:subnav", handleSubNav);
      window.removeEventListener("matchdb:breadcrumb", handleBreadcrumb);
      window.removeEventListener("matchdb:footerInfo", handleFooterInfo);
    };
  }, [handleSubNav, handleBreadcrumb]);

  /* Nav = all 10 MFEs always visible; override 'Jobs Database' label per user type */
  const jobsLabel =
    user?.user_type === "vendor"
      ? "Candidate Database"
      : user?.user_type === "candidate"
        ? "Job Openings Database"
        : "Jobs Database";
  const navItems = useMemo(
    () =>
      MFE_NAV.map((n) => (n.id === "jobs" ? { ...n, label: jobsLabel } : n)),
    [jobsLabel],
  );

  const [tzCity, setTzCity] = useState(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz.split("/").pop()?.replace(/_/g, " ") || tz;
  });

  useEffect(() => {
    let cancelled = false;
    // Try browser geolocation → reverse-geocode to get actual city + state
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
              { headers: { "Accept-Language": "en-US" } },
            );
            if (!res.ok) return;
            const data = await res.json();
            const addr = data.address || {};
            const city =
              addr.city || addr.town || addr.village || addr.county || "";
            const state = addr.state ? `, ${addr.state}` : "";
            if (!cancelled && city) setTzCity(`${city}${state}`);
          } catch {
            /* keep timezone fallback */
          }
        },
        () => {
          /* geolocation denied – keep timezone fallback */
        },
        { timeout: 5000 },
      );
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const tzAbbr = useMemo(() => {
    return (
      new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value || ""
    );
  }, []);

  const plan = (user?.plan ?? "free").toUpperCase();

  /* ── Profile location — sent from Jobs MFE via custom event ── */
  const [profileLocation, setProfileLocation] = useState<string>("");
  /* ── Visible-in text — sent from Jobs MFE ── */
  const [visibleInText, setVisibleInText] = useState<string>("");

  /* Derive country + flag from location string (e.g. "Indianapolis, IN" → "🇺🇸 United States") */
  const US_STATES = new Set([
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
  const profileCountry = useMemo(() => {
    if (!profileLocation) return "";
    const parts = profileLocation.split(",").map((s: string) => s.trim());
    const lastPart = parts[parts.length - 1]?.toUpperCase();
    if (lastPart && US_STATES.has(lastPart)) return "🇺🇸 United States";
    return profileLocation; // fallback: show raw location
  }, [profileLocation]);
  useEffect(() => {
    const locHandler = (e: Event) => {
      const loc = (e as CustomEvent).detail?.location;
      if (loc) setProfileLocation(loc);
    };
    const visHandler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text;
      setVisibleInText(text || "");
    };
    window.addEventListener("matchdb:profileLocation", locHandler);
    window.addEventListener("matchdb:visibleIn", visHandler);
    return () => {
      window.removeEventListener("matchdb:profileLocation", locHandler);
      window.removeEventListener("matchdb:visibleIn", visHandler);
    };
  }, []);

  const initials = user
    ? `${user.first_name?.charAt(0) ?? ""}${user.last_name?.charAt(0) ?? ""}`.toUpperCase() ||
      user.email.charAt(0).toUpperCase()
    : "G";
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : (user?.email ?? "Guest");

  /* ── Account age & profile freshness badges ── */
  const accountAgeBadge = useMemo(() => {
    if (!user?.created_at) return null;
    const created = new Date(user.created_at);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const days = Math.floor(diffMs / 86400000);
    let label: string;
    let color: "green" | "yellow" | "orange" | "red";
    if (days < 30) {
      label = `${days}d`;
      color = "green";
    } else if (days < 90) {
      const m = Math.floor(days / 30);
      label = `${m}mo`;
      color = "green";
    } else if (days < 180) {
      const m = Math.floor(days / 30);
      label = `${m}mo`;
      color = "yellow";
    } else if (days < 365) {
      const m = Math.floor(days / 30);
      label = `${m}mo`;
      color = "orange";
    } else {
      const y = Math.floor(days / 365);
      label = `${y}yr`;
      color = "red";
    }
    return {
      label,
      color,
      tooltip: `Account created ${created.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }, [user?.created_at]);

  const profileFreshBadge = useMemo(() => {
    if (!user?.updated_at) return null;
    const updated = new Date(user.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    const days = Math.floor(diffMs / 86400000);
    let label: string;
    let color: "green" | "yellow" | "orange" | "red";
    if (days < 7) {
      label = "Fresh";
      color = "green";
    } else if (days < 30) {
      label = `${days}d ago`;
      color = "yellow";
    } else if (days < 90) {
      const m = Math.floor(days / 30);
      label = `${m}mo ago`;
      color = "orange";
    } else {
      const m = Math.floor(days / 30);
      label = m < 12 ? `${m}mo ago` : `${Math.floor(days / 365)}yr ago`;
      color = "red";
    }
    return {
      label,
      color,
      tooltip: `Profile updated ${updated.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }, [user?.updated_at]);

  /* ── Account details panel ── */
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const accountPanelContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAccountPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountPanelContainerRef.current &&
        !accountPanelContainerRef.current.contains(e.target as Node)
      ) {
        setShowAccountPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAccountPanel]);

  const isWelcome = location.pathname === "/";

  /** null on home page "/" — no nav item should appear selected */
  const active =
    navItems.find((item) => isPathActive(item.path, location.pathname)) ?? null;

  const drawerWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  /* Shell-level job type subs — MFE controls the real filtering via membershipConfig */
  const allowedSubdivisions = useMemo(
    () => (isLoggedIn ? JOB_TYPE_SUBS : []),
    [isLoggedIn],
  );

  /* Broadcast active login context to MFE (null → "candidate" as safe default) */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("matchdb:loginContext", {
        detail: { loginType: activeLoginType ?? "candidate" },
      }),
    );
  }, [activeLoginType]);

  /* Get submenu items for a nav item (respects candidate visibility for Jobs) */
  const getSubsForItem = useCallback(
    (item: NavItem): SubMenu[] => {
      if (!item.subs) return [];
      if (item.id === "jobs") return allowedSubdivisions;
      return item.subs;
    },
    [allowedSubdivisions],
  );

  /* All non-disabled MFE submenus are always visible */

  /* Dispatch job type filter event to MFE */
  const handleJobTypeClick = (typeId: string) => {
    const newType = activeJobType === typeId ? "" : typeId;
    setActiveJobType(newType);
    window.dispatchEvent(
      new CustomEvent("matchdb:jobTypeFilter", {
        detail: { jobType: newType },
      }),
    );
  };

  /* Open login modal */
  const openLogin = (
    context: "candidate" | "vendor" = "candidate",
    mode: "login" | "register" = "login",
  ) => {
    window.dispatchEvent(
      new CustomEvent("matchdb:openLogin", { detail: { context, mode } }),
    );
  };

  return (
    <div className={`legacy-shell-root${darkMode ? " dark" : ""}`}>
      <header className="legacy-shell-header">
        <Button
          type="button"
          icon={
            collapsed ? "pi pi-angle-double-right" : "pi pi-angle-double-left"
          }
          className="legacy-shell-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label="Toggle sidebar"
        />

        <div
          className="legacy-shell-brand"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
          title="MatchDB — Home"
        >
          {/* Tiny Windows-97 pixel flag */}
          <div className="legacy-shell-brand-logo">
            <span
              className="legacy-shell-brand-pixel"
              style={{ background: "#235A81" }}
            />
            <span
              className="legacy-shell-brand-pixel"
              style={{ background: "#1A4565" }}
            />
            <span
              className="legacy-shell-brand-pixel"
              style={{ background: "#2E7D32" }}
            />
            <span
              className="legacy-shell-brand-pixel"
              style={{ background: "#0077B5" }}
            />
            <span
              className="legacy-shell-brand-pixel"
              style={{ background: "#F5A623" }}
            />
            <span
              className="legacy-shell-brand-pixel"
              style={{ background: "#1565C0" }}
            />
          </div>
          <span className="legacy-shell-brand-title">MatchDB</span>
          <span className="legacy-shell-brand-subtitle">97</span>
        </div>

        {/* Location / Date / Time — single line in header */}
        <span className="legacy-shell-date-inline">
          🇺🇸 {tzCity}
          {tzAbbr ? ` (${tzAbbr})` : ""} &middot;{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {isLoggedIn && user?.user_type && (
            <span style={{ color: "#e8850f", fontWeight: 700, marginLeft: 6 }}>
              · Logged in as{" "}
              {user.user_type === "vendor" ? "Vendor" : "Candidate"}
            </span>
          )}
        </span>

        <div className="legacy-shell-header-fill" />

        {/* Dark mode toggle */}
        <Button
          type="button"
          icon={darkMode ? "pi pi-sun" : "pi pi-moon"}
          className="legacy-shell-darkmode"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Toggle dark mode"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          tooltip={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          tooltipOptions={{ position: "bottom" }}
        />

        {!isLoggedIn && (
          <div className="legacy-shell-header-auth">
            <Button
              type="button"
              icon="pi pi-sign-in"
              label="Sign In"
              className="legacy-shell-signout"
              onClick={() => openLogin("candidate", "login")}
              tooltip="Sign in to your account"
              tooltipOptions={{ position: "bottom" }}
            />
            <Button
              type="button"
              icon="pi pi-user-plus"
              label="Sign Up"
              className="legacy-shell-signout"
              onClick={() => openLogin("candidate", "register")}
              tooltip="Create a new account"
              tooltipOptions={{ position: "bottom" }}
            />
          </div>
        )}

        {isLoggedIn && (
          <>
            <Tag value={plan} className="legacy-shell-plan" />
            {/* Clickable user area — opens account details panel */}
            <div
              className="legacy-shell-user-container"
              ref={accountPanelContainerRef}
            >
              <div
                className="legacy-shell-user"
                style={{ cursor: "pointer" }}
                onClick={() => setShowAccountPanel((p) => !p)}
                title="Click to view account details"
                role="button"
                aria-expanded={showAccountPanel}
                aria-haspopup="true"
              >
                <Avatar
                  label={initials}
                  shape="circle"
                  className="legacy-shell-avatar"
                />
                <div className="legacy-shell-user-text">
                  <div className="legacy-shell-user-name">{displayName}</div>
                  <div className="legacy-shell-user-type">
                    {user?.user_type === "vendor" ? "Vendor" : "Candidate"}
                  </div>
                </div>
                <span className="legacy-shell-user-caret" aria-hidden="true">
                  {showAccountPanel ? "▲" : "▼"}
                </span>
              </div>

              {/* W97-style account details dropdown */}
              {showAccountPanel && (
                <div
                  className="shell-account-panel"
                  role="dialog"
                  aria-label="Account Details"
                >
                  <div className="shell-account-panel-title">
                    <span>👤</span>
                    <span>Account Details</span>
                    <button
                      className="shell-account-panel-close"
                      onClick={() => setShowAccountPanel(false)}
                      title="Close"
                      aria-label="Close account details"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="shell-account-panel-body">
                    <div className="shell-account-row">
                      <span className="shell-account-label">Name</span>
                      <span className="shell-account-value" title={displayName}>
                        {displayName}
                      </span>
                    </div>
                    <div className="shell-account-row">
                      <span className="shell-account-label">Email</span>
                      <span className="shell-account-value" title={user?.email}>
                        {user?.email}
                      </span>
                    </div>
                    {user?.username && (
                      <div className="shell-account-row">
                        <span className="shell-account-label">Username</span>
                        <span className="shell-account-value">
                          @{user.username}
                        </span>
                      </div>
                    )}
                    <div className="shell-account-row">
                      <span className="shell-account-label">Type</span>
                      <span className="shell-account-value">
                        {user?.user_type === "vendor" ? "Vendor" : "Candidate"}
                      </span>
                    </div>
                    <div className="shell-account-row">
                      <span className="shell-account-label">Plan</span>
                      <span className="shell-account-value shell-account-plan">
                        {plan}
                      </span>
                    </div>
                    {user?.created_at && (
                      <div className="shell-account-row">
                        <span className="shell-account-label">
                          Member since
                        </span>
                        <span className="shell-account-value">
                          {new Date(user.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    )}
                    {profileFreshBadge && (
                      <div className="shell-account-row">
                        <span className="shell-account-label">Updated</span>
                        <span
                          className="shell-account-value"
                          title={profileFreshBadge.tooltip}
                        >
                          {profileFreshBadge.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="shell-account-panel-footer">
                    <button
                      className="shell-account-panel-signout"
                      onClick={() => {
                        setShowAccountPanel(false);
                        dispatch(logout());
                        navigate("/");
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button
              type="button"
              icon="pi pi-sign-out"
              label="Sign Out"
              className="legacy-shell-signout"
              onClick={() => {
                dispatch(logout());
                navigate("/");
              }}
              tooltip="Sign out"
              tooltipOptions={{ position: "bottom" }}
            />
          </>
        )}
      </header>

      <div className="legacy-shell-body">
        <aside
          className={`legacy-shell-sidebar${collapsed ? " collapsed" : ""}`}
          style={{ width: drawerWidth }}
          role="navigation"
          aria-label="Main navigation"
        >
          {!collapsed && isLoggedIn && (
            <div className="legacy-shell-sidebar-user">
              <Avatar
                label={initials}
                shape="circle"
                className="legacy-shell-avatar big"
              />
              <div className="legacy-shell-sidebar-info">
                <div className="legacy-shell-sidebar-name">{displayName}</div>
                <div className="legacy-shell-sidebar-type">
                  {user?.user_type === "vendor" ? "Vendor" : "Candidate"}
                </div>
              </div>
              <div className="legacy-shell-rosettes">
                {accountAgeBadge && (
                  <div
                    className={`rosette rosette-${accountAgeBadge.color}`}
                    title={accountAgeBadge.tooltip}
                  >
                    <div className="rosette-body">
                      <span className="rosette-label">
                        {accountAgeBadge.label}
                      </span>
                    </div>
                    <div className="rosette-tails" />
                  </div>
                )}
                {profileFreshBadge && (
                  <div
                    className={`rosette rosette-${profileFreshBadge.color}`}
                    title={profileFreshBadge.tooltip}
                  >
                    <div className="rosette-body">
                      <span className="rosette-label">
                        {profileFreshBadge.label}
                      </span>
                    </div>
                    <div className="rosette-tails" />
                  </div>
                )}
              </div>
            </div>
          )}

          {!collapsed && !isLoggedIn && (
            <div className="legacy-shell-sidebar-user">
              <div
                className="legacy-shell-sidebar-name"
                style={{ fontSize: 10, opacity: 0.7 }}
              >
                ■ Browse as Guest
              </div>
            </div>
          )}

          {/* ---- JOBS item (active MFE) ---- */}
          {(() => {
            const item = navItems.find((n) => n.id === "jobs")!;
            const activeItem = active !== null && item.id === active.id;
            return (
              <ul className="legacy-shell-nav-list legacy-shell-apps-list">
                <li className="legacy-shell-app-entry">
                  <button
                    type="button"
                    className={`legacy-shell-nav-item${activeItem ? " active" : ""}`}
                    onClick={() => {
                      navigate(item.path);
                      setActiveLoginType(null);
                    }}
                    aria-current={activeItem ? "page" : undefined}
                    title={
                      collapsed
                        ? `${item.label} (port ${item.port})`
                        : `Jobs portal — port ${item.port}`
                    }
                  >
                    {!collapsed && item.chipColor && (
                      <span
                        className="legacy-shell-mfe-chip"
                        style={{ background: item.chipColor }}
                      />
                    )}
                    <i className={`${item.icon} legacy-shell-nav-icon`} />
                    {!collapsed && <span>{item.label}</span>}
                    {collapsed && item.chipColor && (
                      <span
                        className="legacy-shell-mfe-chip"
                        style={{
                          background: item.chipColor,
                          position: "absolute",
                          right: 2,
                          top: 2,
                          width: 5,
                          height: 5,
                        }}
                      />
                    )}
                  </button>

                  {/* Login-mode sub-rows (Candidate / Vendor login selector) */}
                  {!collapsed && !isLoggedIn && (
                    <ul className="legacy-shell-nav-list legacy-shell-jobtype-list">
                      {LOGIN_MODES.map((lm) => (
                        <li key={lm.id}>
                          <button
                            type="button"
                            className={`legacy-shell-nav-item legacy-shell-subnav-item${activeLoginType === lm.id ? " active" : ""}`}
                            onClick={() => {
                              const type = lm.id as "candidate" | "vendor";
                              setActiveLoginType(type);
                              navigate(`/jobs/${type}`);
                            }}
                            title={
                              lm.id === "candidate"
                                ? "Log in as a job seeker"
                                : "Log in as an employer / recruiter"
                            }
                          >
                            <span className="legacy-shell-subnav-bullet">
                              {lm.icon}
                            </span>
                            <span className="legacy-shell-subnav-label">
                              {lm.label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              </ul>
            );
          })()}

          {/* ---- MFE sub-nav groups (Profile, Actions, Job Type from MFE) ---- */}
          {subNavGroups.map((group, gi) => (
            <div
              key={`sub-${gi}`}
              className="legacy-shell-nav-group legacy-shell-subnav-group"
            >
              {!collapsed && (
                <div className="legacy-shell-nav-group-title legacy-shell-subnav-title">
                  {group.icon && (
                    <span className="legacy-shell-subnav-icon">
                      {group.icon}
                    </span>
                  )}
                  {group.label}
                </div>
              )}
              {!collapsed && (
                <ul className="legacy-shell-nav-list">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={[
                          "legacy-shell-nav-item",
                          "legacy-shell-subnav-item",
                          item.depth === 1 ? "depth-1" : "",
                          item.active ? "active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={item.onClick}
                        title={
                          item.tooltip
                            ? item.tooltip
                            : item.count !== undefined
                              ? `${item.label} (${item.count} records)`
                              : item.label
                        }
                      >
                        <span className="legacy-shell-subnav-bullet">
                          {item.depth === 1 ? "└" : "▸"}
                        </span>
                        <span className="legacy-shell-subnav-label">
                          {item.label}
                        </span>
                        {item.count !== undefined && (
                          <span className="legacy-shell-subnav-count">
                            {item.count}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {collapsed && (
                <div
                  className="legacy-shell-nav-list"
                  style={{ textAlign: "center", padding: "4px 0" }}
                >
                  <span
                    title={group.label}
                    style={{ fontSize: 14, cursor: "default" }}
                  >
                    {group.icon}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* ---- OTHER MFEs (Sales, Rentals, etc.) — collapsible, default collapsed ---- */}
          <ul className="legacy-shell-nav-list legacy-shell-apps-list">
            {navItems
              .filter((n) => n.id !== "jobs")
              .map((item) => {
                const isDisabled = !!item.disabled;
                const itemSubs = item.subs || [];
                const isExpanded = !!expandedMFEs[item.id];
                const toggleExpand = () =>
                  setExpandedMFEs((prev) => ({
                    ...prev,
                    [item.id]: !prev[item.id],
                  }));
                return (
                  <li key={item.id} className="legacy-shell-app-entry">
                    <button
                      type="button"
                      className={`legacy-shell-nav-item${isDisabled ? " disabled" : ""}`}
                      onClick={() => {
                        if (isDisabled) {
                          toggleExpand();
                        } else {
                          navigate(item.path);
                        }
                      }}
                      title={
                        isDisabled
                          ? `${item.label} — Coming Soon (port ${item.port})`
                          : `${item.label} (port ${item.port})`
                      }
                    >
                      {!collapsed && item.chipColor && (
                        <span
                          className="legacy-shell-mfe-chip"
                          style={{
                            background: isDisabled
                              ? "var(--w97-btn-shadow, #808080)"
                              : item.chipColor,
                          }}
                        />
                      )}
                      <i className={`${item.icon} legacy-shell-nav-icon`} />
                      {!collapsed && <span>{item.label}</span>}
                      {!collapsed && isDisabled && (
                        <span className="legacy-shell-mfe-soon">soon</span>
                      )}
                      {!collapsed && itemSubs.length > 0 && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 9,
                            opacity: 0.6,
                          }}
                        >
                          {isExpanded ? "▾" : "▸"}
                        </span>
                      )}
                      {collapsed && item.chipColor && (
                        <span
                          className="legacy-shell-mfe-chip"
                          style={{
                            background: isDisabled
                              ? "var(--w97-btn-shadow, #808080)"
                              : item.chipColor,
                            position: "absolute",
                            right: 2,
                            top: 2,
                            width: 5,
                            height: 5,
                          }}
                        />
                      )}
                    </button>
                    {!collapsed && isExpanded && itemSubs.length > 0 && (
                      <ul className="legacy-shell-nav-list legacy-shell-jobtype-list">
                        {itemSubs.map((sub) => (
                          <li key={sub.id}>
                            <button
                              type="button"
                              className="legacy-shell-nav-item legacy-shell-subnav-item"
                              title={`${item.label} › ${sub.label} — Coming Soon`}
                            >
                              <span className="legacy-shell-subnav-bullet">
                                ▸
                              </span>
                              <span className="legacy-shell-subnav-label">
                                {sub.label}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
          </ul>
        </aside>

        <section className="legacy-shell-main" role="main">
          {/* Visible-in banner — above pagehead, sent from Jobs MFE */}
          {isLoggedIn && visibleInText && (
            <div className="legacy-shell-visible-in">
              <i
                className="pi pi-eye"
                style={{ marginRight: 6, fontSize: 13 }}
              />
              {visibleInText}
            </div>
          )}

          <div className="legacy-shell-pagehead">
            <div>
              <h2>{isWelcome ? "MatchDB" : (active?.label ?? "")}</h2>
              {(!isLoggedIn || isWelcome) && (
                <p>
                  {isWelcome
                    ? "The data-driven marketplace"
                    : "Browse job openings and candidate profiles"}
                </p>
              )}
            </div>
            <div className="legacy-shell-pagehead-right">
              {isLoggedIn && (
                <Button
                  type="button"
                  label="Upgrade to Post More"
                  className="legacy-shell-signout"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("matchdb:openPricing", {
                        detail: {
                          tab:
                            user?.user_type === "vendor"
                              ? "vendor"
                              : "candidate",
                        },
                      }),
                    )
                  }
                  style={{ fontWeight: 700 }}
                />
              )}
              {!isLoggedIn && (
                <div className="legacy-shell-pagehead-auth">
                  {loginTypeFromPath !== "vendor" && (
                    <Button
                      type="button"
                      icon="pi pi-user"
                      label="Candidate Login"
                      className="legacy-shell-signout"
                      onClick={() => openLogin("candidate", "login")}
                    />
                  )}
                  {loginTypeFromPath !== "candidate" && (
                    <Button
                      type="button"
                      icon="pi pi-building"
                      label="Vendor Login"
                      className="legacy-shell-signout"
                      onClick={() => openLogin("vendor", "login")}
                    />
                  )}
                  <Button
                    type="button"
                    icon="pi pi-user-plus"
                    label="Create Account"
                    className="legacy-shell-signout"
                    onClick={() =>
                      openLogin(
                        loginTypeFromPath === "vendor" ? "vendor" : "candidate",
                        "register",
                      )
                    }
                  />
                </div>
              )}
              {isLoggedIn && profileCountry && (
                <span className="legacy-shell-sub-country">
                  {profileCountry}
                </span>
              )}
            </div>
          </div>

          <div className="legacy-shell-content">{children}</div>

          <footer className="legacy-shell-footer">
            <span>&copy; 2026 MatchDB Corporation</span>
            {footerInfo && <span>{footerInfo}</span>}
            <span>Build 97.2026.0213</span>
          </footer>
        </section>
      </div>

      {/* ── Pricing modal overlay — triggered by matchdb:openPricing event ── */}
      {pricingModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "20px 16px",
            overflowY: "auto",
          }}
          onClick={handleClosePricing}
        >
          <div
            style={{
              background: "#f5f5f5",
              width: "fit-content",
              maxWidth: "95vw",
              borderTop: "2px solid #fff",
              borderLeft: "2px solid #fff",
              borderRight: "2px solid #404040",
              borderBottom: "2px solid #404040",
              boxShadow: "4px 4px 12px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* W97-style title bar */}
            <div
              style={{
                background: "linear-gradient(to right, #235a81, #3b6fa6)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                padding: "4px 6px",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 13 }}>💎</span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  flex: 1,
                  fontFamily: "MS Sans Serif, Tahoma, Arial, sans-serif",
                }}
              >
                Plans &amp; Pricing — MatchDB
              </span>
              <button
                onClick={handleClosePricing}
                style={{
                  background: "#c0c0c0",
                  border: "1px solid",
                  borderTopColor: "#fff",
                  borderLeftColor: "#fff",
                  borderRightColor: "#404040",
                  borderBottomColor: "#404040",
                  width: 18,
                  height: 18,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1,
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
            {/* PricingPage fills the modal body */}
            <div
              style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}
            >
              <PricingPage
                initialTab={pricingModalTab}
                onClose={() => setPricingModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShellLayout;
