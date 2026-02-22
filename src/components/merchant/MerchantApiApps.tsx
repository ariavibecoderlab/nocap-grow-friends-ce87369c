import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Key, Copy, Eye, EyeOff, Loader2, Globe, FlaskConical, Webhook, Pencil, Check, X } from "lucide-react";

interface Branch {
  id: string;
  branch_name: string;
}

interface ApiApp {
  id: string;
  name: string;
  description: string | null;
  api_key: string;
  branch_id: string;
  webhook_url: string | null;
  is_active: boolean;
  is_sandbox: boolean;
  created_at: string;
}

interface MerchantApiAppsProps {
  branches: Branch[];
}

const MerchantApiApps = ({ branches }: MerchantApiAppsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<ApiApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form
  const [appName, setAppName] = useState("");
  const [appDesc, setAppDesc] = useState("");
  const [branchId, setBranchId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSandbox, setIsSandbox] = useState(false);

  // Credentials dialog (shown once after creation)
  const [credentials, setCredentials] = useState<{ api_key: string; api_secret: string; test_access_token?: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showTestToken, setShowTestToken] = useState(false);
  const [generatingToken, setGeneratingToken] = useState<string | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [webhookEdit, setWebhookEdit] = useState("");
  useEffect(() => {
    if (!user) return;
    fetchApps();
  }, [user]);

  const fetchApps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("api_applications")
      .select("id, name, description, api_key, branch_id, webhook_url, is_active, is_sandbox, created_at")
      .eq("merchant_user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setApps(data as ApiApp[]);
    setLoading(false);
  };

  const createApp = async () => {
    if (!appName.trim() || !branchId) return;
    setCreating(true);

    const { data, error } = await supabase.functions.invoke("api-register-app", {
      body: {
        name: appName.trim(),
        description: appDesc.trim() || null,
        branch_id: branchId,
        webhook_url: webhookUrl.trim() || null,
        is_sandbox: isSandbox,
      },
    });

    if (error || !data?.success) {
      toast({ title: "Error", description: data?.error || error?.message || "Failed to create app", variant: "destructive" });
    } else {
      setCredentials({ api_key: data.api_key, api_secret: data.api_secret, test_access_token: data.test_access_token });
      setShowCreate(false);
      setAppName("");
      setAppDesc("");
      setBranchId("");
      setWebhookUrl("");
      setIsSandbox(false);
      fetchApps();
      toast({ title: "API App created!" });
    }
    setCreating(false);
  };

  const toggleApp = async (appId: string, active: boolean) => {
    await supabase
      .from("api_applications")
      .update({ is_active: active })
      .eq("id", appId);
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, is_active: active } : a)));
  };

  const toggleSandbox = async (appId: string, sandbox: boolean) => {
    await supabase
      .from("api_applications")
      .update({ is_sandbox: sandbox })
      .eq("id", appId);
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, is_sandbox: sandbox } : a)));
    toast({ title: `Sandbox mode ${sandbox ? 'enabled' : 'disabled'}` });
  };

  const generateTestToken = async (appId: string) => {
    setGeneratingToken(appId);
    const { data, error } = await supabase.functions.invoke("generate-test-token", {
      body: { app_id: appId },
    });

    if (error || !data?.success) {
      toast({ title: "Error", description: data?.error || error?.message || "Failed to generate token", variant: "destructive" });
    } else {
      setCredentials({ api_key: "", api_secret: "", test_access_token: data.test_access_token });
      toast({ title: "Test token generated!" });
    }
    setGeneratingToken(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const branchName = (id: string) => branches.find((b) => b.id === id)?.branch_name || "Unknown";

  const startEditWebhook = (app: ApiApp) => {
    setEditingWebhook(app.id);
    setWebhookEdit(app.webhook_url || "");
  };

  const saveWebhook = async (appId: string) => {
    const url = webhookEdit.trim() || null;
    const { error } = await supabase
      .from("api_applications")
      .update({ webhook_url: url })
      .eq("id", appId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, webhook_url: url } : a)));
      toast({ title: "Webhook URL updated" });
    }
    setEditingWebhook(null);
  };
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">API Applications</p>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="gap-1 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
          <Plus className="h-3.5 w-3.5" /> Register App
        </Button>
      </div>

      {apps.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-8 text-white/40">
            <Globe className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No API apps yet</p>
            <p className="text-xs mt-1">Register a third-party app to accept payments via API</p>
          </CardContent>
        </Card>
      ) : (
        apps.map((app) => (
          <Card key={app.id} className="border-white/10 bg-white/5">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{app.name}</p>
                    {app.is_sandbox && (
                      <Badge variant="outline" className="text-[9px] h-4 border-amber-500/50 text-amber-500 py-0 px-1">
                        SANDBOX
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40">Branch: {branchName(app.branch_id)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={app.is_active ? "default" : "secondary"} className="text-[10px]">
                      {app.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Switch checked={app.is_active} onCheckedChange={(v) => toggleApp(app.id, v)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">Sandbox</span>
                    <Switch 
                      checked={app.is_sandbox} 
                      onCheckedChange={(v) => toggleSandbox(app.id, v)}
                      className="data-[state=checked]:bg-amber-500 scale-75"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-[10px] text-white/50 bg-white/5 px-2 py-1 rounded flex-1 truncate">{app.api_key}</code>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/40 hover:text-white" onClick={() => copyToClipboard(app.api_key, "API Key")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {app.is_sandbox && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 text-[10px] h-7"
                  onClick={() => generateTestToken(app.id)}
                  disabled={generatingToken === app.id}
                >
                  {generatingToken === app.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <FlaskConical className="h-3 w-3" />
                  )}
                  Generate Test Token
                </Button>
              )}
              {app.description && <p className="text-[10px] text-white/30">{app.description}</p>}
              
              {/* Webhook URL */}
              <div className="border-t border-white/5 pt-2 mt-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 text-white/40">
                    <Webhook className="h-3 w-3" />
                    <span className="text-[10px] font-medium">Webhook URL</span>
                  </div>
                  {editingWebhook !== app.id && (
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/30 hover:text-white" onClick={() => startEditWebhook(app)}>
                      <Pencil className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
                {editingWebhook === app.id ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={webhookEdit}
                      onChange={(e) => setWebhookEdit(e.target.value)}
                      placeholder="https://your-app.com/webhook"
                      className="h-7 text-[10px] bg-white/5 border-white/10 text-white flex-1"
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300" onClick={() => saveWebhook(app.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white" onClick={() => setEditingWebhook(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/50 truncate">
                    {app.webhook_url || <span className="italic text-white/20">Not set — click edit to add</span>}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Create App Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-primary border-secondary/20 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-secondary font-display">Register API App</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-secondary/80 text-xs font-medium">App Name *</Label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="My Third-Party App" className="bg-white/10 border-secondary/30 text-white placeholder:text-white/30 focus-visible:ring-secondary/50" maxLength={100} />
            </div>
            <div>
              <Label className="text-secondary/80 text-xs font-medium">Description</Label>
              <Input value={appDesc} onChange={(e) => setAppDesc(e.target.value)} placeholder="Optional description" className="bg-white/10 border-secondary/30 text-white placeholder:text-white/30 focus-visible:ring-secondary/50" maxLength={255} />
            </div>
            <div>
              <Label className="text-secondary/80 text-xs font-medium">Branch *</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="bg-white/10 border-secondary/30 text-white focus:ring-secondary/50">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="bg-primary border-secondary/20 text-white">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-white focus:bg-secondary/20 focus:text-secondary">{b.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-secondary/80 text-xs font-medium">Webhook URL (optional)</Label>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." className="bg-white/10 border-secondary/30 text-white placeholder:text-white/30 focus-visible:ring-secondary/50" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-secondary/30 bg-secondary/10">
              <div className="space-y-0.5">
                <Label className="text-secondary text-xs font-medium">Sandbox Mode</Label>
                <p className="text-[10px] text-white/50">Test integrations without real money</p>
              </div>
              <Switch checked={isSandbox} onCheckedChange={setIsSandbox} className="data-[state=checked]:bg-secondary" />
            </div>
            <Button onClick={createApp} disabled={creating || !appName.trim() || !branchId} className="w-full bg-secondary text-primary font-semibold hover:bg-secondary/90">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & Get Credentials"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog (shown once) */}
      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent className="bg-card border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-secondary" /> {credentials?.api_key ? "API Credentials" : "Test Token Generated"}
            </DialogTitle>
          </DialogHeader>
          {credentials?.api_key && (
            <p className="text-xs text-destructive font-semibold">⚠️ Save the API Secret now — it won't be shown again!</p>
          )}
          <div className="space-y-3">
            {credentials?.api_key && (
              <div>
                <Label className="text-white/70 text-xs">API Key</Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-white/70 bg-white/5 px-2 py-1.5 rounded flex-1 break-all">{credentials.api_key}</code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/40" onClick={() => copyToClipboard(credentials.api_key, "API Key")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {credentials?.api_secret && (
              <div>
                <Label className="text-white/70 text-xs">API Secret</Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-white/70 bg-white/5 px-2 py-1.5 rounded flex-1 break-all">
                    {showSecret ? credentials.api_secret : "••••••••••••••••"}
                  </code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/40" onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/40" onClick={() => copyToClipboard(credentials.api_secret, "API Secret")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {credentials?.test_access_token && (
              <div>
                <Label className="text-xs text-amber-500">🧪 Test Access Token (Sandbox)</Label>
                <p className="text-[10px] text-white/40 mb-1">Use this token to skip the authorization flow during testing</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-white/70 bg-white/5 px-2 py-1.5 rounded flex-1 break-all">
                    {showTestToken ? credentials.test_access_token : "••••••••••••••••"}
                  </code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/40" onClick={() => setShowTestToken(!showTestToken)}>
                    {showTestToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/40" onClick={() => copyToClipboard(credentials.test_access_token!, "Test Token")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => setCredentials(null)} className="w-full bg-secondary text-primary hover:bg-secondary/90 mt-2">
            I've saved my credentials
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantApiApps;
