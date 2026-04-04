import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppSelector } from "../store";
import { Button, Text } from "matchdb-component-library";
import axios from "axios";
import { RESUME_VIEW, RESUME_DOWNLOAD } from "../constants/endpoints";

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
  const { token } = useAppSelector((state) => state.auth);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    axios
      .get(RESUME_VIEW(username))
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
      <div className="matchdb-loading-center">
        <div className="matchdb-panel u-max-w-720 u-w-full u-p-0">
          <div className="rm-titlebar u-rounded-0">
            <span className="rm-titlebar-icon">📄</span>
            <span className="rm-titlebar-title">Resume — Loading…</span>
          </div>
          <div className="u-p-16">
            <div
              className="w97-shimmer w97-shimmer-xl u-block u-mb-8"
              style={{ height: 14 }}
            />
            <div
              className="w97-shimmer w97-shimmer-lg u-block u-mb-16"
              style={{ height: 12 }}
            />
            {[100, 80, 95, 70, 90].map((w) => (
              <div
                key={`shimmer-${w}`}
                className="w97-shimmer u-block u-mb-6"
                style={{ height: 12, width: `${w}%` }}
              />
            ))}
            <div className="u-mt-16">
              {[60, 40, 55, 45, 50].map((w) => (
                <div
                  key={`shimmer-${w}`}
                  className="w97-shimmer u-block"
                  style={{ height: 12, marginBottom: 5, width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="matchdb-loading-center">
        <div
          className="matchdb-panel matchdb-empty-state u-max-w-420"
          role="alert"
        >
          <div className="matchdb-empty-icon">📄</div>
          <h2 className="matchdb-empty-title">Profile Not Found</h2>
          <Text as="p" className="matchdb-empty-desc">
            {error || "The username you requested does not exist."}
          </Text>
          <Link
            to="/"
            className="matchdb-btn matchdb-btn-primary u-no-decoration u-fs-12"
          >
            ← Back to MatchingDB
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
      const res = await axios.get(RESUME_DOWNLOAD(username), {
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
    <div className="matchdb-loading-center">
      <div className="matchdb-panel u-max-w-720 u-w-full u-p-0">
        {/* Title bar */}
        <div className="rm-titlebar u-rounded-0">
          <span className="rm-titlebar-icon">📄</span>
          <span className="rm-titlebar-title">
            Resume — {profile.name || username}
          </span>
        </div>

        {/* Status bar */}
        <div className="rm-statusbar u-fs-11">
          Public profile for <strong>{profile.name}</strong> on MatchingDB
        </div>

        {/* Body */}
        <div className="u-p-16">
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
              <div className="u-flex-wrap u-gap-4">
                {profile.skills.map((skill) => (
                  <span key={skill} className="matchdb-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Bio */}
          {profile.bio && (
            <Section title="Bio">
              <p className="matchdb-body-text">{profile.bio}</p>
            </Section>
          )}

          {/* Resume sections */}
          {profile.resume_summary && (
            <Section title="Professional Summary">
              <p className="matchdb-body-text">{profile.resume_summary}</p>
            </Section>
          )}
          {profile.resume_experience && (
            <Section title="Work Experience">
              <pre className="matchdb-pre-text">
                {profile.resume_experience}
              </pre>
            </Section>
          )}
          {profile.resume_education && (
            <Section title="Education">
              <pre className="matchdb-pre-text">{profile.resume_education}</pre>
            </Section>
          )}
          {profile.resume_achievements && (
            <Section title="Achievements & Certifications">
              <pre className="matchdb-pre-text">
                {profile.resume_achievements}
              </pre>
            </Section>
          )}

          {/* Footer */}
          <div className="u-flex-between u-mt-20 u-pt-10 u-border-top">
            <Link to="/" className="matchdb-btn u-no-decoration u-fs-11">
              ← Back to MatchingDB
            </Link>
            <div className="u-flex-center u-gap-8">
              {token ? (
                <Button
                  variant="primary"
                  size="xs"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? "Downloading..." : "⬇ Download Resume"}
                </Button>
              ) : (
                <Text size={10} color="hint" italic>
                  Log in to download resume
                </Text>
              )}
              <Text size={10} color="hint">
                Generated by MatchingDB
              </Text>
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
  <div className="u-mb-12">
    <h3 className="matchdb-section-heading">{title}</h3>
    {children}
  </div>
);

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({
  label,
  value,
}) => (
  <div className="matchdb-info-row">
    <span className="matchdb-info-key">{label}:</span>
    <span>{value || "—"}</span>
  </div>
);

export default ResumeViewPage;
