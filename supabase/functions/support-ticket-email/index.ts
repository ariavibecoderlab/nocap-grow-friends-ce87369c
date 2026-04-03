import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    console.log(`Email sent to ${to}: ${subject}`);
  }
}

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const priorityColors: Record<string, string> = {
  urgent: "#dc2626",
  high: "#ea580c",
  medium: "#eab308",
  low: "#22c55e",
};

function ticketEmailTemplate(
  title: string,
  ticketNumber: string,
  subject: string,
  status: string,
  priority: string,
  category: string,
  body: string
) {
  return `
  <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #141414; border-radius: 12px; overflow: hidden;">
    <div style="background: #FFD700; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 18px; color: #141414; font-weight: 700;">${title}</h1>
    </div>
    <div style="padding: 24px;">
      <table style="width: 100%; margin-bottom: 20px;">
        <tr>
          <td style="color: #888; font-size: 13px; padding: 4px 0;">Ticket</td>
          <td style="color: #fff; font-size: 13px; font-weight: 600;">${ticketNumber}</td>
        </tr>
        <tr>
          <td style="color: #888; font-size: 13px; padding: 4px 0;">Subject</td>
          <td style="color: #fff; font-size: 13px;">${subject}</td>
        </tr>
        <tr>
          <td style="color: #888; font-size: 13px; padding: 4px 0;">Status</td>
          <td><span style="background: #262626; color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 12px;">${statusLabels[status] || status}</span></td>
        </tr>
        <tr>
          <td style="color: #888; font-size: 13px; padding: 4px 0;">Priority</td>
          <td><span style="color: ${priorityColors[priority] || "#eab308"}; font-size: 13px; font-weight: 600; text-transform: capitalize;">${priority}</span></td>
        </tr>
        <tr>
          <td style="color: #888; font-size: 13px; padding: 4px 0;">Category</td>
          <td style="color: #fff; font-size: 13px; text-transform: capitalize;">${category}</td>
        </tr>
      </table>
      <div style="color: #ccc; font-size: 14px; line-height: 1.6;">${body}</div>
    </div>
    <div style="padding: 16px 24px; border-top: 1px solid #262626; text-align: center;">
      <span style="color: #666; font-size: 11px;">NOcap Support System</span>
    </div>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, ticket_id, old_status, new_status, reply_message, agent_name } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get ticket
    const { data: ticket, error: tErr } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();
    if (tErr || !ticket) throw new Error("Ticket not found");

    // Get ticket owner email
    const { data: emails } = await supabase.rpc("get_all_user_emails");
    const ownerEmail = emails?.find((e: any) => e.user_id === ticket.user_id)?.email;

    // Get assigned agent email (if any)
    const agentEmail = ticket.assigned_to
      ? emails?.find((e: any) => e.user_id === ticket.assigned_to)?.email
      : null;

    if (type === "ticket_created") {
      // Notify the user
      if (ownerEmail) {
        await sendEmail(
          ownerEmail,
          `Ticket ${ticket.ticket_number} Created — ${ticket.subject}`,
          ticketEmailTemplate(
            "Your Support Ticket Has Been Created",
            ticket.ticket_number,
            ticket.subject,
            ticket.status,
            ticket.priority,
            ticket.category,
            `<p>We've received your support request and a team member will review it shortly.</p>
             <p style="color: #888; margin-top: 16px;">Description:</p>
             <p>${ticket.description}</p>`
          )
        );
      }

      // Notify all support agents
      const { data: supportRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "support");
      if (supportRoles) {
        for (const sr of supportRoles) {
          const agEmail = emails?.find((e: any) => e.user_id === sr.user_id)?.email;
          if (agEmail) {
            await sendEmail(
              agEmail,
              `New Ticket ${ticket.ticket_number} — ${ticket.subject}`,
              ticketEmailTemplate(
                "New Support Ticket",
                ticket.ticket_number,
                ticket.subject,
                ticket.status,
                ticket.priority,
                ticket.category,
                `<p>A new support ticket has been submitted and requires attention.</p>
                 <p style="color: #888; margin-top: 16px;">Description:</p>
                 <p>${ticket.description}</p>`
              )
            );
          }
        }
      }
    } else if (type === "status_changed") {
      // Notify the ticket owner about the status change
      if (ownerEmail && old_status !== new_status) {
        await sendEmail(
          ownerEmail,
          `Ticket ${ticket.ticket_number} — Status Updated to ${statusLabels[new_status] || new_status}`,
          ticketEmailTemplate(
            "Ticket Status Updated",
            ticket.ticket_number,
            ticket.subject,
            new_status,
            ticket.priority,
            ticket.category,
            `<p>Your ticket status has been updated from <strong>${statusLabels[old_status] || old_status}</strong> to <strong>${statusLabels[new_status] || new_status}</strong>.</p>
             ${new_status === "resolved" ? "<p style='color: #22c55e; margin-top: 12px;'>If this resolves your issue, no further action is needed. Otherwise, you can reply to reopen the ticket.</p>" : ""}`
          )
        );
      }
    } else if (type === "agent_reply") {
      const agentDisplayName = agent_name || "Support Agent";
      const replyText = reply_message || "A support agent has replied to your ticket.";

      if (ownerEmail) {
        await sendEmail(
          ownerEmail,
          `Reply on ${ticket.ticket_number} — ${ticket.subject}`,
          ticketEmailTemplate(
            "New Reply on Your Support Ticket",
            ticket.ticket_number,
            ticket.subject,
            ticket.status,
            ticket.priority,
            ticket.category,
            `<p><strong>${agentDisplayName}</strong> replied:</p>
             <div style="background: #1a1a1a; border-left: 3px solid #FFD700; padding: 12px 16px; border-radius: 4px; margin: 12px 0;">
               <p style="margin: 0; white-space: pre-wrap;">${replyText}</p>
             </div>
             <p style="color: #888; margin-top: 16px;">You can reply directly from the app to continue the conversation.</p>`
          )
        );
      }
    } else if (type === "user_reply") {
      const replyText = reply_message || "A user has replied to their ticket.";

      // Get user's name from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", ticket.user_id)
        .single();
      const userName = profile?.full_name || ownerEmail || "User";

      // Notify the assigned agent
      if (agentEmail) {
        await sendEmail(
          agentEmail,
          `User Reply on ${ticket.ticket_number} — ${ticket.subject}`,
          ticketEmailTemplate(
            "New User Reply on Support Ticket",
            ticket.ticket_number,
            ticket.subject,
            ticket.status,
            ticket.priority,
            ticket.category,
            `<p><strong>${userName}</strong> replied:</p>
             <div style="background: #1a1a1a; border-left: 3px solid #FFD700; padding: 12px 16px; border-radius: 4px; margin: 12px 0;">
               <p style="margin: 0; white-space: pre-wrap;">${replyText}</p>
             </div>
             <p style="color: #888; margin-top: 16px;">Log in to the Support Portal to respond.</p>`
          )
        );
      } else {
        // No assigned agent — notify all support agents
        const { data: supportRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "support");
        if (supportRoles) {
          for (const sr of supportRoles) {
            const agEmail = emails?.find((e: any) => e.user_id === sr.user_id)?.email;
            if (agEmail) {
              await sendEmail(
                agEmail,
                `User Reply on ${ticket.ticket_number} (Unassigned) — ${ticket.subject}`,
                ticketEmailTemplate(
                  "New User Reply on Unassigned Ticket",
                  ticket.ticket_number,
                  ticket.subject,
                  ticket.status,
                  ticket.priority,
                  ticket.category,
                  `<p><strong>${userName}</strong> replied to an unassigned ticket:</p>
                   <div style="background: #1a1a1a; border-left: 3px solid #FFD700; padding: 12px 16px; border-radius: 4px; margin: 12px 0;">
                     <p style="margin: 0; white-space: pre-wrap;">${replyText}</p>
                   </div>
                   <p style="color: #888; margin-top: 16px;">Log in to the Support Portal to claim and respond.</p>`
                )
              );
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("support-ticket-email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
