import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { useAppDispatch, useAppSelector } from "../store";
import { logout } from "../store/authSlice";
import "./ShellLayout.css";

/* ---- types shared with the Jobs MFE via CustomEvent ---- */
interface SubNavItem {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
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
  const [activeJobType, setActiveJobType] = useState<string>("");
  const [activeLoginType, setActiveLoginType] = useState<
    "candidate" | "vendor"
  >("candidate");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("matchdb_dark") === "1";
  });

  const isLoggedIn = !!token;

  /* ---- Dark mode persistence ---- */
  useEffect(() => {
    localStorage.setItem("matchdb_dark", darkMode ? "1" : "0");
    // Also set on <body> so MFE CSS can read it
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  /* Listen for sub-nav events emitted by the Jobs MFE */
  const handleSubNav = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    setSubNavGroups(Array.isArray(detail) ? detail : []);
  }, []);

  useEffect(() => {
    window.addEventListener("matchdb:subnav", handleSubNav);
    return () => window.removeEventListener("matchdb:subnav", handleSubNav);
  }, [handleSubNav]);

  /* Nav = all 10 MFEs always visible */
  const navItems = MFE_NAV;

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

  /* Determine allowed subdivisions based on candidate visibility */
  const allowedSubdivisions = useMemo(() => {
    if (!isLoggedIn) return []; // no job-type subs when not logged in
    if (user?.user_type === "vendor") return JOB_TYPE_SUBS;
    const vis = user?.visibility || "all";
    if (vis === "all") return JOB_TYPE_SUBS;
    return JOB_TYPE_SUBS.filter((s) => s.id === vis);
  }, [isLoggedIn, user]);

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

          {/* ---- Flat app list (no section headers) ---- */}
          <ul className="legacy-shell-nav-list legacy-shell-apps-list">
            {navItems.map((item) => {
              const activeItem = item.id === active.id;
              const isDisabled = !!item.disabled;
              const itemSubs = getSubsForItem(item);
              return (
                <li key={item.id} className="legacy-shell-app-entry">
                  <button
                    type="button"
                    className={`legacy-shell-nav-item${activeItem ? " active" : ""}${isDisabled ? " disabled" : ""}`}
                    onClick={() => {
                      if (isDisabled) return;
                      navigate(item.path);
                    }}
                    title={
                      isDisabled
                        ? `${item.label} — Coming Soon (port ${item.port})`
                        : collapsed
                          ? `${item.label} (port ${item.port})`
                          : `Port ${item.port}`
                    }
                    disabled={isDisabled}
                  >
                    {/* Color chip */}
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

                  {/* Login-mode sub-rows (when NOT logged in under Jobs) */}
                  {!collapsed &&
                    !isDisabled &&
                    !isLoggedIn &&
                    item.id === "jobs" && (
                      <ul className="legacy-shell-nav-list legacy-shell-jobtype-list">
                        {LOGIN_MODES.map((lm) => (
                          <li key={lm.id}>
                            <button
                              type="button"
                              className={`legacy-shell-nav-item legacy-shell-subnav-item${activeLoginType === lm.id ? " active" : ""}`}
                              onClick={() => {
                                setActiveLoginType(
                                  lm.id as "candidate" | "vendor",
                                );
                              }}
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

                  {/* Job-type sub-rows (when logged in under Jobs) */}
                  {!collapsed &&
                    !isDisabled &&
                    isLoggedIn &&
                    item.id === "jobs" &&
                    allowedSubdivisions.length > 0 && (
                      <ul className="legacy-shell-nav-list legacy-shell-jobtype-list">
                        {allowedSubdivisions.map((sub) => (
                          <li key={sub.id}>
                            <button
                              type="button"
                              className={`legacy-shell-nav-item legacy-shell-subnav-item${activeJobType === sub.id ? " active" : ""}`}
                              onClick={() => handleJobTypeClick(sub.id)}
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

                  {/* Always-visible submenus for other non-disabled MFEs */}
                  {!collapsed &&
                    !isDisabled &&
                    item.id !== "jobs" &&
                    itemSubs.length > 0 && (
                      <ul className="legacy-shell-nav-list legacy-shell-jobtype-list">
                        {itemSubs.map((sub) => (
                          <li key={sub.id}>
                            <button
                              type="button"
                              className="legacy-shell-nav-item legacy-shell-subnav-item"
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

          {/* ---- MFE sub-nav groups ---- */}
          {!collapsed && subNavGroups.length > 0 && (
            <div className="legacy-shell-subnav-divider" />
          )}
          {subNavGroups.map((group, gi) => (
            <div
              key={`sub-${gi}`}
              className="legacy-shell-nav-group legacy-shell-subnav-group"
            >
              {!collapsed && (
                <div className="legacy-shell-nav-group-title legacy-shell-subnav-title">
                  <span className="legacy-shell-subnav-icon">{group.icon}</span>
                  {group.label}
                </div>
              )}
              {!collapsed && (
                <ul className="legacy-shell-nav-list">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`legacy-shell-nav-item legacy-shell-subnav-item${item.active ? " active" : ""}`}
                        onClick={item.onClick}
                        title={item.label}
                      >
                        <span className="legacy-shell-subnav-bullet">▸</span>
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
        </aside>

        <section className="legacy-shell-main">
          <div className="legacy-shell-breadcrumb">
            <button type="button" onClick={() => navigate("/")}>
              Home
            </button>
            <span className="sep">&gt;</span>
            <span>{active.label}</span>
            {active.port && (
              <>
                <span className="sep">|</span>
                <span style={{ opacity: 0.6 }}>:{active.port}</span>
              </>
            )}
            {activeJobType && (
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
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
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
    </div>
  );
};

export default ShellLayout;
