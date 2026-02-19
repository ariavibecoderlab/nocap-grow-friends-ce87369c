import Deno from "https://deno.land/std@0.168.0/node/global.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const validatedItems = [];
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
        await adminClient.from('marketplace_order_items').insert({ order_id: order.id, product_id: item.product_id, product_name: item.product.name, product_image: item.product.images?.[0] ?? '', unit_price: item.product.price, quantity: item.quantity, subtotal: item.itemSubtotal });
        await adminClient.from('marketplace_products').update({ stock_quantity: item.product.stock_quantity - item.quantity }).eq('id', item.product_id);
      }

      // Notify merchant
      await adminClient.from('notifications').insert({ user_id: store.merchant_user_id, title: 'New Order!', message: `New order #${orderNum} for RM ${totalAmount.toFixed(2)}`, type: 'order', link: '/marketplace/manage/orders' });

      return new Response(JSON.stringify({ success: true, order_id: order.id, order_number: orderNum }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Online payment — create pending order first, then bill
    const { data: order } = await adminClient.from('marketplace_orders').insert({
      order_number: orderNum, store_id, buyer_user_id: buyerUserId, buyer_name, buyer_email, buyer_phone, shipping_address, notes,
      subtotal, shipping_fee: shippingFee, total_amount: totalAmount, platform_fee: platformFee,
      payment_method: 'online', payment_status: 'pending', status: 'pending',
    }).select().single();

    for (const item of validatedItems) {
      await adminClient.from('marketplace_order_items').insert({ order_id: order.id, product_id: item.product_id, product_name: item.product.name, product_image: item.product.images?.[0] ?? '', unit_price: item.product.price, quantity: item.quantity, subtotal: item.itemSubtotal });
    }

    return new Response(JSON.stringify({ success: true, order_id: order.id, order_number: orderNum, requires_online_payment: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
