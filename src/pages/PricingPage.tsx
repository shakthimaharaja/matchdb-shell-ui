import React, { useEffect, useState } from "react";
import { useAppSelector } from "../store";
import {
  useGetVendorPlansQuery,
  useGetCandidatePackagesQuery,
  useCreateVendorCheckoutMutation,
  useCreateCandidateCheckoutMutation,
  useOpenBillingPortalMutation,
  useRefreshUserDataMutation,
  type VendorPlan,
} from "../api/shellApi";
import {
  CONTRACT_SUBDOMAINS,
  FULLTIME_SUBDOMAINS,
  DOMAIN_LABELS,
  SUB_LABELS,
  TAB_INDEX,
  planBadge,
  MARKETER_TIERS,
  COMBINED_TIERS,
  type PricingPageProps,
  type ConfirmDialogProps,
} from "./pricingPageHelpers";
import "./PricingPage.css";

//  Confirm Dialog (W97-native)

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
    <dialog open className="pp-confirm-overlay" data-testid="confirm-dialog">
      <div className="rm-backdrop" role="none" onClick={onClose} />
      <div className="pp-confirm-window" data-testid="confirm-dialog-window">
        <div
          className="pp-confirm-titlebar"
          data-testid="confirm-dialog-titlebar"
        >
          <span>{icon}</span>
          <span className="pp-confirm-titlebar-title">{title}</span>
          <button
            className="pp-confirm-close"
            onClick={onClose}
            title="Close"
            data-testid="confirm-dialog-close"
          >
            x
          </button>
        </div>

        <div className="pp-confirm-body" data-testid="confirm-dialog-body">
          <div
            style={{
              fontSize: 10,
              color: "var(--w97-text-secondary)",
              marginBottom: -2,
            }}
          >
            {subtitle}
          </div>

          <div className="pp-confirm-card" data-testid="confirm-dialog-card">
            <div className="pp-confirm-card-title">{cardTitle}</div>
            <div className="pp-confirm-card-name">{cardName}</div>
            <div
              className="pp-confirm-card-price"
              data-testid="confirm-dialog-price"
            >
              ${price}{" "}
              <span className="pp-confirm-card-price-note">{priceNote}</span>
            </div>

            {features && features.length > 0 && (
              <>
                <hr className="pp-confirm-card-divider" />
                <ul
                  className="pp-confirm-feature-list"
                  data-testid="confirm-dialog-features"
                >
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

          <div
            className="pp-confirm-notice"
            data-testid="confirm-dialog-notice"
          >
            {notice}
          </div>
        </div>

        <div className="pp-confirm-footer" data-testid="confirm-dialog-footer">
          <button
            className="pp-btn"
            onClick={onClose}
            disabled={loading}
            data-testid="confirm-dialog-cancel"
          >
            Cancel
          </button>
          <button
            className="pp-btn pp-btn-primary pp-btn-wide"
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-dialog-confirm"
          >
            {loading ? "Redirecting..." : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};

//  Main Component

const PricingPage: React.FC<PricingPageProps> = ({
  initialTab,
  onClose: _onClose,
}) => {
  const { token, user } = useAppSelector((s) => s.auth);

  // ─── RTK Query hooks ───────────────────────────────────────────────────────
  const { data: vendorPlans = [] } = useGetVendorPlansQuery();
  const { data: candidatePkgs = [] } = useGetCandidatePackagesQuery();
  const [createVendorCheckout, { isLoading: vendorCheckoutLoading }] =
    useCreateVendorCheckoutMutation();
  const [createCandidateCheckout, { isLoading: candidateCheckoutLoading }] =
    useCreateCandidateCheckoutMutation();
  const [openBillingPortal, { isLoading: portalLoading }] =
    useOpenBillingPortalMutation();
  const [refreshUserData] = useRefreshUserDataMutation();

  const checkoutLoading =
    vendorCheckoutLoading || candidateCheckoutLoading || portalLoading;

  const isCandidate = user?.user_type === "candidate";
  const isEmployer = user?.user_type === "employer";

  const defaultTab =
    TAB_INDEX[user?.user_type ?? ""] ?? TAB_INDEX[initialTab ?? ""] ?? 0;

  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync active tab when initialTab prop changes (e.g. modal re-opened for different view)
  useEffect(() => {
    if (!user && initialTab) {
      const idx = TAB_INDEX[initialTab];
      if (idx != null) setActiveTab(idx);
    }
  }, [initialTab, user]);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [loadingPkgId, setLoadingPkgId] = useState<string | null>(null);
  const [vendorConfirm, setVendorConfirm] = useState<VendorPlan | null>(null);
  const [candidateConfirm, setCandidateConfirm] = useState<{
    packageId: string;
    label: string;
    price: number;
  } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<
    "contract" | "full_time"
  >("contract");
  const [employerView, setEmployerView] = useState<
    "combined" | "job-posting" | "staffing"
  >("combined");
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Handle Stripe redirect-back query params
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    if (params.get("success") === "true") {
      setMessage({
        type: "success",
        text: "Subscription activated! Your vendor plan has been updated.",
      });
      refreshUserData()
        .unwrap()
        .catch(() => {
          setMessage({
            type: "error",
            text: "Failed to refresh user data. Please reload the page.",
          });
        });
      globalThis.history.replaceState({}, "", globalThis.location.pathname);
    }
    if (params.get("candidate_success") === "true") {
      setMessage({
        type: "success",
        text: "Visibility package purchased! You are now visible to employers in the selected categories.",
      });
      refreshUserData()
        .unwrap()
        .catch(() => {
          setMessage({
            type: "error",
            text: "Failed to refresh user data. Please reload the page.",
          });
        });
      globalThis.history.replaceState({}, "", globalThis.location.pathname);
      setActiveTab(1);
    }
    if (params.get("canceled") === "true") {
      setMessage({
        type: "error",
        text: "Checkout canceled - no changes were made.",
      });
      globalThis.history.replaceState({}, "", globalThis.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  //  Vendor
  const handleVendorConfirm = async () => {
    if (!vendorConfirm || !token) return;
    setLoadingPlanId(vendorConfirm.id);
    try {
      const { url } = await createVendorCheckout({
        planId: vendorConfirm.id,
      }).unwrap();
      globalThis.location.href = url;
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text:
          (err as { data?: { error?: string } }).data?.error ||
          "Checkout failed. Please try again.",
      });
      setLoadingPlanId(null);
    }
  };

  const handlePortal = async () => {
    if (!token) return;
    try {
      const { url } = await openBillingPortal().unwrap();
      globalThis.location.href = url;
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text:
          (err as { data?: { error?: string } }).data?.error ||
          "Could not open billing portal.",
      });
    }
  };

  const handleMarketerSubscribe = async () => {
    if (!token) {
      setMessage({ type: "error", text: "Please sign in to subscribe." });
      return;
    }
    // Use the vendor checkout for marketer/staffing plans
    // The employer sees both plan types on the same page
    setMessage({
      type: "info",
      text: "Please select a Job Posting plan above to subscribe.",
    });
  };

  //  Candidate helpers
  const getOwnedSubs = (domain: string): string[] =>
    user?.membership_config?.[domain] || [];

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
      setSelectedSubs([subValue]);
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
  let effectivePrice = 0;
  if (selectedPkg === "subdomain_addon")
    effectivePrice = (selectedPkgData?.price || 2) * selectedSubs.length;
  else if (selectedPkg) effectivePrice = selectedPkgData?.price || 0;

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
    try {
      const args: {
        packageId: string;
        domain?: string;
        subdomains?: string[];
      } = { packageId };
      if (packageId !== "full_bundle") {
        args.domain = selectedDomain;
        if (packageId === "base" && selectedSubs.length > 0)
          args.subdomains = [selectedSubs[0]];
        else if (packageId === "subdomain_addon")
          args.subdomains = selectedSubs;
      }
      const { url } = await createCandidateCheckout(args).unwrap();
      globalThis.location.href = url;
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text:
          (err as { data?: { error?: string } }).data?.error ||
          "Checkout failed. Please try again.",
      });
      setLoadingPkgId(null);
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
              {(() => {
                const domainSubs =
                  selectedDomain === "contract"
                    ? CONTRACT_SUBDOMAINS
                    : FULLTIME_SUBDOMAINS;
                const values =
                  selectedSubs.length > 0
                    ? selectedSubs
                    : domainSubs.map((s) => s.value);
                return values.map((s) => (
                  <span key={s} className="pp-confirm-sub-pill">
                    {SUB_LABELS[s] || s.toUpperCase()}
                  </span>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  function renderPlanAction(plan: VendorPlan, isCurrent: boolean) {
    if (isCurrent) {
      return (
        <span
          className="pp-plan-current-badge"
          data-testid={`vendor-plan-current-${plan.id}`}
        >
          CURRENT PLAN
        </span>
      );
    }
    if (plan.price === 0) {
      return (
        <button
          className="pp-btn"
          style={{ width: "100%" }}
          disabled
          data-testid={`vendor-plan-free-btn-${plan.id}`}
        >
          Free Account
        </button>
      );
    }
    return (
      <button
        className="pp-btn pp-btn-primary"
        style={{ width: "100%" }}
        disabled={loadingPlanId === plan.id || checkoutLoading}
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
        data-testid={`vendor-plan-select-btn-${plan.id}`}
      >
        {user?.plan === "free" ? "Get Started" : "Switch Plan"}
      </button>
    );
  }

  function renderVendorTab() {
    if (vendorConfirm) {
      return (
        <div className="pp-inline-confirm" data-testid="vendor-confirm-view">
          <div className="pp-inline-confirm-nav">
            <button
              className="pp-btn"
              onClick={() => {
                setVendorConfirm(null);
                setLoadingPlanId(null);
              }}
              data-testid="vendor-confirm-back-btn"
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

          <div className="pp-confirm-card" data-testid="vendor-confirm-card">
            <div className="pp-confirm-card-title">Employer Plan</div>
            <div className="pp-confirm-card-name">{vendorConfirm.name}</div>
            <div className="pp-confirm-card-price">
              ${vendorConfirm.price}
              <span className="pp-confirm-card-price-note">
                &nbsp;/ {vendorConfirm.interval} &nbsp;&middot;&nbsp; billed
                monthly &nbsp;&middot;&nbsp; cancel anytime
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

          <div
            className="pp-inline-confirm-footer"
            data-testid="vendor-confirm-footer"
          >
            <button
              className="pp-btn pp-btn-primary pp-btn-wide"
              disabled={loadingPlanId === vendorConfirm.id || checkoutLoading}
              onClick={handleVendorConfirm}
              data-testid="vendor-confirm-subscribe-btn"
            >
              {loadingPlanId === vendorConfirm.id || checkoutLoading
                ? "Redirecting..."
                : `Subscribe \u2014 $${vendorConfirm.price}/mo`}
            </button>
          </div>
        </div>
      );
    }
    return (
      <>
        <div className="pp-section-label">
          Employer Subscription Plans - monthly recurring, cancel anytime
        </div>
        <div className="pp-plan-grid" data-testid="vendor-plan-grid">
          {vendorPlans.map((plan) => {
            const isCurrent = user?.plan === plan.id;
            const cardCls = [
              "pp-plan-card",
              plan.highlighted ? "pp-plan-card-highlighted" : "",
              isCurrent ? "pp-plan-card-current" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={plan.id}
                className={cardCls}
                data-testid={`vendor-plan-card-${plan.id}`}
              >
                <div className={`pp-plan-titlebar pp-plan-titlebar-${plan.id}`}>
                  <span style={{ flex: 1 }}>{plan.name}</span>
                  <span
                    className={`pp-plan-badge${
                      plan.highlighted ? " pp-plan-badge-popular" : ""
                    }`}
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
                    className={`pp-plan-features${
                      plan.highlighted ? " pp-plan-features-highlighted" : ""
                    }`}
                  >
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>

                  <div className="pp-plan-action">
                    {renderPlanAction(plan, isCurrent)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  function renderSubTile(
    domain: "contract" | "full_time",
    sub: { value: string; label: string },
    isDomainActive: boolean,
  ) {
    const isOwned = getOwnedSubs(domain).includes(sub.value);
    const active = isSubActive(domain, sub.value);
    const clickable =
      !!selectedPkg &&
      selectedPkg !== "full_bundle" &&
      selectedPkg !== "single_domain_bundle" &&
      isDomainActive &&
      !isOwned;

    return (
      <button
        type="button"
        key={sub.value}
        className={[
          "pp-sub-tile",
          active ? "pp-sub-tile-active" : "",
          isOwned ? "pp-sub-tile-owned" : "",
          !clickable && !isOwned && !active ? "pp-sub-tile-disabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => clickable && handleSubClick(domain, sub.value)}
        style={{
          cursor: clickable ? "pointer" : "default",
        }}
        data-testid={`sub-tile-${domain}-${sub.value}`}
      >
        <span className="pp-sub-tile-label">{sub.label}</span>
        {isOwned && <span className="pp-sub-tile-badge">OWNED</span>}
        {active && !isOwned && (
          <span className="pp-sub-tile-check">&#10003;</span>
        )}
      </button>
    );
  }

  function renderCandidateTab() {
    return (
      <>
        {/* Current visibility */}
        {user?.has_purchased_visibility && user?.membership_config && (
          <div
            className="pp-visibility-panel"
            data-testid="candidate-visibility-panel"
          >
            <div className="pp-visibility-title">Your Current Visibility</div>
            {Object.entries(user.membership_config).map(([domain, subs]) => (
              <div key={domain}>
                <div className="pp-visibility-domain">
                  {domain.replace("_", " ")}
                </div>
                <div className="pp-visibility-subs">
                  {subs.map((s) => (
                    <span key={s} className="pp-visibility-sub">
                      {s.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Select a Package */}
        <div className="pp-step-header">Step 1 &mdash; Choose a Package</div>

        <div className="pp-pkg-grid" data-testid="candidate-pkg-grid">
          {candidatePkgs.map((pkg) => {
            const isActive = selectedPkg === pkg.id;
            return (
              <button
                type="button"
                key={pkg.id}
                className={[
                  "pp-pkg-card",
                  pkg.id === "full_bundle" ? "pp-pkg-card-best" : "",
                  isActive ? "pp-pkg-card-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handlePkgSelect(pkg.id)}
                data-testid={`candidate-pkg-card-${pkg.id}`}
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
              </button>
            );
          })}
        </div>

        {/* Step 2: Domain / Subdomain Map */}
        <div className="pp-step-header">
          Step 2 &mdash; Select Coverage
          {!selectedPkg && (
            <span className="pp-step-hint">Choose a package above first</span>
          )}
        </div>

        <div
          className={`pp-domain-map${
            selectedPkg ? "" : " pp-domain-map-disabled"
          }`}
          data-testid="candidate-domain-map"
        >
          {(["contract", "full_time"] as const).map((domain) => {
            const subs =
              domain === "contract" ? CONTRACT_SUBDOMAINS : FULLTIME_SUBDOMAINS;
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
                data-testid={`domain-panel-${domain}`}
              >
                <button
                  type="button"
                  className="pp-domain-panel-header"
                  onClick={() => isDomainClickable && handleDomainClick(domain)}
                  style={{
                    cursor: isDomainClickable ? "pointer" : "default",
                  }}
                  data-testid={`domain-panel-header-${domain}`}
                >
                  <span>{DOMAIN_LABELS[domain]}</span>
                  {isDomainActive && (
                    <span className="pp-domain-check">&#10003;</span>
                  )}
                </button>
                <div className="pp-domain-panel-body">
                  {subs.map((sub) =>
                    renderSubTile(domain, sub, isDomainActive),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Purchase Bar */}
        {selectedPkg && canPurchase() && (
          <div className="pp-purchase-bar" data-testid="candidate-purchase-bar">
            <div
              className="pp-purchase-info"
              data-testid="candidate-purchase-info"
            >
              <span className="pp-purchase-pkg">{selectedPkgData?.name}</span>
              <span
                className="pp-purchase-price"
                data-testid="candidate-purchase-price"
              >
                ${effectivePrice}
              </span>
              <span className="pp-purchase-note">one-time</span>
            </div>
            <button
              className="pp-btn pp-btn-primary pp-btn-wide"
              style={{ height: 28, fontSize: 12 }}
              disabled={loadingPkgId !== null || checkoutLoading}
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
              data-testid="candidate-purchase-btn"
            >
              {loadingPkgId || checkoutLoading
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
              data-testid="candidate-selection-hint"
            >
              {selectedPkg === "base"
                ? "Select 1 subdomain from the map above"
                : "Select one or more subdomains from the map above"}
            </div>
          )}
      </>
    );
  }

  function renderMarketerTab() {
    const titlebarColor: Record<string, string> = {
      "1": "free",
      "2": "pro",
      "3": "basic",
      "4": "pro_plus",
    };

    function marketerBtnLabel(): string {
      if (checkoutLoading) return "Please wait...";
      if (!user || user.plan === "free") return "Get Started";
      return "Switch Plan";
    }

    return (
      <div data-testid="marketer-section">
        <div className="pp-section-label">
          Staffing Plans - monthly recurring, cancel anytime{" "}
          <span style={{ fontSize: 10, marginLeft: 8, color: "#666" }}>
            Pay annually &amp; get 1 month free (save 8.3%)
          </span>
        </div>
        <div className="pp-plan-grid" data-testid="marketer-plan-grid">
          {MARKETER_TIERS.map((tier) => {
            const isCurrent = isEmployer && user?.plan === tier.id;
            const color = tier.highlighted
              ? "pro"
              : titlebarColor[tier.testIdSuffix] || "basic";
            const cardCls = [
              "pp-plan-card",
              tier.highlighted ? "pp-plan-card-highlighted" : "",
              isCurrent ? "pp-plan-card-current" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={tier.testIdSuffix}
                className={cardCls}
                data-testid={`marketer-tier-${tier.testIdSuffix}-card`}
              >
                <div className={`pp-plan-titlebar pp-plan-titlebar-${color}`}>
                  <span style={{ flex: 1 }}>{tier.name}</span>
                  <span
                    className={`pp-plan-badge${
                      tier.highlighted ? " pp-plan-badge-popular" : ""
                    }`}
                  >
                    {tier.badge}
                  </span>
                </div>

                <div className="pp-plan-body">
                  <div className="pp-plan-candidates-label">
                    {tier.candidates}
                  </div>

                  <span className="pp-plan-price">
                    ${tier.price}
                    <span className="pp-plan-price-interval"> /month</span>
                  </span>

                  <div className="pp-marketer-annual">
                    or ${tier.annualPrice}/yr
                    <span className="pp-marketer-annual-save">
                      Save ${tier.annualSavings} ({tier.savingsPct})
                    </span>
                  </div>

                  <hr className="pp-plan-divider" />

                  <ul
                    className={`pp-plan-features${
                      tier.highlighted ? " pp-plan-features-highlighted" : ""
                    }`}
                  >
                    {tier.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>

                  <div className="pp-plan-action">
                    {isCurrent ? (
                      <>
                        <span
                          className="pp-plan-badge"
                          style={{
                            background: "#2e7d32",
                            color: "#fff",
                            display: "inline-block",
                            marginBottom: 6,
                          }}
                        >
                          Active
                        </span>
                        <button
                          className="pp-btn pp-btn-primary pp-btn-wide"
                          onClick={handlePortal}
                          disabled={checkoutLoading}
                          data-testid="marketer-manage-billing-btn"
                        >
                          Manage Billing
                        </button>
                      </>
                    ) : (
                      <button
                        className="pp-btn pp-btn-primary pp-btn-wide"
                        disabled={checkoutLoading}
                        onClick={handleMarketerSubscribe}
                        data-testid={`marketer-tier-${tier.testIdSuffix}-subscribe-btn`}
                      >
                        {marketerBtnLabel()}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderCombinedCards() {
    const titlebarColor: Record<string, string> = {
      "1": "free",
      "2": "pro",
      "3": "basic",
      "4": "pro_plus",
    };

    return (
      <div className="pp-plan-grid" data-testid="combined-plan-grid">
        {COMBINED_TIERS.map((tier) => {
          const color = tier.highlighted
            ? "pro"
            : titlebarColor[tier.testIdSuffix] || "basic";
          const cardCls = [
            "pp-plan-card",
            tier.highlighted ? "pp-plan-card-highlighted" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={tier.id}
              className={cardCls}
              data-testid={`combined-tier-${tier.testIdSuffix}-card`}
            >
              <div className={`pp-plan-titlebar pp-plan-titlebar-${color}`}>
                <span style={{ flex: 1 }}>{tier.name}</span>
                <span
                  className={`pp-plan-badge${
                    tier.highlighted ? " pp-plan-badge-popular" : ""
                  }`}
                >
                  {tier.badge}
                </span>
              </div>

              <div className="pp-plan-body">
                <div className="pp-combined-limits">
                  <span className="pp-combined-limit-chip pp-combined-limit-chip-job">
                    {tier.jobPostings}
                  </span>
                  <span className="pp-combined-limit-chip pp-combined-limit-chip-staff">
                    {tier.candidates}
                  </span>
                </div>

                <span className="pp-plan-price">
                  ${tier.monthlyPrice}
                  <span className="pp-plan-price-interval"> /month</span>
                </span>

                <div className="pp-marketer-annual">
                  or ${tier.annualPrice}/yr
                  <span className="pp-marketer-annual-save">
                    Save ${tier.annualSavings} ({tier.savingsPct})
                  </span>
                </div>

                <hr className="pp-plan-divider" />

                <ul
                  className={`pp-plan-features${
                    tier.highlighted ? " pp-plan-features-highlighted" : ""
                  }`}
                >
                  {tier.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>

                <div className="pp-plan-action">
                  <button
                    className="pp-btn pp-btn-primary pp-btn-wide"
                    disabled={checkoutLoading}
                    onClick={handleMarketerSubscribe}
                    data-testid={`combined-tier-${tier.testIdSuffix}-subscribe-btn`}
                  >
                    {checkoutLoading ? "Please wait..." : "Get Started"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderEmployerTab() {
    return (
      <div data-testid="employer-section">
        <div className="pp-section-label" style={{ marginBottom: 4 }}>
          Employer Plans &mdash; combined Vendor + Staffing access
        </div>

        {/* ── View toggle ── */}
        <div className="pp-employer-toggle" data-testid="employer-view-toggle">
          <button
            className={`pp-toggle-btn${
              employerView === "combined" ? " pp-toggle-btn-active" : ""
            }`}
            onClick={() => setEmployerView("combined")}
            data-testid="employer-toggle-combined"
          >
            Combined Plans
          </button>
          <button
            className={`pp-toggle-btn${
              employerView === "job-posting" ? " pp-toggle-btn-active" : ""
            }`}
            onClick={() => setEmployerView("job-posting")}
            data-testid="employer-toggle-job-posting"
          >
            Job Posting Only
          </button>
          <button
            className={`pp-toggle-btn${
              employerView === "staffing" ? " pp-toggle-btn-active" : ""
            }`}
            onClick={() => setEmployerView("staffing")}
            data-testid="employer-toggle-staffing"
          >
            Staffing Only
          </button>
        </div>

        {/* ── Combined plans ── */}
        {employerView === "combined" && (
          <>
            <div
              className="pp-section-label"
              style={{ fontSize: 11, marginTop: 8, marginBottom: 4 }}
            >
              Employer Subscription Plans &mdash; Job Posting + Staffing{" "}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: "#666",
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                Monthly recurring, cancel anytime &middot; Pay annually &amp;
                save 8.3%
              </span>
            </div>
            {renderCombinedCards()}
          </>
        )}

        {/* ── Job Posting Only plans ── */}
        {employerView === "job-posting" && (
          <>
            <div
              className="pp-section-label"
              style={{ fontSize: 11, marginTop: 8, marginBottom: 4 }}
            >
              Job Posting Plans &mdash; Subscription only
            </div>
            {renderVendorTab()}
          </>
        )}

        {/* ── Staffing Only plans ── */}
        {employerView === "staffing" && (
          <>
            <div
              className="pp-section-label"
              style={{ fontSize: 11, marginTop: 8, marginBottom: 4 }}
            >
              Staffing / Candidate Management Plans &mdash; Subscription only{" "}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: "#666",
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                Pay annually &amp; save 8.3%
              </span>
            </div>
            {renderMarketerTab()}
          </>
        )}
      </div>
    );
  }

  //  Render
  return (
    <div className="pp-root" data-testid="pricing-page">
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
        loading={
          loadingPkgId === candidateConfirm?.packageId || checkoutLoading
        }
        onConfirm={handleCandidateConfirm}
        onClose={() => {
          setCandidateConfirm(null);
          setLoadingPkgId(null);
        }}
      />

      <div className="pp-statusbar" data-testid="pricing-statusbar">
        <span>Plans &amp; Pricing</span>
        <span className="pp-statusbar-sep">|</span>
        {user ? (
          <>
            <span
              className="pp-statusbar-plan"
              data-testid="statusbar-plan-label"
            >
              {user.user_type === "employer" ? "Employer" : "Candidate"} -{" "}
              {planBadge(user.plan ?? "free")}
            </span>
            {user.plan && user.plan !== "free" && (
              <>
                <span className="pp-statusbar-sep">|</span>
                <button
                  className="pp-btn"
                  style={{ height: 18, fontSize: 10 }}
                  onClick={handlePortal}
                  disabled={checkoutLoading}
                  data-testid="statusbar-manage-billing-btn"
                >
                  Manage Billing
                </button>
              </>
            )}
          </>
        ) : (
          <span data-testid="statusbar-sign-in-hint">Sign in to subscribe</span>
        )}
      </div>

      {/* Only show tabs when both sections are accessible (unauthenticated) */}
      {!user || (!isCandidate && !isEmployer) ? (
        <div className="pp-tabs" data-testid="pricing-tabs">
          <button
            className={`pp-tab${activeTab === 0 ? " pp-tab-active" : ""}`}
            onClick={() => setActiveTab(0)}
            data-testid="tab-employer"
          >
            For Employers
          </button>
          <button
            className={`pp-tab${activeTab === 1 ? " pp-tab-active" : ""}`}
            onClick={() => setActiveTab(1)}
            data-testid="tab-candidate"
          >
            For Candidates
          </button>
        </div>
      ) : (
        <div className="pp-tabs" data-testid="pricing-tabs">
          {isCandidate && (
            <button
              className="pp-tab pp-tab-active"
              data-testid="tab-candidate"
            >
              For Candidates
            </button>
          )}
          {isEmployer && (
            <button className="pp-tab pp-tab-active" data-testid="tab-employer">
              For Employers
            </button>
          )}
        </div>
      )}

      <div className="pp-body" data-testid="pricing-body">
        {message && (
          <div
            className={`pp-alert pp-alert-${message.type}`}
            data-testid="pricing-alert"
            data-alert-type={message.type}
          >
            {message.text}
            <button
              className="pp-alert-close"
              onClick={() => setMessage(null)}
              data-testid="pricing-alert-close"
            >
              x
            </button>
          </div>
        )}

        {(activeTab === 0 || isEmployer) && !isCandidate && renderEmployerTab()}

        {(activeTab === 1 || isCandidate) &&
          !isEmployer &&
          renderCandidateTab()}
      </div>

      <div className="pp-footer" data-testid="pricing-footer">
        All payments processed securely via Stripe &nbsp;&nbsp; Vendor plans
        cancel anytime &nbsp;&nbsp; Candidate visibility packages are one-time
        purchases
      </div>
    </div>
  );
};

export default PricingPage;
