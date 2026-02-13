import React, { useState, useEffect, useCallback } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Message } from "primereact/message";
import { useAppDispatch, useAppSelector } from "../store";
import { login, register, clearError } from "../store/authSlice";
import "./LoginModal.css";

type ModalMode = "login" | "register";

const VISIBILITY_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "c2c", label: "C2C" },
  { value: "w2", label: "W2" },
  { value: "c2h", label: "C2H" },
  { value: "fulltime", label: "Full Time" },
];

const LoginModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error, token } = useAppSelector((state) => state.auth);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("login");
  const [context, setContext] = useState<"candidate" | "vendor">("candidate");

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  // Register form
  const [regForm, setRegForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    user_type: "candidate" as "candidate" | "vendor",
    visibility: "all" as "all" | "c2c" | "w2" | "c2h" | "fulltime",
  });

  // Listen for custom event to open modal
  const handleOpenModal = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setContext(detail?.context || "candidate");
      setMode(detail?.mode || "login");
      setOpen(true);
      dispatch(clearError());
    },
    [dispatch],
  );

  useEffect(() => {
    window.addEventListener("matchdb:openLogin", handleOpenModal);
    return () =>
      window.removeEventListener("matchdb:openLogin", handleOpenModal);
  }, [handleOpenModal]);

  // Close modal when user logs in successfully
  useEffect(() => {
    if (token && open) {
      setOpen(false);
    }
  }, [token, open]);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(clearError());
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleRegChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    dispatch(clearError());
    setRegForm({ ...regForm, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(login(loginForm));
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(
      register({
        ...regForm,
        user_type: regForm.user_type,
      }),
    );
  };

  const handleClose = () => {
    setOpen(false);
    dispatch(clearError());
  };

  if (!open) return null;

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

        {/* Login form */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="login-modal-form">
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

        {/* Register form */}
        {mode === "register" && (
          <form onSubmit={handleRegSubmit} className="login-modal-form">
            <div className="login-modal-row2">
              <div className="login-modal-field">
                <label htmlFor="lm-fname">First Name</label>
                <InputText
                  id="lm-fname"
                  name="first_name"
                  value={regForm.first_name}
                  onChange={handleRegChange}
                  className="login-modal-input"
                />
              </div>
              <div className="login-modal-field">
                <label htmlFor="lm-lname">Last Name</label>
                <InputText
                  id="lm-lname"
                  name="last_name"
                  value={regForm.last_name}
                  onChange={handleRegChange}
                  className="login-modal-input"
                />
              </div>
            </div>
            <div className="login-modal-field">
              <label htmlFor="lm-reg-email">Email Address</label>
              <InputText
                id="lm-reg-email"
                name="email"
                type="email"
                value={regForm.email}
                onChange={handleRegChange}
                required
                className="login-modal-input"
              />
            </div>
            <div className="login-modal-field">
              <label htmlFor="lm-reg-password">Password</label>
              <Password
                id="lm-reg-password"
                name="password"
                value={regForm.password}
                onChange={handleRegChange}
                toggleMask
                feedback={false}
                required
                inputClassName="login-modal-input"
              />
            </div>
            <div className="login-modal-field">
              <label htmlFor="lm-user-type">I am a...</label>
              <select
                id="lm-user-type"
                name="user_type"
                value={regForm.user_type}
                onChange={handleRegChange}
                className="login-modal-select"
              >
                <option value="candidate">Candidate</option>
                <option value="vendor">Vendor / Employer</option>
              </select>
            </div>
            {regForm.user_type === "candidate" && (
              <div className="login-modal-field">
                <label htmlFor="lm-visibility">Job Visibility</label>
                <select
                  id="lm-visibility"
                  name="visibility"
                  value={regForm.visibility}
                  onChange={handleRegChange}
                  className="login-modal-select"
                >
                  {VISIBILITY_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && (
              <Message
                severity="error"
                text={error}
                className="login-modal-error"
              />
            )}
            <Button
              type="submit"
              label={loading ? "Creating..." : "Create Account"}
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
