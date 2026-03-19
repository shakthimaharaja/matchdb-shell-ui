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
import { logout } from "../store/authSlice";
import { useRefreshUserDataMutation } from "../api/shellApi";
import PricingPage from "../pages/PricingPage";
import {
  type ShellLayoutProps,
  type SubNavGroup,
  SIDEBAR_EXPANDED,
  SIDEBAR_COLLAPSED,
  JOB_TYPE_SUBS,
  LOGIN_MODES,
  MFE_NAV,
  isPathActive,
  userTypeLabel,
  computeAccountAgeBadge,
  computeProfileFreshBadge,
  deriveProfileCountry,
} from "./shellLayoutHelpers";
import "./ShellLayout.css";
import {
  LS_DARK,
  LS_FONT_SIZE,
  FONT_SIZE_MAP,
  GEOCODE_URL,
  GEOCODE_TIMEOUT,
  EVT_OPEN_PRICING,
  EVT_PRICING_CLOSED,
  EVT_OPEN_PROFILE,
  EVT_SUBNAV,
  EVT_BREADCRUMB,
  EVT_FOOTER_INFO,
  EVT_PROFILE_LOCATION,
  EVT_VISIBLE_IN,
  EVT_LOGIN_CONTEXT,
  EVT_JOB_TYPE_FILTER,
  EVT_OPEN_LOGIN,
  STRIPE_SUCCESS_PARAM,
  STRIPE_CANDIDATE_SUCCESS_PARAM,
  STRIPE_CANCELED_PARAM,
} from "../constants";

