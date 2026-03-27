import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check – admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminRole } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch ALL profiles (paginated to beat 1000 limit)
    const allProfiles: { id: string; user_id: string; referred_by: string | null }[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await db
        .from("profiles")
        .select("id, user_id, referred_by")
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allProfiles.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    // Build lookup maps
    const profileById = new Map(allProfiles.map(p => [p.id, p]));
    const profileByUserId = new Map(allProfiles.map(p => [p.user_id, p]));

    // 2. For each user, walk referred_by chain up to 5 tiers
    const newRows: { user_id: string; ancestor_id: string; tier: number }[] = [];

    for (const profile of allProfiles) {
      if (!profile.referred_by) continue;

      let currentProfileId: string | null = profile.referred_by;
      let tier = 1;
      const visited = new Set<string>();

      while (currentProfileId && tier <= 5) {
        const ancestor = profileById.get(currentProfileId);
        if (!ancestor) break;
        if (visited.has(ancestor.user_id)) break;
        visited.add(ancestor.user_id);

        newRows.push({
          user_id: profile.user_id,
          ancestor_id: ancestor.user_id,
          tier,
        });

        currentProfileId = ancestor.referred_by;
        tier++;
      }
    }

    // 3. Delete all existing referral_tree rows
    // Delete in batches by selecting all distinct user_ids
    const uniqueUserIds = [...new Set(allProfiles.map(p => p.user_id))];
    const DEL_BATCH = 500;
    for (let i = 0; i < uniqueUserIds.length; i += DEL_BATCH) {
      const batch = uniqueUserIds.slice(i, i + DEL_BATCH);
      await db.from("referral_tree").delete().in("user_id", batch);
    }

    // 4. Insert new rows in batches
    const INS_BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < newRows.length; i += INS_BATCH) {
      const batch = newRows.slice(i, i + INS_BATCH);
      const { error: insErr } = await db.from("referral_tree").insert(batch);
      if (insErr) {
        console.error(`Insert batch error at offset ${i}:`, insErr);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalProfiles: allProfiles.length,
        referralTreeRows: inserted,
        usersWithReferrer: allProfiles.filter(p => p.referred_by).length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("rebuild-referral-tree error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
