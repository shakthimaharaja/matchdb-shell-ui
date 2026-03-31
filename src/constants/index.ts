/* =============================================================================
 * matchdb-shell-ui — Centralized constants
 * Single source of truth for localStorage keys, custom events, UI config.
 * ============================================================================= */
import { ICONS } from "matchdb-component-library";

// ─── LocalStorage Keys ────────────────────────────────────────────────────────

export const LS_TOKEN = "matchdb_token";
export const LS_USER = "matchdb_user";
export const LS_REFRESH = "matchdb_refresh";
export const LS_DARK = "matchdb_dark";
export const LS_FONT_SIZE = "matchdb_font_size";
export const LS_STYLE = "matchdb_style";

// ─── Custom Event Names ────────────────────────────────────────────────────────

export const EVT_OPEN_PRICING = "matchdb:openPricing";
export const EVT_PRICING_CLOSED = "matchdb:pricingClosed";
export const EVT_OPEN_PROFILE = "matchdb:openProfile";
export const EVT_SUBNAV = "matchdb:subnav";
export const EVT_BREADCRUMB = "matchdb:breadcrumb";
export const EVT_FOOTER_INFO = "matchdb:footerInfo";
export const EVT_PROFILE_LOCATION = "matchdb:profileLocation";
export const EVT_VISIBLE_IN = "matchdb:visibleIn";
export const EVT_LOGIN_CONTEXT = "matchdb:loginContext";
export const EVT_JOB_TYPE_FILTER = "matchdb:jobTypeFilter";
export const EVT_OPEN_LOGIN = "matchdb:openLogin";
export const EVT_LIVE_STATS = "matchdb:liveStats";

// ─── UI Config ─────────────────────────────────────────────────────────────────

export const FONT_SIZE_MAP: Record<string, string> = {
  small: "11px",
  medium: "13px",
  large: "15px",
};

export const GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse";
export const GEOCODE_TIMEOUT = 5000;

// ─── User Type ─────────────────────────────────────────────────────────────────

export type UserType = "candidate" | "employer";

export const USER_TYPE_ICONS: Record<UserType, string> = {
  employer: ICONS.OFFICE,
  candidate: ICONS.PERSON,
};

export const USER_TYPE_LABELS: Record<UserType, string> = {
  employer: `${ICONS.OFFICE} Employer`,
  candidate: `${ICONS.PERSON} Candidate`,
};

// ─── Stripe Callback Params ────────────────────────────────────────────────────

export const STRIPE_SUCCESS_PARAM = "success";
export const STRIPE_CANDIDATE_SUCCESS_PARAM = "candidate_success";
export const STRIPE_CANCELED_PARAM = "canceled";
