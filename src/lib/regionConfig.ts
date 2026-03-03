/**
 * Regional configuration for multi-region support.
 * Covers US, UK, EU (major markets), and Canada.
 */

// ─── Region definitions ───

export type RegionCode = "us" | "uk" | "eu_fr" | "eu_de" | "eu_nl" | "eu_es" | "eu_it" | "ca";

export interface RegionConfig {
  code: RegionCode;
  label: string;
  flag: string;
  currency: CurrencyCode;
  employeeLabel: string;
  contractorLabel: string;
  employerCostPct: number; // approximate total employer burden as decimal
  employerCostBreakdown: { label: string; pct: number }[];
  /** Whether fringe benefits (health, retirement) are typically employer-provided */
  hasFringeBenefits: boolean;
  fringePct: number;
}

export const REGIONS: Record<RegionCode, RegionConfig> = {
  us: {
    code: "us",
    label: "United States",
    flag: "🇺🇸",
    currency: "USD",
    employeeLabel: "W-2 Employee",
    contractorLabel: "1099 Contractor",
    employerCostPct: 0.08,
    employerCostBreakdown: [
      { label: "FICA (SS + Medicare)", pct: 0.0765 },
      { label: "FUTA", pct: 0.006 },
      { label: "SUTA (avg)", pct: 0.027 },
    ],
    hasFringeBenefits: true,
    fringePct: 0.25,
  },
  uk: {
    code: "uk",
    label: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    employeeLabel: "PAYE Employee",
    contractorLabel: "Freelancer / Sole Trader",
    employerCostPct: 0.138,
    employerCostBreakdown: [
      { label: "Employer NI", pct: 0.138 },
      { label: "Apprenticeship Levy", pct: 0.005 },
    ],
    hasFringeBenefits: true,
    fringePct: 0.10,
  },
  eu_fr: {
    code: "eu_fr",
    label: "France",
    flag: "🇫🇷",
    currency: "EUR",
    employeeLabel: "CDI / CDD Employee",
    contractorLabel: "Auto-entrepreneur / Freelance",
    employerCostPct: 0.42,
    employerCostBreakdown: [
      { label: "Social Security (Employer)", pct: 0.30 },
      { label: "Unemployment Insurance", pct: 0.042 },
      { label: "Retirement + Complementary", pct: 0.078 },
    ],
    hasFringeBenefits: false,
    fringePct: 0.05,
  },
  eu_de: {
    code: "eu_de",
    label: "Germany",
    flag: "🇩🇪",
    currency: "EUR",
    employeeLabel: "Employee (Arbeitnehmer)",
    contractorLabel: "Freelancer (Freiberufler)",
    employerCostPct: 0.21,
    employerCostBreakdown: [
      { label: "Health Insurance (Employer)", pct: 0.073 },
      { label: "Pension Insurance", pct: 0.093 },
      { label: "Unemployment Insurance", pct: 0.013 },
      { label: "Long-term Care", pct: 0.017 },
      { label: "Accident Insurance", pct: 0.013 },
    ],
    hasFringeBenefits: false,
    fringePct: 0.05,
  },
  eu_nl: {
    code: "eu_nl",
    label: "Netherlands",
    flag: "🇳🇱",
    currency: "EUR",
    employeeLabel: "Employee (Werknemer)",
    contractorLabel: "ZZP / Freelancer",
    employerCostPct: 0.18,
    employerCostBreakdown: [
      { label: "Social Insurance (WW, WAO)", pct: 0.10 },
      { label: "Health Insurance (ZVW)", pct: 0.065 },
      { label: "Pension Contribution", pct: 0.015 },
    ],
    hasFringeBenefits: false,
    fringePct: 0.05,
  },
  eu_es: {
    code: "eu_es",
    label: "Spain",
    flag: "🇪🇸",
    currency: "EUR",
    employeeLabel: "Employee (Trabajador)",
    contractorLabel: "Autónomo / Freelance",
    employerCostPct: 0.30,
    employerCostBreakdown: [
      { label: "Social Security (Employer)", pct: 0.236 },
      { label: "Unemployment", pct: 0.055 },
      { label: "Training + FOGASA", pct: 0.008 },
    ],
    hasFringeBenefits: false,
    fringePct: 0.05,
  },
  eu_it: {
    code: "eu_it",
    label: "Italy",
    flag: "🇮🇹",
    currency: "EUR",
    employeeLabel: "Employee (Dipendente)",
    contractorLabel: "Freelancer (Libero professionista)",
    employerCostPct: 0.32,
    employerCostBreakdown: [
      { label: "INPS Contributions", pct: 0.24 },
      { label: "INAIL (Accident)", pct: 0.01 },
      { label: "Severance (TFR)", pct: 0.069 },
    ],
    hasFringeBenefits: false,
    fringePct: 0.05,
  },
  ca: {
    code: "ca",
    label: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    employeeLabel: "Employee (T4)",
    contractorLabel: "Independent Contractor",
    employerCostPct: 0.08,
    employerCostBreakdown: [
      { label: "CPP (Employer)", pct: 0.0595 },
      { label: "EI (Employer)", pct: 0.022 },
    ],
    hasFringeBenefits: true,
    fringePct: 0.15,
  },
};

