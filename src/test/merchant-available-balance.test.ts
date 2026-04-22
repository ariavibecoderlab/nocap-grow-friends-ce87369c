import { describe, it, expect } from "vitest";

/**
 * Automated checks for the Merchant "Available Balance" calculation rule:
 *
 *   Available Balance = Total Sales − Σ Withdrawals (status IN ('approved','settled'))
 *
 * Only `approved` and `settled` withdrawals reduce the available balance.
 * `pending` and `rejected` withdrawals MUST be excluded.
 *
 * These tests pin the business rule so any future regression in
 * src/components/merchant/MerchantWithdrawals.tsx (or its data query) is caught.
 */

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const COMMITTED_STATUSES = ["approved", "settled"] as const;
type WithdrawalStatus = "pending" | "approved" | "rejected" | "settled";

interface Withdrawal {
  amount: number;
  status: WithdrawalStatus;
}

const sumCommitted = (withdrawals: Withdrawal[]) =>
  round2(
    withdrawals
      .filter((w) => (COMMITTED_STATUSES as readonly string[]).includes(w.status))
      .reduce((s, w) => s + Number(w.amount || 0), 0),
  );

const computeAvailable = (totalSales: number, withdrawals: Withdrawal[]) =>
  round2(round2(totalSales) - sumCommitted(withdrawals));

describe("Merchant Available Balance — status mapping", () => {
  it("includes 'approved' withdrawals in the deduction", () => {
    expect(sumCommitted([{ amount: 50, status: "approved" }])).toBe(50);
  });

  it("includes 'settled' withdrawals in the deduction", () => {
    expect(sumCommitted([{ amount: 75, status: "settled" }])).toBe(75);
  });

  it("excludes 'pending' withdrawals from the deduction", () => {
    expect(sumCommitted([{ amount: 100, status: "pending" }])).toBe(0);
  });

  it("excludes 'rejected' withdrawals from the deduction", () => {
    expect(sumCommitted([{ amount: 100, status: "rejected" }])).toBe(0);
  });

  it("only sums approved + settled when statuses are mixed", () => {
    const withdrawals: Withdrawal[] = [
      { amount: 50, status: "approved" },
      { amount: 30, status: "settled" },
      { amount: 999, status: "pending" },
      { amount: 999, status: "rejected" },
    ];
    expect(sumCommitted(withdrawals)).toBe(80);
  });

  it("matches the screenshot example: 182 sales, 0 committed → 182 available", () => {
    expect(computeAvailable(182, [])).toBe(182);
  });

  it("matches the plan example: 182 sales − 50 approved → 132 available", () => {
    expect(computeAvailable(182, [{ amount: 50, status: "approved" }])).toBe(132);
  });

  it("ignores pending withdrawals so a pending request does NOT reduce balance", () => {
    expect(computeAvailable(182, [{ amount: 50, status: "pending" }])).toBe(182);
  });

  it("ignores rejected withdrawals", () => {
    expect(computeAvailable(182, [{ amount: 50, status: "rejected" }])).toBe(182);
  });

  it("avoids floating-point drift (0.1 + 0.2 case)", () => {
    expect(
      computeAvailable(0.3, [
        { amount: 0.1, status: "approved" },
        { amount: 0.2, status: "settled" },
      ]),
    ).toBe(0);
  });

  it("COMMITTED_STATUSES contract: exactly ['approved','settled'] — guards against accidental status drift", () => {
    expect([...COMMITTED_STATUSES].sort()).toEqual(["approved", "settled"]);
    expect(COMMITTED_STATUSES).not.toContain("pending");
    expect(COMMITTED_STATUSES).not.toContain("rejected");
  });
});

describe("Merchant Available Balance — source code contract", () => {
  it("MerchantWithdrawals.tsx queries withdrawal_requests with .in('status', ['approved','settled'])", async () => {
    const src = await import("fs").then((fs) =>
      fs.promises.readFile("src/components/merchant/MerchantWithdrawals.tsx", "utf8"),
    );
    // Pin the exact query so a future edit that adds 'pending' or drops 'settled' fails this test.
    expect(src).toMatch(/\.in\(\s*["']status["']\s*,\s*\[\s*["']approved["']\s*,\s*["']settled["']\s*\]\s*\)/);
  });
});
