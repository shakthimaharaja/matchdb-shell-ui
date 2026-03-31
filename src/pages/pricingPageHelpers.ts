/* ------------------------------------------------------------------ *
 *  PricingPage — extracted types, constants & pure helpers             *
 * ------------------------------------------------------------------ */

export const CONTRACT_SUBDOMAINS = [
  { value: "c2c", label: "C2C (Corp-to-Corp)" },
  { value: "c2h", label: "C2H (Contract-to-Hire)" },
  { value: "w2", label: "W2" },
  { value: "1099", label: "1099 / Independent" },
];

export const FULLTIME_SUBDOMAINS = [
  { value: "c2h", label: "C2H (Contract-to-Hire)" },
  { value: "w2", label: "W2" },
  { value: "direct_hire", label: "Direct Hire" },
  { value: "salary", label: "Salaried" },
];

export const DOMAIN_LABELS: Record<string, string> = {
  contract: "Contract",
  full_time: "Full Time",
};

export const SUB_LABELS: Record<string, string> = {
  c2c: "C2C",
  c2h: "C2H",
  w2: "W2",
  "1099": "1099",
  direct_hire: "Direct Hire",
  salary: "Salaried",
};

export const TAB_INDEX: Record<string, number> = {
  employer: 0,
  candidate: 1,
};

export function planBadge(id: string) {
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

export interface MarketerTier {
  id: string;
  name: string;
  candidates: string;
  price: number;
  annualPrice: number;
  annualSavings: number;
  savingsPct: string;
  features: string[];
  highlighted?: boolean;
  badge: string;
  testIdSuffix: string;
}

export const MARKETER_TIERS: MarketerTier[] = [
  {
    id: "marketer_starter",
    name: "Starter",
    candidates: "0–10 Candidates",
    price: 39,
    annualPrice: 429,
    annualSavings: 39,
    savingsPct: "8.3%",
    features: [
      "Up to 10 candidate profiles",
      "Browse job openings",
      "Basic candidate matching",
      "Email support",
    ],
    badge: "STARTER",
    testIdSuffix: "1",
  },
  {
    id: "marketer_growth",
    name: "Growth",
    candidates: "0–50 Candidates",
    price: 79,
    annualPrice: 869,
    annualSavings: 79,
    savingsPct: "8.3%",
    features: [
      "Up to 50 candidate profiles",
      "Priority candidate matching",
      "Advanced analytics & reports",
      "Email support",
    ],
    highlighted: true,
    badge: "POPULAR",
    testIdSuffix: "2",
  },
  {
    id: "marketer_pro",
    name: "Professional",
    candidates: "0–500 Candidates",
    price: 99,
    annualPrice: 1089,
    annualSavings: 99,
    savingsPct: "8.3%",
    features: [
      "Up to 500 candidate profiles",
      "Priority candidate matching",
      "Dedicated account manager",
      "API access & custom integrations",
    ],
    badge: "PRO",
    testIdSuffix: "3",
  },
  {
    id: "marketer_enterprise",
    name: "Enterprise",
    candidates: "500+ Candidates",
    price: 499,
    annualPrice: 5489,
    annualSavings: 499,
    savingsPct: "8.3%",
    features: [
      "Unlimited candidate profiles",
      "Dedicated account manager",
      "API access & custom integrations",
      "Priority support",
    ],
    badge: "ENTERPRISE",
    testIdSuffix: "4",
  },
];

export const MARKETER_COMMON_FEATURES = [
  "Job openings + candidate profiles",
  "Vendor email & phone",
  "Download CSV / Excel / Resume PDF",
  "0–2 concurrent sessions included",
];

/* ── Combined (Job Posting + Staffing) tiers ──────────────────────────────── */

export interface CombinedTier {
  id: string;
  name: string;
  badge: string;
  jobPostings: string;
  candidates: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  savingsPct: string;
  features: string[];
  highlighted?: boolean;
  testIdSuffix: string;
}

export const COMBINED_TIERS: CombinedTier[] = [
  {
    id: "combined_starter",
    name: "Starter",
    badge: "STARTER",
    jobPostings: "5 active job postings",
    candidates: "Up to 10 candidates",
    monthlyPrice: 49,
    annualPrice: 539,
    annualSavings: 49,
    savingsPct: "8.3%",
    features: [
      "5 active job postings",
      "Up to 10 candidate profiles",
      "Candidate matching & shortlisting",
      "Basic analytics dashboard",
      "Email support",
    ],
    testIdSuffix: "1",
  },
  {
    id: "combined_growth",
    name: "Growth",
    badge: "POPULAR",
    jobPostings: "10 active job postings",
    candidates: "Up to 50 candidates",
    monthlyPrice: 99,
    annualPrice: 1089,
    annualSavings: 99,
    savingsPct: "8.3%",
    features: [
      "10 active job postings",
      "Up to 50 candidate profiles",
      "Priority candidate matching",
      "Advanced analytics & reports",
      "25 Poke messages/month",
      "Email support",
    ],
    highlighted: true,
    testIdSuffix: "2",
  },
  {
    id: "combined_pro",
    name: "Professional",
    badge: "PRO",
    jobPostings: "20 active job postings",
    candidates: "Up to 500 candidates",
    monthlyPrice: 129,
    annualPrice: 1419,
    annualSavings: 129,
    savingsPct: "8.3%",
    features: [
      "20 active job postings",
      "Up to 500 candidate profiles",
      "Priority candidate matching",
      "50 Poke messages/month",
      "Dedicated account manager",
      "API access & custom integrations",
    ],
    testIdSuffix: "3",
  },
  {
    id: "combined_enterprise",
    name: "Enterprise",
    badge: "ENTERPRISE",
    jobPostings: "Unlimited job postings",
    candidates: "Unlimited candidates",
    monthlyPrice: 499,
    annualPrice: 5489,
    annualSavings: 499,
    savingsPct: "8.3%",
    features: [
      "Unlimited job postings",
      "Unlimited candidate profiles",
      "Unlimited Poke messages",
      "Dedicated account manager",
      "API access & custom integrations",
      "Priority support",
    ],
    testIdSuffix: "4",
  },
];

export interface PricingPageProps {
  initialTab?: "candidate" | "employer";
  onClose?: () => void;
}

export interface ConfirmDialogProps {
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
