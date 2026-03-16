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
  vendor: 0,
  candidate: 1,
  marketer: 2,
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
  types: string;
  name: string;
  price: number;
  featurePrefix: string;
  badgeStyle?: React.CSSProperties;
  testIdSuffix: string;
}

export const MARKETER_TIERS: MarketerTier[] = [
  {
    types: "1 JOB TYPE",
    name: "Starter",
    price: 100,
    featurePrefix: "Pick 1 of C2C, W2, C2H, Full Time",
    testIdSuffix: "1",
  },
  {
    types: "ANY 2 TYPES",
    name: "Growth",
    price: 180,
    featurePrefix: "Pick any 2 of C2C, W2, C2H, Full Time",
    testIdSuffix: "2",
  },
  {
    types: "ANY 3 TYPES",
    name: "Professional",
    price: 250,
    featurePrefix: "Pick any 3 of C2C, W2, C2H, Full Time",
    testIdSuffix: "3",
  },
  {
    types: "ALL TYPES",
    name: "Enterprise",
    price: 499,
    featurePrefix: "Full access: C2C, W2, C2H, Full Time",
    badgeStyle: { background: "#1565c0" },
    testIdSuffix: "4",
  },
];

export const MARKETER_COMMON_FEATURES = [
  "Job openings + candidate profiles",
  "Vendor email & phone",
  "Download CSV / Excel / Resume PDF",
  "0–2 concurrent sessions included",
];

export interface PricingPageProps {
  initialTab?: "vendor" | "candidate" | "marketer";
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
