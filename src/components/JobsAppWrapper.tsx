import React, { Component, Suspense, lazy, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../store";
import { expireSession, refreshAuthToken } from "../store/authSlice";
import axios from "axios";

// Dynamically load the remote Jobs MFE via Module Federation
const JobsApp = lazy(() => import("matchdbJobs/JobsApp"));

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
              onClick={() => window.location.reload()}
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
  const verifyRan = useRef(false);

  /**
   * On mount (and on token change), verify the stored JWT is still valid.
   * If expired → try refresh token.
   * If refresh also fails → expire session and redirect to the appropriate login page.
   */
  useEffect(() => {
    // Only run when there IS a stored token (logged-in user reloading the page).
    if (!token) return;
    // Guard: only run once per mount to avoid double-verify on React StrictMode.
    if (verifyRan.current) return;
    verifyRan.current = true;

    const verifyToken = async () => {
      try {
        await axios.get("/api/auth/verify", {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Token is valid — nothing to do.
      } catch (err: any) {
        const status = err?.response?.status;
        // Only act on auth errors (401/403) — network errors should not log out.
        if (status === 401 || status === 403) {
          // Attempt silent refresh.
          if (refresh) {
            try {
              await dispatch(refreshAuthToken(refresh)).unwrap();
              // Refresh succeeded — token updated in Redux/localStorage.
              return;
            } catch {
              // Refresh token also expired — fall through to expire session.
            }
          }
          // Both token and refresh failed → expire session.
          const expiredType = user?.user_type ?? "candidate";
          dispatch(expireSession(expiredType));
          // Redirect to the login page matching the user's last role.
          navigate(
            expiredType === "vendor" ? "/jobs/vendor" : "/jobs/candidate",
            {
              replace: true,
            },
          );
        }
        // For 5xx or network errors, leave the user logged in so they can retry.
      }
    };

    verifyToken();
  }, [token]);

  // Both pre-login (public tables) and post-login (dashboards) are now
  // handled inside the Jobs MFE. The MFE checks `token` and renders
  // PublicJobsView when null, or the authenticated routes when present.
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
    {[85, 70, 60, 75, 50, 65].map((w, i) => (
      <div
        key={i}
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
