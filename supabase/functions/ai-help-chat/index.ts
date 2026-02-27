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
- CRITICAL: For transfers, you MUST call the transfer_money tool TWICE:
  1. First call with confirmed=false → shows preview details to user, present these to the user
  2. After user confirms (says yes/ya/confirm), call transfer_money AGAIN with the SAME email and amount but confirmed=true → actually executes
- NEVER generate a transfer success message without calling the transfer_money tool with confirmed=true
- NEVER fabricate or make up transaction IDs or success responses
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
- **Customer Lookup**: Merchants can ask you to look up customer details (name, email, phone, address, order history, total spending) from their store orders. Just ask "find customer Ahmad" or "show orders for customer@email.com"
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

## Soalan Lazim (FAQ Bahasa Melayu)
Berikut adalah soalan yang sering ditanya pengguna dalam Bahasa Melayu. Gunakan jawapan ini sebagai panduan:

- **"Macam mana nak top up?"** → Pergi ke Dashboard → tekan "Top Up" → masukkan jumlah (minimum RM10) → bayar melalui FPX (online banking).
- **"Macam mana nak transfer duit?"** → Pergi ke Transfer → masukkan nombor telefon atau email penerima → masukkan jumlah → sahkan dengan PIN 6 digit anda.
- **"Macam mana nak bayar kedai?"** → Pergi ke "Pay" atau imbas QR code merchant → masukkan jumlah → sahkan dengan PIN.
- **"Macam mana nak set PIN?"** → Pergi ke Settings → My Profile → Set PIN → masukkan PIN 6 digit baru.
- **"Saya lupa PIN, macam mana?"** → Pergi ke Settings → My Profile → Reset PIN → pengesahan OTP akan dihantar ke email anda.
- **"PIN saya kena lock, apa nak buat?"** → PIN dikunci selama 30 minit selepas 3 percubaan gagal. Sila tunggu dan cuba semula, atau reset PIN anda.
- **"Macam mana nak jadi merchant?"** → Pergi ke Dashboard → tekan "Become a Merchant" → isi maklumat perniagaan → tunggu kelulusan admin.
- **"Apa itu cashback?"** → Setiap pembayaran kepada merchant, anda akan dapat cashback secara automatik berdasarkan kadar komisen merchant.
- **"Macam mana nak guna referral code?"** → Kongsikan kod referral anda kepada kawan. Bila mereka daftar guna kod anda dan buat transaksi, anda akan dapat komisen.
- **"Berapa tier referral?"** → Ada 5 tier. Tier 1 (rujukan terus) dapat komisen paling tinggi. Tier 2 hingga Tier 5 dapat komisen secara berperingkat.
- **"Macam mana nak tengok baki wallet?"** → Baki dipaparkan di Dashboard. Atau tanya saya "berapakah baki saya?" dan saya akan semak untuk anda.
- **"Macam mana nak beli barang di marketplace?"** → Pergi ke Shop → pilih kedai → pilih produk → tambah ke cart → checkout dan bayar.
- **"Macam mana nak track order?"** → Pergi ke "My Orders" → tekan order untuk lihat status dan nombor tracking.
- **"Boleh ke saya withdraw duit dari wallet?"** → Ya, merchant boleh request withdrawal ke akaun bank. Pergi ke Merchant Dashboard → Withdrawals.
- **"Apa itu NoCap?"** → NoCap adalah aplikasi dompet digital di Malaysia yang membolehkan anda top up, transfer duit, bayar merchant, dan beli-belah di marketplace.
- **"Adakah NoCap selamat?"** → Ya, NoCap menggunakan PIN transaksi 6 digit dan pengesahan email untuk melindungi akaun anda.
- **"Macam mana nak hubungi sokongan?"** → Anda boleh email ke support@nocap.my atau tanya saya di sini untuk bantuan segera.

## Admin Features (for admin-role users only)
If the user has admin privileges, you can help them with:
- **View all users**: List registered users with their roles and wallet balances
- **Manage user roles**: Grant or remove roles (member, merchant, branch, admin) for any user
- **View all transactions**: See platform-wide transaction history with filters
- **View pending merchant applications**: Check merchants awaiting approval
- **Approve/reject merchants**: Process merchant applications
- **View pending withdrawals**: Check withdrawal requests awaiting approval
- **View platform stats**: Overall platform statistics (total users, transactions, revenue)

