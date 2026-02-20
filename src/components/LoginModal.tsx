import React, { useState, useEffect, useCallback } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Message } from "primereact/message";
import { useAppDispatch, useAppSelector } from "../store";
import { login, register, clearError } from "../store/authSlice";
import "./LoginModal.css";

type ModalMode = "login" | "register";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  user_type: "candidate" | "vendor";
}

const EMPTY_REG: RegForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  user_type: "candidate",
};

// ─── Component ────────────────────────────────────────────────────────────────

const LoginModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error, token, user } = useAppSelector((state) => state.auth);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("login");
  const [context, setContext] = useState<"candidate" | "vendor">("candidate");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState<RegForm>(EMPTY_REG);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Check for OAuth error in URL (from failed Google sign-in redirect)
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
      // Open modal automatically so user sees the error
      setOpen(true);
      // Clean up the URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleOpenModal = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setContext(detail?.context || "candidate");
      setMode(detail?.mode || "login");
      setRegForm({ ...EMPTY_REG, user_type: detail?.context || "candidate" });
      setOauthError(null);
      setShowUpgrade(false);
      setOpen(true);
      dispatch(clearError());
    },
    [dispatch],
  );

  useEffect(() => {
    window.addEventListener("matchdb:openLogin", handleOpenModal);
    return () => window.removeEventListener("matchdb:openLogin", handleOpenModal);
  }, [handleOpenModal]);

  // After auth succeeds: handle post-auth modal flow
  useEffect(() => {
    if (token && open && !showUpgrade) {
      if (user?.user_type === "candidate") {
        if (!user?.has_purchased_visibility) {
          // Candidate without a visibility package (new registration OR returning login) —
          // go directly to pricing with no skip. Both flows are identical from here.
          setOpen(false);
          window.dispatchEvent(
            new CustomEvent("matchdb:openPricing", {
              detail: { tab: "candidate", triggerProfile: true },
            }),
          );
        } else {
          // Paid candidate — just close the modal
          setOpen(false);
        }
      } else if (user?.plan === "free") {
        // Free vendor — show upgrade prompt with skip option
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
    const isVendor = user?.user_type === "vendor";
    const tab = isVendor ? "vendor" : "candidate";
    setShowUpgrade(false);
    setOpen(false);
    // triggerProfile: true tells ShellLayout to open the profile modal after pricing closes
    window.dispatchEvent(new CustomEvent("matchdb:openPricing", {
      detail: { tab, triggerProfile: !isVendor },
    }));
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(clearError());
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleField = (field: keyof RegForm, value: any) => {
    dispatch(clearError());
    setRegForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(login(loginForm));
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(
      register({
        email: regForm.email,
        password: regForm.password,
        first_name: regForm.first_name,
        last_name: regForm.last_name,
        user_type: regForm.user_type,
      }),
    );
  };

  const handleClose = () => {
    setOpen(false);
    setOauthError(null);
    dispatch(clearError());
  };

  /** Initiates Google OAuth flow. Redirects to backend which redirects to Google. */
  const handleGoogleAuth = (userType: "candidate" | "vendor") => {
    const backendUrl =
      (window as any).__MATCHDB_API_URL__ ||
      "http://localhost:8000";
    window.location.href = `${backendUrl}/api/auth/google?userType=${userType}`;
  };

  if (!open) return null;

  const activeUserType =
    mode === "login" ? context : regForm.user_type;

  // ── Upgrade prompt (shown after free-account auth) ────────────────────────
  if (showUpgrade) {
    const isVendor = user?.user_type === "vendor";
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
            <span className="login-modal-context">
              {isVendor ? "🏢 Vendor" : "👤 Candidate"}
            </span>
            <button className="login-modal-close" onClick={handleUpgradeClose}>✕</button>
          </div>

          <div className="lm-upgrade-panel">
            <div className="lm-upgrade-icon">{isVendor ? "🏢" : "👤"}</div>
            <h3 className="lm-upgrade-title">
              {mode === "register"
                ? "Your free account is ready!"
                : "You're logged in on the free plan"}
            </h3>
            <p className="lm-upgrade-desc">
              {isVendor
                ? "Free accounts can browse MatchDB but cannot post jobs or view matched candidates. Subscribe to the Basic plan ($22/mo) or higher to unlock full access."
                : "Free accounts can browse matched jobs. Purchase a Visibility Package to upload your profile and appear in employer searches — starting at $13."}
            </p>
            <button
              type="button"
              className="login-modal-submit lm-upgrade-cta"
              onClick={handleGoToPricing}
            >
              {isVendor ? "View Subscription Plans →" : "Purchase Visibility →"}
            </button>
            <button
              type="button"
              className="lm-upgrade-skip"
              onClick={handleUpgradeClose}
            >
              Skip for now — I'll upgrade later
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
      >
        {/* Title bar */}
        <div className="login-modal-titlebar">
          <span className="login-modal-title">
            {mode === "login" ? "User Authentication" : "Create Account"}
          </span>
          <span className="login-modal-context">
            {context === "vendor" ? "🏢 Vendor" : "👤 Candidate"}
          </span>
          <button className="login-modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="login-modal-tabs">
          <button
            className={`login-modal-tab${mode === "login" ? " active" : ""}`}
            onClick={() => {
              setMode("login");
              dispatch(clearError());
            }}
          >
            Sign In
          </button>
          <button
            className={`login-modal-tab${mode === "register" ? " active" : ""}`}
            onClick={() => {
              setMode("register");
              dispatch(clearError());
            }}
          >
            Create Account
          </button>
        </div>

        {/* OAuth error banner (from failed redirect) */}
        {oauthError && (
          <Message
            severity="error"
            text={oauthError}
            className="login-modal-error"
          />
        )}

        {/* ── Login form ── */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="login-modal-form">
            {/* Google OAuth button */}
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
              <Message
                severity="error"
                text={error}
                className="login-modal-error"
              />
            )}
            <Button
              type="submit"
              label={loading ? "Signing In..." : "Sign In"}
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-sign-in"}
              disabled={loading}
              className="login-modal-submit"
            />
          </form>
        )}

        {/* ── Register form ── */}
        {mode === "register" && (
          <form onSubmit={handleRegSubmit} className="login-modal-form">
            {/* Account type selector — choose first so Google button knows the type */}
            <div className="login-modal-field">
              <label htmlFor="lm-user-type">Account Type</label>
              <select
                id="lm-user-type"
                value={regForm.user_type}
                onChange={(e) =>
                  handleField(
                    "user_type",
                    e.target.value as "candidate" | "vendor",
                  )
                }
                className="login-modal-select"
              >
                <option value="candidate">👤 Candidate (Job Seeker)</option>
                <option value="vendor">🏢 Vendor / Employer</option>
              </select>
            </div>

            {/* Google OAuth button */}
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

            {/* Vendor info panel */}
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

            {/* Candidate info panel */}
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
                Password{" "}
                <span className="lm-hint">(min 8 characters)</span>
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
              <Message
                severity="error"
                text={error}
                className="login-modal-error"
              />
            )}
            <Button
              type="submit"
              label={loading ? "Creating..." : "Create Free Account"}
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-user-plus"}
              disabled={loading}
              className="login-modal-submit"
            />
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
