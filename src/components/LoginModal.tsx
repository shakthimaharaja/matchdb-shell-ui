import React, { useState, useEffect, useCallback } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Message } from "primereact/message";
import { useAppDispatch, useAppSelector } from "../store";
import { login, register, clearError } from "../store/authSlice";
import "./LoginModal.css";

type ModalMode = "login" | "register";

// ─── Membership definitions ──────────────────────────────────────────────────
const CONTRACT_SUBS = [
  { value: "c2c", label: "C2C (Corp-to-Corp)" },
  { value: "c2h", label: "C2H (Contract-to-Hire)" },
  { value: "w2", label: "W2" },
  { value: "1099", label: "1099 / Independent" },
];

const FULLTIME_SUBS = [
  { value: "c2h", label: "C2H (Contract-to-Hire)" },
  { value: "w2", label: "W2" },
  { value: "direct_hire", label: "Direct Hire" },
  { value: "salary", label: "Salaried" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type MembershipConfig = Record<string, string[]>;

interface RegForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  user_type: "candidate" | "vendor";
  // Candidate membership
  jobTypes: { contract: boolean; full_time: boolean; part_time: boolean };
  contractSubs: string[];
  fulltimeSubs: string[];
}

const EMPTY_REG: RegForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  user_type: "candidate",
  jobTypes: { contract: false, full_time: false, part_time: false },
  contractSubs: [],
  fulltimeSubs: [],
};

// Build membershipConfig object from form selections
function buildMembershipConfig(form: RegForm): MembershipConfig | null {
  if (form.user_type === "vendor") return null;
  const config: MembershipConfig = {};
  if (form.jobTypes.contract) {
    config.contract = form.contractSubs.length > 0
      ? form.contractSubs
      : CONTRACT_SUBS.map((s) => s.value); // default: all subtypes
  }
  if (form.jobTypes.full_time) {
    config.full_time = form.fulltimeSubs.length > 0
      ? form.fulltimeSubs
      : FULLTIME_SUBS.map((s) => s.value);
  }
  if (form.jobTypes.part_time) {
    config.part_time = [];
  }
  return Object.keys(config).length > 0 ? config : null;
}

