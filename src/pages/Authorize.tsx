import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signUp, verifyOtp } from "@/lib/auth";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Zap, Shield, Wallet, CreditCard, ArrowLeft, Loader2, CheckCircle2, XCircle, ArrowUpCircle, UserPlus } from "lucide-react";

type Step = "login" | "register" | "otp" | "consent";

const SCOPE_LABELS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  balance: { label: "View Balance", icon: <Wallet className="h-4 w-4" />, description: "Read your wallet balance" },
  charge: { label: "Create Charges", icon: <CreditCard className="h-4 w-4" />, description: "Charge payments from your wallet" },
  referral: { label: "View Referral Network", icon: <Zap className="h-4 w-4" />, description: "Access your referral stats, network & cashback history" },
  topup: { label: "Wallet Top-Up", icon: <ArrowUpCircle className="h-4 w-4" />, description: "Initiate wallet top-ups via FPX bank transfer" },
};

const Authorize = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const rawAppId = searchParams.get("app_id") || searchParams.get("client_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || searchParams.get("callback_url") || "";
  const state = searchParams.get("state") || "";
  const scopeParam = searchParams.get("scope") || searchParams.get("scopes") || "balance,charge";
  const scopes = scopeParam.split(",").map(s => s.trim()).filter(Boolean);

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState("");
  const [appError, setAppError] = useState("");
  const [approving, setApproving] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  // Resolved UUID of the app (may differ from rawAppId if caller passed api_key)
  const [resolvedAppId, setResolvedAppId] = useState("");

  // Validate required params
  useEffect(() => {
    if (!rawAppId || !redirectUri) {
      setAppError("Missing required parameters: app_id and redirect_uri are required.");
      return;
    }
    // Fetch app info via edge function (bypasses RLS, resolves api_key → UUID)
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

  const sendOtpViaEdgeFunction = async (targetEmail: string) => {
    try {
      const response = await supabase.functions.invoke('send-otp', {
        body: { email: targetEmail },
      });
      let errorMessage: string | null = null;
      if (response.error) {
        if (response.error instanceof FunctionsHttpError) {
          try {
            const errorBody = await response.error.context.json();
            errorMessage = errorBody?.error || response.error.message;
          } catch {
            errorMessage = response.error.message;
          }
        } else {
          errorMessage = response.error.message || String(response.error);
        }
      } else if (response.data?.error) {
        errorMessage = response.data.error;
      }
      return { ...response, errorMessage };
    } catch (err) {
      return { data: null, error: err, errorMessage: err instanceof Error ? err.message : String(err) };
    }
  };

  const handleSendOtp = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { error, data, errorMessage } = await sendOtpViaEdgeFunction(email);
      if (error || data?.error) {
        if (errorMessage === 'User not found') {
          setIsNewUser(true);
          setStep("register");
        } else {
          toast({ title: "Error", description: errorMessage || "Could not send OTP. Please try again.", variant: "destructive" });
        }
      } else {
        toast({ title: "OTP Sent", description: "Check your email for the verification code." });
        setStep("otp");
      }
    } catch {
      toast({ title: "Error", description: "Failed to send OTP.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email || !referralCode) return;
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

    // Sign up with random password
    const randomPassword = crypto.randomUUID();
    const { error: signUpError } = await signUp(email, randomPassword, "", "", referralCode.toUpperCase());

    if (signUpError) {
      if (signUpError.message?.toLowerCase().includes("already registered")) {
        toast({ title: "Email already registered", description: "Please sign in instead.", variant: "destructive" });
        setIsNewUser(false);
        setStep("login");
      } else {
        toast({ title: "Registration failed", description: signUpError.message, variant: "destructive" });
      }
      setLoading(false);
      return;
    }

    // Sign out so user verifies via OTP
    await supabase.auth.signOut();

    // Send OTP to newly created user
    const { error: otpError, data: otpData } = await sendOtpViaEdgeFunction(email);
    if (otpError || otpData?.error) {
      toast({ title: "Account created", description: "Please try signing in again.", variant: "destructive" });
      setIsNewUser(false);
      setStep("login");
      setLoading(false);
      return;
    }

    toast({ title: "Account created!", description: "Check your email for the verification code." });
    setStep("otp");
    setLoading(false);
  };
  const handleVerifyOtp = async () => {
    setLoading(true);
    const { error } = await verifyOtp(email, otpCode);
    if (error) {
      toast({ title: "Invalid OTP", description: error.message, variant: "destructive" });
    } else {
      setStep("consent");
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!user) return;
    setApproving(true);

    try {
      // Generate auth code
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

      // Redirect back to 3rd party with code
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
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleSendOtp} disabled={loading || !email}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : "Send OTP"}
                </Button>
              </CardContent>
            </>
          )}

          {/* Register step */}
          {step === "register" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                  <UserPlus className="h-5 w-5 text-secondary" />
                </div>
                <CardTitle className="text-lg text-white">Create NoCap Account</CardTitle>
                <CardDescription className="text-white/50">
                  No account found for <span className="text-white font-medium">{email}</span>. Enter a referral code to register.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Referral Code</Label>
                  <Input
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30 uppercase tracking-wider"
                    autoFocus
                  />
                </div>
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleRegister} disabled={loading || !referralCode}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account...</> : "Create Account & Send OTP"}
                </Button>
                <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white" onClick={() => { setStep("login"); setIsNewUser(false); }}>
                  <ArrowLeft className="h-3 w-3 mr-1" /> Back to Sign In
                </Button>
              </CardContent>
            </>
          )}

          {/* OTP step */}
          {step === "otp" && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-lg text-white">Verify OTP</CardTitle>
                <CardDescription className="text-white/50">
                  Enter the 6-digit code sent to {email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-widest font-semibold border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  autoFocus
                />
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleVerifyOtp} disabled={loading || otpCode.length < 6}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</> : "Verify"}
                </Button>
                <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white" onClick={() => setStep("login")}>
                  <ArrowLeft className="h-3 w-3 mr-1" /> Back
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
    </div>
  );
};

export default Authorize;
