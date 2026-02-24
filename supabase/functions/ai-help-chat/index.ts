import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are NoCap AI Assistant — a friendly, helpful chatbot for the NoCap digital wallet and marketplace app. You help members and merchants with questions about the app. Keep answers concise, clear, and friendly. Use RM (Malaysian Ringgit) for currency. Use markdown for formatting when helpful.

## Language
You are bilingual — you understand and respond fluently in both **English** and **Bahasa Melayu (Malay)**. Always reply in the same language the user is writing in. If the user writes in Malay, respond entirely in Malay. If they write in English, respond in English. If they mix both, match their style. Never switch languages unless the user does.

## About NoCap
NoCap is a digital wallet app in Malaysia that lets users:
- **Top Up**: Add money to their wallet via online payment gateway (RaudhahPay)
- **Transfer**: Send money to other NoCap users using their phone number or referral code
- **QR Pay**: Pay merchants by scanning their QR code
- **Marketplace**: Browse and buy products from merchant stores

## Wallet Features
- Users have a digital wallet with a balance in RM
- Top up via online banking (FPX) through RaudhahPay
- Minimum top-up: RM 10
- Transfer to other users instantly
- Every payment to merchants earns automatic cashback based on the merchant's commission rate

## AI Transfer
- You can help users transfer money by asking for the recipient's email and amount
- Just say something like "transfer RM10 to user@email.com" and you'll handle it
- Transfers below RM100 can be done via chat; for RM100+ the user must use the Transfer page (PIN required)
- Always confirm the transfer details before executing
- You can also check the user's wallet balance when they ask "what's my balance?" or similar

## Account & Transaction Tools
- You can look up the user's **profile info** (name, phone, referral code, PIN status, address) when they ask "what's my account info?" or similar
- You can **update profile info** (name, phone, address) when they ask "change my name to..." or "update my address" — always confirm the new values before saving
- You can show **recent transactions** (top-ups, transfers, payments, commissions) when they ask "show my transactions" or "what did I spend today?"
- You can show **referral stats** (how many people referred, total commission earned) when they ask "how many people have I referred?" or "show my referral stats"
- Use these tools proactively when a user's question relates to their account or transaction history

## Transaction PIN
- Users must set a 6-digit PIN for transactions (transfers, payments)
- PIN can be set from Profile → Set PIN
- If PIN is forgotten, use Profile → Reset PIN (requires email OTP verification)
- PIN is locked after 3 failed attempts for 30 minutes

## Referral System
- Every user gets a unique referral code
- Share your code → friends sign up → you earn commission when they transact
- Commission tiers: Tier 1 (direct referral) earns the most, up to Tier 5
- Commission rates are set by the admin

## Merchant Features
- Apply to become a merchant from the app
- Once approved, manage branches, set commission rates
- Each branch gets a unique QR code for receiving payments
- View transactions, analytics, and settlement reports
- Request withdrawals to bank account
- Create and manage marketplace stores

## Marketplace
- Merchants can create online stores with products
- Buyers browse stores, add items to cart, and checkout
- Payment methods: NoCap Wallet or Online Payment
- Order lifecycle: Pending → Confirmed → Processing → Shipped → Delivered
- Buyers can track orders from "My Orders"
- Buyers can leave reviews and ratings after delivery
- Merchants can set shipping rates, free shipping thresholds, and discount codes

## Order Status Meanings
- **Pending**: Order placed, awaiting merchant confirmation
- **Confirmed**: Merchant accepted the order
- **Processing**: Order is being prepared
- **Shipped**: Order dispatched, tracking number may be available
- **Delivered**: Order received by buyer
- **Cancelled**: Order was cancelled

## Common Troubleshooting
- "Payment failed" → Check wallet balance, ensure PIN is correct
- "Can't find a store" → Store may be in draft mode (not yet live)
- "Order not received" → Check order status, contact merchant via store WhatsApp
- "Forgot PIN" → Go to Profile → Reset PIN

## For Merchants
- Add products via Merchant Dashboard → Marketplace tab
- Process orders: Confirm → Process → Ship (add tracking) → mark Delivered
- View sales analytics and settlement reports
- Set up API apps for integration with external systems
- Manage branch owners and store managers

