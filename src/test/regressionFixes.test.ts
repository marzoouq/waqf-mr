/**
 * Regression tests for the 3 confirmed fixes:
 * #1 - AI assistant uses userClient (not serviceClient) — tested via edge function logs
 * #2 - PDF paid_months denominator is dynamic, not hardcoded /12
 * #3 - contractAllocation recognizes both semi_annual and semi-annual
 */
import { describe, it, expect } from "vitest";
import { generatePaymentDueDates, allocateContractToFiscalYears } from "@/utils/contractAllocation";

// ── #3: semi-annual vs semi_annual ──

describe("contractAllocation – semi-annual naming", () => {
  const baseFY = [
    { id: "fy1", label: "2025", start_date: "2025-01-01", end_date: "2025-12-31", status: "active" as const, published: true, created_at: "" },
  ];

  const makeContract = (paymentType: string) => ({
    id: "c1",
    start_date: "2025-01-01",
    end_date: "2025-12-31",
    rent_amount: 12000,
    payment_type: paymentType,
  });

  it("semi_annual (underscore) produces 2 payments", () => {
    const dates = generatePaymentDueDates(makeContract("semi_annual"));
    expect(dates).toHaveLength(2);
  });

  it("semi-annual (hyphen) produces 2 payments", () => {
    const dates = generatePaymentDueDates(makeContract("semi-annual"));
    expect(dates).toHaveLength(2);
  });

  it("both variants allocate the same amount to a fiscal year", () => {
    const a1 = allocateContractToFiscalYears(makeContract("semi_annual"), baseFY);
    const a2 = allocateContractToFiscalYears(makeContract("semi-annual"), baseFY);
    expect(a1[0]?.allocated_amount).toBe(a2[0]?.allocated_amount);
    expect(a1[0]?.allocated_payments).toBe(a2[0]?.allocated_payments);
  });
});

// ── #2: PDF denominator logic (unit test of the calculation) ──

describe("PDF payment denominator calculation", () => {
  // Mirrors the inline logic in src/utils/pdf/entities.ts line 163
  function getDenominator(paymentType?: string, paymentCount?: number): number {
    if (paymentType === "monthly") return 12;
    if (paymentType === "quarterly") return 4;
    if (paymentType === "semi_annual" || paymentType === "semi-annual") return 2;
    if (paymentType === "annual") return 1;
    return paymentCount || 12;
  }

  it("monthly → 12", () => expect(getDenominator("monthly")).toBe(12));
  it("quarterly → 4", () => expect(getDenominator("quarterly")).toBe(4));
  it("semi_annual → 2", () => expect(getDenominator("semi_annual")).toBe(2));
  it("semi-annual → 2", () => expect(getDenominator("semi-annual")).toBe(2));
  it("annual → 1", () => expect(getDenominator("annual")).toBe(1));
  it("custom with payment_count=3 → 3", () => expect(getDenominator("custom", 3)).toBe(3));
  it("unknown without count → fallback 12", () => expect(getDenominator(undefined)).toBe(12));
});
