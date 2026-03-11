/**
 * api/shellApi.ts — Shell UI: ALL endpoints in one place.
 *
 * Every endpoint is exposed as an auto-generated React hook:
 *   Queries  → useXxxQuery / useLazyXxxQuery
 *   Mutations → useXxxMutation
 *
 * The Node BFF server (port 4000) proxies /api/* to the real backends,
 * so browser network tab only ever shows relative /api/... URLs.
 *
 * prepareHeaders automatically injects the JWT from Redux auth state —
 * components never need to pass the token manually.
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  setAuth,
  setUser,
  setToken,
  logout as logoutAction,
} from "../store/authSlice";
import type { User } from "../store/authSlice";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginArgs {
  email: string;
  password: string;
}

export interface RegisterArgs {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  userType: "candidate" | "vendor" | "marketer";
}

export interface RefreshTokenArgs {
  refresh: string;
}

export interface VendorPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  highlighted?: boolean;
}

export interface CandidatePackage {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface CandidateCheckoutArgs {
  packageId: string;
  domain?: string;
  subdomains?: string[];
}

// ─── RTK Query API ────────────────────────────────────────────────────────────

// Avoid circular import: read token from state with a local type, not RootState
type StateWithAuth = { auth: { token: string | null } };

export const shellApi = createApi({
  reducerPath: "shellApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as StateWithAuth).auth.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    // ── Auth ──────────────────────────────────────────────────────────────────

    login: builder.mutation<AuthResponse, LoginArgs>({
      query: (body) => ({ url: "api/auth/login", method: "POST", body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAuth(data));
        } catch { /* handled by RTK Query */ }
      },
    }),

    register: builder.mutation<AuthResponse, RegisterArgs>({
      query: (body) => ({ url: "api/auth/register", method: "POST", body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAuth(data));
        } catch { /* handled by RTK Query */ }
      },
    }),

    logoutUser: builder.mutation<void, void>({
      query: () => ({ url: "api/auth/logout", method: "POST" }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(logoutAction());
        }
      },
    }),

    verifyToken: builder.query<{ user: User }, void>({
      query: () => "api/auth/verify",
    }),

    refreshUserData: builder.mutation<User, void>({
      query: () => "api/auth/verify",
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data));
        } catch { /* handled by RTK Query */ }
      },
    }),

    refreshToken: builder.mutation<{ access: string }, RefreshTokenArgs>({
      query: (body) => ({ url: "api/auth/refresh", method: "POST", body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setToken(data.access));
        } catch { /* handled by RTK Query */ }
      },
    }),

    deleteAccount: builder.mutation<void, void>({
      query: () => ({ url: "api/auth/account", method: "DELETE" }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(logoutAction());
        } catch { /* handled by RTK Query */ }
      },
    }),

    // ── Payments ──────────────────────────────────────────────────────────────

    getVendorPlans: builder.query<VendorPlan[], void>({
      query: () => "api/payments/plans",
      transformResponse: (res: { plans: VendorPlan[] }) => res.plans,
    }),

    getCandidatePackages: builder.query<CandidatePackage[], void>({
      query: () => "api/payments/candidate-packages",
      transformResponse: (res: { packages: CandidatePackage[] }) => res.packages,
    }),

    createVendorCheckout: builder.mutation<{ url: string }, { planId: string }>(
      {
        query: (body) => ({
          url: "api/payments/checkout",
          method: "POST",
          body,
        }),
      },
    ),

    createCandidateCheckout: builder.mutation<
      { url: string },
      CandidateCheckoutArgs
    >({
      query: (body) => ({
        url: "api/payments/candidate-checkout",
        method: "POST",
        body,
      }),
    }),

    openBillingPortal: builder.mutation<{ url: string }, void>({
      query: () => ({ url: "api/payments/portal", method: "POST", body: {} }),
    }),

    createMarketerCheckout: builder.mutation<{ url: string }, void>({
      query: () => ({
        url: "api/payments/marketer-checkout",
        method: "POST",
        body: {},
      }),
    }),
  }),
});

// ─── Export hooks ─────────────────────────────────────────────────────────────

export const {
  // Auth
  useLoginMutation,
  useRegisterMutation,
  useLogoutUserMutation,
  useVerifyTokenQuery,
  useLazyVerifyTokenQuery,
  useRefreshUserDataMutation,
  useRefreshTokenMutation,
  useDeleteAccountMutation,
  // Payments
  useGetVendorPlansQuery,
  useGetCandidatePackagesQuery,
  useCreateVendorCheckoutMutation,
  useCreateCandidateCheckoutMutation,
  useOpenBillingPortalMutation,
  useCreateMarketerCheckoutMutation,
} = shellApi;
