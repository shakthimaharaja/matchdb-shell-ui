/* =============================================================================
 * matchdb-shell-ui — API endpoint paths
 * Single source of truth for all API URLs used by the Shell MFE.
 * ============================================================================= */

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const AUTH_LOGIN = "api/auth/login";
export const AUTH_REGISTER = "api/auth/register";
export const AUTH_LOGOUT = "api/auth/logout";
export const AUTH_VERIFY = "api/auth/verify";
export const AUTH_REFRESH = "api/auth/refresh";
export const AUTH_ACCOUNT = "api/auth/account";
export const AUTH_GOOGLE = (userType: string) =>
  `/api/auth/google?userType=${encodeURIComponent(userType)}`;

// ─── Payments ──────────────────────────────────────────────────────────────────

export const PAYMENTS_PLANS = "api/payments/plans";
export const PAYMENTS_CANDIDATE_PACKAGES = "api/payments/candidate-packages";
export const PAYMENTS_CHECKOUT = "api/payments/checkout";
export const PAYMENTS_CANDIDATE_CHECKOUT = "api/payments/candidate-checkout";
export const PAYMENTS_PORTAL = "api/payments/portal";

// ─── User Preferences ─────────────────────────────────────────────────────────

export const USER_PREFERENCES = "api/user/preferences";

// ─── Resume (proxied to jobs-services) ─────────────────────────────────────────

export const RESUME_VIEW = (username: string) => `/api/jobs/resume/${username}`;
export const RESUME_DOWNLOAD = (username: string) =>
  `/api/jobs/resume/${username}/download`;
