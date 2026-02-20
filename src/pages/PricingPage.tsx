import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAppSelector, useAppDispatch } from "../store";
import { refreshUserData } from "../store/authSlice";
import "./PricingPage.css";

//  Types

interface VendorPlanDef {
  id: string;
  name: string;
  price: number;
  interval: string | null;
  features: string[];
  stripePriceId: string;
  highlighted?: boolean;
  jobLimit: number;
  pokeLimit: number;
}

interface CandidatePackage {
  id: string;
  name: string;
  price: number;
  priceCents: number;
  description: string;
  details: string;
  stripePriceId: string;
}

const CONTRACT_SUBDOMAINS = [
  { value: "c2c", label: "C2C (Corp-to-Corp)" },
  { value: "c2h", label: "C2H (Contract-to-Hire)" },
  { value: "w2", label: "W2" },
  { value: "1099", label: "1099 / Independent" },
];
const FULLTIME_SUBDOMAINS = [
  { value: "c2h", label: "C2H (Contract-to-Hire)" },
  { value: "w2", label: "W2" },
  { value: "direct_hire", label: "Direct Hire" },
  { value: "salary", label: "Salaried" },
];

const DOMAIN_LABELS: Record<string, string> = {
  contract: "Contract",
  full_time: "Full Time",
};
const SUB_LABELS: Record<string, string> = {
  c2c: "C2C",
  c2h: "C2H",
  w2: "W2",
  "1099": "1099",
  direct_hire: "Direct Hire",
  salary: "Salaried",
};

function planBadge(id: string) {
  switch (id) {
    case "basic":
      return "BASIC";
    case "pro":
      return "PRO";
    case "pro_plus":
      return "PRO+";
    default:
      return "FREE";
  }
}

//  Confirm Dialog (W97-native)

interface ConfirmDialogProps {
  open: boolean;
  icon: string;
  title: string;
  subtitle: string;
  cardTitle: string;
  cardName: string;
  price: number;
  priceNote: string;
  features?: string[];
  domainLine?: React.ReactNode;
  notice: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  icon,
  title,
  subtitle,
  cardTitle,
  cardName,
  price,
  priceNote,
  features,
  domainLine,
  notice,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div className="pp-confirm-overlay" onClick={onClose}>
      <div className="pp-confirm-window" onClick={(e) => e.stopPropagation()}>
        <div className="pp-confirm-titlebar">
          <span>{icon}</span>
          <span className="pp-confirm-titlebar-title">{title}</span>
          <button className="pp-confirm-close" onClick={onClose} title="Close">
            x
          </button>
        </div>

        <div className="pp-confirm-body">
          <div
            style={{
              fontSize: 10,
              color: "var(--w97-text-secondary)",
              marginBottom: -2,
            }}
          >
            {subtitle}
          </div>

          <div className="pp-confirm-card">
            <div className="pp-confirm-card-title">{cardTitle}</div>
            <div className="pp-confirm-card-name">{cardName}</div>
            <div className="pp-confirm-card-price">
              ${price}{" "}
              <span className="pp-confirm-card-price-note">{priceNote}</span>
            </div>

