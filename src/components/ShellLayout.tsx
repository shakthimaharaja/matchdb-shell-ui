import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    label: "Jobs",
    icon: "pi pi-briefcase",
    path: "/",
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
  const [activeJobType, setActiveJobType] = useState<string>("");
  const [activeLoginType, setActiveLoginType] = useState<
    "candidate" | "vendor"
  >("candidate");
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
    return () => {
      window.removeEventListener("matchdb:subnav", handleSubNav);
      window.removeEventListener("matchdb:breadcrumb", handleBreadcrumb);
    };
  }, [handleSubNav, handleBreadcrumb]);

  /* Nav = all 10 MFEs always visible */
  const navItems = MFE_NAV;

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
  const initials = user
    ? `${user.first_name?.charAt(0) ?? ""}${user.last_name?.charAt(0) ?? ""}`.toUpperCase() ||
      user.email.charAt(0).toUpperCase()
    : "G";
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : (user?.email ?? "Guest");

  const active =
    navItems.find((item) => isPathActive(item.path, location.pathname)) ??
    navItems[0];

  const drawerWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  /* Shell-level job type subs — MFE controls the real filtering via membershipConfig */
  const allowedSubdivisions = useMemo(
    () => (isLoggedIn ? JOB_TYPE_SUBS : []),
    [isLoggedIn],
  );

  /* Broadcast active login context to MFE */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("matchdb:loginContext", {
        detail: { loginType: activeLoginType },
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

        <div className="legacy-shell-brand">
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

        <div className="legacy-shell-header-fill" />

        {/* Dark mode toggle */}
        <Button
          type="button"
          icon={darkMode ? "pi pi-sun" : "pi pi-moon"}
          className="legacy-shell-darkmode"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Toggle dark mode"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        />

        {isLoggedIn && (
          <>
            <Tag value={plan} className="legacy-shell-plan" />
            <div className="legacy-shell-user">
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
            </div>
            <Button
              type="button"
              icon="pi pi-sign-out"
              label="Sign Out"
              className="legacy-shell-signout"
              onClick={() => dispatch(logout())}
            />
          </>
        )}
      </header>

      <div className="legacy-shell-body">
        <aside
          className={`legacy-shell-sidebar${collapsed ? " collapsed" : ""}`}
          style={{ width: drawerWidth }}
        >
          {!collapsed && isLoggedIn && (
            <div className="legacy-shell-sidebar-user">
              <Avatar
                label={initials}
                shape="circle"
                className="legacy-shell-avatar big"
              />
              <div className="legacy-shell-sidebar-name">{displayName}</div>
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
            const activeItem = item.id === active.id;
            return (
              <ul className="legacy-shell-nav-list legacy-shell-apps-list">
                <li className="legacy-shell-app-entry">
                  <button
                    type="button"
                    className={`legacy-shell-nav-item${activeItem ? " active" : ""}`}
                    onClick={() => navigate(item.path)}
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
                            onClick={() =>
                              setActiveLoginType(
                                lm.id as "candidate" | "vendor",
                              )
                            }
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

        <section className="legacy-shell-main">
          <div className="legacy-shell-breadcrumb">
            <button type="button" onClick={() => navigate("/")}>
              Home
            </button>
            <span className="sep">&gt;</span>
            <button type="button" onClick={() => navigate(active.path)}>
              {active.label}
            </button>
            {active.port && !mfeBreadcrumb.length && (
              <>
                <span className="sep">|</span>
                <span style={{ opacity: 0.6 }}>:{active.port}</span>
              </>
            )}
            {/* MFE-provided breadcrumb segments */}
            {mfeBreadcrumb.map((seg, i) => (
              <React.Fragment key={i}>
                <span className="sep">&gt;</span>
                {i < mfeBreadcrumb.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      /* clicking an ancestor segment fires subnav item at that depth */
                      const subNavItem = subNavGroups
                        .flatMap((g) => g.items)
                        .find((item) => item.label === seg || item.active);
                      subNavItem?.onClick?.();
                    }}
                  >
                    {seg}
                  </button>
                ) : (
                  <span>{seg}</span>
                )}
              </React.Fragment>
            ))}
            {/* Fallback: show active job type filter when no MFE breadcrumb */}
            {!mfeBreadcrumb.length && activeJobType && (
              <>
                <span className="sep">&gt;</span>
                <span>
                  {JOB_TYPE_SUBS.find((s) => s.id === activeJobType)?.label ||
                    activeJobType}
                </span>
              </>
            )}
          </div>

          <div className="legacy-shell-pagehead">
            <div>
              <h2>{active.label}</h2>
              <p>
                {!isLoggedIn
                  ? "Browse job openings and candidate profiles"
                  : user?.user_type === "vendor"
                    ? "Manage job postings and review applicants"
                    : "Search and apply for available positions"}
              </p>
            </div>
            <div className="legacy-shell-pagehead-right">
              {!isLoggedIn && (
                <div className="legacy-shell-pagehead-auth">
                  <Button
                    type="button"
                    icon="pi pi-sign-in"
                    label="Sign In"
                    className="legacy-shell-signout"
                    onClick={() => openLogin("candidate", "login")}
                  />
                  <Button
                    type="button"
                    icon="pi pi-user-plus"
                    label="Sign Up"
                    className="legacy-shell-signout"
                    onClick={() => openLogin("candidate", "register")}
                  />
                </div>
              )}
              <div className="legacy-shell-date">
                <span className="legacy-shell-date-tz">
                  {tzCity}
                  {tzAbbr ? ` (${tzAbbr})` : ""}
                </span>
                <span>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="legacy-shell-content">{children}</div>

          <footer className="legacy-shell-footer">
            <span>&copy; 2026 MatchDB Corporation</span>
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
