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

    // Verify caller
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

    const { targetUserId, reassignReferrerCode } = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "targetUserId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId === adminUserId) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
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

    // Resolve new referrer for children
    let newReferrerProfileId: string | null = null;
    let newReferrerUserId: string | null = null;

    if (reassignReferrerCode) {
      const { data: referrerProfile } = await db
        .from("profiles")
        .select("id, user_id, referral_code")
        .eq("referral_code", reassignReferrerCode)
        .single();

      if (!referrerProfile) {
        return new Response(JSON.stringify({ error: "Reassign referrer code not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (referrerProfile.user_id === targetUserId) {
        return new Response(JSON.stringify({ error: "Cannot reassign to the user being deleted" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      newReferrerProfileId = referrerProfile.id;
      newReferrerUserId = referrerProfile.user_id;
    }

    // Find direct children (profiles whose referred_by = target's profile id)
    const { data: children } = await db
      .from("profiles")
      .select("id, user_id")
      .eq("referred_by", targetProfile.id);

    const childList = children || [];

    // Reassign each child's referred_by
    for (const child of childList) {
      await db
        .from("profiles")
        .update({ referred_by: newReferrerProfileId })
        .eq("id", child.id);

      // Delete and rebuild referral_tree for this child
      await db.from("referral_tree").delete().eq("user_id", child.user_id);

      if (newReferrerUserId) {
        // Tier 1: direct referrer
        await db.from("referral_tree").insert({
          user_id: child.user_id,
          ancestor_id: newReferrerUserId,
          tier: 1,
        });

        // Tiers 2-5: ancestors of the new referrer
        const { data: refAncestors } = await db
          .from("referral_tree")
          .select("ancestor_id, tier")
          .eq("user_id", newReferrerUserId)
          .order("tier", { ascending: true })
          .limit(4);

        for (const anc of refAncestors || []) {
          await db.from("referral_tree").insert({
            user_id: child.user_id,
            ancestor_id: anc.ancestor_id,
            tier: anc.tier + 1,
          });
        }
      }

      // Rebuild descendants of this child
      const { data: descendants } = await db
        .from("referral_tree")
        .select("user_id")
        .eq("ancestor_id", child.user_id);

      const descIds = [...new Set((descendants || []).map((d) => d.user_id))];

      for (const descUserId of descIds) {
        await db.from("referral_tree").delete().eq("user_id", descUserId);

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
    }

    // Now delete the target user's data
    // 1. Delete referral_tree entries
    await db.from("referral_tree").delete().eq("user_id", targetUserId);
    await db.from("referral_tree").delete().eq("ancestor_id", targetUserId);

    // 2. Delete wallets
    await db.from("wallets").delete().eq("user_id", targetUserId);

    // 3. Delete notifications
    await db.from("notifications").delete().eq("user_id", targetUserId);

    // 4. Delete user_roles
    await db.from("user_roles").delete().eq("user_id", targetUserId);

    // 5. Delete profile
    await db.from("profiles").delete().eq("user_id", targetUserId);

    // 6. Delete auth user
    const { error: authDeleteErr } = await db.auth.admin.deleteUser(targetUserId);
    if (authDeleteErr) {
      console.error("Failed to delete auth user:", authDeleteErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: targetUserId,
        childrenReassigned: childList.length,
        reassignedTo: reassignReferrerCode || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-delete-member error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
