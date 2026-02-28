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
    const { data: { user: callerUser }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminUserId = callerUser.id;

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
      .select("id, user_id, referral_code, referred_by")
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

      // Circular reference handling: if target is an ancestor of new referrer,
      // we need to detach the link that goes through target first.
      const { data: referrerAncestors } = await db
        .from("referral_tree")
        .select("ancestor_id")
        .eq("user_id", referrerProfile.user_id);

      const ancestorIds = (referrerAncestors || []).map((a: any) => a.ancestor_id);
      if (ancestorIds.includes(targetUserId)) {
        // Find which direct child of target is in the chain leading to newReferrer
        // That child's referred_by should be set to target's current referred_by (detach)
        const { data: targetCurrentProfile } = await db
          .from("profiles")
          .select("id, referred_by")
          .eq("user_id", targetUserId)
          .single();

        // Find direct children of target whose subtree contains newReferrer
        const { data: directChildren } = await db
          .from("profiles")
          .select("id, user_id")
          .eq("referred_by", targetCurrentProfile?.id);

        for (const child of directChildren || []) {
          // Check if newReferrer is this child or a descendant of this child
          if (child.user_id === referrerProfile.user_id) {
            await db.from("profiles")
              .update({ referred_by: targetCurrentProfile?.referred_by || null })
              .eq("id", child.id);
            break;
          }
          const { data: childDesc } = await db
            .from("referral_tree")
            .select("user_id")
            .eq("ancestor_id", child.user_id);
          const childDescIds = (childDesc || []).map((d: any) => d.user_id);
          if (childDescIds.includes(referrerProfile.user_id)) {
            await db.from("profiles")
              .update({ referred_by: targetCurrentProfile?.referred_by || null })
              .eq("id", child.id);
            break;
          }
        }
      }

      newReferrerProfileId = referrerProfile.id;
      newReferrerUserId = referrerProfile.user_id;
    }

    // No-op guard: avoid rebuilding large trees when referrer is unchanged.
    if ((targetProfile.referred_by ?? null) === newReferrerProfileId) {
      return new Response(
        JSON.stringify({
          success: true,
          updated: targetUserId,
          newReferrerCode: newReferrerCode || null,
          descendantsRebuilt: 0,
          noOp: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Also find descendants of the detached children (who may have been reparented)
    const { data: allDescendants } = await db
      .from("referral_tree")
      .select("user_id")
      .eq("ancestor_id", targetUserId);

    const { data: targetChildProfiles } = await db
      .from("profiles")
      .select("user_id")
      .eq("referred_by", newReferrerProfileId ? targetProfile.id : null);

    // Gather all users who might need rebuilding
    const rebuildSet = new Set<string>();
    for (const d of allDescendants || []) rebuildSet.add(d.user_id);
    // Also check for any user whose ancestor chain passes through target
    for (const c of targetChildProfiles || []) {
      rebuildSet.add(c.user_id);
      const { data: cDesc } = await db
        .from("referral_tree")
        .select("user_id")
        .eq("ancestor_id", c.user_id);
      for (const cd of cDesc || []) rebuildSet.add(cd.user_id);
    }

    const descendantUserIds = [...rebuildSet];

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
