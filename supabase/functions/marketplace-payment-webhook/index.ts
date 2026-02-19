import Deno from "https://deno.land/std@0.168.0/node/global.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json();
    const billId = body.billcode || body.bill_code || body.BillCode;
    const status = body.status || body.paid_at ? 'paid' : null;

    if (!billId) return new Response('Missing bill ID', { status: 400 });

    // Find order
    const { data: order } = await adminClient.from('marketplace_orders').select('*, marketplace_stores(branch_id, merchant_user_id, store_name)').eq('bill_id', billId).single();
    if (!order) return new Response('Order not found', { status: 404 });
    if (order.payment_status === 'paid') return new Response('Already processed', { status: 200 });

    const store = order.marketplace_stores;

    // Credit merchant branch wallet
    const { data: branchWallet } = await adminClient.from('wallets').select('id, balance').eq('user_id', store.merchant_user_id).eq('branch_id', store.branch_id).eq('wallet_type', 'merchant').single();
    const creditAmount = order.total_amount - order.platform_fee;

    if (branchWallet) {
      await adminClient.from('wallets').update({ balance: branchWallet.balance + creditAmount }).eq('id', branchWallet.id);
    } else {
      await adminClient.from('wallets').insert({ user_id: store.merchant_user_id, branch_id: store.branch_id, wallet_type: 'merchant', balance: creditAmount });
    }

    // Decrement stock
    const { data: orderItems } = await adminClient.from('marketplace_order_items').select('product_id, quantity').eq('order_id', order.id);
    for (const item of orderItems || []) {
      const { data: product } = await adminClient.from('marketplace_products').select('stock_quantity').eq('id', item.product_id).single();
      if (product) {
        await adminClient.from('marketplace_products').update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) }).eq('id', item.product_id);
      }
    }

    // Update order
    await adminClient.from('marketplace_orders').update({ payment_status: 'paid', status: 'confirmed' }).eq('id', order.id);

    // Notify merchant
    await adminClient.from('notifications').insert({ user_id: store.merchant_user_id, title: 'Payment Received!', message: `Order #${order.order_number} — RM ${order.total_amount.toFixed(2)} paid online`, type: 'order', link: '/marketplace/manage/orders' });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
