import React, { useState, useEffect, useCallback } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { useAppSelector } from "../store";
import { useLoginMutation, useRegisterMutation } from "../api/shellApi";
import "./LoginModal.css";

type ModalMode = "login" | "register";

interface RegForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  user_type: "candidate" | "vendor" | "marketer";
}

const EMPTY_REG: RegForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  user_type: "candidate",
};

const LoginModal: React.FC = () => {
  const { token, user } = useAppSelector((state) => state.auth);
  const [
    login,
    { isLoading: loginLoading, error: loginError, reset: resetLogin },
  ] = useLoginMutation();
  const [
    register,
    { isLoading: registerLoading, error: registerError, reset: resetRegister },
  ] = useRegisterMutation();

  const loading = loginLoading || registerLoading;
  const rawError = loginError || registerError;
  const error = rawError
    ? (rawError as any).data?.error ??
      (rawError as any).data?.detail ??
      "Authentication failed. Please try again."
    : null;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("login");
  const [context, setContext] = useState<"candidate" | "vendor" | "marketer">(
    "candidate",
  );
  /** When true the user_type is locked (came from Candidate/Vendor nav link) */
  const [locked, setLocked] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState<RegForm>(EMPTY_REG);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errParam = params.get("oauth_error");
    if (errParam) {
      const msg = decodeURIComponent(errParam);
      setOauthError(
        msg === "missing_data" || msg === "parse_error"
          ? "Google sign-in failed. Please try again."
          : "Google sign-in failed: " + msg,
      );
      setOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleOpenModal = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setContext(detail?.context || "candidate");
      setMode(detail?.mode || "login");
      setLocked(!!detail?.locked);
      setRegForm({ ...EMPTY_REG, user_type: detail?.context || "candidate" });
      setOauthError(null);
      setShowUpgrade(false);
      setOpen(true);
      resetLogin();
      resetRegister();
    },
    [resetLogin, resetRegister],
  );

  useEffect(() => {
    window.addEventListener("matchdb:openLogin", handleOpenModal);
    return () =>
      window.removeEventListener("matchdb:openLogin", handleOpenModal);
  }, [handleOpenModal]);

  useEffect(() => {
    if (token && open && !showUpgrade) {
      if (user?.user_type === "candidate") {
        if (!user?.has_purchased_visibility) {
          setOpen(false);
          window.dispatchEvent(
            new CustomEvent("matchdb:openPricing", {
              detail: { tab: "candidate", triggerProfile: true },
            }),
          );
        } else {
          setOpen(false);
        }
      } else if (user?.user_type === "marketer" && user?.plan !== "marketer") {
        setShowUpgrade(true);
      } else if (user?.plan === "free") {
        setShowUpgrade(true);
      } else {
        setOpen(false);
      }
    }
  }, [token, open, user, showUpgrade]);

  const handleUpgradeClose = () => {
    setShowUpgrade(false);
    setOpen(false);
  };

  const handleGoToPricing = () => {
    const ut = user?.user_type;
    const tab =
      ut === "vendor" ? "vendor" : ut === "marketer" ? "marketer" : "candidate";
    setShowUpgrade(false);
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("matchdb:openPricing", {
        detail: { tab, triggerProfile: tab === "candidate" },
      }),
    );
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetLogin();
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleField = (field: keyof RegForm, value: any) => {
    resetRegister();
    setRegForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(loginForm);
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register({
      email: regForm.email,
      password: regForm.password,
      firstName: regForm.first_name,
      lastName: regForm.last_name,
      userType: regForm.user_type,
    });
  };

  const handleClose = () => {
    setOpen(false);
    setOauthError(null);
    resetLogin();
    resetRegister();
  };

  const handleGoogleAuth = (userType: "candidate" | "vendor" | "marketer") => {
    const backendUrl =
      (window as any).__MATCHDB_API_URL__ ||
      process.env.SHELL_SERVICES_URL ||
      "";
    window.location.href = `${backendUrl}/api/auth/google?userType=${userType}`;
  };

  if (!open) return null;

  const activeUserType = mode === "login" ? context : regForm.user_type;

  if (showUpgrade) {
    const ut = user?.user_type;
    const isVendor = ut === "vendor";
    const isMarketer = ut === "marketer";
    const ctxIcon = isVendor ? "🏢" : isMarketer ? "📊" : "👤";
    const ctxLabel = isVendor
      ? "🏢 Vendor"
      : isMarketer
      ? "📊 Marketer"
      : "👤 Candidate";
    return (
      <div className="login-modal-overlay" onClick={handleUpgradeClose}>
        <div
          className="login-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="login-modal-titlebar">
            <span className="login-modal-title">
              {mode === "register" ? "Account Created!" : "Welcome Back"}
            </span>
            <span className="login-modal-context">{ctxLabel}</span>
            <button className="login-modal-close" onClick={handleUpgradeClose}>
              ✕
            </button>
          </div>

          <div className="lm-upgrade-panel">
            <div className="lm-upgrade-icon">{ctxIcon}</div>
            <h3 className="lm-upgrade-title">
              {mode === "register"
                ? "Your free account is ready!"
                : "You're logged in on the free plan"}
            </h3>
            <p className="lm-upgrade-desc">
              {isVendor
                ? "Free accounts can browse MatchDB but cannot post jobs or view matched candidates. Subscribe to the Basic plan ($22/mo) or higher to unlock full access."
                : isMarketer
                ? "Subscribe to the Marketer plan ($100/month) to access the full live database of job openings and candidate profiles."
                : "Free accounts can browse matched jobs. Purchase a Visibility Package to upload your profile and appear in employer searches — starting at $13."}
            </p>
            <button
              type="button"
              className="login-modal-submit lm-upgrade-cta"
              onClick={handleGoToPricing}
            >
              {isVendor
                ? "View Subscription Plans →"
                : isMarketer
                ? "Subscribe to Marketer Plan →"
                : "Purchase Visibility →"}
            </button>
            <button
              type="button"
              className="lm-upgrade-skip"
              onClick={handleUpgradeClose}
            >
              Skip for now — I&apos;ll upgrade later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-modal-overlay" onClick={handleClose}>
      <div
        className="login-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lm-title"
      >
        <div className="login-modal-titlebar">
          <span id="lm-title" className="login-modal-title">
            {mode === "login" ? "User Authentication" : "Create Account"}
          </span>
          <span className="login-modal-context">
            {context === "vendor"
              ? "🏢 Vendor"
              : context === "marketer"
              ? "📊 Marketer"
              : "👤 Candidate"}
            {locked && " (locked)"}
          </span>
          <button
            className="login-modal-close"
            onClick={handleClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* User-type chooser — only when NOT locked (i.e. opened from header or Jobs Database) */}
        {!locked && mode === "login" && (
          <div className="login-modal-field" style={{ padding: "8px 16px 0" }}>
            <label htmlFor="lm-login-type">Login as</label>
            <select
              id="lm-login-type"
              value={context}
              onChange={(e) =>
                setContext(
                  e.target.value as "candidate" | "vendor" | "marketer",
                )
              }
              className="login-modal-select"
            >
              <option value="candidate">👤 Candidate (Job Seeker)</option>
              <option value="vendor">🏢 Vendor / Employer</option>
              <option value="marketer">📊 Marketer</option>
            </select>
          </div>
        )}

        <div className="login-modal-tabs">
          <button
            className={`login-modal-tab${mode === "login" ? " active" : ""}`}
            aria-label="Sign In tab"
            onClick={() => {
              setMode("login");
              resetLogin();
              resetRegister();
            }}
          >
            Sign In
          </button>
          <button
            className={`login-modal-tab${mode === "register" ? " active" : ""}`}
            aria-label="Create Account tab"
            onClick={() => {
              setMode("register");
              resetLogin();
              resetRegister();
            }}
          >
            Create Account
          </button>
        </div>

        {oauthError && (
          <div
            className="w97-alert w97-alert-error"
            role="alert"
            aria-live="assertive"
          >
            ✕ {oauthError}
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="login-modal-form">
            <Button
              type="button"
              label="Continue with Google"
              icon="pi pi-google"
              className="lm-google-btn"
              onClick={() => handleGoogleAuth(context)}
            />
            <div className="lm-oauth-divider">
              <span>or sign in with email</span>
            </div>

            <div className="login-modal-field">
              <label htmlFor="lm-email">Email Address</label>
              <InputText
                id="lm-email"
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                autoComplete="username"
                required
                className="login-modal-input"
              />
            </div>
            <div className="login-modal-field">
              <label htmlFor="lm-password">Password</label>
              <Password
                id="lm-password"
                name="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                autoComplete="current-password"
                toggleMask
                feedback={false}
                required
                inputClassName="login-modal-input"
              />
            </div>

            {error && (
              <div
                className="w97-alert w97-alert-error"
                role="alert"
                aria-live="assertive"
              >
                ✕ {error}
              </div>
            )}
            <Button
              type="submit"
              label={loading ? "Signing In..." : "Sign In"}
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-sign-in"}
              disabled={loading}
              className="login-modal-submit"
              aria-label={loading ? "Signing in, please wait" : "Sign In"}
            />
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegSubmit} className="login-modal-form">
            <div className="login-modal-field">
              <label htmlFor="lm-user-type">Account Type</label>
              <select
                id="lm-user-type"
                value={regForm.user_type}
                onChange={(e) =>
                  handleField(
                    "user_type",
                    e.target.value as "candidate" | "vendor" | "marketer",
                  )
                }
                className="login-modal-select"
                disabled={locked}
                style={
                  locked ? { opacity: 0.7, cursor: "not-allowed" } : undefined
                }
              >
                <option value="candidate">👤 Candidate (Job Seeker)</option>
                <option value="vendor">🏢 Vendor / Employer</option>
                <option value="marketer">📊 Marketer</option>
              </select>
              {locked && (
                <span style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                  Account type is pre-selected from your navigation choice
                </span>
              )}
            </div>

            <Button
              type="button"
              label="Sign up with Google"
              icon="pi pi-google"
              className="lm-google-btn"
              onClick={() => handleGoogleAuth(regForm.user_type)}
            />
            <div className="lm-oauth-divider">
              <span>or register with email</span>
            </div>

            {regForm.user_type === "vendor" && (
              <div className="lm-vendor-info">
                <div className="lm-vendor-info-title">🏢 Employer Account</div>
                <div className="lm-vendor-info-desc">
                  Post job openings, review matched candidates, and send pokes.
                  Free accounts can browse — subscribe from the Pricing page to
                  start posting jobs.
                </div>
              </div>
            )}

            {regForm.user_type === "candidate" && (
              <div className="lm-vendor-info">
                <div className="lm-vendor-info-title">👤 Candidate Account</div>
                <div className="lm-vendor-info-desc">
                  Create your free account and browse matched jobs. Purchase a
                  Visibility Package from the Pricing page to appear in employer
                  searches and get discovered.
                </div>
              </div>
            )}

            {regForm.user_type === "marketer" && (
              <div className="lm-vendor-info">
                <div className="lm-vendor-info-title">📊 Marketer Account</div>
                <div className="lm-vendor-info-desc">
                  Access a live database of all job openings and candidate
                  profiles. Subscribe to the Marketer plan ($100/month) from the
                  Pricing page to unlock the full intelligence dashboard.
                </div>
              </div>
            )}

            <div className="login-modal-row2">
              <div className="login-modal-field">
                <label htmlFor="lm-fname">First Name</label>
                <InputText
                  id="lm-fname"
                  value={regForm.first_name}
                  onChange={(e) => handleField("first_name", e.target.value)}
                  className="login-modal-input"
                  placeholder="First name"
                />
              </div>
              <div className="login-modal-field">
                <label htmlFor="lm-lname">Last Name</label>
                <InputText
                  id="lm-lname"
                  value={regForm.last_name}
                  onChange={(e) => handleField("last_name", e.target.value)}
                  className="login-modal-input"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="login-modal-field">
              <label htmlFor="lm-reg-email">Email Address</label>
              <InputText
                id="lm-reg-email"
                type="email"
                value={regForm.email}
                onChange={(e) => handleField("email", e.target.value)}
                required
                className="login-modal-input"
                placeholder={
                  regForm.user_type === "vendor"
                    ? "work@company.com"
                    : "your@email.com"
                }
              />
            </div>

            <div className="login-modal-field">
              <label htmlFor="lm-reg-password">
                Password <span className="lm-hint">(min 8 characters)</span>
              </label>
              <Password
                id="lm-reg-password"
                value={regForm.password}
                onChange={(e: any) => handleField("password", e.target.value)}
                toggleMask
                feedback={false}
                required
                inputClassName="login-modal-input"
              />
            </div>

            {error && (
              <div
                className="w97-alert w97-alert-error"
                role="alert"
                aria-live="assertive"
              >
                ✕ {error}
              </div>
            )}
            <Button
              type="submit"
              label={loading ? "Creating..." : "Create Free Account"}
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-user-plus"}
              disabled={loading}
              className="login-modal-submit"
              aria-label={
                loading
                  ? "Creating account, please wait"
                  : "Create Free Account"
              }
            />
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
