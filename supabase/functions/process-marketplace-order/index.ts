import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return encodeBase64(new Uint8Array(hashBuffer));
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!storedHash.includes(':')) return pin === storedHash;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  return (await hashPin(pin, salt)) === hash;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function idempotencyKey(...parts: string[]): string { return parts.join(':'); }
function timeBucket(windowSec = 10): string { return Math.floor(Date.now() / (windowSec * 1000)).toString(36); }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonRes({ error: 'Not authenticated' }, 401);

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) return jsonRes({ error: 'Invalid token' }, 401);
    const buyerId = user.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      items, // [{ product_id, quantity }]
      buyer_name,
      buyer_email,
      buyer_phone,
      shipping_address,
      notes,
      discount_code,
      pin,
    } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return jsonRes({ error: 'Cart is empty' }, 400);
    }
    if (!buyer_name || !buyer_email || !buyer_phone || !shipping_address) {
      return jsonRes({ error: 'Missing delivery details' }, 400);
    }

    // ── 1. Fetch products and validate stock ──
    const productIds = items.map((i: { product_id: string }) => i.product_id);
    const { data: products, error: prodErr } = await supabase
      .from('marketplace_products')
      .select('id, name, price, stock_quantity, store_id, images, status')
      .in('id', productIds);

    if (prodErr || !products || products.length === 0) {
      return jsonRes({ error: 'Products not found' }, 400);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    const orderItems: Array<{
      product_id: string; product_name: string; unit_price: number;
      quantity: number; subtotal: number; product_image: string;
    }> = [];

    // All items must be from the same store
    let storeId: string | null = null;
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) return jsonRes({ error: `Product ${item.product_id} not found` }, 400);
      if (product.status !== 'active') return jsonRes({ error: `${product.name} is not available` }, 400);
      if (product.stock_quantity < item.quantity) {
        return jsonRes({ error: `${product.name} only has ${product.stock_quantity} in stock` }, 400);
      }
      if (!storeId) storeId = product.store_id;
      else if (storeId !== product.store_id) {
        return jsonRes({ error: 'All items must be from the same store' }, 400);
      }
      const lineTotal = Number(product.price) * item.quantity;
      subtotal += lineTotal;
      const imgs = Array.isArray(product.images) ? product.images : [];
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: Number(product.price),
        quantity: item.quantity,
        subtotal: lineTotal,
        product_image: (imgs[0] as string) || '',
      });
    }

    // ── 2. Get store and branch info ──
    const { data: store } = await supabase
      .from('marketplace_stores')
      .select('id, store_name, branch_id, merchant_user_id, shipping_flat_rate, free_shipping_min, logo_url')
      .eq('id', storeId!)
      .single();

    if (!store) return jsonRes({ error: 'Store not found' }, 404);

    if (buyerId === store.merchant_user_id) {
      return jsonRes({ error: 'Cannot buy from your own store' }, 400);
    }

    const { data: branch } = await supabase
      .from('merchant_branches')
      .select('id, merchant_user_id, branch_name, commission_percent, is_active, owner_user_id')
      .eq('id', store.branch_id)
      .single();

    if (!branch || !branch.is_active) {
      return jsonRes({ error: 'Store branch is not active' }, 400);
    }

    // ── 3. Shipping calculation ──
    let shippingFee = Number(store.shipping_flat_rate) || 0;
    if (store.free_shipping_min && subtotal >= Number(store.free_shipping_min)) {
      shippingFee = 0;
    }

    // ── 4. Discount code validation ──
    let discountAmount = 0;
    let discountCodeId: string | null = null;
    if (discount_code) {
      const { data: dc } = await supabase
        .from('marketplace_discount_codes')
        .select('*')
        .eq('store_id', storeId!)
        .ilike('code', discount_code)
        .eq('is_active', true)
        .maybeSingle();

      if (dc) {
        const valid =
          (!dc.expires_at || new Date(dc.expires_at) > new Date()) &&
          (!dc.max_uses || dc.used_count < dc.max_uses) &&
          (!dc.min_order_amount || subtotal >= Number(dc.min_order_amount));

        if (valid) {
          discountAmount = dc.discount_type === 'percentage'
            ? Math.round(subtotal * Number(dc.discount_value)) / 100
            : Math.min(Number(dc.discount_value), subtotal);
          discountCodeId = dc.id;
        }
      }
    }

    // ── 5. Calculate totals ──
    const totalAmount = subtotal - discountAmount + shippingFee;
    if (totalAmount < 0.01) return jsonRes({ error: 'Order total too low' }, 400);

    // ── 6. PIN verification (same logic as process-payment) ──
    const { data: pinSetting } = await supabase
      .from('system_settings').select('value').eq('key', 'min_pin_amount').single();
    const minPinAmount = pinSetting ? Number(pinSetting.value) : 100;

    if (totalAmount >= minPinAmount) {
      if (!pin) return jsonRes({ error: `PIN is required for orders of RM${minPinAmount} and above` }, 400);

      const { data: pinProfile } = await supabase
        .from('profiles')
        .select('has_pin, pin_hash, pin_attempts, pin_locked_until')
        .eq('user_id', buyerId)
        .single();

      if (!pinProfile?.has_pin || !pinProfile.pin_hash) {
        return jsonRes({ error: 'Please set up your PIN first', code: 'PIN_NOT_SET' }, 400);
      }

      if (pinProfile.pin_locked_until) {
        const lockedUntil = new Date(pinProfile.pin_locked_until);
        if (lockedUntil > new Date()) {
          const mins = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
          return jsonRes({ error: `PIN locked. Try again in ${mins} minute(s).`, code: 'PIN_LOCKED' }, 429);
        }
        await supabase.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', buyerId);
      }

      const pinValid = await verifyPin(pin, pinProfile.pin_hash);
      if (!pinValid) {
        const newAttempts = (pinProfile.pin_attempts || 0) + 1;
        const updates: Record<string, unknown> = { pin_attempts: newAttempts };
        if (newAttempts >= MAX_ATTEMPTS) {
          updates.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
        }
        await supabase.from('profiles').update(updates).eq('user_id', buyerId);
        const remaining = MAX_ATTEMPTS - newAttempts;
        return jsonRes({
          error: remaining > 0
            ? `Incorrect PIN. ${remaining} attempt(s) remaining.`
            : `Too many failed attempts. PIN locked for ${LOCKOUT_MINUTES} minutes.`,
          code: 'INVALID_PIN',
          locked: newAttempts >= MAX_ATTEMPTS,
          attempts_remaining: Math.max(0, remaining),
        }, 403);
      }
      await supabase.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', buyerId);
    }

    // ── 7. Check wallet balance ──
    const { data: buyerWallet } = await supabase
      .from('wallets').select('balance')
      .eq('user_id', buyerId).eq('wallet_type', 'member').single();

    if (!buyerWallet || Number(buyerWallet.balance) < totalAmount) {
      return jsonRes({ error: 'Insufficient balance' }, 400);
    }

    // ── 8. Commission engine (same as process-payment) ──
    const { data: feeSetting } = await supabase
      .from('system_settings').select('value').eq('key', 'platform_fee_percent').single();
    const platformFeePercent = feeSetting ? Number(feeSetting.value) : 2.0;
    const commissionPercent = Number(branch.commission_percent);

    const feeAmount = Math.round(totalAmount * platformFeePercent) / 100;
    const commissionPool = Math.round(totalAmount * commissionPercent) / 100;
    const netAmount = totalAmount - feeAmount;
    const cashbackShare = Math.floor((commissionPool / 6) * 100) / 100;
    const tierShare = Math.floor((commissionPool / 6) * 100) / 100;

    // ── 9. ATOMIC: Debit buyer wallet ──
    const { data: newBuyerBalance, error: debitErr } = await supabase.rpc('debit_wallet', {
      p_user_id: buyerId, p_wallet_type: 'member', p_amount: totalAmount,
    });
    if (debitErr) {
      const msg = debitErr.message || '';
      if (msg.includes('Insufficient balance')) return jsonRes({ error: 'Insufficient balance' }, 400);
      throw debitErr;
    }

    // ── 10. ATOMIC: Credit branch wallet ──
    const branchCredit = netAmount - commissionPool;
    const branchIncomeUserId = branch.owner_user_id || branch.merchant_user_id;
    const { error: branchCreditErr } = await supabase.rpc('credit_wallet', {
      p_user_id: branchIncomeUserId, p_wallet_type: 'branch', p_amount: branchCredit, p_branch_id: branch.id,
    });
    if (branchCreditErr) {
      await supabase.from('wallets').insert({
        user_id: branchIncomeUserId, wallet_type: 'branch', branch_id: branch.id, balance: branchCredit,
      });
    }

    // Update merchant_branches.balance
    const { data: branchRow } = await supabase.from('merchant_branches').select('balance').eq('id', branch.id).single();
    if (branchRow) {
      await supabase.from('merchant_branches').update({ balance: Number(branchRow.balance) + branchCredit }).eq('id', branch.id);
    }

    // ── 11. Create order ──
    const orderNumber = `MKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const ikey = idempotencyKey('mkt', buyerId, storeId!, totalAmount.toString(), timeBucket());
    const { data: paymentTx, error: payTxErr } = await supabase.from('transactions').insert({
      user_id: buyerId,
      type: 'payment',
      amount: totalAmount,
      fee_amount: feeAmount,
      net_amount: netAmount,
      status: 'completed',
      description: `Marketplace order at ${store.store_name}`,
      metadata: { store_id: storeId, order_number: orderNumber },
      idempotency_key: ikey,
    }).select('id').single();

    if (payTxErr && (payTxErr as any).code === '23505') {
      const { data: existing } = await supabase.from('transactions').select('id').eq('idempotency_key', ikey).single();
      return jsonRes({ error: 'Duplicate request', transaction_id: existing?.id }, 409);
    }

    const { data: order, error: orderErr } = await supabase.from('marketplace_orders').insert({
      store_id: storeId!,
      buyer_user_id: buyerId,
      buyer_name,
      buyer_email,
      buyer_phone,
      shipping_address,
      notes: notes || null,
      order_number: orderNumber,
      subtotal,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      platform_fee: feeAmount,
      payment_method: 'nocap_wallet',
      payment_status: 'paid',
      status: 'pending',
      transaction_id: paymentTx?.id || null,
    }).select('id, order_number').single();

    if (orderErr || !order) {
      console.error('Order creation failed:', orderErr);
      return jsonRes({ error: 'Failed to create order' }, 500);
    }

    // Insert order items
    await supabase.from('marketplace_order_items').insert(
      orderItems.map((oi) => ({ ...oi, order_id: order.id }))
    );

    // ── 12. Decrement stock ──
    for (const item of items) {
      const product = productMap.get(item.product_id)!;
      await supabase.from('marketplace_products')
        .update({ stock_quantity: product.stock_quantity - item.quantity })
        .eq('id', item.product_id);
    }

    // ── 13. Increment discount code usage ──
    if (discountCodeId) {
      const { data: dc } = await supabase
        .from('marketplace_discount_codes').select('used_count').eq('id', discountCodeId).single();
      if (dc) {
        await supabase.from('marketplace_discount_codes')
          .update({ used_count: dc.used_count + 1 })
          .eq('id', discountCodeId);
      }
    }

    // ── 14. Income transaction for merchant ──
    const { data: buyerProfile } = await supabase
      .from('profiles').select('full_name').eq('user_id', buyerId).single();
    const buyerDisplayName = buyerProfile?.full_name || 'Member';

    await supabase.from('transactions').insert({
      user_id: branchIncomeUserId,
      type: 'top_up',
      amount: branchCredit,
      status: 'completed',
      description: `Order ${orderNumber} from ${buyerDisplayName}`,
      reference_id: paymentTx?.id || null,
      metadata: { store_id: storeId, order_number: orderNumber },
    });

    // ── 15. ATOMIC: Cashback ──
    if (cashbackShare > 0) {
      await supabase.rpc('credit_wallet', {
        p_user_id: buyerId, p_wallet_type: 'member', p_amount: cashbackShare,
      });
      await supabase.from('transactions').insert({
        user_id: buyerId, type: 'cashback', amount: cashbackShare, status: 'completed',
        description: `Cashback from ${store.store_name}`, reference_id: paymentTx?.id || null,
      });
    }

    // ── 16. ATOMIC: Tier commissions ──
    const { data: ancestors } = await supabase
      .from('referral_tree').select('ancestor_id, tier')
      .eq('user_id', buyerId).order('tier', { ascending: true }).limit(5);

    let unclaimedCommission = 0;
    if (ancestors && ancestors.length > 0) {
      for (const ancestor of ancestors) {
        if (ancestor.tier >= 1 && ancestor.tier <= 5) {
          const { error: commErr } = await supabase.rpc('credit_wallet', {
            p_user_id: ancestor.ancestor_id, p_wallet_type: 'member', p_amount: tierShare,
          });
          if (!commErr) {
            await supabase.from('transactions').insert({
              user_id: ancestor.ancestor_id, type: 'commission', amount: tierShare, status: 'completed',
              description: `Tier ${ancestor.tier} commission from ${store.store_name}`,
              reference_id: paymentTx?.id || null,
            });
          } else {
            unclaimedCommission += tierShare;
          }
        }
      }
      unclaimedCommission += (5 - ancestors.length) * tierShare;
    } else {
      unclaimedCommission = 5 * tierShare;
    }

    // Return unclaimed to branch
    if (unclaimedCommission > 0) {
      await supabase.rpc('credit_wallet', {
        p_user_id: branchIncomeUserId, p_wallet_type: 'branch', p_amount: unclaimedCommission, p_branch_id: branch.id,
      });
    }

    // ── 17. ATOMIC: Credit platform fee to admin wallet ──
    if (feeAmount > 0) {
      const { data: adminRole } = await supabase.from('user_roles').select('user_id').eq('role', 'admin').limit(1).single();
      if (adminRole) {
        const { error: adminErr } = await supabase.rpc('credit_wallet', {
          p_user_id: adminRole.user_id, p_wallet_type: 'admin', p_amount: feeAmount,
        });
        if (adminErr) {
          await supabase.from('wallets').insert({ user_id: adminRole.user_id, wallet_type: 'admin', balance: feeAmount });
        }
        await supabase.from('transactions').insert({
          user_id: adminRole.user_id, type: 'commission', amount: feeAmount, status: 'completed',
          description: `Platform fee from ${store.store_name}`, reference_id: paymentTx?.id || null,
          metadata: { source: 'platform_fee', store_id: storeId, order_number: orderNumber },
        });
      }
    }

    // ── 18. Notification to merchant ──
    await supabase.from('notifications').insert({
      user_id: store.merchant_user_id,
      title: 'New Marketplace Order',
      message: `Order ${orderNumber} received — RM${totalAmount.toFixed(2)} from ${buyerDisplayName}`,
      type: 'order',
      link: `/merchant`,
    });

    console.log(`Marketplace order completed: ${orderNumber}, buyer=${buyerId}, total=RM${totalAmount.toFixed(2)}`);

    return jsonRes({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      total_amount: totalAmount,
      cashback: cashbackShare,
    });

  } catch (error: unknown) {
    console.error('Marketplace order error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return jsonRes({ error: msg }, 500);
  }
});
