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

  const sendOtpViaEdgeFunction = async (targetEmail: string) => {
    try {
      const response = await supabase.functions.invoke('send-otp', {
        body: { email: targetEmail },
      });
      return response;
    } catch (err) {
      return { data: null, error: err };
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

    // Existing user path: try to send OTP
    setLoading(true);
    try {
      const { data, error } = await sendOtpViaEdgeFunction(email);
      if (error || data?.error) {
        setIsNewEmail(true);
      } else {
        toast({ title: "OTP Sent", description: "Check your email for the 6-digit code." });
        setStep("otp");
      }
    } catch {
      setIsNewEmail(true);
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
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">
            NO<span className="text-secondary">cap</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">Affiliate Cashback Platform</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">
              {step === "email" && "Welcome"}
              {step === "otp" && "Verify OTP"}
              {step === "password" && "Enter Password"}
              {step === "set-password" && "Set Your Password"}
            </CardTitle>
            <CardDescription>
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setIsNewEmail(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                  />
                </div>
                {isNewEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="referralEmail">Referral Code *</Label>
                    <Input
                      id="referralEmail"
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="uppercase"
                      onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                    />
                    <p className="text-xs text-muted-foreground">This email is not registered. Enter a referral code to create an account.</p>
                  </div>
                )}
                <Button className="w-full" onClick={handleEmailSubmit} disabled={loading}>
                  {loading ? "Please wait..." : isNewEmail ? "Create Account & Send OTP" : "Continue"}
                </Button>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otpInput">Verification Code</Label>
                  <Input
                    id="otpInput"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter code from email"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-lg tracking-widest font-semibold"
                    autoFocus
                  />
                </div>
                <Button className="w-full" onClick={handleVerifyOtp} disabled={loading || otpCode.length < 6}>
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>
                <Button variant="outline" className="w-full text-sm" onClick={handleResendOtp} disabled={loading}>
                  Resend Code
                </Button>
                <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={() => setStep("password")}>
                  Sign in with password instead
                </Button>
                <Button variant="link" className="w-full text-xs" onClick={() => setStep("email")}>
                  ← Back
                </Button>
              </>
            )}

            {step === "password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                  />
                </div>
                <Button className="w-full" onClick={handlePasswordLogin} disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={handleResendOtp}>
                  Sign in with OTP instead
                </Button>
                <Button variant="link" className="w-full text-xs" onClick={() => setStep("email")}>
                  ← Back
                </Button>
              </>
            )}

            {step === "set-password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleSetPassword} disabled={loading}>
                  {loading ? "Setting password..." : "Set Password & Continue"}
                </Button>
                <Button variant="ghost" className="w-full text-xs" onClick={() => navigate("/dashboard")}>
                  Skip for now
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