## Important Notes
- You can ONLY help with NoCap-related questions
- If asked about unrelated topics, politely redirect to NoCap help
- If unsure, suggest contacting support@nocap.my
- You have tools to search products, check order status, and browse stores — use them when relevant
- When showing product results, include name, price, and store name
- When showing order results, include order number, status, total, and date`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search marketplace products by keyword, category, or price range. Use when users ask about available products or want to find something specific.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keyword for product name or description",
          },
          max_price: {
            type: "number",
            description: "Maximum price filter in RM",
          },
          category: {
            type: "string",
            description: "Category name to filter by",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_order_status",
      description:
        "Check the status of a specific order by order number. Only works for the authenticated user's own orders.",
      parameters: {
        type: "object",
        properties: {
          order_number: {
            type: "string",
            description: "The order number (e.g. NC-xxxx)",
          },
        },
        required: ["order_number"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_orders",
      description:
        "List the authenticated user's recent orders. Use when user asks about their orders without specifying a number.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_stores",
      description:
        "Browse available marketplace stores or search for a specific store.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keyword for store name",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_money",
      description:
        "Transfer money from the authenticated user's wallet to another user identified by their email address. Use when user asks to send/transfer money to someone.",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "Recipient's email address",
          },
          amount: {
            type: "number",
            description: "Amount in RM to transfer",
          },
        },
        required: ["email", "amount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_balance",
      description:
        "Check the authenticated user's wallet balance. Use when user asks about their balance, how much money they have, etc.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_profile",
      description:
        "Get the authenticated user's profile information including name, phone, referral code, PIN status, and address. Use when user asks about their account info, referral code, or PIN status.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_transactions",
      description:
        "List the authenticated user's recent wallet transactions (top-ups, transfers, payments, cashback, commissions, etc.). Use when user asks about their transaction history, recent spending, or specific transaction types.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of transactions to return (default 10, max 20)",
          },
          type: {
            type: "string",
            description: "Filter by transaction type: top_up, payment, transfer_in, transfer_out, cashback, commission, withdrawal, refund",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_referral_info",
      description:
        "Get the authenticated user's referral statistics including referral code, number of direct referrals, total network size, and total commission earned. Use when user asks about their referrals or referral earnings.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_my_profile",
      description:
        "Update the authenticated user's profile information. Can update name, phone number, and/or address. Always confirm the new values with the user before calling this tool.",
      parameters: {
        type: "object",
        properties: {
          full_name: {
            type: "string",
            description: "New full name (max 100 characters)",
          },
          phone: {
            type: "string",
            description: "New phone number (Malaysian format, e.g. 0123456789)",
          },
          address: {
            type: "string",
            description: "New address (max 500 characters)",
          },
        },
        additionalProperties: false,
      },
    },
  },
];

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string | null,
  authHeader: string | null
) {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  switch (toolName) {
    case "search_products": {
      let query = supabaseAdmin
        .from("marketplace_products")
        .select("id, name, price, description, images, store_id, marketplace_stores(store_name, slug)")
        .eq("status", "active")
        .limit(10);

      if (args.query) {
        query = query.or(
          `name.ilike.%${args.query}%,description.ilike.%${args.query}%`
        );
      }
      if (args.max_price) {
        query = query.lte("price", args.max_price);
      }
      const { data, error } = await query.order("is_featured", { ascending: false });
      if (error) return { error: error.message };
      return {
        products: (data || []).map((p: any) => ({
          name: p.name,
          price: `RM ${Number(p.price).toFixed(2)}`,
          description: p.description?.slice(0, 100),
          store: p.marketplace_stores?.store_name,
          store_slug: p.marketplace_stores?.slug,
        })),
        count: data?.length || 0,
      };
    }

    case "check_order_status": {
      if (!userId) return { error: "You need to be logged in to check orders." };
      const { data, error } = await supabaseAdmin
        .from("marketplace_orders")
        .select("order_number, status, payment_status, total_amount, created_at, tracking_number, marketplace_stores(store_name)")
        .eq("buyer_user_id", userId)
        .eq("order_number", args.order_number)
        .single();
      if (error) return { error: "Order not found or you don't have access." };
      return {
        order_number: data.order_number,
        status: data.status,
        payment_status: data.payment_status,
        total: `RM ${Number(data.total_amount).toFixed(2)}`,
        date: new Date(data.created_at).toLocaleDateString("en-MY"),
        tracking: data.tracking_number,
        store: (data as any).marketplace_stores?.store_name,
      };
    }

    case "list_my_orders": {
      if (!userId) return { error: "You need to be logged in to view orders." };
      const { data, error } = await supabaseAdmin
        .from("marketplace_orders")
        .select("order_number, status, total_amount, created_at, marketplace_stores(store_name)")
        .eq("buyer_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return { error: error.message };
      return {
        orders: (data || []).map((o: any) => ({
          order_number: o.order_number,
          status: o.status,
          total: `RM ${Number(o.total_amount).toFixed(2)}`,
          date: new Date(o.created_at).toLocaleDateString("en-MY"),
          store: o.marketplace_stores?.store_name,
        })),
        count: data?.length || 0,
      };
    }

    case "browse_stores": {
      let query = supabaseAdmin
        .from("marketplace_stores")
        .select("store_name, slug, description, tagline")
        .eq("status", "live")
        .limit(10);
      if (args.query) {
        query = query.ilike("store_name", `%${args.query}%`);
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      return {
        stores: (data || []).map((s: any) => ({
          name: s.store_name,
          slug: s.slug,
          description: s.description?.slice(0, 100),
          tagline: s.tagline,
        })),
        count: data?.length || 0,
      };
    }

    case "check_balance": {
      if (!userId) return { error: "You need to be logged in to check your balance." };
      const { data, error } = await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .eq("wallet_type", "member")
        .single();
      if (error || !data) return { error: "Could not retrieve your wallet balance." };
      return { balance: `RM ${Number(data.balance).toFixed(2)}` };
    }

    case "get_my_profile": {
      if (!userId) return { error: "You need to be logged in to view your profile." };
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("full_name, phone, referral_code, has_pin, address")
        .eq("user_id", userId)
        .single();
      if (error || !data) return { error: "Could not retrieve your profile information." };
      return {
        name: data.full_name || "Not set",
        phone: data.phone || "Not set",
        referral_code: data.referral_code,
        has_pin: data.has_pin,
        address: data.address || "Not set",
      };
    }

    case "list_my_transactions": {
      if (!userId) return { error: "You need to be logged in to view transactions." };
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
      let query = supabaseAdmin
        .from("transactions")
        .select("type, amount, description, created_at, status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (args.type) {
        query = query.eq("type", args.type);
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      return {
        transactions: (data || []).map((t: any) => ({
          type: t.type,
          amount: `RM ${Number(t.amount).toFixed(2)}`,
          description: t.description || "-",
          date: new Date(t.created_at).toLocaleDateString("en-MY"),
          status: t.status,
        })),
        count: data?.length || 0,
      };
    }

    case "get_referral_info": {
      if (!userId) return { error: "You need to be logged in to view referral info." };
      
      // Get referral code
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("referral_code")
        .eq("user_id", userId)
        .single();

      // Count direct referrals (tier 1) and total network
      const { data: directRefs } = await supabaseAdmin
        .from("referral_tree")
        .select("id", { count: "exact" })
        .eq("ancestor_id", userId)
        .eq("tier", 1);

      const { data: totalNetwork } = await supabaseAdmin
        .from("referral_tree")
        .select("id", { count: "exact" })
        .eq("ancestor_id", userId);

      // Sum commission earned
      const { data: commissions } = await supabaseAdmin
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "commission")
        .eq("status", "completed");

      const totalCommission = (commissions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount), 0
      );

      return {
        referral_code: profile?.referral_code || "N/A",
        direct_referrals: directRefs?.length || 0,
        total_network: totalNetwork?.length || 0,
        total_commission_earned: `RM ${totalCommission.toFixed(2)}`,
      };
    }

    case "update_my_profile": {
      if (!userId) return { error: "You need to be logged in to update your profile." };

      const updates: Record<string, string> = {};
      
      if (args.full_name !== undefined) {
        const name = String(args.full_name).trim();
        if (!name || name.length > 100) return { error: "Name must be between 1 and 100 characters." };
        updates.full_name = name;
      }
      if (args.phone !== undefined) {
        const phone = String(args.phone).trim().replace(/\s+/g, "");
        if (!/^0\d{9,10}$/.test(phone)) return { error: "Please provide a valid Malaysian phone number (e.g. 0123456789)." };
        updates.phone = phone;
      }
      if (args.address !== undefined) {
        const address = String(args.address).trim();
        if (!address || address.length > 500) return { error: "Address must be between 1 and 500 characters." };
        updates.address = address;
      }

      if (Object.keys(updates).length === 0) {
        return { error: "No fields provided to update. You can update: name, phone, or address." };
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);

      if (error) return { error: "Failed to update profile. Please try again." };

      return {
        success: true,
        message: "Profile updated successfully.",
        updated_fields: updates,
      };
    }

    case "transfer_money": {
      if (!userId) return { error: "You need to be logged in to make transfers." };
      
      const recipientEmail = String(args.email || "").trim().toLowerCase();
      const amount = Number(args.amount);
      
      if (!recipientEmail) return { error: "Please provide the recipient's email address." };
      if (!amount || amount <= 0) return { error: "Please provide a valid amount greater than 0." };

      // Check PIN threshold from system_settings
      const { data: settingsData } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", "min_pin_amount")
        .single();
      const minPinAmount = settingsData ? Number(settingsData.value) : 100;

      if (amount >= minPinAmount) {
        return { error: `For transfers of RM${minPinAmount.toFixed(0)} and above, please use the Transfer page where you can enter your PIN securely.` };
      }

      // Look up recipient by email
      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const recipient = allUsers?.users?.find(u => u.email?.toLowerCase() === recipientEmail);
      
      if (!recipient) {
        return { error: `No NoCap user found with email ${recipientEmail}.` };
      }

      if (recipient.id === userId) {
        return { error: "You cannot transfer to yourself." };
      }

      // Call process-transfer edge function
      const transferResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader || "",
          },
          body: JSON.stringify({
            recipient_user_id: recipient.id,
            amount: amount,
          }),
        }
      );

      const transferResult = await transferResponse.json();

      if (!transferResponse.ok) {
        return { error: transferResult.error || "Transfer failed. Please try again." };
      }

      return {
        success: true,
        message: `RM${amount.toFixed(2)} has been transferred to ${recipientEmail}.`,
        new_balance: transferResult.new_balance != null ? `RM ${Number(transferResult.new_balance).toFixed(2)}` : undefined,
        transaction_id: transferResult.transaction_id,
      };
    }

    default:
      return { error: "Unknown tool" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract user ID from auth header by decoding JWT payload
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        // Decode JWT payload without server roundtrip (avoids session_not_found errors)
        const payloadBase64 = token.split(".")[1];
        if (payloadBase64) {
          const payload = JSON.parse(atob(payloadBase64));
          userId = payload.sub || null;
        }
      } catch {
        // Not authenticated — that's fine, tools will return appropriate messages
      }
    }

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // First call — may return tool_calls
    const firstResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools,
          stream: false,
        }),
      }
    );

    if (!firstResponse.ok) {
      const status = firstResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "I'm receiving too many requests right now. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await firstResponse.text();
      console.error("AI gateway error:", status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstData = await firstResponse.json();
    const choice = firstData.choices?.[0];

    // If no tool calls, return the response
    if (!choice?.message?.tool_calls?.length) {
      return new Response(
        JSON.stringify({ reply: choice?.message?.content || "I'm not sure how to help with that." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute tool calls
    const toolMessages = [];
    for (const tc of choice.message.tool_calls) {
      const args = typeof tc.function.arguments === "string"
        ? JSON.parse(tc.function.arguments)
        : tc.function.arguments;
      const result = await executeToolCall(tc.function.name, args, userId, authHeader);
      toolMessages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }

    // Second call with tool results — stream this one
    const secondResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [...aiMessages, choice.message, ...toolMessages],
          stream: true,
        }),
      }
    );

    if (!secondResponse.ok) {
      const t = await secondResponse.text();
      console.error("AI second call error:", secondResponse.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(secondResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-help-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