            {features && features.length > 0 && (
              <>
                <hr className="pp-confirm-card-divider" />
                <ul className="pp-confirm-feature-list">
                  {features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            )}

            {domainLine && (
              <>
                <hr className="pp-confirm-card-divider" />
                {domainLine}
              </>
            )}
          </div>

          <div className="pp-confirm-notice">{notice}</div>
        </div>

        <div className="pp-confirm-footer">
          <button className="pp-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="pp-btn pp-btn-primary pp-btn-wide"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Redirecting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

//  Main Component

interface PricingPageProps {
  initialTab?: "vendor" | "candidate";
  onClose?: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ initialTab, onClose }) => {
  const { token, user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();

  const isVendor = user?.user_type === "vendor";
  const isCandidate = user?.user_type === "candidate";

  const defaultTab = isVendor
    ? 0
    : isCandidate
      ? 1
      : initialTab === "vendor"
        ? 0
        : initialTab === "candidate"
          ? 1
          : 0;

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [vendorPlans, setVendorPlans] = useState<VendorPlanDef[]>([]);
  const [candidatePkgs, setCandidatePkgs] = useState<CandidatePackage[]>([]);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [loadingPkgId, setLoadingPkgId] = useState<string | null>(null);
  const [vendorConfirm, setVendorConfirm] = useState<VendorPlanDef | null>(
    null,
  );
  const [candidateConfirm, setCandidateConfirm] = useState<{
    packageId: string;
    label: string;
    price: number;
  } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<
    "contract" | "full_time"
  >("contract");
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    axios
      .get("/api/payments/plans")
      .then((r) => setVendorPlans(r.data.plans || []))
      .catch(() => {});
    axios
      .get("/api/payments/candidate-packages")
      .then((r) => setCandidatePkgs(r.data.packages || []))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setMessage({
        type: "success",
        text: "Subscription activated! Your vendor plan has been updated.",
      });
      if (token) dispatch(refreshUserData(token));
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("candidate_success") === "true") {
      setMessage({
        type: "success",
        text: "Visibility package purchased! You are now visible to employers in the selected categories.",
      });
      if (token) dispatch(refreshUserData(token));
      window.history.replaceState({}, "", window.location.pathname);
      setActiveTab(1);
    }
    if (params.get("canceled") === "true") {
      setMessage({
        type: "error",
        text: "Checkout canceled - no changes were made.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [dispatch, token]);

  //  Vendor
  const handleVendorConfirm = async () => {
    if (!vendorConfirm || !token) return;
    setLoadingPlanId(vendorConfirm.id);
    try {
      const res = await axios.post(
        "/api/payments/checkout",
        { planId: vendorConfirm.id },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      window.location.href = res.data.url;
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Checkout failed. Please try again.",
      });
      setLoadingPlanId(null);
      setVendorConfirm(null);
    }
  };

  const handlePortal = async () => {
    if (!token) return;
    try {
      const res = await axios.post(
        "/api/payments/portal",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      window.location.href = res.data.url;
    } catch {
      setMessage({ type: "error", text: "Unable to open billing portal." });
    }
  };

  //  Candidate helpers
  const getOwnedSubs = (domain: string): string[] =>
    (user as any)?.membership_config?.[domain] || [];

  const handlePkgSelect = (pkgId: string) => {
    if (selectedPkg === pkgId) {
      setSelectedPkg(null);
      setSelectedSubs([]);
      return;
    }
    setSelectedPkg(pkgId);
    setSelectedSubs([]);
  };

  const isSubActive = (domain: string, subValue: string): boolean => {
    if (!selectedPkg) return false;
    if (selectedPkg === "full_bundle") return true;
    if (domain !== selectedDomain) return false;
    if (selectedPkg === "single_domain_bundle")
      return !getOwnedSubs(domain).includes(subValue);
    return selectedSubs.includes(subValue);
  };

  const handleSubClick = (
    domain: "contract" | "full_time",
    subValue: string,
  ) => {
    if (
      !selectedPkg ||
      selectedPkg === "full_bundle" ||
      selectedPkg === "single_domain_bundle"
    )
      return;
    if (getOwnedSubs(domain).includes(subValue)) return;
    if (domain !== selectedDomain) {
      setSelectedDomain(domain);
      setSelectedSubs(selectedPkg === "base" ? [subValue] : [subValue]);
      return;
    }
    if (selectedPkg === "base") {
      setSelectedSubs([subValue]);
    } else {
      setSelectedSubs((prev) =>
        prev.includes(subValue)
          ? prev.filter((v) => v !== subValue)
          : [...prev, subValue],
      );
    }
  };

  const handleDomainClick = (domain: "contract" | "full_time") => {
    if (!selectedPkg || selectedPkg === "full_bundle") return;
    setSelectedDomain(domain);
    setSelectedSubs([]);
  };

  const selectedPkgData = candidatePkgs.find((p) => p.id === selectedPkg);
  const effectivePrice = !selectedPkg
    ? 0
    : selectedPkg === "subdomain_addon"
      ? (selectedPkgData?.price || 2) * selectedSubs.length
      : selectedPkgData?.price || 0;

  const canPurchase = (): boolean => {
    if (!selectedPkg || !token) return false;
    if (selectedPkg === "full_bundle") return true;
    if (selectedPkg === "single_domain_bundle") return true;
    if (selectedPkg === "base") return selectedSubs.length === 1;
    if (selectedPkg === "subdomain_addon") return selectedSubs.length > 0;
    return false;
  };

  const handleCandidateConfirm = async () => {
    if (!candidateConfirm || !token) return;
    const { packageId } = candidateConfirm;
    setLoadingPkgId(packageId);
    const body: Record<string, any> = { packageId };
    if (packageId !== "full_bundle") {
      body.domain = selectedDomain;
      if (packageId === "base" && selectedSubs.length > 0)
        body.subdomains = [selectedSubs[0]];
      else if (packageId === "subdomain_addon") body.subdomains = selectedSubs;
    }
    try {
      const res = await axios.post("/api/payments/candidate-checkout", body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.href = res.data.url;
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Checkout failed. Please try again.",
      });
      setLoadingPkgId(null);
      setCandidateConfirm(null);
    }
  };

  const buildDomainLine = (packageId: string) => {
    const isFullBundle = packageId === "full_bundle";
    return (
      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--w97-text-secondary)",
            marginBottom: 3,
          }}
        >
          Visible in:
        </div>
        {isFullBundle ? (
          (["contract", "full_time"] as const).map((d) => (
            <div key={d} style={{ marginBottom: 4 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 2,
                }}
              >
                {DOMAIN_LABELS[d]}
              </div>
              <div className="pp-confirm-subs">
                {(d === "contract"
                  ? CONTRACT_SUBDOMAINS
                  : FULLTIME_SUBDOMAINS
                ).map((s) => (
                  <span key={s.value} className="pp-confirm-sub-pill">
                    {SUB_LABELS[s.value] || s.value}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 2,
              }}
            >
              {DOMAIN_LABELS[selectedDomain] || selectedDomain}
            </div>
            <div className="pp-confirm-subs">
              {(selectedSubs.length > 0
                ? selectedSubs
                : (selectedDomain === "contract"
                    ? CONTRACT_SUBDOMAINS
                    : FULLTIME_SUBDOMAINS
                  ).map((s) => s.value)
              ).map((s) => (
                <span key={s} className="pp-confirm-sub-pill">
                  {SUB_LABELS[s] || s.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  //  Render
  return (
    <div className="pp-root">
      <ConfirmDialog
        open={candidateConfirm !== null}
        icon=""
        title="Confirm Visibility Purchase"
        subtitle="Review your selection before proceeding to Stripe"
        cardTitle="Candidate Visibility"
        cardName={candidateConfirm?.label || ""}
        price={candidateConfirm?.price || 0}
        priceNote="one-time  no recurring fees"
        domainLine={
          candidateConfirm
            ? buildDomainLine(candidateConfirm.packageId)
            : undefined
        }
        notice="You will be redirected to Stripe to complete payment. This is a one-time charge - no recurring fees."
        confirmLabel={`Buy Now - $${candidateConfirm?.price}`}
        loading={loadingPkgId === candidateConfirm?.packageId}
        onConfirm={handleCandidateConfirm}
        onClose={() => {
          setCandidateConfirm(null);
          setLoadingPkgId(null);
        }}
      />

      <div className="pp-statusbar">
        <span>Plans &amp; Pricing</span>
        <span className="pp-statusbar-sep">|</span>
        {user ? (
          <>
            <span className="pp-statusbar-plan">
              {user.user_type === "vendor" ? "Employer" : "Candidate"} -{" "}
              {planBadge((user as any).plan ?? "free")}
            </span>
            {(user as any).plan && (user as any).plan !== "free" && (
              <>
                <span className="pp-statusbar-sep">|</span>
                <button
                  className="pp-btn"
                  style={{ height: 18, fontSize: 10 }}
                  onClick={handlePortal}
                >
                  Manage Billing
                </button>
              </>
            )}
          </>
        ) : (
          <span>Sign in to subscribe</span>
        )}
      </div>

      {/* Only show tabs when both sections are accessible (unauthenticated) */}
      {!user || (!isVendor && !isCandidate) ? (
        <div className="pp-tabs">
          <button
            className={`pp-tab${activeTab === 0 ? " pp-tab-active" : ""}`}
            onClick={() => setActiveTab(0)}
          >
            For Employers (Vendors)
          </button>
          <button
            className={`pp-tab${activeTab === 1 ? " pp-tab-active" : ""}`}
            onClick={() => setActiveTab(1)}
          >
            For Candidates
          </button>
        </div>
      ) : (
        <div className="pp-tabs">
          {isVendor && (
            <button className="pp-tab pp-tab-active">
              For Employers (Vendors)
            </button>
          )}
          {isCandidate && (
            <button className="pp-tab pp-tab-active">For Candidates</button>
          )}
        </div>
      )}

      <div className="pp-body">
        {message && (
          <div className={`pp-alert pp-alert-${message.type}`}>
            {message.text}
            <button className="pp-alert-close" onClick={() => setMessage(null)}>
              x
            </button>
          </div>
        )}

        {(activeTab === 0 || isVendor) && !isCandidate && (
          <>
            {vendorConfirm ? (
              /* ── Inline confirmation view ── */
              <div className="pp-inline-confirm">
                <div className="pp-inline-confirm-nav">
                  <button
                    className="pp-btn"
                    onClick={() => {
                      setVendorConfirm(null);
                      setLoadingPlanId(null);
                    }}
                  >
                    &#8592; Go Back
                  </button>
                  <span className="pp-inline-confirm-heading">
                    Confirm Subscription
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: "var(--w97-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  Review your selection before proceeding to Stripe
                </div>

                <div className="pp-confirm-card">
                  <div className="pp-confirm-card-title">Employer Plan</div>
                  <div className="pp-confirm-card-name">
                    {vendorConfirm.name}
                  </div>
                  <div className="pp-confirm-card-price">
                    ${vendorConfirm.price}
                    <span className="pp-confirm-card-price-note">
                      &nbsp;/ {vendorConfirm.interval} &nbsp;&middot;&nbsp;
                      billed monthly &nbsp;&middot;&nbsp; cancel anytime
                    </span>
                  </div>
                  {vendorConfirm.features.length > 0 && (
                    <>
                      <hr className="pp-confirm-card-divider" />
                      <ul className="pp-confirm-feature-list">
                        {vendorConfirm.features.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <div className="pp-confirm-notice">
                  You will be redirected to Stripe to complete payment. Your
                  subscription starts immediately after payment and auto-renews
                  monthly.
                </div>

                <div className="pp-inline-confirm-footer">
                  <button
                    className="pp-btn pp-btn-primary pp-btn-wide"
                    disabled={loadingPlanId === vendorConfirm.id}
                    onClick={handleVendorConfirm}
                  >
                    {loadingPlanId === vendorConfirm.id
                      ? "Redirecting..."
                      : `Subscribe \u2014 $${vendorConfirm.price}/mo`}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Plan grid ── */
              <>
                <div className="pp-section-label">
                  Employer Subscription Plans - monthly recurring, cancel
                  anytime
                </div>
                <div className="pp-plan-grid">
                  {vendorPlans.map((plan) => {
                    const isCurrent = (user as any)?.plan === plan.id;
                    const cardCls = [
                      "pp-plan-card",
                      plan.highlighted ? "pp-plan-card-highlighted" : "",
                      isCurrent ? "pp-plan-card-current" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <div key={plan.id} className={cardCls}>
                        <div
                          className={`pp-plan-titlebar pp-plan-titlebar-${plan.id}`}
                        >
                          <span style={{ flex: 1 }}>{plan.name}</span>
                          <span
                            className={`pp-plan-badge${plan.highlighted ? " pp-plan-badge-popular" : ""}`}
                          >
                            {plan.highlighted ? "POPULAR" : planBadge(plan.id)}
                          </span>
                        </div>

                        <div className="pp-plan-body">
                          <div>
                            {plan.price === 0 ? (
                              <span className="pp-plan-price pp-plan-price-free">
                                Free
                              </span>
                            ) : (
                              <span className="pp-plan-price">
                                ${plan.price}
                                <span className="pp-plan-price-interval">
                                  {" "}
                                  /{plan.interval}
                                </span>
                              </span>
                            )}
                          </div>

                          <hr className="pp-plan-divider" />

                          <ul
                            className={`pp-plan-features${plan.highlighted ? " pp-plan-features-highlighted" : ""}`}
                          >
                            {plan.features.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>

                          <div className="pp-plan-action">
                            {isCurrent ? (
                              <span className="pp-plan-current-badge">
                                CURRENT PLAN
                              </span>
                            ) : plan.price === 0 ? (
                              <button
                                className="pp-btn"
                                style={{ width: "100%" }}
                                disabled
                              >
                                Free Account
                              </button>
                            ) : (
                              <button
                                className="pp-btn pp-btn-primary"
                                style={{ width: "100%" }}
                                disabled={loadingPlanId === plan.id}
                                onClick={() => {
                                  if (!token) {
                                    setMessage({
                                      type: "error",
                                      text: "Please sign in to subscribe.",
                                    });
                                    return;
                                  }
                                  setVendorConfirm(plan);
                                }}
                              >
                                {(user as any)?.plan === "free"
                                  ? "Get Started"
                                  : "Switch Plan"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {(activeTab === 1 || isCandidate) && !isVendor && (
          <>
            {/* Current visibility */}
            {(user as any)?.has_purchased_visibility &&
              (user as any)?.membership_config && (
                <div className="pp-visibility-panel">
                  <div className="pp-visibility-title">
                    Your Current Visibility
                  </div>
                  {Object.entries((user as any).membership_config).map(
                    ([domain, subs]) => (
                      <div key={domain}>
                        <div className="pp-visibility-domain">
                          {domain.replace("_", " ")}
                        </div>
                        <div className="pp-visibility-subs">
                          {(subs as string[]).map((s) => (
                            <span key={s} className="pp-visibility-sub">
                              {s.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

            {/* ── Step 1: Select a Package ── */}
            <div className="pp-step-header">
              Step 1 &mdash; Choose a Package
            </div>

            <div className="pp-pkg-grid">
              {candidatePkgs.map((pkg) => {
                const isActive = selectedPkg === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    className={[
                      "pp-pkg-card",
                      pkg.id === "full_bundle" ? "pp-pkg-card-best" : "",
                      isActive ? "pp-pkg-card-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handlePkgSelect(pkg.id)}
                  >
                    {pkg.id === "full_bundle" && (
                      <span className="pp-pkg-badge">BEST VALUE</span>
                    )}
                    <div className="pp-pkg-name">{pkg.name}</div>
                    <div className="pp-pkg-price">
                      ${pkg.price}
                      <span>
                        {pkg.id === "subdomain_addon" ? " /each" : " one-time"}
                      </span>
                    </div>
                    <div className="pp-pkg-desc">{pkg.description}</div>
                  </div>
                );
              })}
            </div>

            {/* ── Step 2: Domain / Subdomain Map ── */}
            <div className="pp-step-header">
              Step 2 &mdash; Select Coverage
              {!selectedPkg && (
                <span className="pp-step-hint">
                  Choose a package above first
                </span>
              )}
            </div>

            <div
              className={`pp-domain-map${!selectedPkg ? " pp-domain-map-disabled" : ""}`}
            >
              {(["contract", "full_time"] as const).map((domain) => {
                const subs =
                  domain === "contract"
                    ? CONTRACT_SUBDOMAINS
                    : FULLTIME_SUBDOMAINS;
                const owned = getOwnedSubs(domain);
                const isDomainActive =
                  selectedPkg === "full_bundle" || selectedDomain === domain;
                const isDomainClickable =
                  !!selectedPkg && selectedPkg !== "full_bundle";

                return (
                  <div
                    key={domain}
                    className={[
                      "pp-domain-panel",
                      isDomainActive ? "pp-domain-panel-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div
                      className="pp-domain-panel-header"
                      onClick={() =>
                        isDomainClickable && handleDomainClick(domain)
                      }
                      style={{
                        cursor: isDomainClickable ? "pointer" : "default",
                      }}
                    >
                      <span>{DOMAIN_LABELS[domain]}</span>
                      {isDomainActive && (
                        <span className="pp-domain-check">&#10003;</span>
                      )}
                    </div>
                    <div className="pp-domain-panel-body">
                      {subs.map((sub) => {
                        const isOwned = owned.includes(sub.value);
                        const active = isSubActive(domain, sub.value);
                        const clickable =
                          !!selectedPkg &&
                          selectedPkg !== "full_bundle" &&
                          selectedPkg !== "single_domain_bundle" &&
                          isDomainActive &&
                          !isOwned;

                        return (
                          <div
                            key={sub.value}
                            className={[
                              "pp-sub-tile",
                              active ? "pp-sub-tile-active" : "",
                              isOwned ? "pp-sub-tile-owned" : "",
                              !clickable && !isOwned && !active
                                ? "pp-sub-tile-disabled"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() =>
                              clickable && handleSubClick(domain, sub.value)
                            }
                            style={{
                              cursor: clickable ? "pointer" : "default",
                            }}
                          >
                            <span className="pp-sub-tile-label">
                              {sub.label}
                            </span>
                            {isOwned && (
                              <span className="pp-sub-tile-badge">OWNED</span>
                            )}
                            {active && !isOwned && (
                              <span className="pp-sub-tile-check">
                                &#10003;
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Purchase Bar ── */}
            {selectedPkg && canPurchase() && (
              <div className="pp-purchase-bar">
                <div className="pp-purchase-info">
                  <span className="pp-purchase-pkg">
                    {selectedPkgData?.name}
                  </span>
                  <span className="pp-purchase-price">${effectivePrice}</span>
                  <span className="pp-purchase-note">one-time</span>
                </div>
                <button
                  className="pp-btn pp-btn-primary pp-btn-wide"
                  style={{ height: 28, fontSize: 12 }}
                  disabled={loadingPkgId !== null}
                  onClick={() => {
                    if (!token) {
                      setMessage({
                        type: "error",
                        text: "Please sign in to purchase.",
                      });
                      return;
                    }
                    setCandidateConfirm({
                      packageId: selectedPkg,
                      label: selectedPkgData?.name || selectedPkg,
                      price: effectivePrice,
                    });
                  }}
                >
                  {loadingPkgId
                    ? "Please wait..."
                    : `Purchase - $${effectivePrice}`}
                </button>
              </div>
            )}

            {/* Hint when package selected but selection incomplete */}
            {selectedPkg &&
              !canPurchase() &&
              selectedPkg !== "full_bundle" &&
              selectedPkg !== "single_domain_bundle" && (
                <div
                  className="pp-alert pp-alert-info"
                  style={{ marginTop: 0 }}
                >
                  {selectedPkg === "base"
                    ? "Select 1 subdomain from the map above"
                    : "Select one or more subdomains from the map above"}
                </div>
              )}
          </>
        )}
      </div>

      <div className="pp-footer">
        All payments processed securely via Stripe &nbsp;&nbsp; Vendor plans
        cancel anytime &nbsp;&nbsp; Candidate visibility packages are one-time
        purchases
      </div>
    </div>
  );
};

export default PricingPage;
