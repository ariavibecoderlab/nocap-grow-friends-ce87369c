import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAUDHAHPAY_API_KEY = Deno.env.get('RAUDHAHPAY_API_KEY');
    const RAUDHAHPAY_COLLECTION_CODE = Deno.env.get('RAUDHAHPAY_COLLECTION_CODE');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAUDHAHPAY_API_KEY) throw new Error('RAUDHAHPAY_API_KEY is not configured');
    if (!RAUDHAHPAY_COLLECTION_CODE) throw new Error('RAUDHAHPAY_COLLECTION_CODE is not configured');
    if (!SUPABASE_URL) throw new Error('SUPABASE_URL is not configured');
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
    
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount } = await req.json();
    
    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 10000) {
      return new Response(JSON.stringify({ error: 'Amount must be between RM1 and RM10,000' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, address')
      .eq('user_id', user.id)
      .single();

    // Format mobile number with country code
    let mobile = profile?.phone || '60123456789';
    if (mobile.startsWith('0')) {
      mobile = '60' + mobile.substring(1);
    } else if (!mobile.startsWith('6')) {
      mobile = '60' + mobile;
    }

    // Create a pending transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'top_up',
        amount: amount,
        status: 'pending',
        description: `Wallet top-up RM${amount.toFixed(2)}`,
      })
      .select('id')
      .single();

    if (txError) {
      console.error('Transaction insert error:', txError);
      return new Response(JSON.stringify({ error: 'Failed to create transaction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine callback URL (use the project URL)
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    const callbackUrl = `${origin}/top-up?status=success`;
    const webhookUrl = `${SUPABASE_URL}/functions/v1/raudhahpay-webhook`;

    // Create bill on RaudhahPay v2.0
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const billPayload = {
      collection_code: RAUDHAHPAY_COLLECTION_CODE,
      due: dueDateStr,
      currency: 'MYR',
      customer: {
        first_name: profile?.full_name?.split(' ')[0] || 'Member',
        last_name: profile?.full_name?.split(' ').slice(1).join(' ') || 'User',
        email: user.email || 'noemail@nocap.app',
        mobile: mobile,
        address: profile?.address || 'Malaysia',
      },
      product: `NOcap Wallet Top Up`,
      reference_1_label: 'Transaction ID',
      reference_1: transaction.id,
      reference_2_label: 'User ID',
      reference_2: user.id,
      redirect_url: callbackUrl,
      callback_url: webhookUrl,
      description: `NOcap Wallet Top Up - RM${amount.toFixed(2)}`,
      amount: Math.round(amount * 100), // amount in cents
    };

    console.log('Creating RaudhahPay bill:', JSON.stringify(billPayload));

    const rpResponse = await fetch(
      `https://api.raudhahpay.com/api/collections/${RAUDHAHPAY_COLLECTION_CODE}/bills`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RAUDHAHPAY_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billPayload),
        signal: AbortSignal.timeout(30000),
      }
    );

    // Defensive response parsing
    const contentType = rpResponse.headers.get('content-type');
    let rpData: any;

    if (!contentType?.includes('application/json')) {
      const textResponse = await rpResponse.text();
      console.error('RaudhahPay returned non-JSON (status', rpResponse.status, '):', textResponse.substring(0, 500));
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
      return new Response(JSON.stringify({ error: 'Payment gateway returned invalid response', status: rpResponse.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      rpData = await rpResponse.json();
    } catch (parseError) {
      console.error('Failed to parse RaudhahPay response:', parseError);
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
      return new Response(JSON.stringify({ error: 'Payment gateway returned malformed response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('RaudhahPay response status:', rpResponse.status, 'body:', JSON.stringify(rpData));

    if (!rpResponse.ok) {
      console.error('RaudhahPay API error:', rpData);
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
      return new Response(JSON.stringify({ error: 'Payment gateway error', details: rpData, status: rpResponse.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store bill code in transaction metadata
    const billCode = rpData?.data?.code || rpData?.code || '';
    await supabase
      .from('transactions')
      .update({ metadata: { bill_code: billCode, raudhahpay_response: rpData } })
      .eq('id', transaction.id);

    // Build payment URL
    const paymentUrl = rpData?.data?.url || rpData?.url || 
      `https://cloud.raudhahpay.com/billing/bills/bill-payment?code=${billCode}`;

    return new Response(JSON.stringify({ 
      payment_url: paymentUrl,
      transaction_id: transaction.id,
      bill_code: billCode,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error creating top-up bill:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
