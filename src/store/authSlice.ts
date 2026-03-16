/**
 * store/authSlice.ts — Auth state management (shell-ui).
 *
 * Owns: token, refresh token, user object, session-expiry state.
 *
 * API calls (login, register, refreshToken, etc.) live in api/shellApi.ts
 * as RTK Query mutations. Those mutations dispatch the actions below via
 * onQueryStarted after a successful response.
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LS_TOKEN, LS_USER, LS_REFRESH } from "../constants";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  user_type: "candidate" | "vendor" | "marketer";
  membership_config: Record<string, string[]> | null;
  has_purchased_visibility: boolean;
  plan: "free" | "basic" | "pro" | "pro_plus" | "marketer";
  created_at: string | null;
  updated_at: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refresh: string | null;
  /** Stores user_type of the user whose session just expired */
  sessionExpiredUserType: "candidate" | "vendor" | "marketer" | null;
}

const token = localStorage.getItem(LS_TOKEN);
const userRaw = localStorage.getItem(LS_USER);

const initialState: AuthState = {
  user: userRaw ? JSON.parse(userRaw) : null,
  token: token || null,
  refresh: localStorage.getItem(LS_REFRESH) || null,
  sessionExpiredUserType: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Hydrates state after a successful login or register response.
     * Called by shellApi login/register onQueryStarted.
     */
    setAuth(
      state,
      action: PayloadAction<{ access: string; refresh: string; user: User }>,
    ) {
      state.user = action.payload.user;
      state.token = action.payload.access;
      state.refresh = action.payload.refresh;
      state.sessionExpiredUserType = null;
      localStorage.setItem(LS_TOKEN, action.payload.access);
      localStorage.setItem(LS_REFRESH, action.payload.refresh);
      localStorage.setItem(LS_USER, JSON.stringify(action.payload.user));
    },

    /**
     * Updates the user object (e.g. after a payment refreshes membership_config).
     * Called by shellApi refreshUserData onQueryStarted.
     */
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      localStorage.setItem(LS_USER, JSON.stringify(action.payload));
    },

    /**
     * Updates only the access token (silent refresh).
     * Called by shellApi refreshToken onQueryStarted.
     */
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      localStorage.setItem(LS_TOKEN, action.payload);
    },

    logout(state) {
      state.user = null;
      state.token = null;
      state.refresh = null;
      state.sessionExpiredUserType = null;
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_REFRESH);
      localStorage.removeItem(LS_USER);
    },

    /**
     * Clears auth state on session expiry, preserving user_type for
     * redirect-to-appropriate-login logic in JobsAppWrapper.
     */
    expireSession(
      state,
      action: PayloadAction<"candidate" | "vendor" | "marketer">,
    ) {
      state.sessionExpiredUserType = action.payload;
      state.user = null;
      state.token = null;
      state.refresh = null;
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_REFRESH);
      localStorage.removeItem(LS_USER);
    },

    updatePlan(state, action: PayloadAction<User["plan"]>) {
      if (state.user) {
        state.user.plan = action.payload;
        localStorage.setItem(LS_USER, JSON.stringify(state.user));
      }
    },

    /**
     * Hydrates Redux auth state from Google OAuth callback URL params.
     * Called by OAuthCallbackPage after the OAuth redirect lands.
     */
    setAuthFromOAuth(
      state,
      action: PayloadAction<{ token: string; refresh: string; user: User }>,
    ) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refresh = action.payload.refresh;
      state.sessionExpiredUserType = null;
      localStorage.setItem(LS_TOKEN, action.payload.token);
      localStorage.setItem(LS_REFRESH, action.payload.refresh);
      localStorage.setItem(LS_USER, JSON.stringify(action.payload.user));
    },
  },
});

export const {
  setAuth,
  setUser,
  setToken,
  logout,
  expireSession,
  updatePlan,
  setAuthFromOAuth,
} = authSlice.actions;

export default authSlice.reducer;
