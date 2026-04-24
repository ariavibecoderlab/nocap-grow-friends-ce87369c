import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Webhook, ChevronDown, ChevronUp, RotateCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ApiApp { id: string; name: string }

interface Delivery {
  id: string;
  app_id: string;
  event: string;
  target_url: string;
  status: string;
  status_code: number | null;
  attempt_count: number;
  last_error: string | null;
  signature: string | null;
  delivered_at: string | null;
  next_retry_at: string | null;
  created_at: string;
  replayed_from_id: string | null;
  payload: Record<string, unknown>;
}

const MerchantWebhookDeliveries = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<ApiApp[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [appId, setAppId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replaying, setReplaying] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("api_applications").select("id, name").eq("merchant_user_id", user.id)
      .then(({ data }) => { if (data) setApps(data); });
  }, [user]);

  const fetchDeliveries = async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("webhook_deliveries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (appId !== "all") q = q.eq("app_id", appId);
    else if (apps.length > 0) q = q.in("app_id", apps.map((a) => a.id));
    if (statusFilter !== "all") q = q.eq("status", statusFilter);

    const { data, error } = await q;
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    if (data) setDeliveries(data as unknown as Delivery[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user && apps.length > 0) fetchDeliveries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, apps, appId, statusFilter]);

  const replay = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReplaying(id);
    try {
      const { data, error } = await supabase.functions.invoke("api-webhooks-replay", {
        body: { delivery_id: id },
      });
      if (error || (data as any)?.error) {
        throw new Error(error?.message || (data as any)?.error || "Replay failed");
      }
      toast({ title: "Replay queued", description: "Webhook re-dispatched" });
      fetchDeliveries();
    } catch (err) {
      toast({ title: "Replay failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setReplaying(null);
    }
  };

  const statusColor = (s: string) => {
    if (s === "delivered") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (s === "failed") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (s === "pending") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-white/10 text-white/60 border-white/20";
  };

  const appName = (id: string) => apps.find((a) => a.id === id)?.name || "Unknown";

  if (apps.length === 0) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex flex-col items-center py-8 text-white/40">
          <Webhook className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm font-medium">No API apps</p>
          <p className="text-xs mt-1">Create an API app with a webhook URL to see deliveries</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={appId} onValueChange={setAppId}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8 flex-1">
            <SelectValue placeholder="App" />
          </SelectTrigger>
          <SelectContent className="bg-primary border-white/10 text-white">
            <SelectItem value="all">All Apps</SelectItem>
            {apps.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-primary border-white/10 text-white">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={fetchDeliveries} disabled={loading}
          className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white h-8">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : deliveries.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-8 text-white/40">
            <Webhook className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No webhook deliveries yet</p>
            <p className="text-xs mt-1">Delivery attempts appear here once events fire</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-1.5">
            {deliveries.map((d) => (
              <Card key={d.id} className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/8 transition-colors"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Webhook className="h-3 w-3 text-purple-400 shrink-0" />
                      <span className="text-[10px] font-mono font-bold text-purple-400">{d.event}</span>
                      <Badge variant="outline" className={`text-[9px] h-4 px-1 py-0 ${statusColor(d.status)}`}>
                        {d.status}
                      </Badge>
                      {d.status_code !== null && (
                        <span className="text-[9px] text-white/40 font-mono">HTTP {d.status_code}</span>
                      )}
                      {d.attempt_count > 1 && (
                        <span className="text-[9px] text-amber-400/70">{d.attempt_count} attempts</span>
                      )}
                      {d.replayed_from_id && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                          replay
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] text-white/30">{format(new Date(d.created_at), "MMM d HH:mm:ss")}</span>
                      {d.status === "failed" && (
                        <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px] text-blue-400 hover:bg-blue-500/10"
                          onClick={(e) => replay(d.id, e)} disabled={replaying === d.id}>
                          {replaying === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RotateCw className="h-2.5 w-2.5 mr-0.5" />Replay</>}
                        </Button>
                      )}
                      {expanded === d.id ? <ChevronUp className="h-3 w-3 text-white/30" /> : <ChevronDown className="h-3 w-3 text-white/30" />}
                    </div>
                  </div>

                  {appId === "all" && (
                    <p className="text-[9px] text-white/30 mt-0.5">{appName(d.app_id)}</p>
                  )}

                  {expanded === d.id && (
                    <div className="mt-2 space-y-2 border-t border-white/5 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-[9px]">
                        <div>
                          <p className="text-white/40">Target URL</p>
                          <p className="text-white/70 font-mono truncate">{d.target_url}</p>
                        </div>
                        <div>
                          <p className="text-white/40">Delivered At</p>
                          <p className="text-white/70 font-mono">
                            {d.delivered_at ? format(new Date(d.delivered_at), "yyyy-MM-dd HH:mm:ss") : "—"}
                          </p>
                        </div>
                        {d.next_retry_at && (
                          <div>
                            <p className="text-white/40">Next Retry</p>
                            <p className="text-white/70 font-mono">{format(new Date(d.next_retry_at), "yyyy-MM-dd HH:mm:ss")}</p>
                          </div>
                        )}
                        {d.signature && (
                          <div className="col-span-2">
                            <p className="text-white/40">Signature</p>
                            <p className="text-white/70 font-mono text-[8px] truncate">{d.signature}</p>
                          </div>
                        )}
                      </div>

                      {d.last_error && (
                        <div className="rounded bg-red-500/10 border border-red-500/20 p-1.5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <AlertCircle className="h-3 w-3 text-red-400" />
                            <p className="text-[9px] text-red-400 font-medium">Last Error</p>
                          </div>
                          <p className="text-[10px] text-red-300/80 font-mono break-all">{d.last_error}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-[9px] text-white/40 mb-0.5">Payload</p>
                        <pre className="text-[10px] text-white/60 bg-white/5 rounded p-1.5 overflow-auto max-h-32 font-mono">
                          {JSON.stringify(d.payload, null, 2)}
                        </pre>
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

export default MerchantWebhookDeliveries;
