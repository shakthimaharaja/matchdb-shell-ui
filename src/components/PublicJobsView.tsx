/**
 * PublicJobsView — rendered in Shell-UI when user is NOT logged in.
 *
 * Three views selected by URL path:
 *   /jobs            → TwinView  : jobs ⋈ candidate_profiles
 *   /jobs/candidate  → CandView  : job openings sorted by rate
 *   /jobs/vendor     → VendorView: candidate profiles sorted by exp
 *
 * Rules enforced:
 *  • No pagination (pre-login rule)
 *  • No scrolling inside table (overflow: hidden via CSS)
 *  • Always renders exactly 25 entries per table
 *  • Polls /api/jobs every 30 seconds; changed rows flash gold for 2.5 s
 *
 * Design: uses .matchdb-panel / .matchdb-table style matching the
 * authenticated MatchDataTable component in matchdb-jobs-ui.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import "./PublicJobsView.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PublicJob {
  id: string;
  title: string;
  location: string;
  job_type: string;
  work_mode: string;
  salary_min: number | null;
  salary_max: number | null;
  pay_per_hour: number | null;
  skills_required: string[];
  experience_required: number;
  recruiter_name: string;
  vendor_email: string;
  created_at: string;
}

interface PublicProfile {
  id: string;
  name: string;
  current_role: string;
  current_company: string;
  preferred_job_type: string;
  experience_years: number;
  expected_hourly_rate: number | null;
  skills: string[];
  location: string;
}

// ── Static mock data (25 jobs + 25 profiles — fallback when API unavailable) ──

const MOCK_JOBS: PublicJob[] = [
  {
    id: "m01",
    title: "Senior React Developer",
    location: "Austin, TX",
    job_type: "full_time",
    work_mode: "hybrid",
    salary_min: 110000,
    salary_max: 140000,
    pay_per_hour: 65,
    skills_required: ["React", "TypeScript", "Redux", "Webpack", "Node.js"],
    experience_required: 4,
    recruiter_name: "Dan Brown",
    vendor_email: "dan@techcorp.com",
    created_at: "",
  },
  {
    id: "m02",
    title: "Blockchain / Solidity Developer",
    location: "Remote",
    job_type: "contract",
    work_mode: "remote",
    salary_min: 140000,
    salary_max: 190000,
    pay_per_hour: 100,
    skills_required: ["Solidity", "Ethereum", "Hardhat", "Web3.js", "DeFi"],
    experience_required: 3,
    recruiter_name: "Quinn Adams",
    vendor_email: "quinn@staffplus.com",
    created_at: "",
  },
  {
    id: "m03",
    title: "Machine Learning Engineer",
    location: "San Francisco, CA",
    job_type: "full_time",
    work_mode: "onsite",
    salary_min: 140000,
    salary_max: 180000,
    pay_per_hour: 95,
    skills_required: ["Python", "PyTorch", "NLP", "MLflow", "SQL"],
    experience_required: 4,
    recruiter_name: "Eve Wilson",
    vendor_email: "eve@startup.io",
    created_at: "",
  },
  {
    id: "m04",
    title: "Golang Backend Developer",
    location: "Seattle, WA",
    job_type: "full_time",
    work_mode: "hybrid",
    salary_min: 130000,
    salary_max: 165000,
    pay_per_hour: 80,
    skills_required: ["Go", "gRPC", "PostgreSQL", "Docker", "Redis"],
    experience_required: 4,
    recruiter_name: "Nina Chen",
    vendor_email: "nina@recruit.co",
    created_at: "",
  },
  {
    id: "m05",
    title: "Site Reliability Engineer",
    location: "Denver, CO",
    job_type: "full_time",
    work_mode: "hybrid",
    salary_min: 125000,
    salary_max: 155000,
    pay_per_hour: 78,
    skills_required: [
      "Linux",
      "Prometheus",
      "Grafana",
      "Kubernetes",
      "Terraform",
    ],
    experience_required: 5,
    recruiter_name: "Oscar Nguyen",
    vendor_email: "oscar@hiringlab.com",
    created_at: "",
  },
  {
    id: "m06",
    title: "DevOps / Cloud Engineer",
    location: "New York, NY",
    job_type: "contract",
    work_mode: "remote",
    salary_min: null,
    salary_max: null,
    pay_per_hour: 90,
    skills_required: ["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD"],
    experience_required: 5,
    recruiter_name: "Eve Wilson",
    vendor_email: "eve@startup.io",
    created_at: "",
  },
  {
    id: "m07",
    title: "Java Spring Boot Developer",
    location: "Dallas, TX",
    job_type: "full_time",
    work_mode: "onsite",
    salary_min: 115000,
    salary_max: 145000,
    pay_per_hour: 70,
    skills_required: [
      "Java",
      "Spring Boot",
      "Kafka",
      "Microservices",
      "PostgreSQL",
    ],
    experience_required: 5,
    recruiter_name: "Nina Chen",
    vendor_email: "nina@recruit.co",
    created_at: "",
  },
  {
    id: "m08",
    title: "Full Stack Engineer (Node+React)",
    location: "San Francisco, CA",
    job_type: "full_time",
    work_mode: "hybrid",
    salary_min: 120000,
    salary_max: 160000,
    pay_per_hour: 75,
    skills_required: ["Node.js", "Express", "React", "MongoDB", "TypeScript"],
    experience_required: 3,
    recruiter_name: "Eve Wilson",
    vendor_email: "eve@startup.io",
    created_at: "",
  },
  {
    id: "m09",
    title: "Salesforce Developer",
    location: "Atlanta, GA",
    job_type: "contract",
    work_mode: "remote",
    salary_min: null,
    salary_max: null,
    pay_per_hour: 85,
    skills_required: ["Salesforce", "Apex", "LWC", "SOQL", "REST API"],
    experience_required: 3,
    recruiter_name: "Paula Kim",
    vendor_email: "paula@talentedge.io",
    created_at: "",
  },
  {
    id: "m10",
    title: "Technical Project Manager",
    location: "Remote",
    job_type: "contract",
    work_mode: "remote",
    salary_min: 120000,
    salary_max: 150000,
    pay_per_hour: 75,
    skills_required: [
      "Agile",
      "Scrum",
      "JIRA",
      "Confluence",
      "Risk Management",
    ],
    experience_required: 6,
    recruiter_name: "Paula Kim",
    vendor_email: "paula@talentedge.io",
    created_at: "",
  },
  {
    id: "m11",
    title: "Angular Frontend Developer",
    location: "Remote",
    job_type: "contract",
    work_mode: "remote",
    salary_min: 95000,
    salary_max: 125000,
    pay_per_hour: 58,
    skills_required: ["Angular", "TypeScript", "RxJS", "NgRx", "SCSS"],
    experience_required: 3,
    recruiter_name: "Nina Chen",
    vendor_email: "nina@recruit.co",
    created_at: "",
  },
  {
    id: "m12",
    title: "Data Engineer (Python + Spark)",
    location: "Remote",
    job_type: "contract",
    work_mode: "remote",
    salary_min: 105000,
    salary_max: 135000,
    pay_per_hour: 60,
    skills_required: ["Python", "Spark", "Airflow", "AWS", "SQL"],
    experience_required: 4,
    recruiter_name: "Frank Miller",
    vendor_email: "frank@agency.com",
    created_at: "",
  },
  {
    id: "m13",
    title: "Python Backend Engineer",
    location: "Remote",
    job_type: "contract",
    work_mode: "remote",
    salary_min: 100000,
    salary_max: 130000,
    pay_per_hour: 55,
    skills_required: ["Python", "Django", "PostgreSQL", "REST API", "Docker"],
    experience_required: 3,
    recruiter_name: "Dan Brown",
    vendor_email: "dan@techcorp.com",
    created_at: "",
  },
  {
    id: "m14",
    title: "Cybersecurity Analyst",
    location: "Washington, DC",
    job_type: "full_time",
    work_mode: "hybrid",
    salary_min: 110000,
    salary_max: 140000,
    pay_per_hour: 72,
    skills_required: ["Penetration Testing", "SIEM", "Python", "OWASP"],
    experience_required: 4,
    recruiter_name: "Oscar Nguyen",
    vendor_email: "oscar@hiringlab.com",
    created_at: "",
  },
  {
    id: "m15",
    title: "iOS Developer (Swift)",
    location: "Los Angeles, CA",
    job_type: "contract",
    work_mode: "remote",
    salary_min: null,
    salary_max: null,
    pay_per_hour: 70,
    skills_required: ["Swift", "SwiftUI", "Combine", "Core Data", "Xcode"],
    experience_required: 3,
    recruiter_name: "Oscar Nguyen",
    vendor_email: "oscar@hiringlab.com",
    created_at: "",
  },
  {
    id: "m16",
    title: "UI/UX Designer (Figma + React)",
    location: "Chicago, IL",
    job_type: "contract",
    work_mode: "hybrid",
    salary_min: null,
    salary_max: null,
    pay_per_hour: 55,
    skills_required: ["Figma", "React", "Tailwind CSS", "CSS", "Adobe XD"],
    experience_required: 3,
    recruiter_name: "Frank Miller",
    vendor_email: "frank@agency.com",
    created_at: "",
  },
  {
    id: "m17",
    title: "QA Automation Engineer",
    location: "Austin, TX",
    job_type: "full_time",
    work_mode: "onsite",
    salary_min: 90000,
    salary_max: 115000,
    pay_per_hour: 50,
    skills_required: [
      "Cypress",
      "Playwright",
      "JavaScript",
      "CI/CD",
      "GitHub Actions",
    ],
    experience_required: 2,
    recruiter_name: "Dan Brown",
    vendor_email: "dan@techcorp.com",
    created_at: "",
  },
  {
    id: "m18",
    title: "React Native Mobile Developer",
    location: "Chicago, IL",
    job_type: "contract",
    work_mode: "remote",
    salary_min: 60000,
    salary_max: 80000,
    pay_per_hour: 45,
    skills_required: ["React Native", "TypeScript", "iOS", "Android", "Redux"],
    experience_required: 2,
    recruiter_name: "Frank Miller",
    vendor_email: "frank@agency.com",
    created_at: "",
  },
  {
    id: "m19",
    title: "WordPress / PHP Developer",
    location: "Miami, FL",
    job_type: "contract",
    work_mode: "remote",
    salary_min: 55000,
    salary_max: 75000,
    pay_per_hour: 40,
    skills_required: ["PHP", "WordPress", "MySQL", "WooCommerce", "JavaScript"],
    experience_required: 2,
    recruiter_name: "Quinn Adams",
    vendor_email: "quinn@staffplus.com",
    created_at: "",
  },
  {
    id: "m20",
    title: "Angular Frontend Developer",
    location: "Remote",
    job_type: "full_time",
    work_mode: "remote",
    salary_min: null,
    salary_max: null,
    pay_per_hour: 58,
    skills_required: ["Angular", "TypeScript", "RxJS", "SCSS", "JavaScript"],
    experience_required: 3,
    recruiter_name: "Nina Chen",
    vendor_email: "nina@recruit.co",
    created_at: "",
  },
  {
    id: "m21",
    title: "Cloud Solutions Architect",
    location: "Boston, MA",
    job_type: "full_time",
    work_mode: "hybrid",
    salary_min: 155000,
    salary_max: 200000,
    pay_per_hour: 105,
    skills_required: ["AWS", "Azure", "GCP", "Terraform", "Microservices"],
    experience_required: 8,
    recruiter_name: "Quinn Adams",
    vendor_email: "quinn@staffplus.com",
    created_at: "",
  },
  {
    id: "m22",
    title: "Data Scientist (NLP)",
    location: "Remote",
    job_type: "full_time",
    work_mode: "remote",
    salary_min: 130000,
    salary_max: 170000,
    pay_per_hour: 88,
    skills_required: ["Python", "NLP", "BERT", "spaCy", "SQL"],
    experience_required: 4,
    recruiter_name: "Eve Wilson",
    vendor_email: "eve@startup.io",
    created_at: "",
  },
  {
    id: "m23",
    title: "Kubernetes Platform Engineer",
    location: "Austin, TX",
    job_type: "full_time",
    work_mode: "hybrid",
    salary_min: 140000,
    salary_max: 175000,
    pay_per_hour: 92,
    skills_required: ["Kubernetes", "Helm", "ArgoCD", "Go", "Prometheus"],
    experience_required: 5,
    recruiter_name: "Oscar Nguyen",
    vendor_email: "oscar@hiringlab.com",
    created_at: "",
  },
  {
    id: "m24",
    title: "Backend Engineer (Rust)",
    location: "Remote",
    job_type: "contract",
    work_mode: "remote",
    salary_min: null,
    salary_max: null,
    pay_per_hour: 97,
    skills_required: ["Rust", "Tokio", "gRPC", "PostgreSQL", "Docker"],
    experience_required: 4,
    recruiter_name: "Frank Miller",
    vendor_email: "frank@agency.com",
    created_at: "",
  },
  {
    id: "m25",
    title: "Product Manager — Fintech",
    location: "New York, NY",
    job_type: "full_time",
    work_mode: "onsite",
    salary_min: 135000,
    salary_max: 165000,
    pay_per_hour: 82,
    skills_required: ["Product Strategy", "SQL", "JIRA", "Fintech", "Agile"],
    experience_required: 6,
    recruiter_name: "Paula Kim",
    vendor_email: "paula@talentedge.io",
    created_at: "",
  },
];

const MOCK_PROFILES: PublicProfile[] = [
  {
    id: "p01",
    name: "Irene Garcia",
    current_role: "DevOps Engineer",
    current_company: "CloudScale",
    preferred_job_type: "full_time",
    experience_years: 7,
    expected_hourly_rate: 80,
    skills: [
      "AWS",
      "Kubernetes",
      "Docker",
      "Terraform",
      "CI/CD",
      "Linux",
      "Prometheus",
    ],
    location: "Denver, CO",
  },
  {
    id: "p02",
    name: "Karen White",
    current_role: "ML Engineer",
    current_company: "AIFirst Labs",
    preferred_job_type: "full_time",
    experience_years: 5,
    expected_hourly_rate: 90,
    skills: [
      "Python",
      "PyTorch",
      "TensorFlow",
      "NLP",
      "MLflow",
      "SQL",
      "Scikit-learn",
    ],
    location: "San Francisco, CA",
  },
  {
    id: "p03",
    name: "Carol Davis",
    current_role: "Full Stack Developer",
    current_company: "DevAgency",
    preferred_job_type: "contract",
    experience_years: 6,
    expected_hourly_rate: 70,
    skills: ["Node.js", "React", "MongoDB", "TypeScript", "AWS", "Express"],
    location: "San Francisco, CA",
  },
  {
    id: "p04",
    name: "Alice Johnson",
    current_role: "Frontend Engineer",
    current_company: "StartupX",
    preferred_job_type: "full_time",
    experience_years: 5,
    expected_hourly_rate: 60,
    skills: ["React", "TypeScript", "Redux", "Node.js", "CSS", "Webpack"],
    location: "Austin, TX",
  },
  {
    id: "p05",
    name: "Jack Thompson",
    current_role: "Java Developer",
    current_company: "EnterpriseSoft",
    preferred_job_type: "full_time",
    experience_years: 5,
    expected_hourly_rate: 62,
    skills: [
      "Java",
      "Spring Boot",
      "Kafka",
      "Microservices",
      "PostgreSQL",
      "Docker",
    ],
    location: "Dallas, TX",
  },
  {
    id: "p06",
    name: "Mia Robinson",
    current_role: "Blockchain Developer",
    current_company: "CryptoVentures",
    preferred_job_type: "contract",
    experience_years: 4,
    expected_hourly_rate: 95,
    skills: [
      "Solidity",
      "Ethereum",
      "Hardhat",
      "Web3.js",
      "React",
      "TypeScript",
    ],
    location: "Remote",
  },
  {
    id: "p07",
    name: "Grace Lee",
    current_role: "Data Engineer",
    current_company: "DataViz Inc.",
    preferred_job_type: "full_time",
    experience_years: 4,
    expected_hourly_rate: 65,
    skills: ["Python", "Spark", "Airflow", "SQL", "AWS", "Kafka"],
    location: "Seattle, WA",
  },
  {
    id: "p08",
    name: "Hank Patel",
    current_role: "Mobile Developer",
    current_company: "MobileLab",
    preferred_job_type: "contract",
    experience_years: 3,
    expected_hourly_rate: 55,
    skills: [
      "React Native",
      "TypeScript",
      "Swift",
      "Android",
      "Redux",
      "Firebase",
    ],
    location: "Chicago, IL",
  },
  {
    id: "p09",
    name: "Bob Smith",
    current_role: "Python Developer",
    current_company: "FreelanceOps",
    preferred_job_type: "contract",
    experience_years: 3,
    expected_hourly_rate: 50,
    skills: ["Python", "Django", "REST API", "PostgreSQL", "Docker", "Redis"],
    location: "Remote",
  },
  {
    id: "p10",
    name: "Leo Martinez",
    current_role: "Frontend Developer",
    current_company: "WebWorks",
    preferred_job_type: "contract",
    experience_years: 2,
    expected_hourly_rate: 45,
    skills: ["Angular", "TypeScript", "RxJS", "SCSS", "JavaScript", "HTML"],
    location: "Remote",
  },
  {
    id: "p11",
    name: "Priya Sharma",
    current_role: "Cloud Architect",
    current_company: "InfraCloud",
    preferred_job_type: "full_time",
    experience_years: 9,
    expected_hourly_rate: 110,
    skills: ["AWS", "Azure", "Terraform", "Kubernetes", "Go", "Security"],
    location: "Boston, MA",
  },
  {
    id: "p12",
    name: "David Kim",
    current_role: "Data Scientist",
    current_company: "AnalyticsCo",
    preferred_job_type: "full_time",
    experience_years: 6,
    expected_hourly_rate: 85,
    skills: ["Python", "R", "Spark", "TensorFlow", "SQL", "Tableau"],
    location: "New York, NY",
  },
  {
    id: "p13",
    name: "Sofia Romero",
    current_role: "QA Lead",
    current_company: "TestFirst",
    preferred_job_type: "full_time",
    experience_years: 7,
    expected_hourly_rate: 72,
    skills: ["Selenium", "Cypress", "Java", "CI/CD", "JIRA", "Appium"],
    location: "Austin, TX",
  },
  {
    id: "p14",
    name: "Marcus Williams",
    current_role: "Security Engineer",
    current_company: "SecureNet",
    preferred_job_type: "full_time",
    experience_years: 6,
    expected_hourly_rate: 90,
    skills: ["Penetration Testing", "SIEM", "Python", "OWASP", "AWS", "Docker"],
    location: "Washington, DC",
  },
  {
    id: "p15",
    name: "Emily Chen",
    current_role: "Product Manager",
    current_company: "ProductCo",
    preferred_job_type: "full_time",
    experience_years: 8,
    expected_hourly_rate: 95,
    skills: ["Product Strategy", "SQL", "JIRA", "Figma", "Agile", "OKRs"],
    location: "San Francisco, CA",
  },
  {
    id: "p16",
    name: "Ryan O'Brien",
    current_role: "Rust Developer",
    current_company: "SysSolve",
    preferred_job_type: "contract",
    experience_years: 5,
    expected_hourly_rate: 100,
    skills: ["Rust", "Tokio", "gRPC", "PostgreSQL", "Docker", "Linux"],
    location: "Remote",
  },
  {
    id: "p17",
    name: "Zara Ahmed",
    current_role: "iOS Developer",
    current_company: "AppCraft",
    preferred_job_type: "full_time",
    experience_years: 4,
    expected_hourly_rate: 68,
    skills: ["Swift", "SwiftUI", "Combine", "Core Data", "Xcode", "ARKit"],
    location: "Los Angeles, CA",
  },
  {
    id: "p18",
    name: "Tom Evans",
    current_role: "Platform Engineer",
    current_company: "PlatformIO",
    preferred_job_type: "full_time",
    experience_years: 6,
    expected_hourly_rate: 88,
    skills: ["Kubernetes", "Helm", "ArgoCD", "Go", "Prometheus", "Grafana"],
    location: "Seattle, WA",
  },
  {
    id: "p19",
    name: "Anya Patel",
    current_role: "UX Designer",
    current_company: "DesignHub",
    preferred_job_type: "contract",
    experience_years: 4,
    expected_hourly_rate: 60,
    skills: ["Figma", "React", "Tailwind CSS", "CSS", "Adobe XD", "Zeplin"],
    location: "Chicago, IL",
  },
  {
    id: "p20",
    name: "Jake Turner",
    current_role: "Salesforce Architect",
    current_company: "CRMPro",
    preferred_job_type: "contract",
    experience_years: 8,
    expected_hourly_rate: 105,
    skills: ["Salesforce", "Apex", "LWC", "SOQL", "REST API", "Flow"],
    location: "Atlanta, GA",
  },
  {
    id: "p21",
    name: "Nina Johansson",
    current_role: "Backend Developer",
    current_company: "Nordic Tech",
    preferred_job_type: "full_time",
    experience_years: 3,
    expected_hourly_rate: 55,
    skills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
    location: "Remote",
  },
  {
    id: "p22",
    name: "Chris Okafor",
    current_role: "React Native Developer",
    current_company: "MobileFirst",
    preferred_job_type: "contract",
    experience_years: 3,
    expected_hourly_rate: 52,
    skills: ["React Native", "TypeScript", "Expo", "Firebase", "Redux"],
    location: "Remote",
  },
  {
    id: "p23",
    name: "Lena Müller",
    current_role: "Scrum Master / PM",
    current_company: "AgileCo",
    preferred_job_type: "full_time",
    experience_years: 7,
    expected_hourly_rate: 78,
    skills: ["Agile", "Scrum", "JIRA", "Confluence", "Risk Management", "OKRs"],
    location: "New York, NY",
  },
  {
    id: "p24",
    name: "Rahul Singh",
    current_role: "Angular Developer",
    current_company: "WebMatrix",
    preferred_job_type: "full_time",
    experience_years: 4,
    expected_hourly_rate: 58,
    skills: ["Angular", "TypeScript", "RxJS", "NgRx", "SCSS", "Jest"],
    location: "Dallas, TX",
  },
  {
    id: "p25",
    name: "Chloe Martin",
    current_role: "Go Backend Engineer",
    current_company: "GopherWorks",
    preferred_job_type: "full_time",
    experience_years: 5,
    expected_hourly_rate: 82,
    skills: ["Go", "gRPC", "PostgreSQL", "Docker", "Redis", "Kafka"],
    location: "Denver, CO",
  },
];

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 25;
const POLL_INTERVAL_MS = 30000;

// ── Helpers ───────────────────────────────────────────────────────────────────

const computeMatch = (s1: string[], s2: string[]): number => {
  if (!s1.length || !s2.length) return 65;
  const a = new Set(s1.map((x) => x.toLowerCase()));
  const b = new Set(s2.map((x) => x.toLowerCase()));
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return Math.min(99, Math.round(62 + (inter / union) * 36));
};

const fmtJobRate = (j: PublicJob): string => {
  if (j.pay_per_hour) return `$${j.pay_per_hour}/hr`;
  if (j.salary_max) return `$${Math.round(j.salary_max / 1000)}k`;
  return "—";
};

const fmtCompany = (j: PublicJob): string => {
  if (!j.vendor_email) return "—";
  const domain = j.vendor_email.split("@")[1]?.split(".")[0] || "";
  return domain.charAt(0).toUpperCase() + domain.slice(1);
};

const fmtProfileRate = (p: PublicProfile): string => {
  if (p.expected_hourly_rate) return `$${p.expected_hourly_rate}/hr`;
  return "—";
};

const JOB_TYPE_MAP: Record<string, string> = {
  c2c: "contract",
  w2: "full_time",
  c2h: "contract",
  fulltime: "full_time",
};

// ── Shared sub-components ─────────────────────────────────────────────────────

const PadRows: React.FC<{ dataLen: number; cols: number }> = ({
  dataLen,
  cols,
}) => {
  const remaining = PAGE_SIZE - dataLen;
  if (remaining <= 0) return null;
  return (
    <>
      {Array.from({ length: remaining }).map((_, i) => (
        <tr key={`pad-${i}`} className="pub-empty-row" aria-hidden="true">
          <td className="pub-td-rn">{dataLen + i + 1}</td>
          {Array.from({ length: cols - 1 }).map((__, ci) => (
            <td key={ci}>&nbsp;</td>
          ))}
        </tr>
      ))}
    </>
  );
};

const MatchBar: React.FC<{ score: number }> = ({ score }) => (
  <span className="pub-fit-track">
    <span className="pub-fit-bar">
      <span
        className={`pub-fit-fill${score >= 90 ? " pub-fit-high" : score >= 75 ? " pub-fit-good" : ""}`}
        style={{ width: `${score}%` }}
      />
    </span>
    <span className="pub-fit-pct">{score}%</span>
  </span>
);

const QueryStrip: React.FC<{ sql: string }> = ({ sql }) => (
  <div className="pub-query-strip">
    <span className="pub-qs-label">SQL&gt;</span>
    <span className="pub-qs-text">{sql};</span>
    <span className="pub-qs-run">▶</span>
  </div>
);

const LoginWarningBar: React.FC<{
  message?: string;
  viewType?: "candidate" | "vendor";
  openPricing?: () => void;
}> = ({ message, viewType, openPricing }) => (
  <div className="pub-login-warning">
    <span className="pub-login-warning-icon">⚠️</span>
    <span className="pub-login-warning-text">
      {message ||
        "Without login you cannot contact recruiters or view important columns such as salary, skills, and match scores."}
    </span>
    {viewType && openPricing ? (
      <span
        className="pub-login-warning-cta"
        onClick={openPricing}
        style={{ cursor: "pointer" }}
      >
        {viewType === "vendor"
          ? "View Vendor Plans & Pricing →"
          : "View Candidate Plans & Pricing →"}
      </span>
    ) : (
      <span className="pub-login-warning-cta">
        Sign in to unlock full access →
      </span>
    )}
  </div>
);

/**
 * Fetches the real count once, then continuously fluctuates it
 * by ±1–10 every 5–15 seconds to make the UI feel alive.
 */
