import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { signUp, verifyOtp, signInWithPassword, updatePassword } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Zap, Users, Coins, TrendingUp, Gift, Percent } from "lucide-react";

type AuthStep = "email" | "otp" | "password" | "set-password";
const REGISTERING_FLAG = "nocap_registering";

const Auth = () => {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewEmail, setIsNewEmail] = useState(false);
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

  // Redirect if already authenticated (skip during registration)
  useEffect(() => {
    if (!authLoading && user && !sessionStorage.getItem(REGISTERING_FLAG)) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const sendOtpViaEdgeFunction = async (targetEmail: string): Promise<{ data: any; error: any; errorMessage?: string }> => {
    try {
      const response = await supabase.functions.invoke('send-otp', {
        body: { email: targetEmail },
      });

      let errorMessage: string | null = null;

      if (response.error) {
        // For FunctionsHttpError (non-2xx), extract the actual response body
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

  const handleEmailSubmit = async () => {
    if (!email) return;

    // New email path: validate referral, sign up, then send OTP
    if (isNewEmail) {
      if (!referralCode) {
        toast({ title: "Referral code required", description: "Please enter a valid referral code to register.", variant: "destructive" });
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

      // Sign up with random password (auto-confirm is enabled)
      // Set flag to prevent auth redirect during signup flow
      sessionStorage.setItem(REGISTERING_FLAG, "1");
      const randomPassword = crypto.randomUUID();
      const { error: signUpError } = await signUp(email, randomPassword, "", "", referralCode.toUpperCase());

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

      // Sign out so user verifies via OTP
      await supabase.auth.signOut();
      sessionStorage.removeItem(REGISTERING_FLAG);

      // Send OTP to newly created user
      const { error: otpError, data: otpData } = await sendOtpViaEdgeFunction(email);
      if (otpError || otpData?.error) {
        toast({ title: "Account created", description: "Please try signing in with your email.", variant: "destructive" });
        setIsNewEmail(false);
        setLoading(false);
        return;
      }

      toast({ title: "OTP Sent", description: "Check your email for the verification code." });
      setStep("otp");
      setLoading(false);
      return;
    }

    // Existing user path: send OTP via edge function which checks auth.users
    setLoading(true);
    try {
      const { data, error, errorMessage } = await sendOtpViaEdgeFunction(email);

      if (error || data?.error) {
        // Only mark as new email if the error is specifically "User not found"
        if (errorMessage === 'User not found') {
          setIsNewEmail(true);
        } else {
          // Transient error (network, SendGrid, etc.) — don't mark as new email
          toast({ title: "Error", description: "Could not send OTP. Please try again.", variant: "destructive" });
        }
      } else {
        toast({ title: "OTP Sent", description: "Check your email for the 6-digit code." });
        setStep("otp");
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
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const { error } = await sendOtpViaEdgeFunction(email);
    if (error) {
      toast({ title: "Error", description: "Failed to resend OTP. Please try again.", variant: "destructive" });
    } else {
      toast({ title: "OTP Sent", description: "Check your email for the 6-digit code." });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    const { error } = await verifyOtp(email, otpCode);
    if (error) {
      toast({ title: "Invalid OTP", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSetPassword = async () => {
    setLoading(true);
    const { error } = await updatePassword(password);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password set!", description: "You can now login with your password." });
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-primary p-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0">
        {/* Floating icons */}
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

        {/* Gradient orbs */}
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 backdrop-blur">
            <Zap className="h-7 w-7 text-secondary" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">
            NO<span className="text-secondary">cap</span>
          </h1>
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
            <TrendingUp className="h-3 w-3 text-secondary" /> 3-Tier Rewards
          </span>
        </div>

        <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl text-white">
              {step === "email" && "Welcome"}
              {step === "otp" && "Verify OTP"}
              {step === "password" && "Enter Password"}
              {step === "set-password" && "Set Your Password"}
            </CardTitle>
            <CardDescription className="text-white/50">
              {step === "email" && "Enter your email to continue"}
              {step === "otp" && `Enter the 6-digit code sent to ${email}`}
              {step === "password" && "Sign in to your account"}
              {step === "set-password" && "Create a password for future logins"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setIsNewEmail(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                {isNewEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="referralEmail" className="text-white/70">Referral Code *</Label>
                    <Input
                      id="referralEmail"
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="uppercase border-white/10 bg-white/5 text-white placeholder:text-white/30"
                      onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                    />
                    <p className="text-xs text-white/40">This email is not registered. Enter a referral code to create an account.</p>
                  </div>
                )}
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleEmailSubmit} disabled={loading}>
                  {loading ? "Please wait..." : isNewEmail ? "Create Account & Send OTP" : "Continue"}
                </Button>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otpInput" className="text-white/70">Verification Code</Label>
                  <Input
                    id="otpInput"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter code from email"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-lg tracking-widest font-semibold border-white/10 bg-white/5 text-white placeholder:text-white/30"
                    autoFocus
                  />
                </div>
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleVerifyOtp} disabled={loading || otpCode.length < 6}>
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>
                <Button variant="outline" className="w-full text-sm border-white/10 text-white/70 hover:bg-white/10 hover:text-white" onClick={handleResendOtp} disabled={loading}>
                  Resend Code
                </Button>
                <Button variant="ghost" className="w-full text-sm text-white/40 hover:text-white hover:bg-white/10" onClick={() => setStep("password")}>
                  Sign in with password instead
                </Button>
                <Button variant="link" className="w-full text-xs text-white/40" onClick={() => setStep("email")}>
                  ← Back
                </Button>
              </>
            )}

            {step === "password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/70">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handlePasswordLogin} disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <Button variant="ghost" className="w-full text-sm text-white/40 hover:text-white hover:bg-white/10" onClick={handleResendOtp}>
                  Sign in with OTP instead
                </Button>
                <Button variant="link" className="w-full text-xs text-white/40" onClick={() => setStep("email")}>
                  ← Back
                </Button>
              </>
            )}

            {step === "set-password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-white/70">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleSetPassword} disabled={loading}>
                  {loading ? "Setting password..." : "Set Password & Continue"}
                </Button>
                <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white hover:bg-white/10" onClick={() => navigate("/dashboard")}>
                  Skip for now
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bottom tagline */}
        <p className="mt-6 text-center text-xs text-white/30">
          Earn cashback on every transaction · Build your affiliate network · Grow together ⚡
        </p>
      </div>
    </div>
  );
};

export default Auth;