export const REGION_LIST = Object.values(REGIONS);

// ─── Currency definitions ───

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", label: "US Dollar" },
  EUR: { code: "EUR", symbol: "€", label: "Euro" },
  GBP: { code: "GBP", symbol: "£", label: "British Pound" },
  CAD: { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

export function getCurrencySymbol(code: string): string {
  return CURRENCIES[code as CurrencyCode]?.symbol ?? "$";
}

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

// ─── PRO (Performance Rights Organisation) lists ───

export interface PROEntry {
  name: string;
  /** Region codes where this PRO is relevant */
  regions: RegionCode[];
}

export const PRO_LIST: PROEntry[] = [
  // US
  { name: "ASCAP", regions: ["us"] },
  { name: "BMI", regions: ["us"] },
  { name: "SESAC", regions: ["us"] },
  { name: "GMR", regions: ["us"] },
  // UK
  { name: "PRS for Music", regions: ["uk"] },
  { name: "PPL", regions: ["uk"] },
  { name: "MCPS", regions: ["uk"] },
  // France
  { name: "SACEM", regions: ["eu_fr"] },
  { name: "SDRM", regions: ["eu_fr"] },
  { name: "ADAMI", regions: ["eu_fr"] },
  // Germany
  { name: "GEMA", regions: ["eu_de"] },
  { name: "GVL", regions: ["eu_de"] },
  // Netherlands
  { name: "Buma/Stemra", regions: ["eu_nl"] },
  { name: "SENA", regions: ["eu_nl"] },
  // Spain
  { name: "SGAE", regions: ["eu_es"] },
  { name: "AIE", regions: ["eu_es"] },
  // Italy
  { name: "SIAE", regions: ["eu_it"] },
  { name: "Nuovo IMAIE", regions: ["eu_it"] },
  // Canada
  { name: "SOCAN", regions: ["ca"] },
  { name: "Re:Sound", regions: ["ca"] },
  { name: "CMRRA", regions: ["ca"] },
  // Multi-region / international
  { name: "SoundExchange", regions: ["us", "ca"] },
];

/**
 * Returns PROs sorted with the team's region first, then all others.
 */
export function getPROsForRegion(regionCode: string): { primary: string[]; other: string[] } {
  const primary: string[] = [];
  const other: string[] = [];
  for (const pro of PRO_LIST) {
    if (pro.regions.includes(regionCode as RegionCode)) {
      primary.push(pro.name);
    } else {
      other.push(pro.name);
    }
  }
  return { primary, other };
}

/**
 * Calculates total employer cost for a given region.
 * For US, uses the detailed FICA/FUTA/SUTA from employerTaxes.ts.
 * For other regions, uses the flat percentage approach.
 */
export function calculateEmployerCost(
  baseSalary: number,
  regionCode: string,
  isEmployee: boolean,
): { breakdown: { label: string; amount: number; pct: number }[]; fringeAmount: number; total: number } {
  if (!isEmployee || baseSalary <= 0) {
    return { breakdown: [], fringeAmount: 0, total: baseSalary };
  }

  const region = REGIONS[regionCode as RegionCode] ?? REGIONS.us;
  const breakdown = region.employerCostBreakdown.map((item) => ({
    label: item.label,
    amount: baseSalary * item.pct,
    pct: item.pct,
  }));

  const taxTotal = breakdown.reduce((s, b) => s + b.amount, 0);
  const fringeAmount = region.hasFringeBenefits ? baseSalary * region.fringePct : baseSalary * region.fringePct;
  const total = baseSalary + taxTotal + fringeAmount;

  return { breakdown, fringeAmount, total };
}
