import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  user_type: "candidate" | "vendor";
  /**
   * Candidate visibility config: which job types + subtypes they can appear in.
   * null = no visibility purchased yet (new candidates).
   */
  membership_config: Record<string, string[]> | null;
  /** true if the candidate has made at least one visibility payment */
  has_purchased_visibility: boolean;
  plan: "free" | "basic" | "pro" | "pro_plus";
  created_at: string | null;
  updated_at: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refresh: string | null;
  loading: boolean;
  error: string | null;
  /** Stores user_type of the user whose session just expired, for redirect-to-login purposes. */
  sessionExpiredUserType: "candidate" | "vendor" | null;
}

const token = localStorage.getItem("matchdb_token");
const userRaw = localStorage.getItem("matchdb_user");

const initialState: AuthState = {
  user: userRaw ? JSON.parse(userRaw) : null,
  token: token || null,
  refresh: localStorage.getItem("matchdb_refresh") || null,
  loading: false,
  error: null,
  sessionExpiredUserType: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const login = createAsyncThunk(
  "auth/login",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await axios.post("/api/auth/login", credentials);
      return response.data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Login failed. Please try again.";
      return rejectWithValue(message);
    }
  },
);

export const register = createAsyncThunk(
  "auth/register",
  async (
    data: {
      email: string;
      password: string;
      first_name?: string;
      last_name?: string;
      user_type: "candidate" | "vendor";
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await axios.post("/api/auth/register", {
        email: data.email,
        password: data.password,
        firstName: data.first_name,
        lastName: data.last_name,
        userType: data.user_type,
        // membershipConfig is no longer set at registration — it's purchased via the Pricing page
      });
      return response.data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        "Registration failed. Please try again.";
      return rejectWithValue(message);
    }
  },
);

/**
 * Fetches the latest user data from the server (e.g., after a successful payment
 * to refresh membership_config and plan without requiring a full re-login).
 */
export const refreshUserData = createAsyncThunk(
  "auth/refreshUserData",
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await axios.get("/api/auth/verify", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.user as User;
    } catch (err: any) {
      return rejectWithValue("Failed to refresh user data");
    }
  },
);

/**
 * Silently refreshes the access token using the stored refresh token.
 * On success, returns the new access token string.
 * On failure (refresh expired), rejects so caller can trigger logout + redirect.
 */
export const refreshAuthToken = createAsyncThunk(
  "auth/refreshToken",
  async (refreshToken: string, { rejectWithValue }) => {
    try {
      const response = await axios.post("/api/auth/refresh", {
        refresh: refreshToken,
      });
      return response.data as { access: string };
    } catch (err: any) {
      return rejectWithValue("Session expired. Please log in again.");
    }
  },
);

export const deleteAccount = createAsyncThunk(
  "auth/deleteAccount",
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await axios.delete("/api/auth/account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        "Failed to delete account. Please try again.";
      return rejectWithValue(message);
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.refresh = null;
      state.sessionExpiredUserType = null;
      localStorage.removeItem("matchdb_token");
      localStorage.removeItem("matchdb_refresh");
      localStorage.removeItem("matchdb_user");
    },
    /**
     * Clears auth state when a session has expired, preserving user_type for
     * redirect-to-appropriate-login logic in JobsAppWrapper.
     */
    expireSession(state, action: PayloadAction<"candidate" | "vendor">) {
      state.sessionExpiredUserType = action.payload;
      state.user = null;
      state.token = null;
      state.refresh = null;
      localStorage.removeItem("matchdb_token");
      localStorage.removeItem("matchdb_refresh");
      localStorage.removeItem("matchdb_user");
    },
    clearError(state) {
      state.error = null;
    },
    updatePlan(state, action: PayloadAction<User["plan"]>) {
      if (state.user) {
        state.user.plan = action.payload;
        localStorage.setItem("matchdb_user", JSON.stringify(state.user));
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
      state.error = null;
      localStorage.setItem("matchdb_token", action.payload.token);
      localStorage.setItem("matchdb_refresh", action.payload.refresh);
      localStorage.setItem("matchdb_user", JSON.stringify(action.payload.user));
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.access;
        state.refresh = action.payload.refresh;
        localStorage.setItem("matchdb_token", action.payload.access);
        localStorage.setItem("matchdb_refresh", action.payload.refresh);
        localStorage.setItem(
          "matchdb_user",
          JSON.stringify(action.payload.user),
        );
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.access;
        state.refresh = action.payload.refresh;
        localStorage.setItem("matchdb_token", action.payload.access);
        localStorage.setItem("matchdb_refresh", action.payload.refresh);
        localStorage.setItem(
          "matchdb_user",
          JSON.stringify(action.payload.user),
        );
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Refresh user data (post-payment)
      .addCase(refreshUserData.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem("matchdb_user", JSON.stringify(action.payload));
      })
      // Token refresh (silent re-auth)
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.token = action.payload.access;
        localStorage.setItem("matchdb_token", action.payload.access);
      })
      // Delete Account
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.refresh = null;
        localStorage.removeItem("matchdb_token");
        localStorage.removeItem("matchdb_refresh");
        localStorage.removeItem("matchdb_user");
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError, updatePlan, setAuthFromOAuth, expireSession } =
  authSlice.actions;
export default authSlice.reducer;
