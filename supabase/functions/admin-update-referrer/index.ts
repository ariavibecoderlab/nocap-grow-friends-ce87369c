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

    // Verify caller identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminUserId = claimsData.claims.sub as string;

    // Use service role for all DB ops
    const db = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin role
    const { data: adminRole } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check ai_only_admin
    const { data: aiSetting } = await db
      .from("system_settings")
      .select("value")
      .eq("key", "ai_only_admin_ids")
      .maybeSingle();
    if (aiSetting?.value) {
      const ids = aiSetting.value.split(",").map((id: string) => id.trim());
      if (ids.includes(adminUserId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { targetUserId, newReferrerCode } = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "targetUserId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target profile
    const { data: targetProfile } = await db
      .from("profiles")
      .select("id, user_id, referral_code")
      .eq("user_id", targetUserId)
      .single();

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let newReferrerProfileId: string | null = null;
    let newReferrerUserId: string | null = null;

    // If newReferrerCode is empty/null, we're removing the referrer
    if (newReferrerCode) {
      const { data: referrerProfile } = await db
        .from("profiles")
        .select("id, user_id, referral_code")
        .eq("referral_code", newReferrerCode)
        .single();

      if (!referrerProfile) {
        return new Response(JSON.stringify({ error: "Referrer code not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (referrerProfile.user_id === targetUserId) {
        return new Response(JSON.stringify({ error: "Cannot set user as their own referrer" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Circular reference check: walk up referrer's ancestor chain
      // If targetUserId is an ancestor of the new referrer, it would create a cycle
      const { data: referrerAncestors } = await db
        .from("referral_tree")
        .select("ancestor_id")
        .eq("user_id", referrerProfile.user_id);

      const ancestorIds = (referrerAncestors || []).map((a) => a.ancestor_id);
      if (ancestorIds.includes(targetUserId)) {
        return new Response(
          JSON.stringify({ error: "Circular reference: target user is an ancestor of the new referrer" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newReferrerProfileId = referrerProfile.id;
      newReferrerUserId = referrerProfile.user_id;
    }

    // 1. Update profiles.referred_by
    await db
      .from("profiles")
      .update({ referred_by: newReferrerProfileId })
      .eq("user_id", targetUserId);

    // 2. Delete existing referral_tree rows for target
    await db.from("referral_tree").delete().eq("user_id", targetUserId);

    // 3. Rebuild referral_tree for target
    if (newReferrerUserId) {
      // Tier 1: direct referrer
      await db.from("referral_tree").insert({
        user_id: targetUserId,
        ancestor_id: newReferrerUserId,
        tier: 1,
      });

      // Tiers 2-5: ancestors of the referrer
      const { data: refAncestors } = await db
        .from("referral_tree")
        .select("ancestor_id, tier")
        .eq("user_id", newReferrerUserId)
        .order("tier", { ascending: true })
        .limit(4);

      for (const anc of refAncestors || []) {
        await db.from("referral_tree").insert({
          user_id: targetUserId,
          ancestor_id: anc.ancestor_id,
          tier: anc.tier + 1,
        });
      }
    }

    // 4. Find all descendants of targetUserId and rebuild their trees
    // A descendant is anyone who has targetUserId as an ancestor
    const { data: descendants } = await db
      .from("referral_tree")
      .select("user_id")
      .eq("ancestor_id", targetUserId);

    const descendantUserIds = [...new Set((descendants || []).map((d) => d.user_id))];

    for (const descUserId of descendantUserIds) {
      // Delete all referral_tree rows for this descendant
      await db.from("referral_tree").delete().eq("user_id", descUserId);

      // Walk up the profiles.referred_by chain and rebuild
      let currentUserId = descUserId;
      let tier = 1;
      const visited = new Set<string>();

      while (tier <= 5) {
        const { data: profile } = await db
          .from("profiles")
          .select("referred_by, user_id")
          .eq("user_id", currentUserId)
          .single();

        if (!profile?.referred_by) break;

        // Get the referrer's user_id from their profile id
        const { data: referrerProfile } = await db
          .from("profiles")
          .select("user_id")
          .eq("id", profile.referred_by)
          .single();

        if (!referrerProfile) break;
        if (visited.has(referrerProfile.user_id)) break;
        visited.add(referrerProfile.user_id);

        await db.from("referral_tree").insert({
          user_id: descUserId,
          ancestor_id: referrerProfile.user_id,
          tier,
        });

        currentUserId = referrerProfile.user_id;
        tier++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: targetUserId,
        newReferrerCode: newReferrerCode || null,
        descendantsRebuilt: descendantUserIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-update-referrer error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
