import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Headphones } from "lucide-react";
import NocapLogo from "@/components/NocapLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SupportLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Check for support role
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "support");
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "You do not have support agent access.", variant: "destructive" });
        return;
      }
      navigate("/support-portal");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <Card className="w-full max-w-sm border-white/10 bg-white/5">
        <CardHeader className="text-center space-y-3">
          <NocapLogo size="md" />
          <div className="flex items-center justify-center gap-2">
            <Headphones className="h-5 w-5 text-secondary" />
            <CardTitle className="text-white text-lg">Support Agent Portal</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="agent@nocap.com"
                className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="bg-white/5 border-white/10 text-white" />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Signing in...</> : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportLogin;
