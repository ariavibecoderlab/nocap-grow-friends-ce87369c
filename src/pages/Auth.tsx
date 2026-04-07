import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { signUp, signInWithPassword } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Coins, TrendingUp, Gift, Percent, Zap } from "lucide-react";
import NocapLogo from "@/components/NocapLogo";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const REGISTERING_FLAG = "nocap_registering";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewEmail, setIsNewEmail] = useState(false);

  // Dialog states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Auto-fill referral code from URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode && !referralCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user && !sessionStorage.getItem(REGISTERING_FLAG)) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const checkHasPassword = async (targetEmail: string) => {
    const { data, error } = await supabase.functions.invoke('check-has-password', {
      body: { email: targetEmail },
    });
    if (error) return null;
    return data as { exists: boolean; has_password: boolean };
  };

  const setInitialPassword = async (targetEmail: string, pwd: string) => {
    const { data, error } = await supabase.functions.invoke('set-initial-password', {
      body: { email: targetEmail, password: pwd },
    });
    if (error) {
      // Extract error from function response
      return { success: false, error: error.message || 'Failed to set password' };
    }
    if (data?.error) {
      return { success: false, error: data.error };
    }
    return { success: true, error: null };
  };

  const handleEmailSubmit = async () => {
    if (!email) return;

    // Registration path
    if (isNewEmail) {
      if (!referralCode) {
        toast({ title: "Referral code required", description: "Please enter a valid referral code to register.", variant: "destructive" });
        return;
      }
      if (password.length < 6) {
        toast({ title: "Password required", description: "Password must be at least 6 characters.", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
        return;
      }

      setLoading(true);

      // Validate referral code
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode.toUpperCase())
        .maybeSingle();

      if (!referrer) {
        toast({ title: "Invalid referral code", description: "This referral code does not exist.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Sign up with user-provided password
      sessionStorage.setItem(REGISTERING_FLAG, "1");
      const { error: signUpError } = await signUp(email, password, "", "", referralCode.toUpperCase());

      if (signUpError) {
        sessionStorage.removeItem(REGISTERING_FLAG);
        if (signUpError.message?.toLowerCase().includes("already registered")) {
          toast({ title: "Email already registered", description: "Please sign in instead.", variant: "destructive" });
          setIsNewEmail(false);
        } else {
          toast({ title: "Registration failed", description: signUpError.message, variant: "destructive" });
        }
        setLoading(false);
        return;
      }

      // Mark has_password via edge function
      await supabase.functions.invoke('set-initial-password', {
        body: { email, password },
      });

      // Sign out so user logs in fresh
      await supabase.auth.signOut();
      sessionStorage.removeItem(REGISTERING_FLAG);

      toast({ title: "Account created!", description: "Please login with your email and password." });
      setPassword("");
      setConfirmPassword("");
      setReferralCode("");
      setIsNewEmail(false);
      setLoading(false);
      return;
    }

    // Existing user path: check if user exists and has password
    setLoading(true);
    try {
      const result = await checkHasPassword(email);

      if (!result) {
        toast({ title: "Error", description: "Could not check account. Please try again.", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!result.exists) {
        // User not found — show registration fields
        setIsNewEmail(true);
        setLoading(false);
        return;
      }

      if (result.has_password) {
        // Has password — show password login dialog
        setPassword("");
        setShowPasswordDialog(true);
      } else {
        // No password yet — show set password dialog
        setPassword("");
        setConfirmPassword("");
        setShowSetPasswordDialog(true);
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handlePasswordLogin = async () => {
    setLoading(true);
    const { error } = await signInWithPassword(email, password);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      setShowPasswordDialog(false);
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSetPassword = async () => {
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setLoading(true);
    const result = await setInitialPassword(email, password);

    if (!result.success) {
      toast({ title: "Error", description: result.error || "Failed to set password", variant: "destructive" });
      setLoading(false);
      return;
    }

    setShowSetPasswordDialog(false);
    toast({ title: "Password set!", description: "Please login with your new password." });

    // Reset form for login
    setPassword("");
    setConfirmPassword("");
    setIsNewEmail(false);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your email for the password reset link." });
      setShowPasswordDialog(false);
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-primary p-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[15%] animate-pulse opacity-10">
          <Coins className="h-16 w-16 text-secondary" />
        </div>
        <div className="absolute right-[12%] top-[20%] animate-pulse opacity-10" style={{ animationDelay: '1s' }}>
          <Users className="h-12 w-12 text-secondary" />
        </div>
        <div className="absolute left-[8%] bottom-[25%] animate-pulse opacity-10" style={{ animationDelay: '0.5s' }}>
          <TrendingUp className="h-14 w-14 text-secondary" />
        </div>
        <div className="absolute right-[15%] bottom-[18%] animate-pulse opacity-10" style={{ animationDelay: '1.5s' }}>
          <Gift className="h-10 w-10 text-secondary" />
        </div>
        <div className="absolute left-[25%] top-[8%] animate-pulse opacity-[0.07]" style={{ animationDelay: '2s' }}>
          <Percent className="h-20 w-20 text-secondary" />
        </div>
        <div className="absolute right-[8%] top-[50%] animate-pulse opacity-[0.07]" style={{ animationDelay: '0.8s' }}>
          <Zap className="h-24 w-24 text-secondary" />
        </div>

        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <NocapLogo size="lg" variant="stacked" />
          <p className="mt-2 text-sm text-white/60">Affiliate Cashback Platform</p>
        </div>

        {/* Feature pills */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 backdrop-blur">
            <Coins className="h-3 w-3 text-secondary" /> Instant Cashback
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 backdrop-blur">
            <Users className="h-3 w-3 text-secondary" /> Refer & Earn
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 backdrop-blur">
            <TrendingUp className="h-3 w-3 text-secondary" /> 6-Tier Rewards
          </span>
        </div>

        <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl text-white">Welcome</CardTitle>
            <CardDescription className="text-white/50">Enter your email to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="azarul@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setIsNewEmail(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            {isNewEmail && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="referralEmail" className="text-white/70">Referral Code *</Label>
                  <Input
                    id="referralEmail"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="uppercase border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPassword" className="text-white/70">Password *</Label>
                  <Input
                    id="regPassword"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                  <PasswordStrengthIndicator password={password} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regConfirmPassword" className="text-white/70">Confirm Password *</Label>
                  <Input
                    id="regConfirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <p className="text-xs text-white/40">This email is not registered. Fill in the details above to create an account.</p>
              </>
            )}
            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleEmailSubmit} disabled={loading}>
              {loading ? "Please wait..." : isNewEmail ? "Create Account" : "Continue"}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-white/30">
          Earn cashback on every transaction · Build your affiliate network · Grow together ⚡
        </p>
      </div>

      {/* Password Login Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="border-white/10 bg-primary text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Enter Password</DialogTitle>
            <DialogDescription className="text-white/50">Sign in to your account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginPwd" className="text-white/70">Password</Label>
              <Input
                id="loginPwd"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                autoFocus
              />
            </div>
            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handlePasswordLogin} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <Button variant="ghost" className="w-full text-sm text-white/40 hover:text-white hover:bg-white/10" onClick={handleForgotPassword} disabled={loading}>
              Forgot Password?
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog open={showSetPasswordDialog} onOpenChange={setShowSetPasswordDialog}>
        <DialogContent className="border-white/10 bg-primary text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Set Your Password</DialogTitle>
            <DialogDescription className="text-white/50">Create a password for your account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPwd" className="text-white/70">New Password</Label>
              <Input
                id="newPwd"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                autoFocus
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
                onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleSetPassword} disabled={loading}>
              {loading ? "Setting password..." : "Set Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
