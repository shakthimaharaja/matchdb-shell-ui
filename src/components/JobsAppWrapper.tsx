import React, { Component, Suspense, lazy, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../store";
import { expireSession, setUser } from "../store/authSlice";
import {
  useLazyVerifyTokenQuery,
  useRefreshTokenMutation,
} from "../api/shellApi";

// Dynamically load the remote Jobs MFE via Module Federation
const JobsApp = lazy(() => import("matchdbJobs/JobsApp"));

/** Default view (first sidebar sub-item) per user type */
const DEFAULT_VIEWS: Record<string, string> = {
  candidate: "matches",
  employer: "postings",
};

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err: Error): ErrorBoundaryState {
    return { hasError: true, message: err.message || "Unknown error" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <div
            className="w97-alert w97-alert-error"
            role="alert"
            aria-live="assertive"
          >
            ⚠ Failed to load Jobs Portal: {this.state.message}
            <button
              aria-label="Reload Jobs Portal"
              onClick={() => globalThis.location.reload()}
            >
              ↺ Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const JobsAppWrapper: React.FC = () => {
  const { token, user, refresh } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const verifyRan = useRef(false);

  const [triggerVerify] = useLazyVerifyTokenQuery();
  const [refreshToken] = useRefreshTokenMutation();

  /**
   * When a logged-in user lands on bare /jobs (no user-type prefix),
   * redirect to /jobs/{userType}?view={defaultView} so the sidebar
   * highlights correctly and the URL is bookmarkable / reloadable.
   */
  useEffect(() => {
    if (!token || !user?.user_type) return;
    const path = location.pathname.replace(/\/+$/, "") || "/jobs";
    if (path === "/jobs") {
      const type = user.user_type;
      const defaultView = DEFAULT_VIEWS[type] ?? "matches";
      navigate(`/jobs/${type}?view=${defaultView}`, { replace: true });
    }
  }, [token, user?.user_type, location.pathname, navigate]);

  /**
   * On mount, verify the stored JWT is still valid.
   * If expired → try refresh token.
   * If refresh also fails → expire session and redirect to the appropriate login page.
   */
  useEffect(() => {
    if (!token) return;
    if (verifyRan.current) return;
    verifyRan.current = true;

    const verifySession = async () => {
      try {
        const verifyResult = await triggerVerify().unwrap();
        dispatch(setUser(verifyResult.user));
        // Token is valid — user data refreshed.
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        // Only act on auth errors (401/403) — network errors should not log out.
        if (status === 401 || status === 403) {
          if (refresh) {
            try {
              await refreshToken({ refresh }).unwrap();
              // shellApi onQueryStarted dispatches setToken — token updated in Redux/localStorage.
              return;
            } catch {
              // Refresh token also expired — fall through to expire session.
            }
          }
          const expiredType = user?.user_type ?? "candidate";
          dispatch(expireSession(expiredType));
          const redirectPath =
            expiredType === "employer" ? "/jobs/employer" : "/jobs/candidate";
          navigate(redirectPath, { replace: true });
        }
        // For 5xx or network errors, leave the user logged in so they can retry.
      }
    };

    verifySession();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingPane />}>
        <JobsApp
          token={token}
          userType={user?.user_type}
          userId={user?.id}
          userEmail={user?.email}
          username={user?.username}
          plan={user?.plan}
          membershipConfig={user?.membership_config}
          hasPurchasedVisibility={user?.has_purchased_visibility ?? false}
        />
      </Suspense>
    </ErrorBoundary>
  );
};

const LoadingPane: React.FC = () => (
  <div style={{ padding: 16 }}>
    <div
      className="w97-shimmer w97-shimmer-xl"
      style={{ height: 24, marginBottom: 12, display: "block" }}
    />
    <div
      className="w97-shimmer w97-shimmer-lg"
      style={{ height: 16, marginBottom: 16, display: "block" }}
    />
    {[85, 70, 60, 75, 50, 65].map((w) => (
      <div
        key={w}
        className="w97-shimmer"
        style={{
          height: 18,
          marginBottom: 6,
          width: `${w}%`,
          display: "block",
        }}
      />
    ))}
  </div>
);

export default JobsAppWrapper;
