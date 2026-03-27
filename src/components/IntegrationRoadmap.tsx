import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const PROMPTS = [
  {
    id: 1,
    title: "Store NoCap API Credentials",
    path: "A",
    pathLabel: "New integrators only",
    merchantAction: "Must have created a merchant-level API app and shared credentials.",
    prompt: `Store NOCAP_APP_ID, NOCAP_API_KEY, NOCAP_API_SECRET as backend secrets. Create a 'nocap_connections' table with: id, customer_id, nocap_user_id, access_token, scopes (text array), referral_code, connected_at, updated_at. Add RLS so customers can only read their own connection.`,
    memberImpact: "None — backend setup only.",
  },
  {
    id: 2,
    title: "Build NoCap API Service Layer",
    path: "A",
    pathLabel: "New integrators only",
    prompt: `Create service functions for all NoCap endpoints:
Wallet: checkBalance, createCharge (with optional branch_id), getChargeStatus, listCharges, refundCharge, listBranches.
Referral: getReferralInfo, registerViaReferral, getReferralNetwork, getCashbackHistory.
All functions use x-api-key + x-api-secret headers. Bearer token endpoints as documented.`,
    memberImpact: "None — backend code only.",
  },
  {
    id: 3,
    title: "OAuth Wallet Connection Flow",
    path: "A",
    pathLabel: "New integrators only",
    merchantAction: "Ensure redirect URI matches the 3rd party callback URL.",
    prompt: `Add 'Connect NoCap Wallet' button. Redirect to /authorize with scope=balance,charge,referral (all three upfront). On callback: verify state, exchange code via POST /api-token-exchange, store access_token and scopes. Handle error=access_denied.`,
    memberImpact: "Members see a consent screen and approve access. This is also how API-registered users (Prompt 4) connect their wallet post-registration.",
  },
  {
    id: 4,
    title: "Account Creation via Referral",
    path: "A",
    pathLabel: "New integrators only",
    prompt: `Add optional 'Referral Code' to signup. After account creation in your system, call POST /api-referral-register with { email, full_name, referral_code } using x-api-key and x-api-secret headers. This creates the full NoCap account: auth user, profile, RM 0.00 wallet, member role, and referral tree links — all automatically. Store the returned user_id and referral_code for reference. If the call returns 409 (user already exists), skip silently. If NoCap registration fails for other reasons, don't block your signup — log and retry later.`,
    memberImpact: "New members get a full NoCap account (with wallet) created automatically when they register on the 3rd party system with a referral code.",
  },
  {
    id: 5,
    title: "Wallet Payment in Checkout",
    path: "A",
    pathLabel: "New integrators only",
    merchantAction: "Ensure sandbox mode is enabled for testing.",
    prompt: `Add NoCap as payment option: show balance (GET /api-balance), call POST /api-charge with amount, description, reference, branch_id. Handle PIN_REQUIRED and INSUFFICIENT_BALANCE. Set up webhook verification (HMAC-SHA256) for charge events.`,
    memberImpact: "Members can now pay with their NoCap wallet at checkout.",
  },
  {
    id: 6,
    title: "Upgrade for Affiliate & Multi-Branch",
    path: "Both",
    pathLabel: "All integrators — existing START HERE",
    merchantAction: "Must have created a NEW merchant-level API app and shared new credentials.",
    prompt: `DO NOT remove existing wallet features. Add referral_code and scopes columns to nocap_connections. Create 'nocap_branch_mappings' table. Add new API service functions. Update createCharge to accept optional branch_id.`,
    memberImpact: "None — backend preparation only.",
  },
  {
    id: 7,
    title: "Re-authorize for Referral Scope",
    path: "Both",
    pathLabel: "All integrators",
    prompt: `Check stored scopes — if missing 'referral', show banner: 'Unlock Referral Rewards!' On click, redirect to /authorize with scope=balance,charge,referral. NoCap auto-revokes old token and issues new one. Exchange code, update stored token and scopes. Hide banner once granted.`,
    memberImpact: "Members see a one-time banner. One click → approve → done. Wallet continues working throughout.",
  },
  {
    id: 8,
    title: "Multi-Branch Charge Routing",
    path: "Both",
    pathLabel: "All integrators",
    merchantAction: "Ensure all branches are created. New branches can be added later.",
    prompt: `DO NOT change existing payment logic. Call GET /api-branches to fetch NoCap branches. Store in nocap_branch_mappings. Build admin page to map outlets to NoCap branch IDs. Include branch_id in POST /api-charge. Show unmapped outlets as warnings. Add 'Refresh Branches' button.`,
    memberImpact: "None — branch routing is transparent to members.",
  },
  {
    id: 9,
    title: "Referral Dashboard & Admin",
    path: "Both",
    pathLabel: "All integrators",
    prompt: `DO NOT modify existing wallet/payment UI. Add new sections:
Customer Dashboard (if referral scope granted): referral code with copy/share, stats cards, network tree Tiers 1-5, earnings history with tabs.
Admin Section: branch mapping management, connected customers overview, top referrers by network size.`,
    memberImpact: "Members with referral scope see a new Referral Dashboard.",
  },
  {
    id: 10,
    title: "Add Top-Up API Service Function",
    path: "C",
    pathLabel: "Top-Up upgrade",
    prompt: `Add a createTopUp service function that calls POST /api-topup. Headers: x-api-key, x-api-secret (server-to-server), and Bearer <access_token> (user context). Request body: { amount, description, reference }. Amount must be between RM10 and RM500. The reference must be unique per request for idempotency. Response: { payment_url, transaction_id, bill_code }. Handle errors: 400 (validation), 401 (invalid token), 403 (missing topup scope), 402 (amount out of range).`,
    memberImpact: "None — backend code only.",
  },
  {
    id: 11,
    title: "Re-authorize for Top-Up Scope",
    path: "C",
    pathLabel: "Top-Up upgrade",
    prompt: `Check stored scopes in nocap_connections. If 'topup' scope is missing, show a banner: 'Enable Wallet Top-Up!' On click, redirect to /authorize with scope=balance,charge,referral,topup and the same state/redirect_uri pattern as before. NoCap auto-revokes the old token and issues a new one with all four scopes. Exchange the authorization code via POST /api-token-exchange, update stored access_token and scopes in nocap_connections. Hide the banner once topup scope is granted.`,
    memberImpact: "Members see a one-time banner. One click → approve → done. Existing wallet and payment features continue working throughout.",
  },
  {
    id: 12,
    title: "Top-Up UI & Webhook Handling",
    path: "C",
    pathLabel: "Top-Up upgrade",
    merchantAction: "Ensure webhook URL is configured to receive topup.completed and topup.failed events.",
    prompt: `Build a 'Top Up NoCap Wallet' button or page. Show current balance via GET /api-balance. Let user enter amount (RM10–RM500). On submit, call POST /api-topup with { amount, description: 'Wallet top-up', reference: <unique> }. Open the returned payment_url in a new tab/window for FPX payment via RaudhahPay. Handle webhooks: verify HMAC-SHA256 signature (same pattern as charge webhooks — use api_secret as HMAC key, raw JSON body as message, compare in constant time). Process topup.completed: update UI to reflect new balance. Process topup.failed: show error to user. Poll GET /api-balance or use webhook to refresh balance after redirect back.`,
    memberImpact: "Members can top up their NoCap wallet directly from the 3rd party app via FPX.",
  },
  {
    id: 13,
    title: "3rd Party Cashback & Commission Distribution",
    path: "D",
    pathLabel: "Distribution upgrade",
    merchantAction: "Ensure the API app has a webhook URL configured to receive distribution.completed events. Each branch must have commission_percent set.",
    prompt: `Add a createDistribution service function that calls POST /api-distribute. Headers: x-api-key, x-api-secret (server-to-server, no Bearer token needed). Request body: { branch_id, member_referral_code (or user_id), amount (the sale amount), reference (unique idempotency key) }. The API calculates the commission pool automatically using the branch's commission_percent. Response: { success, distribution_id, breakdown: { total_pool, cashback, tier_commissions[], unclaimed_returned, branch_debited } }. The branch wallet is debited (negative balances allowed). Cashback (1/6 of pool) goes to the member, tier commissions (1/6 each) go to up to 5 referral ancestors, and unclaimed tiers are returned to the branch. Handle errors: 400 (validation/missing fields), 401 (invalid credentials), 404 (branch or member not found), 409 (duplicate reference). Set up webhook verification (HMAC-SHA256, same pattern as charge webhooks) for distribution.completed events. Build an admin/reporting page showing distribution history with breakdowns per branch.`,
    memberImpact: "Members automatically receive cashback when a 3rd party sale is recorded. Referral ancestors earn tier commissions.",
  },
];

function CopyPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy Prompt"}
    </Button>
  );
}

export default function IntegrationRoadmap() {
  return (
    <div className="space-y-6">
      {/* Quick reference */}
      <Card>
        <CardHeader>
          <CardTitle>3rd Party Integration Roadmap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copy-paste these prompts into your AI coding assistant (Cursor, Copilot, etc.) to implement NoCap integration step-by-step.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Badge variant="secondary" className="text-xs">Path A (Prompts 1–9): New integration</Badge>
            <Badge variant="outline" className="text-xs">Path B (Prompts 6–9): Upgrade existing</Badge>
            <Badge className="text-xs bg-emerald-600 hover:bg-emerald-700">Path C (Prompts 10–12): Add Top-Up</Badge>
            <Badge className="text-xs bg-blue-600 hover:bg-blue-700">Path D (Prompt 13): Add Distribution</Badge>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-sm">
              <thead>
                 <tr className="border-b border-border">
                   <th className="text-left py-2 pr-4 font-semibold">Prompt</th>
                   <th className="text-left py-2 pr-4 font-semibold">New</th>
                   <th className="text-left py-2 pr-4 font-semibold">Upgrade</th>
                   <th className="text-left py-2 pr-4 font-semibold">Top-Up</th>
                   <th className="text-left py-2 font-semibold">Dist</th>
                 </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ["1 — Credentials & DB", "Yes", "Skip", "Skip", "Skip"],
                  ["2 — API Service Layer", "Yes", "Skip", "Skip", "Skip"],
                  ["3 — OAuth Connection", "Yes", "Skip", "Skip", "Skip"],
                  ["4 — Account Creation via Referral", "Yes", "Skip", "Skip", "Skip"],
                  ["5 — Wallet Checkout", "Yes", "Skip", "Skip", "Skip"],
                  ["6 — Upgrade DB + APIs", "Yes", "Start here", "Skip", "Skip"],
                  ["7 — Re-auth for Referral", "Yes", "Yes", "Skip", "Skip"],
                  ["8 — Multi-Branch Routing", "Yes", "Yes", "Skip", "Skip"],
                  ["9 — Referral Dashboard", "Yes", "Yes", "Skip", "Skip"],
                  ["10 — Top-Up Service", "Skip", "Skip", "Start here", "Skip"],
                  ["11 — Re-auth for Top-Up", "Skip", "Skip", "Yes", "Skip"],
                  ["12 — Top-Up UI & Webhooks", "Skip", "Skip", "Yes", "Skip"],
                  ["13 — Distribution", "Skip", "Skip", "Skip", "Start here"],
                ].map(([prompt, fresh, upgrade, topup, dist], i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs">{prompt}</td>
                    <td className="py-2 pr-4">{fresh}</td>
                    <td className="py-2 pr-4">{upgrade}</td>
                    <td className="py-2 pr-4">{topup}</td>
                    <td className="py-2">{dist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Individual prompts */}
      {PROMPTS.map((p) => (
        <Card key={p.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {p.id}
                </span>
                <div>
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.pathLabel}</p>
                </div>
              </div>
              <CopyPromptButton text={p.prompt} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.merchantAction && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3 rounded-md">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>NoCap Merchant Action:</strong> {p.merchantAction}
                </p>
              </div>
            )}
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{p.prompt}</pre>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Member Impact:</strong> {p.memberImpact}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
