import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signUp, signInWithPassword } from "@/lib/auth";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { Shield, Wallet, CreditCard, ArrowLeft, Loader2, CheckCircle2, XCircle, ArrowUpCircle, Zap } from "lucide-react";

const SCOPE_LABELS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  balance: { label: "View Balance", icon: <Wallet className="h-4 w-4" />, description: "Read your VA balance" },
  charge: { label: "Create Charges", icon: <CreditCard className="h-4 w-4" />, description: "Charge payments from your wallet" },
  referral: { label: "View Referral Network", icon: <Zap className="h-4 w-4" />, description: "Access your referral stats, network & cashback history" },
  topup: { label: "Wallet Top-Up", icon: <ArrowUpCircle className="h-4 w-4" />, description: "Initiate wallet top-ups via FPX bank transfer" },
  "merchant.branches.read": { label: "View Merchant Branches", icon: <Shield className="h-4 w-4" />, description: "Read active merchant branch IDs for payment routing" },
  "branches:read": { label: "View Merchant Branches", icon: <Shield className="h-4 w-4" />, description: "Read active merchant branch IDs for payment routing" },
  branches: { label: "View Merchant Branches", icon: <Shield className="h-4 w-4" />, description: "Read active merchant branch IDs for payment routing" },
};

type Step = "login" | "register" | "consent";

