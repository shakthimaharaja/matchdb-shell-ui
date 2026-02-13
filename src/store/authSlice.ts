import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: "candidate" | "vendor";
  visibility: "all" | "c2c" | "w2" | "c2h" | "fulltime";
  plan: "free" | "pro" | "enterprise";
}

interface AuthState {
  user: User | null;
  token: string | null;
  refresh: string | null;
  loading: boolean;
  error: string | null;
}

const token = localStorage.getItem("matchdb_token");
const userRaw = localStorage.getItem("matchdb_user");

const initialState: AuthState = {
  user: userRaw ? JSON.parse(userRaw) : null,
  token: token || null,
  refresh: localStorage.getItem("matchdb_refresh") || null,
  loading: false,
  error: null,
};

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
      visibility?: "all" | "c2c" | "w2" | "c2h" | "fulltime";
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
        visibility: data.visibility || "all",
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

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
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
    updatePlan(state, action) {
      if (state.user) {
        state.user.plan = action.payload;
        localStorage.setItem("matchdb_user", JSON.stringify(state.user));
      }
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
      });
  },
});

export const { logout, clearError, updatePlan } = authSlice.actions;
export default authSlice.reducer;
