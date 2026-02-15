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

    // Verify user with anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin role
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    let result;

    switch (action) {
      case "approve_merchant": {
        const { applicationId, applicationUserId } = body;
        // Update application status
        const { error: updateErr } = await adminClient
          .from("merchant_applications")
          .update({
            status: "approved",
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", applicationId);
        if (updateErr) throw updateErr;

        // Assign merchant role (ignore if already exists)
        await adminClient
          .from("user_roles")
          .upsert(
            { user_id: applicationUserId, role: "merchant" },
            { onConflict: "user_id,role" }
          );

        result = { success: true };
        break;
      }

      case "reject_merchant": {
        const { applicationId: rejId, reason } = body;
        const { error: rejErr } = await adminClient
          .from("merchant_applications")
          .update({
            status: "rejected",
            rejection_reason: reason,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", rejId);
        if (rejErr) throw rejErr;
        result = { success: true };
        break;
      }

      case "update_role": {
        const { targetUserId, role, remove } = body;
        if (remove) {
          const { error } = await adminClient
            .from("user_roles")
            .delete()
            .eq("user_id", targetUserId)
            .eq("role", role);
          if (error) throw error;
        } else {
          const { error } = await adminClient
            .from("user_roles")
            .upsert(
              { user_id: targetUserId, role },
              { onConflict: "user_id,role" }
            );
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      case "update_setting": {
        const { settingId, value } = body;
        const { error } = await adminClient
          .from("system_settings")
          .update({ value, updated_by: userId })
          .eq("id", settingId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "create_setting": {
        const { key, value: val, description } = body;
        const { error } = await adminClient
          .from("system_settings")
          .insert({ key, value: val, description, updated_by: userId });
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