// ─── Component ────────────────────────────────────────────────────────────────
const LoginModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error, token } = useAppSelector((state) => state.auth);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("login");
  const [context, setContext] = useState<"candidate" | "vendor">("candidate");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState<RegForm>(EMPTY_REG);

  const handleOpenModal = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setContext(detail?.context || "candidate");
      setMode(detail?.mode || "login");
      setRegForm({ ...EMPTY_REG, user_type: detail?.context || "candidate" });
      setOpen(true);
      dispatch(clearError());
    },
    [dispatch],
  );

  useEffect(() => {
    window.addEventListener("matchdb:openLogin", handleOpenModal);
    return () => window.removeEventListener("matchdb:openLogin", handleOpenModal);
  }, [handleOpenModal]);

  useEffect(() => {
    if (token && open) setOpen(false);
  }, [token, open]);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(clearError());
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleField = (field: keyof RegForm, value: any) => {
    dispatch(clearError());
    setRegForm((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle a job type checkbox
  const toggleJobType = (type: "contract" | "full_time" | "part_time") => {
    dispatch(clearError());
    setRegForm((prev) => ({
      ...prev,
      jobTypes: { ...prev.jobTypes, [type]: !prev.jobTypes[type] },
      // Clear subtypes when unchecking parent
      ...(prev.jobTypes[type] && type === "contract" ? { contractSubs: [] } : {}),
      ...(prev.jobTypes[type] && type === "full_time" ? { fulltimeSubs: [] } : {}),
    }));
  };

  // Toggle a subtype checkbox
  const toggleSub = (kind: "contractSubs" | "fulltimeSubs", val: string) => {
    dispatch(clearError());
    setRegForm((prev) => {
      const existing = prev[kind] as string[];
      return {
        ...prev,
        [kind]: existing.includes(val)
          ? existing.filter((v) => v !== val)
          : [...existing, val],
      };
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(login(loginForm));
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const membership_config = buildMembershipConfig(regForm);
    await dispatch(
      register({
        email: regForm.email,
        password: regForm.password,
        first_name: regForm.first_name,
        last_name: regForm.last_name,
        user_type: regForm.user_type,
        membership_config,
      }),
    );
  };

  const handleClose = () => {
    setOpen(false);
    dispatch(clearError());
  };

  if (!open) return null;

  const anyJobType = Object.values(regForm.jobTypes).some(Boolean);

  return (
    <div className="login-modal-overlay" onClick={handleClose}>
      <div className="login-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Title bar */}
        <div className="login-modal-titlebar">
          <span className="login-modal-title">
            {mode === "login" ? "User Authentication" : "Create Account"}
          </span>
          <span className="login-modal-context">
            {context === "vendor" ? "🏢 Vendor" : "👤 Candidate"}
          </span>
          <button className="login-modal-close" onClick={handleClose}>✕</button>
        </div>

        {/* Tab switcher */}
        <div className="login-modal-tabs">
          <button
            className={`login-modal-tab${mode === "login" ? " active" : ""}`}
            onClick={() => { setMode("login"); dispatch(clearError()); }}
          >
            Sign In
          </button>
          <button
            className={`login-modal-tab${mode === "register" ? " active" : ""}`}
            onClick={() => { setMode("register"); dispatch(clearError()); }}
          >
            Create Account
          </button>
        </div>

        {/* ── Login form ── */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="login-modal-form">
            <div className="login-modal-field">
              <label htmlFor="lm-email">Email Address</label>
              <InputText
                id="lm-email" name="email" type="email"
                value={loginForm.email} onChange={handleLoginChange}
                autoComplete="username" required className="login-modal-input"
              />
            </div>
            <div className="login-modal-field">
              <label htmlFor="lm-password">Password</label>
              <Password
                id="lm-password" name="password"
                value={loginForm.password} onChange={handleLoginChange}
                autoComplete="current-password" toggleMask feedback={false}
                required inputClassName="login-modal-input"
              />
            </div>
            {error && <Message severity="error" text={error} className="login-modal-error" />}
            <Button
              type="submit"
              label={loading ? "Signing In..." : "Sign In"}
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-sign-in"}
              disabled={loading} className="login-modal-submit"
            />
          </form>
        )}

        {/* ── Register form ── */}
        {mode === "register" && (
          <form onSubmit={handleRegSubmit} className="login-modal-form">
            {/* Account type selector — first thing to choose */}
            <div className="login-modal-field">
              <label htmlFor="lm-user-type">Account Type</label>
              <select id="lm-user-type" value={regForm.user_type}
                onChange={(e) => handleField("user_type", e.target.value as "candidate" | "vendor")}
                className="login-modal-select">
                <option value="candidate">👤 Candidate (Job Seeker)</option>
                <option value="vendor">🏢 Vendor / Employer</option>
              </select>
            </div>

            {/* Vendor info panel */}
            {regForm.user_type === "vendor" && (
              <div className="lm-vendor-info">
                <div className="lm-vendor-info-title">🏢 Employer Account</div>
                <div className="lm-vendor-info-desc">
                  Post job openings, review matched candidates, and send pokes to prospects.
                  Free plan includes 1 active job posting.
                </div>
              </div>
            )}

            <div className="login-modal-row2">
              <div className="login-modal-field">
                <label htmlFor="lm-fname">{regForm.user_type === "vendor" ? "First Name" : "First Name"}</label>
                <InputText id="lm-fname" value={regForm.first_name}
                  onChange={(e) => handleField("first_name", e.target.value)}
                  className="login-modal-input"
                  placeholder={regForm.user_type === "vendor" ? "Contact first name" : "First name"} />
              </div>
              <div className="login-modal-field">
                <label htmlFor="lm-lname">Last Name</label>
                <InputText id="lm-lname" value={regForm.last_name}
                  onChange={(e) => handleField("last_name", e.target.value)}
                  className="login-modal-input"
                  placeholder={regForm.user_type === "vendor" ? "Contact last name" : "Last name"} />
              </div>
            </div>

            <div className="login-modal-field">
              <label htmlFor="lm-reg-email">Email Address</label>
              <InputText id="lm-reg-email" type="email" value={regForm.email}
                onChange={(e) => handleField("email", e.target.value)}
                required className="login-modal-input"
                placeholder={regForm.user_type === "vendor" ? "work@company.com" : "your@email.com"} />
            </div>

            <div className="login-modal-field">
              <label htmlFor="lm-reg-password">Password <span className="lm-hint">(min 8 chars)</span></label>
              <Password id="lm-reg-password" value={regForm.password}
                onChange={(e: any) => handleField("password", e.target.value)}
                toggleMask feedback={false} required
                inputClassName="login-modal-input" />
            </div>

            {/* ── Candidate membership selector ── */}
            {regForm.user_type === "candidate" && (
              <div className="login-modal-membership">
                <div className="lm-membership-title">
                  Membership — Select Job Types You Are Looking For
                  <span className="lm-membership-note">(one-time, defines your access)</span>
                </div>

                {/* Contract */}
                <div className="lm-job-type-row">
                  <label className="lm-checkbox-label">
                    <input type="checkbox" checked={regForm.jobTypes.contract}
                      onChange={() => toggleJobType("contract")} />
                    <strong>Contract</strong>
                  </label>
                </div>
                {regForm.jobTypes.contract && (
                  <div className="lm-subtypes">
                    <div className="lm-sub-hint">Select contract types (leave all unchecked = all types):</div>
                    <div className="lm-sub-grid">
                      {CONTRACT_SUBS.map((s) => (
                        <label key={s.value} className="lm-checkbox-label">
                          <input type="checkbox"
                            checked={regForm.contractSubs.includes(s.value)}
                            onChange={() => toggleSub("contractSubs", s.value)} />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full Time */}
                <div className="lm-job-type-row">
                  <label className="lm-checkbox-label">
                    <input type="checkbox" checked={regForm.jobTypes.full_time}
                      onChange={() => toggleJobType("full_time")} />
                    <strong>Full Time</strong>
                  </label>
                </div>
                {regForm.jobTypes.full_time && (
                  <div className="lm-subtypes">
                    <div className="lm-sub-hint">Select full-time types (leave all unchecked = all types):</div>
                    <div className="lm-sub-grid">
                      {FULLTIME_SUBS.map((s) => (
                        <label key={s.value} className="lm-checkbox-label">
                          <input type="checkbox"
                            checked={regForm.fulltimeSubs.includes(s.value)}
                            onChange={() => toggleSub("fulltimeSubs", s.value)} />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Part Time */}
                <div className="lm-job-type-row">
                  <label className="lm-checkbox-label">
                    <input type="checkbox" checked={regForm.jobTypes.part_time}
                      onChange={() => toggleJobType("part_time")} />
                    <strong>Part Time</strong>
                  </label>
                </div>

                {/* Membership summary */}
                {anyJobType && (
                  <div className="lm-membership-summary">
                    <strong>Your membership:</strong>{" "}
                    {regForm.jobTypes.contract && (
                      <span>Contract
                        {regForm.contractSubs.length > 0
                          ? ` [${regForm.contractSubs.join(", ").toUpperCase()}]`
                          : " [All]"}
                      </span>
                    )}
                    {regForm.jobTypes.contract && (regForm.jobTypes.full_time || regForm.jobTypes.part_time) && " + "}
                    {regForm.jobTypes.full_time && (
                      <span>Full Time
                        {regForm.fulltimeSubs.length > 0
                          ? ` [${regForm.fulltimeSubs.join(", ").toUpperCase()}]`
                          : " [All]"}
                      </span>
                    )}
                    {regForm.jobTypes.full_time && regForm.jobTypes.part_time && " + "}
                    {regForm.jobTypes.part_time && <span>Part Time</span>}
                  </div>
                )}
              </div>
            )}

            {error && <Message severity="error" text={error} className="login-modal-error" />}
            <Button
              type="submit"
              label={loading ? "Creating..." : "Create Account"}
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-user-plus"}
              disabled={loading || (regForm.user_type === "candidate" && !anyJobType)}
              className="login-modal-submit"
            />
            {regForm.user_type === "candidate" && !anyJobType && (
              <div className="lm-membership-required">
                Please select at least one job type for your membership.
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