function useLiveCount(endpoint: string): number | null {
  const [display, setDisplay] = useState<number | null>(null);
  const baseRef = useRef<number>(0);

  useEffect(() => {
    let active = true;
    let timerId: ReturnType<typeof setTimeout>;

    // Seed with real DB value ±100 offset so it never shows the exact count
    axios
      .get<{ count: number }>(endpoint)
      .then((r) => {
        if (!active) return;
        const offset =
          (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 101);
        const seed = Math.max(1, r.data.count + offset);
        baseRef.current = seed;
        setDisplay(seed);
        scheduleNext();
      })
      .catch(() => {});

    function scheduleNext() {
      if (!active) return;
      const delaySec = Math.floor(Math.random() * 11) + 5; // 5-15 s
      timerId = setTimeout(() => {
        if (!active) return;
        const delta = Math.floor(Math.random() * 10) + 1; // 1-10
        const direction = Math.random() < 0.5 ? -1 : 1;
        const next = Math.max(1, baseRef.current + direction * delta);
        baseRef.current = next;
        setDisplay(next);
        scheduleNext();
      }, delaySec * 1000);
    }

    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [endpoint]);

  return display;
}

/**
 * Renders a number with a typewriter-style animation,
 * re-triggering each time the value changes.
 */
const TypewriterCount: React.FC<{ value: number | null; fallback: number }> = ({
  value,
  fallback,
}) => {
  const target = value !== null ? value : fallback;
  const text = String(target);
  const [displayed, setDisplayed] = useState("");
  const prevRef = useRef(text);

  useEffect(() => {
    // Reset and re-type whenever the target text changes
    let active = true;
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      if (!active) return;
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 80);
    prevRef.current = text;
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [text]);

  return (
    <span className="pub-typewriter-count">
      {displayed}
      <span className="pub-typewriter-cursor">|</span>
    </span>
  );
};

const StatusBar: React.FC<{
  cells: string[];
  loading: boolean;
  live?: boolean;
}> = ({ cells, loading, live }) => (
  <div className="pub-statusbar">
    {loading ? (
      <span className="pub-sb-cell">Executing query…</span>
    ) : (
      <>
        {cells.map((c, i) => (
          <span
            key={i}
            className={`pub-sb-cell${i === cells.length - 1 ? " pub-sb-right" : ""}`}
          >
            {c}
          </span>
        ))}
        {live && (
          <span
            className="pub-sb-cell pub-poll-live"
            title="Auto-refreshes every 30 seconds"
          >
            ↻ 30s
          </span>
        )}
      </>
    )}
  </div>
);

// ── Column definition type ────────────────────────────────────────────────────

interface ColumnDef {
  key: string;
  header: React.ReactNode;
  colWidth?: string;
  tdClass?: string;
  render: (item: any, localIndex: number, absIndex: number) => React.ReactNode;
  tooltip?: (item: any) => string;
}

// ── Shared data table — MatchDataTable style panel ────────────────────────────

interface PubDataTableProps {
  panelTitle: string;
  panelIcon: string;
  data: any[];
  columns: ColumnDef[];
  loading: boolean;
  keyExtractor: (item: any) => string;
  flashIds?: Set<string>;
  rnColWidth?: string;
}

const PubDataTable: React.FC<PubDataTableProps> = ({
  panelTitle,
  panelIcon,
  data,
  columns,
  loading,
  keyExtractor,
  flashIds,
  rnColWidth = "3%",
}) => {
  const totalCols = columns.length + 1;

  return (
    <div className="matchdb-panel">
      {/* Panel title bar — gradient, W97 style matching MatchDataTable */}
      <div className="matchdb-panel-title">
        <span className="matchdb-panel-title-icon">{panelIcon}</span>
        <span className="matchdb-panel-title-text">{panelTitle}</span>
        <span className="matchdb-panel-title-meta">
          {loading ? "Loading..." : `${data.length} rows`}
        </span>
      </div>

      {/* Table wrap — overflow hidden, no scroll */}
      <div className="matchdb-table-wrap">
        {loading ? (
          <table className="matchdb-table" aria-busy="true">
            <tbody>
              {Array.from({ length: 8 }).map((_, ri) => (
                <tr
                  key={`sk-${ri}`}
                  className="matchdb-skeleton-row"
                  aria-hidden="true"
                >
                  {Array.from({ length: totalCols }).map((_, ci) => (
                    <td key={ci}>
                      <span
                        className="w97-shimmer"
                        style={{ width: ci === 0 ? 22 : 60 }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="matchdb-table">
            <colgroup>
              <col style={{ width: rnColWidth }} />
              {columns.map((c) => (
                <col
                  key={c.key}
                  style={c.colWidth ? { width: c.colWidth } : undefined}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="pub-th-rn" title="Row number">
                  #
                </th>
                {columns.map((c) => (
                  <th key={c.key}>{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => {
                const itemKey = keyExtractor(item);
                const isFlashing = flashIds?.has(itemKey) ?? false;
                return (
                  <tr
                    key={itemKey}
                    className={isFlashing ? "pub-row-flash" : undefined}
                  >
                    <td className="pub-td-rn">{i + 1}</td>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={c.tdClass}
                        title={c.tooltip ? c.tooltip(item) : undefined}
                      >
                        {c.render(item, i, i)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <PadRows dataLen={data.length} cols={totalCols} />
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ── TwinView — /jobs ──────────────────────────────────────────────────────────

interface TwinProps {
  jobs: PublicJob[];
  profiles: PublicProfile[];
  loading: boolean;
  openLogin: (ctx: "candidate" | "vendor", mode?: "login" | "register") => void;
  flashJobIds: Set<string>;
  flashProfileIds: Set<string>;
}

const TwinView: React.FC<TwinProps> = ({
  jobs,
  profiles,
  loading,
  openLogin,
  flashJobIds,
  flashProfileIds,
}) => {
  const queryTime = useMemo(
    () => (Math.random() * 0.005 + 0.002).toFixed(3),
    [],
  );

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const rA = a.pay_per_hour ?? (a.salary_max ? a.salary_max / 2080 : 0);
        const rB = b.pay_per_hour ?? (b.salary_max ? b.salary_max / 2080 : 0);
        return rB - rA;
      }),
    [jobs],
  );

  const profilesWithFit = useMemo(
    () =>
      profiles
        .map((p) => ({
          ...p,
          fitScore:
            jobs.length > 0
              ? Math.max(
                  ...jobs.map((j) => computeMatch(j.skills_required, p.skills)),
                )
              : 70,
        }))
        .sort((a, b) => b.fitScore - a.fitScore),
    [jobs, profiles],
  );

  const jobsWithCandCount = useMemo(
    () =>
      sortedJobs.map((j) => ({
        ...j,
        candCount: profiles.filter(
          (p) => computeMatch(j.skills_required, p.skills) > 75,
        ).length,
      })),
    [sortedJobs, profiles],
  );

  const totalMatches = useMemo(
    () => profilesWithFit.filter((p) => p.fitScore > 75).length,
    [profilesWithFit],
  );

  const pageJobs = jobsWithCandCount.slice(0, PAGE_SIZE);
  const pageProfiles = profilesWithFit.slice(0, PAGE_SIZE);

  const twinJobColumns: ColumnDef[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        colWidth: "21%",
        tdClass: "pub-job-title",
        render: (j: any) => j.title,
      },
      {
        key: "name",
        header: "Name",
        colWidth: "12%",
        tdClass: "pub-cell-truncate",
        render: (j: any) => j.recruiter_name,
      },
      {
        key: "company",
        header: "Company",
        colWidth: "12%",
        tdClass: "pub-cell-truncate",
        render: (j: any) => fmtCompany(j),
      },
      {
        key: "location",
        header: "Location",
        colWidth: "12%",
        tdClass: "pub-cell-truncate",
        render: (j: any) => j.location,
      },
      {
        key: "type",
        header: "Type",
        colWidth: "11%",
        render: (j: any) => (
          <span className={`pub-type-badge pub-type-${j.job_type}`}>
            {j.job_type.replace("_", " ")}
          </span>
        ),
      },
      {
        key: "mode",
        header: "Mode",
        colWidth: "6%",
        tdClass: "pub-mode-cell",
        render: (j: any) => j.work_mode,
      },
      {
        key: "rate",
        header: (
          <>
            Rate <span className="pub-sort">▼</span>
          </>
        ),
        colWidth: "6%",
        tdClass: "pub-num",
        render: (j: any) => fmtJobRate(j),
      },
      {
        key: "exp",
        header: "Exp",
        colWidth: "3%",
        tdClass: "pub-num",
        render: (j: any) => `${j.experience_required}y`,
      },
      {
        key: "candidates",
        header: "Cand.",
        colWidth: "4%",
        tdClass: "pub-cand-count",
        render: (j: any) =>
          j.candCount > 0 ? (
            <>👥 {j.candCount}</>
          ) : (
            <span style={{ opacity: 0.4 }}>—</span>
          ),
      },
    ],
    [],
  );

  const twinProfileColumns: ColumnDef[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        colWidth: "20%",
        tdClass: "pub-job-title",
        render: (p: any) => p.name,
        tooltip: (p: any) => p.name,
      },
      {
        key: "current_role",
        header: "Role",
        colWidth: "14%",
        tdClass: "pub-cell-truncate",
        render: (p: any) => p.current_role,
        tooltip: (p: any) => p.current_role,
      },
      {
        key: "company",
        header: "Company",
        colWidth: "12%",
        tdClass: "pub-cell-truncate",
        render: (p: any) => p.current_company,
        tooltip: (p: any) => p.current_company,
      },
      {
        key: "location",
        header: "Location",
        colWidth: "12%",
        tdClass: "pub-cell-truncate",
        render: (p: any) => p.location || "—",
        tooltip: (p: any) => p.location || "—",
      },
      {
        key: "pref_type",
        header: "Pref",
        colWidth: "11%",
        render: (p: any) => (
          <span
            className={`pub-type-badge pub-type-${p.preferred_job_type || ""}`}
          >
            {p.preferred_job_type?.replace("_", " ") || "—"}
          </span>
        ),
        tooltip: (p: any) => p.preferred_job_type?.replace("_", " ") || "—",
      },
      {
        key: "rate_hr",
        header: "Rate/hr",
        colWidth: "7%",
        tdClass: "pub-num",
        render: (p: any) => fmtProfileRate(p),
        tooltip: (p: any) => fmtProfileRate(p),
      },
      {
        key: "exp",
        header: "Exp",
        colWidth: "4%",
        tdClass: "pub-num",
        render: (p: any) => `${p.experience_years}y`,
        tooltip: (p: any) => `${p.experience_years} years`,
      },
      {
        key: "fit_score",
        header: (
          <>
            Fit <span className="pub-sort">▼</span>
          </>
        ),
        colWidth: "14%",
        render: (p: any) => <MatchBar score={p.fitScore} />,
        tooltip: (p: any) => `${p.fitScore}% fit`,
      },
    ],
    [],
  );

  return (
    <div className="pub-landing">
      <div className="pub-section">
        <div className="pub-section-titlebar">
          <span className="pub-section-icon">🗄️</span>
          <span className="pub-section-title">
            💼 Job Openings <span className="pub-join-badge">&amp;</span> 👥
            Candidate Profiles
          </span>
        </div>

        <LoginWarningBar />

        <div className="pub-twin-panels">
          <PubDataTable
            panelTitle="Job Openings"
            panelIcon="💼"
            data={pageJobs}
            columns={twinJobColumns}
            loading={loading}
            keyExtractor={(j: any) => j.id}
            flashIds={flashJobIds}
            rnColWidth="3%"
          />
          <PubDataTable
            panelTitle="candidate_profiles"
            panelIcon="👥"
            data={pageProfiles}
            columns={twinProfileColumns}
            loading={loading}
            keyExtractor={(p: any) => p.id}
            flashIds={flashProfileIds}
            rnColWidth="3%"
          />
        </div>

        <StatusBar
          loading={loading}
          live={true}
          cells={[
            `${jobs.length} jobs × ${profiles.length} candidates (${queryTime} sec)`,
            `${totalMatches} strong matches (fit > 75%)`,
            "MatchDB v97.2026",
          ]}
        />
      </div>
    </div>
  );
};

// ── CandidateView — /jobs/candidate ──────────────────────────────────────────

interface CandViewProps {
  jobs: PublicJob[];
  loading: boolean;
  jobTypeFilter: string;
  openLogin: (ctx: "candidate" | "vendor", mode?: "login" | "register") => void;
  flashJobIds: Set<string>;
}

const CandView: React.FC<CandViewProps> = ({
  jobs,
  loading,
  jobTypeFilter,
  openLogin,
  flashJobIds,
}) => {
  const liveJobCount = useLiveCount("/api/jobs/count");
  const queryTime = useMemo(
    () => (Math.random() * 0.004 + 0.001).toFixed(3),
    [],
  );

  const filteredJobs = jobTypeFilter
    ? jobs.filter((j) => {
        const mapped = JOB_TYPE_MAP[jobTypeFilter];
        return mapped ? j.job_type === mapped : true;
      })
    : jobs;

  const sortedJobs = useMemo(
    () =>
      [...filteredJobs].sort((a, b) => {
        const rA = a.pay_per_hour ?? (a.salary_max ? a.salary_max / 2080 : 0);
        const rB = b.pay_per_hour ?? (b.salary_max ? b.salary_max / 2080 : 0);
        return rB - rA;
      }),
    [filteredJobs],
  );

  const SCORES = useMemo(
    () => [
      96, 94, 92, 90, 89, 87, 85, 84, 82, 80, 79, 77, 75, 74, 72, 70, 69, 67,
      65, 63, 61, 60, 58, 56, 54,
    ],
    [],
  );

  const pageJobs = sortedJobs.slice(0, PAGE_SIZE);

  const candColumns: ColumnDef[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        colWidth: "24%",
        tdClass: "pub-job-title",
        render: (j: any) => j.title,
        tooltip: (j: any) => j.title,
      },
      {
        key: "name",
        header: "Name",
        colWidth: "11%",
        tdClass: "pub-cell-truncate",
        render: (j: any) => j.recruiter_name,
        tooltip: (j: any) => j.recruiter_name,
      },
      {
        key: "location",
        header: "Location",
        colWidth: "11%",
        tdClass: "pub-cell-truncate",
        render: (j: any) => j.location,
        tooltip: (j: any) => j.location,
      },
      {
        key: "type",
        header: "Type",
        colWidth: "8%",
        render: (j: any) => (
          <span className="pub-type-badge">{j.job_type.replace("_", " ")}</span>
        ),
        tooltip: (j: any) => j.job_type.replace("_", " "),
      },
      {
        key: "mode",
        header: "Mode",
        colWidth: "6%",
        tdClass: "pub-mode-cell",
        render: (j: any) => j.work_mode,
        tooltip: (j: any) => j.work_mode,
      },
      {
        key: "rate",
        header: (
          <>
            Rate <span className="pub-sort">▼</span>
          </>
        ),
        colWidth: "6%",
        tdClass: "pub-num",
        render: (j: any) => fmtJobRate(j),
        tooltip: (j: any) => fmtJobRate(j),
      },
      {
        key: "exp",
        header: "Exp",
        colWidth: "3%",
        tdClass: "pub-num",
        render: (j: any) => j.experience_required,
        tooltip: (j: any) => `${j.experience_required} years`,
      },
      {
        key: "skills",
        header: "Skills Required",
        colWidth: "26%",
        tdClass: "pub-skills-cell",
        render: (j: any) => (
          <div className="pub-skills">
            {j.skills_required.slice(0, 4).map((s: string) => (
              <span key={s} className="pub-skill-tag">
                {s}
              </span>
            ))}
            {j.skills_required.length > 4 && (
              <span className="pub-skill-more">
                +{j.skills_required.length - 4}
              </span>
            )}
          </div>
        ),
        tooltip: (j: any) => j.skills_required.join(", "),
      },
      {
        key: "match_score",
        header: "Match",
        colWidth: "13%",
        tdClass: "pub-match-cell",
        render: (_j: any, li: number) => <MatchBar score={SCORES[li] ?? 60} />,
      },
    ],
    [SCORES],
  );

  const sqlQuery = `SELECT id, title, location, job_type, work_mode, pay_per_hour, skills_required, experience_required FROM jobs WHERE is_active = 1${jobTypeFilter ? ` AND job_subtype = '${jobTypeFilter}'` : ""} ORDER BY pay_per_hour DESC`;

  return (
    <div className="pub-landing">
      <div className="pub-section">
        <div className="pub-section-titlebar">
          <span className="pub-section-icon">💼</span>
          <span className="pub-section-title">
            Total Job Openings :{" "}
            <TypewriterCount
              value={liveJobCount}
              fallback={sortedJobs.length}
            />
            {jobTypeFilter && (
              <span className="pub-filter-badge">
                {jobTypeFilter.toUpperCase()}
              </span>
            )}
          </span>
        </div>

        <LoginWarningBar
          message="Without login you cannot contact recruiters or view important columns such as salary, skills, and match scores."
          viewType="candidate"
          openPricing={() =>
            window.dispatchEvent(
              new CustomEvent("matchdb:openPricing", {
                detail: { tab: "candidate" },
              }),
            )
          }
        />

        <PubDataTable
          panelTitle={`Job Openings${jobTypeFilter ? ` [${jobTypeFilter.toUpperCase()}]` : ""}`}
          panelIcon="💼"
          data={pageJobs}
          columns={candColumns}
          loading={loading}
          keyExtractor={(j: any) => j.id}
          flashIds={flashJobIds}
          rnColWidth="2%"
        />

        <StatusBar
          loading={loading}
          live={true}
          cells={[
            `${sortedJobs.length} rows in set (${queryTime} sec)`,
            jobTypeFilter
              ? `Filter: ${jobTypeFilter.toUpperCase()}`
              : "Filter: ALL",
            "View Candidate Plans & Pricing →",
            "MatchDB v97.2026",
          ]}
        />
      </div>
    </div>
  );
};

// ── VendorView — /jobs/vendor ─────────────────────────────────────────────────

interface VendorViewProps {
  profiles: PublicProfile[];
  loading: boolean;
  openLogin: (ctx: "candidate" | "vendor", mode?: "login" | "register") => void;
  flashProfileIds: Set<string>;
}

const VendorView: React.FC<VendorViewProps> = ({
  profiles,
  loading,
  openLogin,
  flashProfileIds,
}) => {
  const liveProfileCount = useLiveCount("/api/jobs/profiles-count");
  const queryTime = useMemo(
    () => (Math.random() * 0.003 + 0.001).toFixed(3),
    [],
  );

  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => b.experience_years - a.experience_years),
    [profiles],
  );

  const pageProfiles = sortedProfiles.slice(0, PAGE_SIZE);

  const vendorColumns: ColumnDef[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        colWidth: "13%",
        tdClass: "pub-job-title",
        render: (p: any) => p.name,
        tooltip: (p: any) => p.name,
      },
      {
        key: "current_role",
        header: "Role",
        colWidth: "14%",
        tdClass: "pub-cell-truncate",
        render: (p: any) => p.current_role,
        tooltip: (p: any) => p.current_role,
      },
      {
        key: "company",
        header: "Company",
        colWidth: "11%",
        tdClass: "pub-cell-truncate",
        render: (p: any) => p.current_company,
        tooltip: (p: any) => p.current_company,
      },
      {
        key: "location",
        header: "Location",
        colWidth: "10%",
        tdClass: "pub-cell-truncate",
        render: (p: any) => p.location,
        tooltip: (p: any) => p.location,
      },
      {
        key: "rate_hr",
        header: "Rate/hr",
        colWidth: "7%",
        tdClass: "pub-num",
        render: (p: any) => fmtProfileRate(p),
        tooltip: (p: any) => fmtProfileRate(p),
      },
      {
        key: "exp",
        header: (
          <>
            Exp <span className="pub-sort">▼</span>
          </>
        ),
        colWidth: "4%",
        tdClass: "pub-num",
        render: (p: any) => `${p.experience_years}y`,
        tooltip: (p: any) => `${p.experience_years} years`,
      },
      {
        key: "pref_type",
        header: "Pref. Type",
        colWidth: "10%",
        render: (p: any) => (
          <span className={`pub-type-badge pub-type-${p.preferred_job_type}`}>
            {p.preferred_job_type.replace("_", " ")}
          </span>
        ),
        tooltip: (p: any) => p.preferred_job_type.replace("_", " "),
      },
      {
        key: "skills",
        header: "Skills",
        colWidth: "28%",
        tdClass: "pub-skills-cell",
        render: (p: any) => (
          <div className="pub-skills">
            {p.skills.slice(0, 4).map((s: string) => (
              <span key={s} className="pub-skill-tag">
                {s}
              </span>
            ))}
            {p.skills.length > 4 && (
              <span className="pub-skill-more">+{p.skills.length - 4}</span>
            )}
          </div>
        ),
        tooltip: (p: any) => p.skills.join(", "),
      },
    ],
    [],
  );

  return (
    <div className="pub-landing">
      <div className="pub-section">
        <div className="pub-section-titlebar">
          <span className="pub-section-icon">👥</span>
          <span className="pub-section-title">
            Total Candidate Profiles :{" "}
            <TypewriterCount
              value={liveProfileCount}
              fallback={sortedProfiles.length}
            />
          </span>
        </div>

        <LoginWarningBar
          message="Without login you cannot contact Candidates or view important columns such as salary, skills, and match scores."
          viewType="vendor"
          openPricing={() =>
            window.dispatchEvent(
              new CustomEvent("matchdb:openPricing", {
                detail: { tab: "vendor" },
              }),
            )
          }
        />

        <PubDataTable
          panelTitle="Candidate_Profiles"
          panelIcon="👥"
          data={pageProfiles}
          columns={vendorColumns}
          loading={loading}
          keyExtractor={(p: any) => p.id}
          flashIds={flashProfileIds}
          rnColWidth="2%"
        />

        <StatusBar
          loading={loading}
          live={true}
          cells={[
            `${sortedProfiles.length} rows in set (${queryTime} sec)`,
            "Filter: profileLocked = 1",
            "View Vendor Plans & Pricing →",
            "MatchDB v97.2026",
          ]}
        />
      </div>
    </div>
  );
};

// ── PublicJobsView (root) — manages polling + change detection ────────────────

const PublicJobsView: React.FC = () => {
  const location = useLocation();
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobTypeFilter, setJobTypeFilter] = useState("");

  const [flashJobIds, setFlashJobIds] = useState<Set<string>>(new Set());
  const [flashProfileIds, setFlashProfileIds] = useState<Set<string>>(
    new Set(),
  );

  const prevJobsRef = useRef<PublicJob[]>([]);
  const prevProfilesRef = useRef<PublicProfile[]>([]);
  const isInitialRef = useRef(true);

  const isVendorView =
    location.pathname === "/jobs/vendor" ||
    location.pathname.startsWith("/jobs/vendor/");
  const isCandView =
    location.pathname === "/jobs/candidate" ||
    location.pathname.startsWith("/jobs/candidate/");

  const fetchData = useCallback(async () => {
    const isInitial = isInitialRef.current;

    const [jobsResult, profilesResult] = await Promise.allSettled([
      axios.get<any[]>("/api/jobs/"),
      axios.get<any[]>("/api/jobs/profiles-public"),
    ]);

    if (
      jobsResult.status === "fulfilled" &&
      jobsResult.value.data?.length > 0
    ) {
      const newJobs: PublicJob[] = jobsResult.value.data.slice(0, PAGE_SIZE);
      if (!isInitial) {
        const prevMap = new Map(prevJobsRef.current.map((j) => [j.id, j]));
        const changedIds = new Set<string>(
          newJobs
            .filter((j) => {
              const prev = prevMap.get(j.id);
              return !prev || JSON.stringify(prev) !== JSON.stringify(j);
            })
            .map((j) => j.id),
        );
        if (changedIds.size > 0) {
          setFlashJobIds(changedIds);
          setTimeout(() => setFlashJobIds(new Set()), 2500);
        }
      }
      prevJobsRef.current = newJobs;
      setJobs(newJobs);
    } else if (isInitial) {
      prevJobsRef.current = MOCK_JOBS;
      setJobs(MOCK_JOBS);
    }

    if (
      profilesResult.status === "fulfilled" &&
      profilesResult.value.data?.length > 0
    ) {
      const newProfiles: PublicProfile[] = profilesResult.value.data.slice(
        0,
        PAGE_SIZE,
      );
      if (!isInitial) {
        const prevMap = new Map(prevProfilesRef.current.map((p) => [p.id, p]));
        const changedIds = new Set<string>(
          newProfiles
            .filter((p) => {
              const prev = prevMap.get(p.id);
              return !prev || JSON.stringify(prev) !== JSON.stringify(p);
            })
            .map((p) => p.id),
        );
        if (changedIds.size > 0) {
          setFlashProfileIds(changedIds);
          setTimeout(() => setFlashProfileIds(new Set()), 2500);
        }
      }
      prevProfilesRef.current = newProfiles;
      setProfiles(newProfiles);
    } else if (isInitial) {
      prevProfilesRef.current = MOCK_PROFILES;
      setProfiles(MOCK_PROFILES);
    }

    if (isInitial) {
      isInitialRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  useEffect(() => {
    const handler = (e: Event) => {
      setJobTypeFilter((e as CustomEvent).detail?.jobType || "");
    };
    window.addEventListener("matchdb:jobTypeFilter", handler);
    return () => window.removeEventListener("matchdb:jobTypeFilter", handler);
  }, []);

  const openLogin = useCallback(
    (context: "candidate" | "vendor", mode: "login" | "register" = "login") => {
      window.dispatchEvent(
        new CustomEvent("matchdb:openLogin", { detail: { context, mode } }),
      );
    },
    [],
  );

  if (isVendorView) {
    return (
      <VendorView
        profiles={profiles}
        loading={loading}
        openLogin={openLogin}
        flashProfileIds={flashProfileIds}
      />
    );
  }

  if (isCandView) {
    return (
      <CandView
        jobs={jobs}
        loading={loading}
        jobTypeFilter={jobTypeFilter}
        openLogin={openLogin}
        flashJobIds={flashJobIds}
      />
    );
  }

  return (
    <TwinView
      jobs={jobs}
      profiles={profiles}
      loading={loading}
      openLogin={openLogin}
      flashJobIds={flashJobIds}
      flashProfileIds={flashProfileIds}
    />
  );
};

export default PublicJobsView;