When an admin asks about users, transactions, or approvals, use the admin tools. Always confirm destructive actions (role changes, approvals) before executing.

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
        "Transfer money from the authenticated user's wallet to another user identified by their email address. IMPORTANT: You MUST call this tool TWICE for each transfer. First call with confirmed=false to preview details. After user confirms, call again with confirmed=true to execute. NEVER generate success without calling with confirmed=true.",
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
          confirmed: {
            type: "boolean",
            description: "false = preview only, true = execute the transfer",
          },
        },
        required: ["email", "amount", "confirmed"],
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
  // === Admin Tools ===
  {
    type: "function",
    function: {
      name: "admin_list_users",
      description: "List all registered users with their roles and wallet balances. Admin only. Use when admin asks to see users, check a user's role, or find a user.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search by name, phone, or referral code" },
          limit: { type: "number", description: "Number of users to return (default 20, max 50)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_update_role",
      description: "Grant or remove a role for a user. Admin only. Roles: member, merchant, branch, admin. Always confirm with the admin before executing.",
      parameters: {
        type: "object",
        properties: {
          user_email: { type: "string", description: "Email of the user to update" },
          role: { type: "string", description: "Role to grant or remove: member, merchant, branch, admin" },
          action: { type: "string", description: "'grant' to add or 'remove' to remove the role" },
        },
        required: ["user_email", "role", "action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_list_transactions",
      description: "List platform-wide transactions with optional filters. Admin only.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of transactions (default 20, max 50)" },
          type: { type: "string", description: "Filter by type: top_up, payment, transfer_in, transfer_out, cashback, commission, withdrawal, refund" },
          status: { type: "string", description: "Filter by status: pending, completed, failed, cancelled" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_list_merchant_applications",
      description: "List merchant applications, optionally filtered by status. Admin only.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending, approved, rejected (default: all)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_process_merchant",
      description: "Approve or reject a pending merchant application. Admin only. Always confirm before executing.",
      parameters: {
        type: "object",
        properties: {
          application_id: { type: "string", description: "The merchant application ID" },
          action: { type: "string", description: "'approve' or 'reject'" },
          rejection_reason: { type: "string", description: "Reason for rejection (required if rejecting)" },
        },
        required: ["application_id", "action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_list_withdrawals",
      description: "List withdrawal requests, optionally filtered by status. Admin only.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending, approved, rejected (default: all)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_platform_stats",
      description: "Get overall platform statistics: total users, total transactions, revenue, etc. Admin only.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  // === Merchant Tools ===
  {
    type: "function",
    function: {
      name: "merchant_lookup_customer",
      description: "Look up customer details who have ordered from the merchant's store, or list all customers. Merchant only. Optionally search by name, email, phone, or order number. If no search term is provided, returns all customers. Returns customer info, order history, and total spending at the merchant's store.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Optional: search by customer name, email, phone number, or order number. Leave empty to list all customers." },
          store_id: { type: "string", description: "Optional store ID to filter by specific store (if merchant has multiple stores)" },
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
      const confirmed = args.confirmed === true;
      
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

      // Look up recipient by email using paginated listUsers to handle >1000 users
      let recipient: any = null;
      let page = 1;
      while (!recipient) {
        const { data: pageData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr) return { error: "Failed to look up recipient. Please try again." };
        const users = pageData?.users || [];
        if (users.length === 0) break;
        recipient = users.find((u: any) => u.email?.toLowerCase() === recipientEmail);
        if (users.length < 1000) break;
        page++;
      }
      
      if (!recipient) {
        return { error: `No NoCap user found with email ${recipientEmail}.` };
      }

      // Verify recipient profile exists
      const { data: recipientProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name")
        .eq("user_id", recipient.id)
        .single();
      
      if (!recipientProfile) {
        return { error: `User ${recipientEmail} exists but has no wallet profile. They may need to log in first.` };
      }

      if (recipient.id === userId) {
        return { error: "You cannot transfer to yourself." };
      }

      // === PREVIEW MODE (confirmed=false) ===
      if (!confirmed) {
        // Get sender's balance for preview
        const { data: senderWallet } = await supabaseAdmin
          .from("wallets")
          .select("balance")
          .eq("user_id", userId)
          .eq("wallet_type", "member")
          .single();

        const currentBalance = senderWallet ? Number(senderWallet.balance) : 0;
        
        if (currentBalance < amount) {
          return { error: `Insufficient balance. Your current balance is RM ${currentBalance.toFixed(2)}.` };
        }

        console.log(`[AI Transfer] Preview: sender=${userId}, recipient=${recipient.id} (${recipientEmail}), amount=RM${amount}`);

        return {
          preview: true,
          message: "Please confirm this transfer. Call transfer_money again with confirmed=true to execute.",
          recipient_email: recipientEmail,
          recipient_name: recipientProfile.full_name || "Member",
          amount: `RM ${amount.toFixed(2)}`,
          current_balance: `RM ${currentBalance.toFixed(2)}`,
          balance_after: `RM ${(currentBalance - amount).toFixed(2)}`,
        };
      }

      // === EXECUTE MODE (confirmed=true) ===
      console.log(`[AI Transfer] Executing: sender=${userId}, recipient=${recipient.id} (${recipientEmail}), amount=RM${amount}`);

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
        console.error(`[AI Transfer] Failed: sender=${userId}, recipient=${recipient.id}, error=${transferResult.error}`);
        return { error: transferResult.error || "Transfer failed. Please try again." };
      }

      // Verify the transaction was actually created in the database
      if (transferResult.transaction_id) {
        const { data: verifyTx } = await supabaseAdmin
          .from("transactions")
          .select("id, user_id, amount, type")
          .eq("id", transferResult.transaction_id)
          .single();
        
        if (!verifyTx) {
          console.error(`[AI Transfer] CRITICAL: process-transfer returned success but transaction ${transferResult.transaction_id} not found in DB!`);
          return { error: "Transfer may have failed. Please check your transaction history and balance before retrying." };
        }
      }

      console.log(`[AI Transfer] Success: tx=${transferResult.transaction_id}, recipient=${recipientEmail} (${recipient.id}), amount=RM${amount}`);

      return {
        success: true,
        executed: true,
        message: `RM${amount.toFixed(2)} has been transferred to ${recipientEmail} (${recipientProfile.full_name || 'Member'}).`,
        recipient_name: recipientProfile.full_name || "Member",
        recipient_email: recipientEmail,
        new_balance: transferResult.new_balance != null ? `RM ${Number(transferResult.new_balance).toFixed(2)}` : undefined,
        transaction_id: transferResult.transaction_id,
      };
    }

    // === Admin Tools ===
    case "admin_list_users": {
      if (!userId) return { error: "You need to be logged in." };
      const { data: adminCheck } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adminCheck) return { error: "You do not have admin privileges." };

      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
      let profileQuery = supabaseAdmin.from("profiles").select("user_id, full_name, phone, referral_code").limit(limit);
      if (args.search) {
        profileQuery = profileQuery.or(`full_name.ilike.%${args.search}%,phone.ilike.%${args.search}%,referral_code.ilike.%${args.search}%`);
      }
      const { data: profiles, error: pErr } = await profileQuery;
      if (pErr) return { error: pErr.message };

      const userIds = (profiles || []).map((p: any) => p.user_id);
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", userIds);
      const { data: wallets } = await supabaseAdmin.from("wallets").select("user_id, balance").in("user_id", userIds);

      const { data: allAuthUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      allAuthUsers?.users?.forEach((u: any) => { emailMap[u.id] = u.email || ""; });

      return {
        users: (profiles || []).map((p: any) => ({
          name: p.full_name || "No name",
          email: emailMap[p.user_id] || "—",
          phone: p.phone || "—",
          referral_code: p.referral_code,
          roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
          balance: `RM ${Number((wallets || []).find((w: any) => w.user_id === p.user_id)?.balance || 0).toFixed(2)}`,
        })),
        count: profiles?.length || 0,
      };
    }

    case "admin_update_role": {
      if (!userId) return { error: "You need to be logged in." };
      const { data: adminCheck } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adminCheck) return { error: "You do not have admin privileges." };

      const email = String(args.user_email || "").trim().toLowerCase();
      const role = String(args.role || "").trim();
      const action = String(args.action || "").trim();

      if (!["member", "merchant", "branch", "admin"].includes(role)) return { error: "Invalid role." };
      if (!["grant", "remove"].includes(action)) return { error: "Action must be 'grant' or 'remove'." };

      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const targetUser = allUsers?.users?.find((u: any) => u.email?.toLowerCase() === email);
      if (!targetUser) return { error: `No user found with email ${email}.` };

      if (action === "grant") {
        const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: targetUser.id, role }).select();
        if (error?.code === "23505") return { message: `User already has the '${role}' role.` };
        if (error) return { error: error.message };
        return { success: true, message: `Granted '${role}' role to ${email}.` };
      } else {
        const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUser.id).eq("role", role);
        if (error) return { error: error.message };
        return { success: true, message: `Removed '${role}' role from ${email}.` };
      }
    }

    case "admin_list_transactions": {
      if (!userId) return { error: "You need to be logged in." };
      const { data: adminCheck } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adminCheck) return { error: "You do not have admin privileges." };

      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
      let query = supabaseAdmin.from("transactions").select("type, amount, description, created_at, status, user_id").order("created_at", { ascending: false }).limit(limit);
      if (args.type) query = query.eq("type", args.type);
      if (args.status) query = query.eq("status", args.status);
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

    case "admin_list_merchant_applications": {
      if (!userId) return { error: "You need to be logged in." };
      const { data: adminCheck } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adminCheck) return { error: "You do not have admin privileges." };

      let query = supabaseAdmin.from("merchant_applications").select("id, business_name, business_type, status, created_at, user_id").order("created_at", { ascending: false }).limit(20);
      if (args.status) query = query.eq("status", args.status);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return {
        applications: (data || []).map((a: any) => ({
          id: a.id,
          business_name: a.business_name,
          business_type: a.business_type || "—",
          status: a.status,
          date: new Date(a.created_at).toLocaleDateString("en-MY"),
        })),
        count: data?.length || 0,
      };
    }

    case "admin_process_merchant": {
      if (!userId) return { error: "You need to be logged in." };
      const { data: adminCheck } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adminCheck) return { error: "You do not have admin privileges." };

      const appId = String(args.application_id || "").trim();
      const action = String(args.action || "").trim();
      if (!["approve", "reject"].includes(action)) return { error: "Action must be 'approve' or 'reject'." };

      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-actions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: action === "approve" ? "approve_merchant" : "reject_merchant",
            applicationId: appId,
            rejectionReason: args.rejection_reason || "",
            reviewedBy: userId,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) return { error: result.error || `Failed to ${action} merchant.` };
      return { success: true, message: `Merchant application ${action === "approve" ? "approved" : "rejected"} successfully.` };
    }

    case "admin_list_withdrawals": {
      if (!userId) return { error: "You need to be logged in." };
      const { data: adminCheck } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adminCheck) return { error: "You do not have admin privileges." };

      let query = supabaseAdmin.from("withdrawal_requests").select("id, amount, bank_name, bank_account_no, bank_account_holder, status, created_at, wallet_type").order("created_at", { ascending: false }).limit(20);
      if (args.status) query = query.eq("status", args.status);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return {
        withdrawals: (data || []).map((w: any) => ({
          id: w.id,
          amount: `RM ${Number(w.amount).toFixed(2)}`,
          bank: `${w.bank_name} - ${w.bank_account_no} (${w.bank_account_holder})`,
          status: w.status,
          wallet_type: w.wallet_type,
          date: new Date(w.created_at).toLocaleDateString("en-MY"),
        })),
        count: data?.length || 0,
      };
    }

    case "admin_platform_stats": {
      if (!userId) return { error: "You need to be logged in." };
      const { data: adminCheck } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adminCheck) return { error: "You do not have admin privileges." };

      const [
        { count: totalUsers },
        { count: totalMerchants },
        { data: txns },
        { count: pendingMerchants },
        { count: pendingWithdrawals },
      ] = await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "merchant"),
        supabaseAdmin.from("transactions").select("amount").eq("status", "completed"),
        supabaseAdmin.from("merchant_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabaseAdmin.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      const totalVolume = (txns || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      return {
        total_users: totalUsers || 0,
        total_merchants: totalMerchants || 0,
        total_transaction_volume: `RM ${totalVolume.toFixed(2)}`,
        pending_merchant_applications: pendingMerchants || 0,
        pending_withdrawals: pendingWithdrawals || 0,
      };
    }

    // === Merchant Tools ===
    case "merchant_lookup_customer": {
      if (!userId) return { error: "You need to be logged in." };
      // Check merchant role
      const { data: merchantCheck } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "merchant").maybeSingle();
      if (!merchantCheck) return { error: "You do not have merchant privileges." };

      const search = String(args.search || "").trim();

      // Get merchant's stores
      let storeQuery = supabaseAdmin.from("marketplace_stores").select("id, store_name").eq("merchant_user_id", userId);
      if (args.store_id) storeQuery = storeQuery.eq("id", args.store_id);
      const { data: stores } = await storeQuery;
      if (!stores?.length) return { error: "You don't have any marketplace stores." };
      const storeIds = stores.map((s: any) => s.id);

      // Query orders — optionally filter by search term
      let orderQuery = supabaseAdmin
        .from("marketplace_orders")
        .select("order_number, status, total_amount, created_at, buyer_name, buyer_email, buyer_phone, shipping_address, buyer_user_id, store_id, tracking_number")
        .in("store_id", storeIds)
        .order("created_at", { ascending: false })
        .limit(100);

      if (search) {
        orderQuery = orderQuery.or(
          `buyer_name.ilike.%${search}%,buyer_email.ilike.%${search}%,buyer_phone.ilike.%${search}%,order_number.ilike.%${search}%`
        );
      }

      const { data: orders, error: oErr } = await orderQuery;
      if (oErr) return { error: oErr.message };
      if (!orders?.length) return { message: search ? `No customers found matching "${search}" in your store orders.` : "No customers have ordered from your store yet." };

      // Group by customer email to aggregate
      const customerMap: Record<string, any> = {};
      for (const o of orders) {
        const key = o.buyer_email.toLowerCase();
        if (!customerMap[key]) {
          customerMap[key] = {
            name: o.buyer_name,
            email: o.buyer_email,
            phone: o.buyer_phone,
            address: o.shipping_address,
            total_spent: 0,
            order_count: 0,
            orders: [],
          };
        }
        customerMap[key].total_spent += Number(o.total_amount);
        customerMap[key].order_count += 1;
        customerMap[key].orders.push({
          order_number: o.order_number,
          status: o.status,
          total: `RM ${Number(o.total_amount).toFixed(2)}`,
          date: new Date(o.created_at).toLocaleDateString("en-MY"),
          tracking: o.tracking_number || null,
        });
      }

      const customers = Object.values(customerMap).map((c: any) => ({
        ...c,
        total_spent: `RM ${c.total_spent.toFixed(2)}`,
      }));

      return {
        customers,
        count: customers.length,
        store_names: stores.map((s: any) => s.store_name),
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
    let currentChoice = firstData.choices?.[0];

    // If no tool calls, return the response
    if (!currentChoice?.message?.tool_calls?.length) {
      return new Response(
        JSON.stringify({ reply: currentChoice?.message?.content || "I'm not sure how to help with that." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Multi-round tool calling loop (max 3 rounds to prevent infinite loops)
    let conversationMessages = [...aiMessages];
    for (let round = 0; round < 3; round++) {
      // Execute tool calls
      const toolMessages = [];
      for (const tc of currentChoice.message.tool_calls) {
        const tcArgs = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
        const result = await executeToolCall(tc.function.name, tcArgs, userId, authHeader);
        toolMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      conversationMessages = [...conversationMessages, currentChoice.message, ...toolMessages];

      // Next call with tool results
      const nextResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: conversationMessages,
            tools,
            stream: false,
          }),
        }
      );

      if (!nextResponse.ok) {
        const t = await nextResponse.text();
        console.error(`AI round ${round + 1} error:`, nextResponse.status, t);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nextData = await nextResponse.json();
      currentChoice = nextData.choices?.[0];

      // If no more tool calls, stream the final response
      if (!currentChoice?.message?.tool_calls?.length) {
        // Make a final streaming call for the response
        const finalResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [...conversationMessages, currentChoice.message],
              stream: true,
            }),
          }
        );

        if (!finalResponse.ok) {
          // Fallback: return the non-streamed content
          return new Response(
            JSON.stringify({ reply: currentChoice?.message?.content || "Done." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(finalResponse.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
      // Otherwise, loop continues to execute the next round of tool calls
    }

    // If we exhausted rounds, return whatever content we have
    return new Response(
      JSON.stringify({ reply: currentChoice?.message?.content || "I completed the requested actions." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-help-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
