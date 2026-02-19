import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const email: string = (body?.email ?? "").trim().toLowerCase();
    const orderNumber: string = (body?.order_number ?? "").trim().toUpperCase();

    // ── Input validation ──────────────────────────────────────────────────
    if (!email || !orderNumber) {
      return new Response(
        JSON.stringify({ error: "email and order_number are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (orderNumber.length > 30 || !/^[A-Z0-9\-]+$/.test(orderNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid order number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Service-role query (bypasses RLS safely with our own filters) ─────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await supabase
      .from("marketplace_orders")
      .select(`
        id,
        order_number,
        status,
        payment_status,
        payment_method,
        subtotal,
        shipping_fee,
        total_amount,
        buyer_name,
        tracking_number,
        created_at,
        updated_at,
        marketplace_stores ( store_name, slug, primary_color )
      `)
      .eq("order_number", orderNumber)
      .eq("buyer_email", email)   // ← email must match exactly
      .maybeSingle();

    if (error) throw error;

    if (!order) {
      // Deliberately vague — don't reveal whether the order number exists
      return new Response(
        JSON.stringify({ error: "No order found. Please check your email and order number." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch items (no sensitive data here) ─────────────────────────────
    const { data: items } = await supabase
      .from("marketplace_order_items")
      .select("product_name, product_image, unit_price, quantity, subtotal")
      .eq("order_id", order.id);

    return new Response(
      JSON.stringify({ order, items: items ?? [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("guest-order-lookup error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
