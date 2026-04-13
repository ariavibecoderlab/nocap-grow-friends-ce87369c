import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { store_id, csv_data } = await req.json();
    if (!store_id || !csv_data || typeof csv_data !== "string") {
      return new Response(JSON.stringify({ error: "store_id and csv_data are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify merchant owns the store
    const { data: store } = await userClient
      .from("marketplace_stores")
      .select("id")
      .eq("id", store_id)
      .eq("merchant_user_id", user.id)
      .maybeSingle();

    if (!store) {
      return new Response(JSON.stringify({ error: "Store not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse CSV
    const lines = csv_data.trim().split("\n");
    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: "CSV must have a header row and at least one data row" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/"/g, ""));
    const requiredFields = ["name", "price"];
    for (const f of requiredFields) {
      if (!headers.includes(f)) {
        return new Response(JSON.stringify({ error: `Missing required column: ${f}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const results: { row: number; success: boolean; error?: string; name?: string }[] = [];
    const products: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parse (handles quoted fields)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
        current += char;
      }
      values.push(current.trim());

      const row: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { row[h] = values[idx] || ""; });

      if (!row.name) {
        results.push({ row: i + 1, success: false, error: "Missing name" });
        continue;
      }

      const price = parseFloat(row.price);
      if (isNaN(price) || price < 0) {
        results.push({ row: i + 1, success: false, error: "Invalid price", name: row.name });
        continue;
      }

      const stock = parseInt(row.stock_quantity || row.stock || "0");

      products.push({
        store_id,
        name: row.name,
        price,
        stock_quantity: isNaN(stock) ? 0 : stock,
        description: row.description || null,
        sku: row.sku || null,
        status: row.status === "active" ? "active" : "draft",
        weight_kg: row.weight_kg ? parseFloat(row.weight_kg) : null,
        images: [],
      });
      results.push({ row: i + 1, success: true, name: row.name });
    }

    // Bulk insert using service role for efficiency
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let insertedCount = 0;
    if (products.length > 0) {
      // Insert in batches of 50
      for (let i = 0; i < products.length; i += 50) {
        const batch = products.slice(i, i + 50);
        const { error: insertError, data: inserted } = await serviceClient
          .from("marketplace_products")
          .insert(batch)
          .select("id");

        if (insertError) {
          // Mark remaining as failed
          for (let j = i; j < products.length; j++) {
            const idx = results.findIndex((r) => r.success && r.name === products[j].name);
            if (idx !== -1) results[idx] = { ...results[idx], success: false, error: insertError.message };
          }
          break;
        }
        insertedCount += (inserted?.length || 0);
      }
    }

    return new Response(
      JSON.stringify({
        total_rows: lines.length - 1,
        inserted: insertedCount,
        errors: results.filter((r) => !r.success),
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