const ShellLayout: React.FC<ShellLayoutProps> = ({
  children,
  themeStyle,
  onThemeStyleChange,
}) => {
  const { user, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [refreshUserData] = useRefreshUserDataMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [subNavGroups, setSubNavGroups] = useState<SubNavGroup[]>([]);
  const mfeBreadcrumbRef = useRef<string[]>([]);
  const stripeHandled = useRef(false);
  const [footerInfo, setFooterInfo] = useState("");
  const [activeJobType, setActiveJobType] = useState<string>("");
  /** null = no sub-item selected (user is on /jobs or elsewhere) */
  const loginTypeFromPath = (() => {
    if (location.pathname.startsWith("/jobs/vendor")) return "vendor";
    if (location.pathname.startsWith("/jobs/candidate")) return "candidate";
    if (location.pathname.startsWith("/jobs/marketer")) return "marketer";
    return null;
  })();
  const [activeLoginType, setActiveLoginType] = useState<
    "candidate" | "vendor" | "marketer" | null
  >(loginTypeFromPath);

  /* Keep activeLoginType in sync when URL changes (e.g. back/forward) */
  useEffect(() => {
    setActiveLoginType(loginTypeFromPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem(LS_DARK) === "1";
  });
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(() => {
    return (
      (localStorage.getItem(LS_FONT_SIZE) as "small" | "medium" | "large") ||
      "medium"
    );
  });
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const [expandedMFEs, setExpandedMFEs] = useState<Record<string, boolean>>({});

  const isLoggedIn = !!token;

  /* ---- Dark mode persistence ---- */
  useEffect(() => {
    localStorage.setItem(LS_DARK, darkMode ? "1" : "0");
    // Also set on <body> so MFE CSS can read it
    document.body.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  /* ---- Font size persistence ---- */
  useEffect(() => {
    const sizeMap = FONT_SIZE_MAP;
    localStorage.setItem(LS_FONT_SIZE, fontSize);
    document.documentElement.style.setProperty(
      "--w97-font-base",
      sizeMap[fontSize],
    );
  }, [fontSize]);

  /* ---- Close font-size dropdown on outside click ---- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        fontSizeRef.current &&
        !fontSizeRef.current.contains(e.target as Node)
      ) {
        setFontSizeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    globalThis.dispatchEvent(new CustomEvent(EVT_PRICING_CLOSED));
    if (pendingProfileOpen) {
      setPendingProfileOpen(false);
      // Small delay so pricing overlay fully unmounts before profile modal appears
      setTimeout(() => {
        globalThis.dispatchEvent(new CustomEvent(EVT_OPEN_PROFILE));
      }, 80);
    }
  }, [pendingProfileOpen]);

  useEffect(() => {
    globalThis.addEventListener(EVT_OPEN_PRICING, handleOpenPricing);
    return () =>
      globalThis.removeEventListener(EVT_OPEN_PRICING, handleOpenPricing);
  }, [handleOpenPricing]);

  /* Auto-open pricing modal on Stripe post-checkout redirects (e.g. /?success=true) */
  useEffect(() => {
    if (stripeHandled.current) return;
    const params = new URLSearchParams(globalThis.location.search);
    const isSuccess = params.get(STRIPE_SUCCESS_PARAM) === "true";
    const isCandSucc = params.get(STRIPE_CANDIDATE_SUCCESS_PARAM) === "true";
    const isCanceled = params.get(STRIPE_CANCELED_PARAM) === "true";
    if (isSuccess || isCandSucc || isCanceled) {
      const tab =
        isCandSucc || user?.user_type === "candidate" ? "candidate" : "vendor";
      setPricingModalTab(tab);
      if (isCandSucc) {
        // Refresh user data from server so hasPurchasedVisibility reflects the completed payment,
        // then sequence the profile form after the pricing confirmation modal closes.
        refreshUserData();
        setPendingProfileOpen(true);
      }
      stripeHandled.current = true;
      setPricingModalOpen(true);
      // Clean up the URL so the modal doesn't re-open on navigation
      globalThis.history.replaceState({}, "", globalThis.location.pathname);
    }
  }, [user?.user_type]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Listen for sub-nav events emitted by the Jobs MFE */
  const handleSubNav = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    setSubNavGroups(Array.isArray(detail) ? detail : []);
  }, []);

  const handleBreadcrumb = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    mfeBreadcrumbRef.current = Array.isArray(detail) ? detail : [];
  }, []);

  useEffect(() => {
    globalThis.addEventListener(EVT_SUBNAV, handleSubNav);
    globalThis.addEventListener(EVT_BREADCRUMB, handleBreadcrumb);
    const handleFooterInfo = (e: Event) => {
      const text = (e as CustomEvent).detail?.text || "";
      setFooterInfo(text);
    };
    globalThis.addEventListener(EVT_FOOTER_INFO, handleFooterInfo);
    return () => {
      globalThis.removeEventListener(EVT_SUBNAV, handleSubNav);
      globalThis.removeEventListener(EVT_BREADCRUMB, handleBreadcrumb);
      globalThis.removeEventListener(EVT_FOOTER_INFO, handleFooterInfo);
    };
  }, [handleSubNav, handleBreadcrumb]);

  /* Nav = all 10 MFEs always visible; override 'Jobs Database' label per user type */
  let jobsLabel = "Jobs Database";
  if (user?.user_type === "vendor") jobsLabel = "Candidate Database";
  else if (user?.user_type === "candidate") jobsLabel = "Job Openings Database";
  else if (user?.user_type === "marketer") jobsLabel = "Marketing Database";
  const navItems = useMemo(
    () =>
      MFE_NAV.map((n) => (n.id === "jobs" ? { ...n, label: jobsLabel } : n)),
    [jobsLabel],
  );

  const [tzCity, setTzCity] = useState(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz.split("/").pop()?.replaceAll("_", " ") || tz;
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
              `${GEOCODE_URL}?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
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
        { timeout: GEOCODE_TIMEOUT },
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

  const profileCountry = useMemo(
    () => deriveProfileCountry(profileLocation),
    [profileLocation],
  );
  useEffect(() => {
    const locHandler = (e: Event) => {
      const loc = (e as CustomEvent).detail?.location;
      if (loc) setProfileLocation(loc);
    };
    const visHandler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text;
      setVisibleInText(text || "");
    };
    globalThis.addEventListener(EVT_PROFILE_LOCATION, locHandler);
    globalThis.addEventListener(EVT_VISIBLE_IN, visHandler);
    return () => {
      globalThis.removeEventListener(EVT_PROFILE_LOCATION, locHandler);
      globalThis.removeEventListener(EVT_VISIBLE_IN, visHandler);
    };
  }, []);

  const initials = user
    ? `${user.first_name?.charAt(0) ?? ""}${
        user.last_name?.charAt(0) ?? ""
      }`.toUpperCase() || user.email.charAt(0).toUpperCase()
    : "G";
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : user?.email ?? "Guest";

  /* ── Account age & profile freshness badges ── */
  const accountAgeBadge = useMemo(
    () => computeAccountAgeBadge(user?.created_at),
    [user?.created_at],
  );
  const profileFreshBadge = useMemo(
    () => computeProfileFreshBadge(user?.updated_at),
    [user?.updated_at],
  );

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

  /* Shell-level job type subs — only for vendors; candidates use the MFE's Job Type nav */
  const allowedSubdivisions = useMemo(
    () => (isLoggedIn && user?.user_type === "vendor" ? JOB_TYPE_SUBS : []),
    [isLoggedIn, user?.user_type],
  );

  /* For candidates, merge the MFE's "Job Type" group under the Jobs nav item */
  const jobTypeNavGroup = useMemo(() => {
    if (user?.user_type !== "candidate") return null;
    return subNavGroups.find((g) => g.label === "Job Type") ?? null;
  }, [user?.user_type, subNavGroups]);
  const displaySubNavGroups = useMemo(() => {
    if (!jobTypeNavGroup) return subNavGroups;
    return subNavGroups.filter((g) => g.label !== "Job Type");
  }, [subNavGroups, jobTypeNavGroup]);

  /* Broadcast active login context to MFE (null → "candidate" as safe default) */
  useEffect(() => {
    globalThis.dispatchEvent(
      new CustomEvent(EVT_LOGIN_CONTEXT, {
        detail: { loginType: activeLoginType ?? "candidate" },
      }),
    );
  }, [activeLoginType]);

  /* All non-disabled MFE submenus are always visible */

  /* Dispatch job type filter event to MFE */
  const handleJobTypeClick = (typeId: string) => {
    const newType = activeJobType === typeId ? "" : typeId;
    setActiveJobType(newType);
    globalThis.dispatchEvent(
      new CustomEvent(EVT_JOB_TYPE_FILTER, {
        detail: { jobType: newType },
      }),
    );
  };

  /* Open login modal.
   * locked = true  → user_type is fixed (came from Candidate/Vendor nav link)
   * locked = false → user can choose candidate or vendor (header buttons, Jobs Database)
   */
  const openLogin = (
    context: "candidate" | "vendor" | "marketer" = "candidate",
    mode: "login" | "register" = "login",
    locked: boolean = false,
  ) => {
    globalThis.dispatchEvent(
      new CustomEvent(EVT_OPEN_LOGIN, {
        detail: { context, mode, locked },
      }),
    );
  };

  function renderHeader() {
    return (
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

        <a
          href="/"
          className="legacy-shell-brand matchdb-clickable"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
          title="MatchDB — Home"
        >
          {/* Tiny Windows-97 pixel flag */}
          <div className="legacy-shell-brand-logo">
            <span className="legacy-shell-brand-pixel" />
            <span className="legacy-shell-brand-pixel" />
            <span className="legacy-shell-brand-pixel" />
            <span className="legacy-shell-brand-pixel" />
            <span className="legacy-shell-brand-pixel" />
            <span className="legacy-shell-brand-pixel" />
          </div>
          <span className="legacy-shell-brand-title">MatchDB</span>
          <span className="legacy-shell-brand-subtitle">
            {themeStyle === "modern" ? "AWS" : "97"}
          </span>
        </a>

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
            <span className="matchdb-accent legacy-shell-logged-as">
              · Logged in as {userTypeLabel(user.user_type)}
            </span>
          )}
        </span>

        <div className="legacy-shell-header-fill" />

        {/* Dark / Light mode toggle */}
        <Button
          type="button"
          icon={darkMode ? "pi pi-sun" : "pi pi-moon"}
          className="legacy-shell-darkmode"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Toggle dark mode"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        />

        {/* Theme style toggle: Legacy ↔ Modern */}
        <Button
          type="button"
          icon="pi pi-palette"
          className="legacy-shell-darkmode"
          onClick={() =>
            onThemeStyleChange(themeStyle === "modern" ? "legacy" : "modern")
          }
          aria-label="Toggle theme style"
          title={
            themeStyle === "modern"
              ? "Switch to Legacy (Win97)"
              : "Switch to Modern (AWS)"
          }
        />

        {/* Font size dropdown */}
        <div ref={fontSizeRef} className="matchdb-fontsize-wrapper">
          <Button
            type="button"
            icon="pi pi-arrows-v"
            className="legacy-shell-darkmode"
            onClick={() => setFontSizeOpen((prev) => !prev)}
            aria-label="Change font size"
            title="Font Size"
          />
          {fontSizeOpen && (
            <div className="matchdb-fontsize-dropdown">
              {(["small", "medium", "large"] as const).map((size) => (
                <button
                  key={size}
                  className={`matchdb-fontsize-option${
                    fontSize === size ? " matchdb-fontsize-active" : ""
                  }`}
                  onClick={() => {
                    setFontSize(size);
                    setFontSizeOpen(false);
                  }}
                >
                  <span
                    className={`matchdb-fontsize-label matchdb-fontsize-${size}`}
                  >
                    A
                  </span>
                  <span className="matchdb-fontsize-text">
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!isLoggedIn && (
          <div className="legacy-shell-header-auth">
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

        {isLoggedIn && (
          <>
            <Tag value={plan} className="legacy-shell-plan" />
            {/* Clickable user area — opens account details panel */}
            <div
              className="legacy-shell-user-container"
              ref={accountPanelContainerRef}
            >
              <button
                type="button"
                className="legacy-shell-user matchdb-clickable"
                onClick={() => setShowAccountPanel((p) => !p)}
                title="Click to view account details"
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
                    {userTypeLabel(user?.user_type)}
                  </div>
                </div>
                <span className="legacy-shell-user-caret" aria-hidden="true">
                  {showAccountPanel ? "▲" : "▼"}
                </span>
              </button>

              {/* W97-style account details dropdown */}
              {showAccountPanel && (
                <dialog
                  open
                  className="shell-account-panel"
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
                        {userTypeLabel(user?.user_type)}
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
                </dialog>
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
            />
          </>
        )}
      </header>
    );
  }

  return (
    <div className={`legacy-shell-root${darkMode ? " dark" : ""}`}>
      {renderHeader()}

      <div className="legacy-shell-body">
        <nav
          className={`legacy-shell-sidebar${collapsed ? " collapsed" : ""}`}
          style={{ width: drawerWidth }}
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
                  {userTypeLabel(user?.user_type)}
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
              <div className="legacy-shell-sidebar-name matchdb-hint">
                ■ Browse as Guest
              </div>
            </div>
          )}

          {/* ---- JOBS item (active MFE) ---- */}
          {(() => {
            const item = navItems.find((n) => n.id === "jobs")!;
            const activeItem = active !== null && item.id === active.id;
            const isMarketerNav = user?.user_type === "marketer" && isLoggedIn;
            return (
              <ul className="legacy-shell-nav-list legacy-shell-apps-list">
                <li className="legacy-shell-app-entry">
                  <button
                    type="button"
                    className={[
                      "legacy-shell-nav-item",
                      activeItem ? "active" : "",
                      isMarketerNav ? "marketer-nav-highlight" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
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
                        className="legacy-shell-mfe-chip legacy-shell-mfe-chip--dot"
                        style={{ background: item.chipColor }}
                      />
                    )}
                  </button>

                  {/* Candidate / Vendor login links for unauthenticated users */}
                  {!collapsed && !isLoggedIn && (
                    <ul className="legacy-shell-nav-list legacy-shell-jobtype-list">
                      {LOGIN_MODES.map((mode) => (
                        <li key={mode.id}>
                          <button
                            type="button"
                            className={`legacy-shell-nav-item legacy-shell-subnav-item${
                              activeLoginType === mode.id ? " active" : ""
                            }`}
                            onClick={() => {
                              setActiveLoginType(
                                mode.id as "candidate" | "vendor" | "marketer",
                              );
                              navigate(`/jobs/${mode.id}`);
                            }}
                            title={mode.label}
                          >
                            <span className="legacy-shell-subnav-bullet">
                              ▸
                            </span>
                            <span className="legacy-shell-subnav-label">
                              {mode.icon} {mode.label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Job-type subdivisions for logged-in users */}
                  {!collapsed &&
                    isLoggedIn &&
                    allowedSubdivisions.length > 0 && (
                      <ul className="legacy-shell-nav-list legacy-shell-jobtype-list">
                        {allowedSubdivisions.map((sub) => (
                          <li key={sub.id}>
                            <button
                              type="button"
                              className={`legacy-shell-nav-item legacy-shell-subnav-item${
                                activeJobType === sub.id ? " active" : ""
                              }`}
                              onClick={() => handleJobTypeClick(sub.id)}
                              title={sub.label}
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

                  {/* Candidate: Job Type MFE items merged under Jobs heading */}
                  {!collapsed && jobTypeNavGroup && (
                    <ul className="legacy-shell-nav-list">
                      {jobTypeNavGroup.items.map((item) => {
                        let itemTitle = item.label;
                        if (item.tooltip) itemTitle = item.tooltip;
                        else if (item.count !== undefined)
                          itemTitle = `${item.label} (${item.count} records)`;
                        return (
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
                              title={itemTitle}
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
                        );
                      })}
                    </ul>
                  )}
                </li>
              </ul>
            );
          })()}

          {/* ---- MFE sub-nav groups (Profile, Actions, etc. — Job Type merged above for candidates) ---- */}
          {displaySubNavGroups.map((group) => (
            <div
              key={group.label}
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
                  {group.items.map((item) => {
                    let itemTitle = item.label;
                    if (item.tooltip) itemTitle = item.tooltip;
                    else if (item.count !== undefined)
                      itemTitle = `${item.label} (${item.count} records)`;
                    return (
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
                          title={itemTitle}
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
                    );
                  })}
                </ul>
              )}
              {collapsed && (
                <div className="matchdb-collapsed-text">
                  <span title={group.label} className="matchdb-collapsed-icon">
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
                      className={`legacy-shell-nav-item${
                        isDisabled ? " disabled" : ""
                      }`}
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
                        <span className="matchdb-chevron">
                          {isExpanded ? "▾" : "▸"}
                        </span>
                      )}
                      {collapsed && item.chipColor && (
                        <span
                          className="legacy-shell-mfe-chip legacy-shell-mfe-chip--dot"
                          style={{
                            background: isDisabled
                              ? "var(--w97-btn-shadow, #808080)"
                              : item.chipColor,
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
        </nav>

        <main className="legacy-shell-main">
          {/* Visible-in banner — above pagehead, sent from Jobs MFE */}
          {isLoggedIn && visibleInText && (
            <div className="legacy-shell-visible-in">
              <i className="pi pi-eye legacy-shell-visible-icon" />
              {visibleInText}
            </div>
          )}

          <div className="legacy-shell-pagehead">
            <div>
              <h2>{isWelcome ? "MatchDB" : active?.label ?? ""}</h2>
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
                  className="legacy-shell-signout legacy-shell-upgrade-btn"
                  onClick={() =>
                    globalThis.dispatchEvent(
                      new CustomEvent(EVT_OPEN_PRICING, {
                        detail: {
                          tab: user?.user_type ?? "candidate",
                        },
                      }),
                    )
                  }
                />
              )}
              {!isLoggedIn && (
                <div className="legacy-shell-pagehead-auth">
                  <span className="matchdb-hint">
                    Use <strong>Sign&nbsp;In</strong> /{" "}
                    <strong>Sign&nbsp;Up</strong> in the top header
                  </span>
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
        </main>
      </div>

      {/* ── Pricing modal overlay — triggered by matchdb:openPricing event ── */}
      {pricingModalOpen && (
        <dialog
          open
          className="matchdb-modal-overlay matchdb-modal-overlay--top"
        >
          <div
            className="rm-backdrop"
            role="none"
            onClick={handleClosePricing}
          />
          <div className="matchdb-modal-window matchdb-modal-window--fit">
            {/* W97-style title bar */}
            <div className="matchdb-modal-titlebar w97-titlebar">
              <span className="matchdb-modal-icon">💎</span>
              <span className="matchdb-modal-title">
                Plans &amp; Pricing — MatchDB
              </span>
              <button
                className="w97-close-btn"
                onClick={handleClosePricing}
                title="Close"
              >
                ✕
              </button>
            </div>
            {/* PricingPage fills the modal body */}
            <div className="matchdb-modal-body">
              <PricingPage
                initialTab={pricingModalTab}
                onClose={() => setPricingModalOpen(false)}
              />
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default ShellLayout;
