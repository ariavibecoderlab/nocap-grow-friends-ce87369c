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
    const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json();
    const { store_id, items, buyer_name, buyer_email, buyer_phone, shipping_address, notes } = body;

    if (!store_id || !items?.length || !buyer_name || !buyer_email || !buyer_phone || !shipping_address) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: store } = await adminClient.from('marketplace_stores').select('id, branch_id, merchant_user_id, shipping_flat_rate, free_shipping_min, store_name, slug').eq('id', store_id).eq('status', 'live').single();
    if (!store) return new Response(JSON.stringify({ error: 'Store not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let subtotal = 0;
    const validatedItems = [];
    for (const item of items) {
      const { data: product } = await adminClient.from('marketplace_products').select('id, name, price, stock_quantity, images').eq('id', item.product_id).single();
      if (!product) return new Response(JSON.stringify({ error: 'Product not found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;
      validatedItems.push({ ...item, product, itemSubtotal });
    }

    const shippingFee = (store.free_shipping_min && subtotal >= store.free_shipping_min) ? 0 : (store.shipping_flat_rate || 0);
    const totalAmount = subtotal + shippingFee;
    const platformFee = Math.round(totalAmount * 0.01 * 100) / 100;
    const orderNum = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

    // Create pending order
    const { data: order } = await adminClient.from('marketplace_orders').insert({
      order_number: orderNum, store_id, buyer_name, buyer_email, buyer_phone, shipping_address, notes,
      subtotal, shipping_fee: shippingFee, total_amount: totalAmount, platform_fee: platformFee,
      payment_method: 'online', payment_status: 'pending', status: 'pending',
    }).select().single();

    for (const item of validatedItems) {
      await adminClient.from('marketplace_order_items').insert({ order_id: order.id, product_id: item.product_id, product_name: item.product.name, product_image: item.product.images?.[0] ?? '', unit_price: item.product.price, quantity: item.quantity, subtotal: item.itemSubtotal });
    }

    // Create RaudhahPay bill
    const apiKey = Deno.env.get('RAUDHAHPAY_API_KEY')!;
    const secretKey = Deno.env.get('RAUDHAHPAY_SECRET_KEY')!;
    const collectionCode = Deno.env.get('RAUDHAHPAY_COLLECTION_CODE')!;

    const signature = await crypto.subtle.importKey('raw', new TextEncoder().encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      .then((key) => crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${apiKey}${collectionCode}${totalAmount.toFixed(2)}`)))
      .then((buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

    const billPayload = {
      userSecretKey: secretKey,
      categoryCode: collectionCode,
      billName: `Order ${orderNum}`,
      billDescription: `Marketplace order from ${store.store_name}`,
      billPriceSetting: 1,
      billPayorInfo: 1,
      billAmount: Math.round(totalAmount * 100),
      billReturnUrl: `${req.headers.get('origin') || 'https://nocap-grow-friends.lovable.app'}/marketplace/${store.slug}/order/${order.id}`,
      billCallbackUrl: `${supabaseUrl}/functions/v1/marketplace-payment-webhook`,
      billExternalReferenceNo: order.id,
      billTo: buyer_name,
      billEmail: buyer_email,
      billPhone: buyer_phone,
      billSplitPayment: 0,
      billSplitPaymentArgs: '',
      billPaymentChannel: 0,
      billDisplayMerchant: 1,
      billContentEmail: `Thank you for your order! Order number: ${orderNum}`,
      billChargeToCustomer: 0,
    };

    const res = await fetch('https://api.raudhahpay.com/api/createBill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
      body: JSON.stringify(billPayload),
    });

    const billData = await res.json();
    const billId = billData.BillCode || billData.bill_no;
    const paymentUrl = billData.BillPaymentUrl || billData.payment_url;

    if (billId) {
      await adminClient.from('marketplace_orders').update({ bill_id: billId }).eq('id', order.id);
    }

    return new Response(JSON.stringify({ success: true, order_id: order.id, order_number: orderNum, payment_url: paymentUrl, bill_id: billId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
