import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SlaSetting {
  priority: string;
  first_response_minutes: number;
  resolution_minutes: number;
}

export function useSlaSettings() {
  const [slaMap, setSlaMap] = useState<Record<string, SlaSetting>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("sla_settings")
      .select("priority, first_response_minutes, resolution_minutes")
      .then(({ data }) => {
        const map: Record<string, SlaSetting> = {};
        (data || []).forEach((s: any) => {
          map[s.priority] = s;
        });
        setSlaMap(map);
        setLoading(false);
      });
  }, []);

  const getSlaStatus = (ticket: { priority: string; created_at: string; first_response_at: string | null; status: string }) => {
    const sla = slaMap[ticket.priority];
    if (!sla) return null;
    if (ticket.status === "closed" || ticket.status === "resolved") return null;

    const now = Date.now();
    const created = new Date(ticket.created_at).getTime();
    const elapsedMinutes = (now - created) / 60000;

    // First response SLA
    let responseBreached = false;
    let responseWarning = false;
    if (!ticket.first_response_at) {
      responseBreached = elapsedMinutes > sla.first_response_minutes;
      responseWarning = !responseBreached && elapsedMinutes > sla.first_response_minutes * 0.75;
    }

    // Resolution SLA
    const resolutionBreached = elapsedMinutes > sla.resolution_minutes;
    const resolutionWarning = !resolutionBreached && elapsedMinutes > sla.resolution_minutes * 0.75;

    return {
      responseBreached,
      responseWarning,
      resolutionBreached,
      resolutionWarning,
      firstResponseTarget: sla.first_response_minutes,
      resolutionTarget: sla.resolution_minutes,
    };
  };

  return { slaMap, loading, getSlaStatus };
}
