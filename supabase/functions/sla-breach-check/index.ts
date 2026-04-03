import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, htmlBody: string) {
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL");
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.warn("SendGrid not configured, skipping email");
    return;
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: SENDGRID_FROM_EMAIL, name: "NOcap Support" },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("SendGrid error:", err);
  } else {
    console.log(`SLA alert email sent to ${to}: ${subject}`);
  }
}

function slaAlertTemplate(tickets: Array<{ ticket_number: string; subject: string; priority: string; type: string; elapsed: string; target: string }>) {
  const priorityColors: Record<string, string> = {
    urgent: "#dc2626", high: "#ea580c", medium: "#eab308", low: "#22c55e",
  };

  const rows = tickets.map(t => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #262626; color: #fff; font-size: 13px;">${t.ticket_number}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #262626; color: #fff; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${t.subject}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #262626;"><span style="color: ${priorityColors[t.priority] || '#eab308'}; font-weight: 600; text-transform: capitalize;">${t.priority}</span></td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #262626; color: #ff6b6b; font-size: 13px;">${t.type}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #262626; color: #ccc; font-size: 13px;">${t.elapsed} / ${t.target}</td>
    </tr>
  `).join("");

  return `
  <div style="font-family: 'Inter', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #141414; border-radius: 12px; overflow: hidden;">
    <div style="background: #dc2626; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 18px; color: #fff; font-weight: 700;">⚠ SLA Breach Alert</h1>
    </div>
    <div style="padding: 24px;">
      <p style="color: #ccc; font-size: 14px; margin: 0 0 16px;">The following tickets assigned to you are at risk of breaching or have breached their SLA targets:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #333;">
            <th style="padding: 8px 12px; text-align: left; color: #888; font-size: 12px; font-weight: 600;">Ticket</th>
            <th style="padding: 8px 12px; text-align: left; color: #888; font-size: 12px; font-weight: 600;">Subject</th>
            <th style="padding: 8px 12px; text-align: left; color: #888; font-size: 12px; font-weight: 600;">Priority</th>
            <th style="padding: 8px 12px; text-align: left; color: #888; font-size: 12px; font-weight: 600;">SLA Type</th>
            <th style="padding: 8px 12px; text-align: left; color: #888; font-size: 12px; font-weight: 600;">Elapsed / Target</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color: #888; font-size: 13px; margin-top: 20px;">Please take immediate action on these tickets to avoid SLA breaches.</p>
    </div>
    <div style="padding: 16px 24px; border-top: 1px solid #262626; text-align: center;">
      <span style="color: #666; font-size: 11px;">NOcap Support System — SLA Monitor</span>
    </div>
  </div>`;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch SLA settings
    const { data: slaSettings } = await supabase.from("sla_settings").select("*");
    if (!slaSettings || slaSettings.length === 0) {
      console.log("No SLA settings configured, skipping check");
      return new Response(JSON.stringify({ skipped: true, reason: "no_sla_settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slaMap: Record<string, { first_response_minutes: number; resolution_minutes: number }> = {};
    for (const s of slaSettings) {
      slaMap[s.priority] = { first_response_minutes: s.first_response_minutes, resolution_minutes: s.resolution_minutes };
    }

    // Fetch open/in-progress tickets with an assigned agent
    const { data: tickets } = await supabase
      .from("support_tickets")
      .select("*")
      .in("status", ["open", "in_progress"])
      .not("assigned_to", "is", null);

    if (!tickets || tickets.length === 0) {
      console.log("No open assigned tickets");
      return new Response(JSON.stringify({ checked: 0, alerts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const WARNING_THRESHOLD = 0.75; // alert at 75% of SLA target

    // Group at-risk tickets by assigned agent
    const agentAlerts: Record<string, Array<{ ticket_number: string; subject: string; priority: string; type: string; elapsed: string; target: string }>> = {};

    for (const ticket of tickets) {
      const sla = slaMap[ticket.priority];
      if (!sla) continue;

      const createdAt = new Date(ticket.created_at).getTime();
      const elapsedMins = (now - createdAt) / 60000;

      const issues: Array<{ type: string; elapsed: number; target: number }> = [];

      // Check first response SLA
      if (!ticket.first_response_at) {
        const target = sla.first_response_minutes;
        if (elapsedMins >= target * WARNING_THRESHOLD) {
          issues.push({ type: elapsedMins >= target ? "Response Breached" : "Response At Risk", elapsed: elapsedMins, target });
        }
      }

      // Check resolution SLA
      const resTarget = sla.resolution_minutes;
      if (elapsedMins >= resTarget * WARNING_THRESHOLD) {
        issues.push({ type: elapsedMins >= resTarget ? "Resolution Breached" : "Resolution At Risk", elapsed: elapsedMins, target: resTarget });
      }

      if (issues.length > 0) {
        const agentId = ticket.assigned_to;
        if (!agentAlerts[agentId]) agentAlerts[agentId] = [];
        // Add the most critical issue
        const worst = issues.sort((a, b) => (b.elapsed / b.target) - (a.elapsed / a.target))[0];
        agentAlerts[agentId].push({
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          priority: ticket.priority,
          type: worst.type,
          elapsed: formatMinutes(worst.elapsed),
          target: formatMinutes(worst.target),
        });
      }
    }

    // Send emails to each agent
    const agentIds = Object.keys(agentAlerts);
    if (agentIds.length === 0) {
      console.log(`Checked ${tickets.length} tickets, no SLA alerts`);
      return new Response(JSON.stringify({ checked: tickets.length, alerts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get agent emails
    const { data: emails } = await supabase.rpc("get_all_user_emails");
    let alertsSent = 0;

    for (const agentId of agentIds) {
      const agentEmail = emails?.find((e: any) => e.user_id === agentId)?.email;
      if (!agentEmail) continue;

      const ticketList = agentAlerts[agentId];
      const breachedCount = ticketList.filter(t => t.type.includes("Breached")).length;
      const atRiskCount = ticketList.filter(t => t.type.includes("At Risk")).length;

      const subjectParts: string[] = [];
      if (breachedCount > 0) subjectParts.push(`${breachedCount} breached`);
      if (atRiskCount > 0) subjectParts.push(`${atRiskCount} at risk`);

      await sendEmail(
        agentEmail,
        `SLA Alert: ${subjectParts.join(", ")} — ${ticketList.length} ticket${ticketList.length > 1 ? "s" : ""} need attention`,
        slaAlertTemplate(ticketList)
      );
      alertsSent++;
    }

    console.log(`SLA check complete: ${tickets.length} tickets checked, ${alertsSent} alert emails sent`);
    return new Response(JSON.stringify({ checked: tickets.length, alerts: alertsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SLA breach check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
