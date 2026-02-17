import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, FileText, ChevronDown, ChevronUp, Webhook } from "lucide-react";
import { format } from "date-fns";

interface ApiApp {
  id: string;
  name: string;
}

interface LogEntry {
  id: string;
  app_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  request_body: Record<string, unknown>;
  response_body: Record<string, unknown>;
  duration_ms: number | null;
  created_at: string;
}

const MerchantApiLogs = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState<ApiApp[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("api_applications")
      .select("id, name")
      .eq("merchant_user_id", user.id)
      .then(({ data }) => { if (data) setApps(data); });
  }, [user]);

  const fetchLogs = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("api_request_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (selectedAppId !== "all") {
      query = query.eq("app_id", selectedAppId);
    } else if (apps.length > 0) {
      query = query.in("app_id", apps.map((a) => a.id));
    }

    const { data } = await query;
    if (data) setLogs(data as LogEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user && apps.length > 0) fetchLogs();
  }, [user, selectedAppId, apps]);

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (code >= 400 && code < 500) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "text-blue-400";
      case "POST": return "text-emerald-400";
      case "PUT": return "text-amber-400";
      case "DELETE": return "text-red-400";
      case "WEBHOOK": return "text-purple-400";
      default: return "text-white/60";
    }
  };

  const isWebhookLog = (log: LogEntry) => log.method === "WEBHOOK";

  const appName = (id: string) => apps.find((a) => a.id === id)?.name || "Unknown";

  if (apps.length === 0) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex flex-col items-center py-8 text-white/40">
          <FileText className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm font-medium">No API apps</p>
          <p className="text-xs mt-1">Create an API app first to see request logs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Select value={selectedAppId} onValueChange={setSelectedAppId}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8 flex-1">
            <SelectValue placeholder="Filter by app" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Apps</SelectItem>
            {apps.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchLogs}
          disabled={loading}
          className="gap-1 border-white/10 text-white/70 hover:bg-white/10 hover:text-white h-8"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-8 text-white/40">
            <FileText className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No logs yet</p>
            <p className="text-xs mt-1">API request logs will appear here once API calls are made</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1.5">
            {logs.map((log) => (
              <Card
                key={log.id}
                className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/8 transition-colors"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isWebhookLog(log) ? (
                        <Webhook className="h-3 w-3 text-purple-400 shrink-0" />
                      ) : null}
                      <span className={`text-[10px] font-mono font-bold ${getMethodColor(log.method)}`}>
                        {log.method}
                      </span>
                      <span className="text-[10px] text-white/60 font-mono truncate">
                        {log.endpoint}
                      </span>
                      <Badge variant="outline" className={`text-[9px] h-4 px-1 py-0 ${getStatusColor(log.status_code)}`}>
                        {isWebhookLog(log)
                          ? ((log.response_body as any)?.delivered ? "delivered" : "failed")
                          : log.status_code}
                      </Badge>
                      {isWebhookLog(log) && (log.response_body as any)?.attempts > 1 && (
                        <span className="text-[9px] text-amber-400/70">
                          {(log.response_body as any).attempts} attempts
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {log.duration_ms !== null && (
                        <span className="text-[9px] text-white/30">{log.duration_ms}ms</span>
                      )}
                      <span className="text-[9px] text-white/30">
                        {format(new Date(log.created_at), "HH:mm:ss")}
                      </span>
                      {expandedLog === log.id ? (
                        <ChevronUp className="h-3 w-3 text-white/30" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-white/30" />
                      )}
                    </div>
                  </div>

                  {selectedAppId === "all" && (
                    <p className="text-[9px] text-white/30 mt-0.5">{appName(log.app_id)}</p>
                  )}

                  {expandedLog === log.id && (
                    <div className="mt-2 space-y-2 border-t border-white/5 pt-2">
                      <div>
                        <p className="text-[9px] text-white/40 mb-0.5">Request</p>
                        <pre className="text-[10px] text-white/60 bg-white/5 rounded p-1.5 overflow-auto max-h-24 font-mono">
                          {JSON.stringify(log.request_body, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-[9px] text-white/40 mb-0.5">Response</p>
                        <pre className="text-[10px] text-white/60 bg-white/5 rounded p-1.5 overflow-auto max-h-24 font-mono">
                          {JSON.stringify(log.response_body, null, 2)}
                        </pre>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-white/30">
                        <span>{format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}</span>
                        {log.duration_ms !== null && <span>• {log.duration_ms}ms</span>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default MerchantApiLogs;
