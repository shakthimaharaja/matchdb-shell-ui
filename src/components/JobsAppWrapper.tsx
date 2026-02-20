import React, { Suspense, lazy } from "react";
import { useAppSelector } from "../store";

// Dynamically load the remote Jobs MFE via Module Federation
const JobsApp = lazy(() => import("matchdbJobs/JobsApp"));

const JobsAppWrapper: React.FC = () => {
  const { token, user } = useAppSelector((state) => state.auth);

  return (
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
  );
};

const LoadingPane: React.FC = () => (
  <div style={styles.loading}>
    <div style={styles.spinner} />
    <p style={styles.loadingText}>Loading Jobs Portal...</p>
    <p style={styles.loadingSubText}>
      Please wait while the module is being loaded.
    </p>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    color: "#606060",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid #c0b8a8",
    borderTopColor: "#003366",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginBottom: "12px",
  },
  loadingText: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#003366",
    margin: "0 0 4px",
  },
  loadingSubText: { fontSize: "11px", color: "#909090", margin: 0 },
};

export default JobsAppWrapper;
