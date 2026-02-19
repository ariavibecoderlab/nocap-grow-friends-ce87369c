import Deno from "https://deno.land/std@0.168.0/node/global.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendOrderConfirmationEmail({
  buyerEmail, buyerName, orderNumber, storeName, orderItems, subtotal, shippingFee, totalAmount,
}: {
  buyerEmail: string; buyerName: string; orderNumber: string; storeName: string;
  orderItems: { product_name: string; quantity: number; unit_price: number; subtotal: number }[];
  subtotal: number; shippingFee: number; totalAmount: number;
}) {
  const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
  if (!sendgridKey || !fromEmail) return;

  const itemRows = orderItems.map((item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;">${item.product_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:center;">×${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:right;">RM ${item.unit_price.toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:600;color:#111827;text-align:right;">RM ${item.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmation</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#16a34a;padding:28px 32px;text-align:center;">
          <div style="font-size:28px;margin-bottom:6px;">✅</div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Order Confirmed!</h1>
          <p style="margin:6px 0 0;color:#bbf7d0;font-size:14px;">Thank you for your purchase from <strong>${storeName}</strong></p>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0;font-size:15px;color:#374151;">Hi <strong>${buyerName}</strong>,</p>
          <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Your payment was received and your order is being processed.</p>
        </td></tr>
        <tr><td style="padding:12px 32px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;width:100%;box-sizing:border-box;">
            <span style="font-size:12px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Order Number</span>
            <div style="font-size:20px;font-weight:700;color:#15803d;margin-top:2px;">#${orderNumber}</div>
          </div>
        </td></tr>
        <tr><td style="padding:8px 32px 0;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Items Ordered</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;">Product</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;">Qty</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;">Price</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;">Subtotal</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
        </td></tr>
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
            <tr><td colspan="2"><hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;"></td></tr>
            <tr>
              <td style="font-size:16px;font-weight:700;color:#111827;padding:3px 0;">Total</td>
              <td style="font-size:16px;font-weight:700;color:#15803d;text-align:right;padding:3px 0;">RM ${totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#9ca3af;padding:4px 0 0;">Payment method</td>
              <td style="font-size:12px;color:#9ca3af;text-align:right;padding:4px 0 0;">Online Payment</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;font-size:13px;color:#1d4ed8;">
            📦 You can track your order status at <strong>My Orders</strong> on our marketplace.
          </div>
        </td></tr>
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
    headers: { 'Authorization': `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
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
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json();
    const billId = body.billcode || body.bill_code || body.BillCode;

    if (!billId) return new Response('Missing bill ID', { status: 400 });

    // Find order with items
    const { data: order } = await adminClient
      .from('marketplace_orders')
      .select('*, marketplace_stores(branch_id, merchant_user_id, store_name)')
      .eq('bill_id', billId)
      .single();
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
    const { data: orderItems } = await adminClient.from('marketplace_order_items').select('product_id, quantity, product_name, unit_price, subtotal').eq('order_id', order.id);
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

    // Send confirmation email to buyer (non-blocking)
    sendOrderConfirmationEmail({
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name,
      orderNumber: order.order_number,
      storeName: store.store_name,
      orderItems: orderItems || [],
      subtotal: order.subtotal,
      shippingFee: order.shipping_fee,
      totalAmount: order.total_amount,
    }).catch(() => {/* swallow email errors */});

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