const Authorize = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const rawAppId = searchParams.get("app_id") || searchParams.get("client_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || searchParams.get("callback_url") || "";
  const state = searchParams.get("state") || "";
  const scopeParam = searchParams.get("scope") || searchParams.get("scopes") || "balance,charge";
  const scopes = scopeParam.split(",").map(s => s.trim()).filter(Boolean);

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState("");
  const [appError, setAppError] = useState("");
  const [approving, setApproving] = useState(false);
  const [resolvedAppId, setResolvedAppId] = useState("");
  const [isNewEmail, setIsNewEmail] = useState(false);

  // Dialog states (matching Auth.tsx pattern)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);

  // Validate required params & fetch app info
  useEffect(() => {
    if (!rawAppId || !redirectUri) {
      setAppError("Missing required parameters: app_id and redirect_uri are required.");
      return;
    }
    const fetchApp = async () => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-app-info?app_id=${encodeURIComponent(rawAppId)}`,
        { headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const result = await res.json();
      if (!res.ok || result.error) {
        setAppError("Application not found or inactive.");
      } else {
        setAppName(result.name);
        setResolvedAppId(result.id);
      }
    };
    fetchApp();
  }, [rawAppId, redirectUri]);

  // If user is already logged in, skip to consent
  useEffect(() => {
    if (!authLoading && user && !appError) {
      setStep("consent");
    }
  }, [user, authLoading, appError]);

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
    if (error) return { success: false, error: error.message || 'Failed to set password' };
    if (data?.error) return { success: false, error: data.error };
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

      // Validate referral code via SECURITY DEFINER RPC (no public profile read).
      const { data: referrerId } = await (supabase.rpc as any)("get_referrer_id_by_code", {
        p_code: referralCode.toUpperCase(),
      });

      if (!referrerId) {
        toast({ title: "Invalid referral code", description: "This referral code does not exist.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error: signUpError } = await signUp(email, password, "", "", referralCode.toUpperCase());

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes("already registered")) {
          toast({ title: "Email already registered", description: "Please sign in instead.", variant: "destructive" });
          setIsNewEmail(false);
        } else {
          toast({ title: "Registration failed", description: signUpError.message, variant: "destructive" });
        }
        setLoading(false);
        return;
      }

      // Mark has_password
      await supabase.functions.invoke('set-initial-password', {
        body: { email, password },
      });

      // Sign out so user logs in fresh
      await supabase.auth.signOut();

      toast({ title: "Account created!", description: "Please login with your email and password." });
      setPassword("");
      setConfirmPassword("");
      setReferralCode("");
      setIsNewEmail(false);
      setLoading(false);
      return;
    }

    // Existing user path
    setLoading(true);
    try {
      const result = await checkHasPassword(email);

      if (!result) {
        toast({ title: "Error", description: "Could not check account. Please try again.", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!result.exists) {
        setIsNewEmail(true);
        setLoading(false);
        return;
      }

      if (result.has_password) {
        setPassword("");
        setShowPasswordDialog(true);
      } else {
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
      setStep("consent");
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

  const handleApprove = async () => {
    if (!user) return;
    setApproving(true);

    try {
      const codeBytes = new Uint8Array(32);
      crypto.getRandomValues(codeBytes);
      const code = Array.from(codeBytes).map(b => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase
        .from("api_authorization_codes")
        .insert({
          code,
          app_id: resolvedAppId,
          user_id: user.id,
          scopes,
          redirect_uri: redirectUri,
          state: state || null,
        });

      if (error) {
        if (error.message?.includes("duplicate") || error.code === "23505") {
          toast({ title: "Error", description: "Authorization code conflict. Please try again.", variant: "destructive" });
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
        setApproving(false);
        return;
      }

      const separator = redirectUri.includes("?") ? "&" : "?";
      let callbackUrl = `${redirectUri}${separator}code=${code}`;
      if (state) callbackUrl += `&state=${encodeURIComponent(state)}`;

      window.location.href = callbackUrl;
    } catch {
      toast({ title: "Error", description: "Failed to authorize.", variant: "destructive" });
      setApproving(false);
    }
  };

  const handleDeny = () => {
    const separator = redirectUri.includes("?") ? "&" : "?";
    let callbackUrl = `${redirectUri}${separator}error=access_denied&error_description=User+denied+the+request`;
    if (state) callbackUrl += `&state=${encodeURIComponent(state)}`;
    window.location.href = callbackUrl;
  };

  if (appError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary p-4">
        <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6">
            <XCircle className="h-12 w-12 text-red-400" />
            <p className="text-center text-white/70">{appError}</p>
            <Button variant="outline" className="border-white/10 text-white/70 hover:bg-white/10" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-primary p-4 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 backdrop-blur">
            <Shield className="h-6 w-6 text-secondary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            NO<span className="text-secondary">cap</span> Authorization
          </h1>
        </div>

        <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          {/* Login step */}
          {step === "login" && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-lg text-white">Sign in to continue</CardTitle>
                <CardDescription className="text-white/50">
                  <span className="font-semibold text-secondary">{appName || "An application"}</span> wants to connect to your NoCap wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Email</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setIsNewEmail(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>

                {isNewEmail && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-white/70">Referral Code *</Label>
                      <Input
                        type="text"
                        placeholder="Enter referral code"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="uppercase border-white/10 bg-white/5 text-white placeholder:text-white/30 tracking-wider"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Password *</Label>
                      <Input
                        type="password"
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                      />
                      <PasswordStrengthIndicator password={password} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Confirm Password *</Label>
                      <Input
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                      />
                    </div>
                    <p className="text-xs text-white/40">No account found for this email. Fill in the details above to create one.</p>
                  </>
                )}

                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleEmailSubmit} disabled={loading || !email}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Please wait...</> : isNewEmail ? "Create Account" : "Continue"}
                </Button>
              </CardContent>
            </>
          )}

          {/* Consent step */}
          {step === "consent" && (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg text-white">Authorize Access</CardTitle>
                <CardDescription className="text-white/50">
                  <span className="font-semibold text-secondary">{appName}</span> is requesting access to your NoCap wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User info */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                  <p className="text-xs text-white/40">Signed in as</p>
                  <p className="text-sm font-medium text-white">{user?.email}</p>
                </div>

                {/* Requested permissions */}
                <div>
                  <p className="text-xs font-medium text-white/50 mb-2">This app will be able to:</p>
                  <div className="space-y-2">
                    {scopes.map((scope) => {
                      const info = SCOPE_LABELS[scope];
                      return (
                        <div key={scope} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                            {info?.icon || <Shield className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{info?.label || scope}</p>
                            <p className="text-xs text-white/40">{info?.description || `Access to ${scope}`}</p>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 border-white/10 text-white/70 hover:bg-white/10 hover:text-white" onClick={handleDeny} disabled={approving}>
                    Deny
                  </Button>
                  <Button className="flex-1 bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleApprove} disabled={approving}>
                    {approving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Authorizing...</> : "Authorize"}
                  </Button>
                </div>

                <p className="text-[10px] text-center text-white/30">
                  By authorizing, you allow this app to access your wallet within the requested permissions. You can revoke access anytime from your Connected Apps settings.
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Password Login Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="border-white/10 bg-primary text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Enter Password</DialogTitle>
            <DialogDescription className="text-white/50">Sign in to your NoCap account</DialogDescription>
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
            <DialogDescription className="text-white/50">Create a password for your NoCap account</DialogDescription>
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

export default Authorize;
