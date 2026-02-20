import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppSelector } from "../store";
import axios from "axios";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  current_company: string;
  current_role: string;
  preferred_job_type: string;
  expected_hourly_rate: number | null;
  experience_years: number;
  skills: string[];
  bio: string;
  resume_summary: string;
  resume_experience: string;
  resume_education: string;
  resume_achievements: string;
  username: string;
}

const ResumeViewPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { token, user } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    axios
      .get(`/api/jobs/resume/${username}`)
      .then((res) => {
        setProfile(res.data);
        setError(null);
      })
      .catch((err) => {
        setError(
          err.response?.status === 404
            ? "Profile not found."
            : "Failed to load profile.",
        );
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div style={styles.center}>
        <div
          className="matchdb-panel"
          style={{ padding: "48px 32px", textAlign: "center" }}
        >
          <p style={{ fontSize: 13, color: "#555" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={styles.center}>
        <div
          className="matchdb-panel"
          style={{ padding: "48px 32px", textAlign: "center", maxWidth: 420 }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Profile Not Found</h2>
          <p style={{ margin: "0 0 20px", fontSize: 12, color: "#666" }}>
            {error || "The username you requested does not exist."}
          </p>
          <Link
            to="/"
            className="matchdb-btn matchdb-btn-primary"
            style={{ textDecoration: "none", fontSize: 12 }}
          >
            ← Back to MatchDB
          </Link>
        </div>
      </div>
    );
  }

  const rate = profile.expected_hourly_rate
    ? `$${profile.expected_hourly_rate}/hr`
    : "—";

  const handleDownload = async () => {
    if (!token || !username) return;
    setDownloading(true);
    try {
      const res = await axios.get(`/api/jobs/resume/${username}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || `resume-${username}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download resume. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={styles.center}>
      <div
        className="matchdb-panel"
        style={{ maxWidth: 720, width: "100%", padding: 0 }}
      >
        {/* Title bar */}
        <div className="rm-titlebar" style={{ borderRadius: 0 }}>
          <span className="rm-titlebar-icon">📄</span>
          <span className="rm-titlebar-title">
            Resume — {profile.name || username}
          </span>
        </div>

        {/* Status bar */}
        <div className="rm-statusbar" style={{ fontSize: 11 }}>
          Public profile for <strong>{profile.name}</strong> on MatchDB
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px" }}>
          {/* Personal info */}
          <Section title="Personal Information">
            <InfoRow label="Name" value={profile.name} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Phone" value={profile.phone} />
            <InfoRow label="Location" value={profile.location} />
          </Section>

          {/* Professional details */}
          <Section title="Professional Details">
            <InfoRow label="Current Company" value={profile.current_company} />
            <InfoRow label="Current Role" value={profile.current_role} />
            <InfoRow
              label="Preferred Type"
              value={profile.preferred_job_type}
            />
            <InfoRow label="Expected Rate" value={rate} />
            <InfoRow
              label="Experience"
              value={`${profile.experience_years || 0} years`}
            />
          </Section>

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <Section title="Skills">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {profile.skills.map((skill, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      background: "#d4d0c8",
                      border: "1px solid #a0a0a0",
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Bio */}
          {profile.bio && (
            <Section title="Bio">
              <p style={styles.text}>{profile.bio}</p>
            </Section>
          )}

          {/* Resume sections */}
          {profile.resume_summary && (
            <Section title="Professional Summary">
              <p style={styles.text}>{profile.resume_summary}</p>
            </Section>
          )}
          {profile.resume_experience && (
            <Section title="Work Experience">
              <pre style={styles.pre}>{profile.resume_experience}</pre>
            </Section>
          )}
          {profile.resume_education && (
            <Section title="Education">
              <pre style={styles.pre}>{profile.resume_education}</pre>
            </Section>
          )}
          {profile.resume_achievements && (
            <Section title="Achievements & Certifications">
              <pre style={styles.pre}>{profile.resume_achievements}</pre>
            </Section>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 10,
              borderTop: "1px solid #c0c0c0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Link
              to="/"
              className="matchdb-btn"
              style={{ textDecoration: "none", fontSize: 11 }}
            >
              ← Back to MatchDB
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {token ? (
                <button
                  type="button"
                  className="matchdb-btn matchdb-btn-primary"
                  style={{ fontSize: 11, padding: "4px 14px" }}
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? "Downloading..." : "⬇ Download Resume"}
                </button>
              ) : (
                <span
                  style={{ fontSize: 10, color: "#999", fontStyle: "italic" }}
                >
                  Log in to download resume
                </span>
              )}
              <span style={{ fontSize: 10, color: "#999" }}>
                Generated by MatchDB
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Small helpers ──────────────────────────────────────────────────────────── */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div style={{ marginBottom: 14 }}>
    <h3
      style={{
        margin: "0 0 6px",
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        color: "#003366",
        borderBottom: "1px solid #d4d0c8",
        paddingBottom: 3,
      }}
    >
      {title}
    </h3>
    {children}
  </div>
);

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({
  label,
  value,
}) => (
  <div style={{ display: "flex", fontSize: 12, marginBottom: 2 }}>
    <span style={{ width: 140, fontWeight: 600, color: "#555", flexShrink: 0 }}>
      {label}:
    </span>
    <span>{value || "—"}</span>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: "flex",
    justifyContent: "center",
    padding: "32px 16px",
  },
  text: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.6,
    color: "#333",
    whiteSpace: "pre-wrap",
  },
  pre: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.6,
    color: "#333",
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
  },
};

export default ResumeViewPage;
