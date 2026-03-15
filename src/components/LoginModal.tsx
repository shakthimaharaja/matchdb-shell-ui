import React, { useState, useEffect, useCallback } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { useAppSelector } from "../store";
import { useLoginMutation, useRegisterMutation } from "../api/shellApi";
import "./LoginModal.css";

type ModalMode = "login" | "register";
type UserType = "candidate" | "vendor" | "marketer";

interface RegForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  user_type: UserType;
}

const EMPTY_REG: RegForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  user_type: "candidate",
};

const USER_TYPE_ICONS: Record<UserType, string> = {
  vendor: "🏢",
  marketer: "📊",
  candidate: "👤",
};

const USER_TYPE_LABELS: Record<UserType, string> = {
  vendor: "🏢 Vendor",
  marketer: "📊 Marketer",
  candidate: "👤 Candidate",
};

const UPGRADE_DESCS: Record<UserType, string> = {
  vendor:
    "Free accounts can browse MatchDB but cannot post jobs or view matched candidates. Subscribe to the Basic plan ($22/mo) or higher to unlock full access.",
  marketer:
    "Subscribe to the Marketer plan ($100/month) to access the full live database of job openings and candidate profiles.",
  candidate:
    "Free accounts can browse matched jobs. Purchase a Visibility Package to upload your profile and appear in employer searches — starting at $13.",
};

const UPGRADE_CTAS: Record<UserType, string> = {
  vendor: "View Subscription Plans →",
  marketer: "Subscribe to Marketer Plan →",
  candidate: "Purchase Visibility →",
};

function resolveErrorMessage(rawError: unknown): string | null {
  if (!rawError) return null;
  return (
    (rawError as any).data?.error ??
    (rawError as any).data?.detail ??
    "Authentication failed. Please try again."
  );
}

function resolveOauthError(msg: string): string {
  if (msg === "missing_data" || msg === "parse_error") {
    return "Google sign-in failed. Please try again.";
  }
  return "Google sign-in failed: " + msg;
}

function resolvePricingTab(userType?: string): string {
  if (userType === "vendor") return "vendor";
  if (userType === "marketer") return "marketer";
  return "candidate";
}

type PostAuthAction = "close" | "pricing" | "upgrade";

function resolvePostAuthAction(
  user:
    | { user_type?: string; has_purchased_visibility?: boolean; plan?: string }
    | null
    | undefined,
): PostAuthAction {
  if (user?.user_type === "candidate") {
    return user.has_purchased_visibility ? "close" : "pricing";
  }
  if (user?.user_type === "marketer" && user.plan !== "marketer")
    return "upgrade";
  if (user?.plan === "free") return "upgrade";
  return "close";
}

const UpgradePanel: React.FC<{
  mode: ModalMode;
  userType?: string;
  onClose: () => void;
  onGoToPricing: () => void;
}> = ({ mode, userType, onClose, onGoToPricing }) => {
  const resolvedType: UserType = (userType as UserType) ?? "candidate";
  const ctxIcon = USER_TYPE_ICONS[resolvedType];
  const ctxLabel = USER_TYPE_LABELS[resolvedType];
  const title = mode === "register" ? "Account Created!" : "Welcome Back";
  const subtitle =
    mode === "register"
      ? "Your free account is ready!"
      : "You're logged in on the free plan";

  return (
    <dialog open className="login-modal-overlay">
      <div className="rm-backdrop" role="none" onClick={onClose} />
      <div className="login-modal-container">
        <div className="login-modal-titlebar">
          <span className="login-modal-title">{title}</span>
          <span className="login-modal-context">{ctxLabel}</span>
          <button className="login-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="lm-upgrade-panel">
          <div className="lm-upgrade-icon">{ctxIcon}</div>
          <h3 className="lm-upgrade-title">{subtitle}</h3>
          <p className="lm-upgrade-desc">{UPGRADE_DESCS[resolvedType]}</p>
          <button
            type="button"
            className="login-modal-submit lm-upgrade-cta"
            onClick={onGoToPricing}
          >
            {UPGRADE_CTAS[resolvedType]}
          </button>
          <button type="button" className="lm-upgrade-skip" onClick={onClose}>
            Skip for now — I&apos;ll upgrade later
          </button>
        </div>
      </div>
    </dialog>
  );
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
  const error = resolveErrorMessage(rawError);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("login");
  const [context, setContext] = useState<UserType>("candidate");
  /** When true the user_type is locked (came from Candidate/Vendor nav link) */
  const [locked, setLocked] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState<RegForm>(EMPTY_REG);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const errParam = params.get("oauth_error");
    if (errParam) {
      setOauthError(resolveOauthError(decodeURIComponent(errParam)));
      setOpen(true);
      globalThis.history.replaceState({}, "", globalThis.location.pathname);
    }
  }, []);

  const handleOpenModal = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      const ctx: UserType = detail.context ?? "candidate";
      setContext(ctx);
      setMode(detail.mode ?? "login");
      setLocked(Boolean(detail.locked));
      setRegForm({ ...EMPTY_REG, user_type: ctx });
      setOauthError(null);
      setShowUpgrade(false);
      setOpen(true);
      resetLogin();
      resetRegister();
    },
    [resetLogin, resetRegister],
  );

  useEffect(() => {
    globalThis.addEventListener("matchdb:openLogin", handleOpenModal);
    return () =>
      globalThis.removeEventListener("matchdb:openLogin", handleOpenModal);
  }, [handleOpenModal]);

  useEffect(() => {
    const shouldProcess = token && open && !showUpgrade;
    if (!shouldProcess) return;

    const action = resolvePostAuthAction(user);
    if (action === "close") {
      setOpen(false);
    } else if (action === "pricing") {
      setOpen(false);
      globalThis.dispatchEvent(
        new CustomEvent("matchdb:openPricing", {
          detail: { tab: "candidate", triggerProfile: true },
        }),
      );
    } else {
      setShowUpgrade(true);
    }
  }, [token, open, user, showUpgrade]);

  const handleUpgradeClose = () => {
    setShowUpgrade(false);
    setOpen(false);
  };

  const handleGoToPricing = () => {
    const tab = resolvePricingTab(user?.user_type);
    setShowUpgrade(false);
    setOpen(false);
    globalThis.dispatchEvent(
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

  const handleGoogleAuth = (userType: UserType) => {
    const backendUrl =
      (globalThis as any).__MATCHDB_API_URL__ ||
      process.env.SHELL_SERVICES_URL ||
      "";
    globalThis.location.href = `${backendUrl}/api/auth/google?userType=${userType}`;
  };

  if (!open) return null;

  if (showUpgrade) {
    return (
      <UpgradePanel
        mode={mode}
        userType={user?.user_type}
        onClose={handleUpgradeClose}
        onGoToPricing={handleGoToPricing}
      />
    );
  }

  return (
    <dialog open className="login-modal-overlay">
      <div className="rm-backdrop" role="none" onClick={handleClose} />
      <div
        className="login-modal-container"
        aria-modal="true"
        aria-labelledby="lm-title"
      >
        <div className="login-modal-titlebar">
          <span id="lm-title" className="login-modal-title">
            {mode === "login" ? "User Authentication" : "Create Account"}
          </span>
          <span className="login-modal-context">
            {USER_TYPE_LABELS[context]}
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
              onChange={(e) => setContext(e.target.value as UserType)}
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
                  handleField("user_type", e.target.value as UserType)
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
    </dialog>
  );
};

export default LoginModal;
