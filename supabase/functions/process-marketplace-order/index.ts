import Deno from "https://deno.land/std@0.168.0/node/global.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidatedItem {
  product_id: string;
  quantity: number;
  product: { name: string; price: number; stock_quantity: number; images: string[] | null };
  itemSubtotal: number;
}

async function sendOrderConfirmationEmail({
  buyerEmail,
  buyerName,
  orderNumber,
  storeName,
  items,
  subtotal,
  shippingFee,
  totalAmount,
  paymentMethod,
}: {
  buyerEmail: string;
  buyerName: string;
  orderNumber: string;
  storeName: string;
  items: ValidatedItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: string;
}) {
  const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
  if (!sendgridKey || !fromEmail) return;

  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;">${item.product.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:center;">×${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:right;">RM ${item.product.price.toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:600;color:#111827;text-align:right;">RM ${item.itemSubtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const paymentLabel = paymentMethod === 'nocap_wallet' ? 'NoCap Wallet' : 'Online Payment';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmation</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#16a34a;padding:28px 32px;text-align:center;">
          <div style="font-size:28px;margin-bottom:6px;">✅</div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Order Confirmed!</h1>
          <p style="margin:6px 0 0;color:#bbf7d0;font-size:14px;">Thank you for your purchase from <strong>${storeName}</strong></p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0;font-size:15px;color:#374151;">Hi <strong>${buyerName}</strong>,</p>
          <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">We've received your order and it's being processed. Here's a summary:</p>
        </td></tr>

        <!-- Order number -->
        <tr><td style="padding:12px 32px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;display:inline-block;width:100%;box-sizing:border-box;">
            <span style="font-size:12px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Order Number</span>
            <div style="font-size:20px;font-weight:700;color:#15803d;margin-top:2px;">#${orderNumber}</div>
          </div>
        </td></tr>

        <!-- Items table -->
        <tr><td style="padding:8px 32px 0;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Items Ordered</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;">Product</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;">Qty</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;">Price</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </td></tr>

        <!-- Totals -->
        <tr><td style="padding:12px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#6b7280;padding:3px 0;">Subtotal</td>
              <td style="font-size:13px;color:#374151;text-align:right;padding:3px 0;">RM ${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;padding:3px 0;">Shipping</td>
              <td style="font-size:13px;color:#374151;text-align:right;padding:3px 0;">${shippingFee === 0 ? '<span style="color:#16a34a;">FREE</span>' : `RM ${shippingFee.toFixed(2)}`}</td>
            </tr>
            <tr>
              <td colspan="2"><hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;"></td>
            </tr>
            <tr>
              <td style="font-size:16px;font-weight:700;color:#111827;padding:3px 0;">Total</td>
              <td style="font-size:16px;font-weight:700;color:#15803d;text-align:right;padding:3px 0;">RM ${totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#9ca3af;padding:4px 0 0;">Payment method</td>
              <td style="font-size:12px;color:#9ca3af;text-align:right;padding:4px 0 0;">${paymentLabel}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Track order note -->
        <tr><td style="padding:20px 32px;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;font-size:13px;color:#1d4ed8;">
            📦 You can track your order status at <strong>My Orders</strong> on our marketplace.
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated confirmation email from <strong>${storeName}</strong>.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Please do not reply to this email.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendgridKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: buyerEmail, name: buyerName }] }],
      from: { email: fromEmail, name: storeName },
      subject: `Order Confirmed – #${orderNumber}`,
      content: [{ type: 'text/html', value: html }],
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { store_id, items, buyer_name, buyer_email, buyer_phone, shipping_address, notes, payment_method, pin } = body;

    if (!store_id || !items?.length || !buyer_name || !buyer_email || !buyer_phone || !shipping_address) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get store + branch
    const { data: store, error: storeErr } = await adminClient.from('marketplace_stores').select('id, branch_id, merchant_user_id, shipping_flat_rate, free_shipping_min, store_name').eq('id', store_id).eq('status', 'live').single();
    if (storeErr || !store) return new Response(JSON.stringify({ error: 'Store not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Validate buyer (must be logged in for wallet payment)
    let buyerUserId: string | null = null;
    if (payment_method === 'nocap_wallet') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return new Response(JSON.stringify({ error: 'Authentication required for wallet payment' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user } } = await userClient.auth.getUser(token);
      if (!user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      buyerUserId = user.id;
    }

    // Validate + calculate items
    let subtotal = 0;
    const validatedItems: ValidatedItem[] = [];
    for (const item of items) {
      const { data: product } = await adminClient.from('marketplace_products').select('id, name, price, stock_quantity, images, status').eq('id', item.product_id).eq('store_id', store_id).single();
      if (!product || product.status !== 'active') return new Response(JSON.stringify({ error: `Product ${item.product_id} not available` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (product.stock_quantity < item.quantity) return new Response(JSON.stringify({ error: `Insufficient stock for ${product.name}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;
      validatedItems.push({ ...item, product, itemSubtotal });
    }

    const shippingFee = (store.free_shipping_min && subtotal >= store.free_shipping_min) ? 0 : (store.shipping_flat_rate || 0);
    const totalAmount = subtotal + shippingFee;
    const platformFee = Math.round(totalAmount * 0.01 * 100) / 100;

    // Generate order number
    const orderNum = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

    if (payment_method === 'nocap_wallet') {
      // PIN check for >= RM 100
      if (totalAmount >= 100) {
        if (!pin) return new Response(JSON.stringify({ error: 'PIN required for amounts ≥ RM 100' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const { data: profile } = await adminClient.from('profiles').select('pin_hash, pin_attempts, pin_locked_until, has_pin').eq('user_id', buyerUserId).single();
        if (!profile?.has_pin) return new Response(JSON.stringify({ error: 'PIN not set' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (profile.pin_locked_until && new Date(profile.pin_locked_until) > new Date()) return new Response(JSON.stringify({ error: 'PIN locked. Try again later.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const [salt, storedHash] = profile.pin_hash.split(':');
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(salt + pin));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (hashHex !== storedHash) {
          const newAttempts = (profile.pin_attempts || 0) + 1;
          const lockUpdate: any = { pin_attempts: newAttempts };
          if (newAttempts >= 5) lockUpdate.pin_locked_until = new Date(Date.now() + 15 * 60000).toISOString();
          await adminClient.from('profiles').update(lockUpdate).eq('user_id', buyerUserId);
          return new Response(JSON.stringify({ error: 'Invalid PIN', attempts_remaining: 5 - newAttempts }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        await adminClient.from('profiles').update({ pin_attempts: 0 }).eq('user_id', buyerUserId);
      }

      // Deduct buyer wallet
      const { data: buyerWallet } = await adminClient.from('wallets').select('id, balance').eq('user_id', buyerUserId).eq('wallet_type', 'member').single();
      if (!buyerWallet || buyerWallet.balance < totalAmount) return new Response(JSON.stringify({ error: 'Insufficient wallet balance' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await adminClient.from('wallets').update({ balance: buyerWallet.balance - totalAmount }).eq('id', buyerWallet.id);

      // Credit merchant branch wallet
      const { data: branchWallet } = await adminClient.from('wallets').select('id, balance').eq('user_id', store.merchant_user_id).eq('branch_id', store.branch_id).eq('wallet_type', 'merchant').single();
      const creditAmount = totalAmount - platformFee;
      if (branchWallet) {
        await adminClient.from('wallets').update({ balance: branchWallet.balance + creditAmount }).eq('id', branchWallet.id);
      } else {
        await adminClient.from('wallets').insert({ user_id: store.merchant_user_id, branch_id: store.branch_id, wallet_type: 'merchant', balance: creditAmount });
      }

      // Record buyer transaction
      const { data: txn } = await adminClient.from('transactions').insert({ user_id: buyerUserId, type: 'payment', amount: totalAmount, status: 'completed', description: `Marketplace: ${store.store_name}`, fee_amount: platformFee }).select().single();

      // Create order
      const { data: order } = await adminClient.from('marketplace_orders').insert({
        order_number: orderNum, store_id, buyer_user_id: buyerUserId, buyer_name, buyer_email, buyer_phone, shipping_address, notes,
        subtotal, shipping_fee: shippingFee, total_amount: totalAmount, platform_fee: platformFee,
        payment_method: 'nocap_wallet', payment_status: 'paid', status: 'confirmed', transaction_id: txn?.id,
      }).select().single();

      // Create order items + decrement stock
      for (const item of validatedItems) {
        await adminClient.from('marketplace_order_items').insert({ order_id: order.id, product_id: item.product_id, product_name: item.product.name, product_image: (item.product.images as string[])?.[0] ?? '', unit_price: item.product.price, quantity: item.quantity, subtotal: item.itemSubtotal });
        await adminClient.from('marketplace_products').update({ stock_quantity: item.product.stock_quantity - item.quantity }).eq('id', item.product_id);
      }

      // Notify merchant
      await adminClient.from('notifications').insert({ user_id: store.merchant_user_id, title: 'New Order!', message: `New order #${orderNum} for RM ${totalAmount.toFixed(2)}`, type: 'order', link: '/marketplace/manage/orders' });

      // Send confirmation email to buyer (non-blocking)
      sendOrderConfirmationEmail({
        buyerEmail: buyer_email,
        buyerName: buyer_name,
        orderNumber: orderNum,
        storeName: store.store_name,
        items: validatedItems,
        subtotal,
        shippingFee,
        totalAmount,
        paymentMethod: 'nocap_wallet',
      }).catch(() => {/* swallow email errors so order still succeeds */});

      return new Response(JSON.stringify({ success: true, order_id: order.id, order_number: orderNum }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Online payment — create pending order first, then bill
    const { data: order } = await adminClient.from('marketplace_orders').insert({
      order_number: orderNum, store_id, buyer_user_id: buyerUserId, buyer_name, buyer_email, buyer_phone, shipping_address, notes,
      subtotal, shipping_fee: shippingFee, total_amount: totalAmount, platform_fee: platformFee,
      payment_method: 'online', payment_status: 'pending', status: 'pending',
    }).select().single();

    for (const item of validatedItems) {
      await adminClient.from('marketplace_order_items').insert({ order_id: order.id, product_id: item.product_id, product_name: item.product.name, product_image: (item.product.images as string[])?.[0] ?? '', unit_price: item.product.price, quantity: item.quantity, subtotal: item.itemSubtotal });
    }

    return new Response(JSON.stringify({ success: true, order_id: order.id, order_number: orderNum, requires_online_payment: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
