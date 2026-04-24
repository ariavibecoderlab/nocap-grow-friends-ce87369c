import { describe, it, expect, vi } from "vitest";

/**
 * Reproduces the exact pagination logic used in
 * src/pages/Referral.tsx -> fetchReferralsFromProfiles
 *
 * The goal is to prove that when tier 1 has more than 1,000 referrals,
 * the loop continues paging via .range(from, to) and returns ALL rows
 * (not just the first 1,000 that Supabase returns by default).
 */
async function fetchReferralsFromProfiles(
  supabase: any,
  rootProfileId: string,
): Promise<Array<{ user_id: string; tier: number }>> {
  let currentParentIds = [rootProfileId];
  const collected: Array<{ id: string; user_id: string; tier: number }> = [];

  for (let tier = 1; tier <= 5 && currentParentIds.length > 0; tier++) {
    const nextLevel: Array<{ id: string; user_id: string; tier: number }> = [];

    const PARENT_BATCH = 200;
    const PAGE = 1000;
    for (let i = 0; i < currentParentIds.length; i += PARENT_BATCH) {
      const batch = currentParentIds.slice(i, i + PARENT_BATCH);

      let from = 0;
      while (true) {
        const to = from + PAGE - 1;
        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, phone")
          .in("referred_by", batch)
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        nextLevel.push(...data.map((row: any) => ({ ...row, tier })));
        if (data.length < PAGE) break;
        from += PAGE;
      }
    }

    collected.push(...nextLevel);
    currentParentIds = nextLevel.map((row) => row.id);
  }

  return collected.map((row) => ({ user_id: row.user_id, tier: row.tier }));
}

/**
 * Build a mock Supabase client whose .range(from, to) returns paginated
 * slices of a seeded rows[] (defaulting to 1,500 tier-1 referrals).
 */
function buildMockSupabase(rows: Array<{ id: string; user_id: string; full_name: string | null; phone: string | null }>) {
  const calls: Array<{ from: number; to: number; parents: string[] }> = [];

  const builder = {
    _parents: [] as string[],
    from() {
      return this;
    },
    select() {
      return this;
    },
    in(_col: string, parents: string[]) {
      this._parents = parents;
      return this;
    },
    range(from: number, to: number) {
      calls.push({ from, to, parents: this._parents });
      // Only return rows when the parent batch contains the seeded root.
      const isRootBatch = this._parents.includes("root-profile");
      const slice = isRootBatch ? rows.slice(from, to + 1) : [];
      return Promise.resolve({ data: slice, error: null });
    },
  };

  const client = {
    from: () => builder,
  };

  return { client, calls };
}

describe("Referral fetchReferralsFromProfiles pagination", () => {
  it("returns all 1,500 tier-1 referrals (no 1,000-row cap)", async () => {
    const seeded = Array.from({ length: 1500 }, (_, i) => ({
      id: `child-${i}`,
      user_id: `user-${i}`,
      full_name: `Member ${i}`,
      phone: null,
    }));

    const { client, calls } = buildMockSupabase(seeded);

    const result = await fetchReferralsFromProfiles(client, "root-profile");

    const tier1 = result.filter((r) => r.tier === 1);
    expect(tier1.length).toBe(1500);

    // Distinct users (no duplicates from overlapping ranges)
    const uniqueUserIds = new Set(tier1.map((r) => r.user_id));
    expect(uniqueUserIds.size).toBe(1500);

    // First and last seeded rows are both present
    expect(uniqueUserIds.has("user-0")).toBe(true);
    expect(uniqueUserIds.has("user-1499")).toBe(true);

    // Verify pagination actually happened: at least 2 .range() calls hitting the root batch
    const rootRangeCalls = calls.filter((c) => c.parents.includes("root-profile"));
    expect(rootRangeCalls.length).toBeGreaterThanOrEqual(2);
    expect(rootRangeCalls[0]).toMatchObject({ from: 0, to: 999 });
    expect(rootRangeCalls[1]).toMatchObject({ from: 1000, to: 1999 });
  });

  it("computes correct direct (tier 1) and total network counts for 1,500 referrals", async () => {
    const seeded = Array.from({ length: 1500 }, (_, i) => ({
      id: `child-${i}`,
      user_id: `user-${i}`,
      full_name: null,
      phone: null,
    }));

    const { client } = buildMockSupabase(seeded);

    const result = await fetchReferralsFromProfiles(client, "root-profile");

    const directCount = result.filter((r) => r.tier === 1).length;
    const totalCount = result.length;

    // Tier 2-5 mock returns no rows (only root batch is seeded), so total === direct
    expect(directCount).toBe(1500);
    expect(totalCount).toBe(1500);
  });

  it("stops paging when a page returns fewer than PAGE rows", async () => {
    const seeded = Array.from({ length: 1200 }, (_, i) => ({
      id: `child-${i}`,
      user_id: `user-${i}`,
      full_name: null,
      phone: null,
    }));

    const { client, calls } = buildMockSupabase(seeded);

    const result = await fetchReferralsFromProfiles(client, "root-profile");

    expect(result.filter((r) => r.tier === 1).length).toBe(1200);
    const rootRangeCalls = calls.filter((c) => c.parents.includes("root-profile"));
    // Two pages: 0-999 (1000 rows) and 1000-1999 (200 rows -> stop)
    expect(rootRangeCalls.length).toBe(2);
  });
});
