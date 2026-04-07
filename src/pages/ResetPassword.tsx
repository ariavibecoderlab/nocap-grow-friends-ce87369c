import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import NocapLogo from "@/components/NocapLogo";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for PASSW0RD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for recovery type
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async () => {
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Update has_password in profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ has_password: true } as any).eq("user_id", user.id);
    }

    await supabase.auth.signOut();
    toast({ title: "Password reset!", description: "Please login with your new password." });
    navigate("/auth");
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary p-4">
        <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
          <CardHeader className="text-center">
            <NocapLogo size="lg" variant="stacked" />
            <CardTitle className="text-white mt-4">Invalid Link</CardTitle>
            <CardDescription className="text-white/50">
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-secondary text-primary" onClick={() => navigate("/auth")}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="text-center">
          <NocapLogo size="lg" variant="stacked" />
          <CardTitle className="text-white mt-4">Reset Your Password</CardTitle>
          <CardDescription className="text-white/50">Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPwd" className="text-white/70">New Password</Label>
            <Input
              id="newPwd"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
            <PasswordStrengthIndicator password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPwd" className="text-white/70">Confirm Password</Label>
            <Input
              id="confirmPwd"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          <Button
            className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold"
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
