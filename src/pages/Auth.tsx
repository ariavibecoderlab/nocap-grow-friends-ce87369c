import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { signUp, signInWithPassword, verifyOtp, updatePassword } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle2 } from "lucide-react";

type AuthStep = "email" | "password" | "otp" | "register" | "set-password" | "registration-success";

const Auth = () => {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewEmail, setIsNewEmail] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const sendOtpViaEdgeFunction = async (targetEmail: string) => {
    const response = await supabase.functions.invoke('send-otp', {
      body: { email: targetEmail },
    });
    return response;
  };

  const handleEmailSubmit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await sendOtpViaEdgeFunction(email);
      if (error) {
        // User doesn't exist → show register form
        setStep("register");
      } else {
        // User exists, OTP sent via SendGrid
        toast({ title: "OTP Sent", description: "Check your email for the 6-digit code." });
        setStep("otp");
      }
    } catch {
      setStep("register");
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
      // Check if user has a password set — if not, prompt to set one
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStep("set-password");
      }
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

  const validateMalaysianPhone = (phoneNum: string): boolean => {
    // Accept formats: 01x-xxxxxxx, 01xx-xxxxxxx, or digits only (10-11 digits starting with 01)
    const cleaned = phoneNum.replace(/\D/g, '');
    return /^01\d{8,9}$/.test(cleaned);
  };

  const handleRegister = async () => {
    if (!referralCode) {
      toast({ title: "Referral code required", description: "Please enter a valid referral code.", variant: "destructive" });
      return;
    }

    if (!validateMalaysianPhone(phone)) {
      toast({ title: "Invalid phone number", description: "Please enter a valid Malaysian phone number (e.g. 012-3456789).", variant: "destructive" });
      return;
    }

    // Validate referral code exists
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode.toUpperCase())
      .maybeSingle();
    
    if (!referrer) {
      toast({ title: "Invalid referral code", description: "This referral code does not exist.", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Check if phone number already exists
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone) {
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", cleanPhone)
        .maybeSingle();
      if (existingPhone) {
        toast({ title: "Phone number already registered", description: "This phone number is already associated with another account.", variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    const { error } = await signUp(email, password, fullName, cleanPhone, referralCode.toUpperCase());
    if (error) {
      if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already been registered")) {
        toast({ title: "Email already registered", description: "This email address is already associated with an account. Please sign in instead.", variant: "destructive" });
      } else {
        toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      }
    } else {
      setStep("registration-success");
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
              {step === "password" && "Enter Password"}
              {step === "otp" && "Verify OTP"}
              {step === "register" && "Create Account"}
              {step === "set-password" && "Set Your Password"}
              {step === "registration-success" && "Account Created!"}
            </CardTitle>
            <CardDescription>
              {step === "email" && "Enter your email to continue"}
              {step === "password" && "Sign in to your account"}
              {step === "otp" && `Enter the 6-digit code sent to ${email}`}
              {step === "register" && "Fill in your details to get started"}
              {step === "set-password" && "Create a password for future logins"}
              {step === "registration-success" && "Please verify your email to get started"}
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
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                  />
                </div>
                <Button className="w-full" onClick={handleEmailSubmit} disabled={loading}>
                  {loading ? "Checking..." : "Continue"}
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

                  {loading ? "Verifying..." : "Verify"}
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

            {step === "register" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regEmail">Email</Label>
                  <Input id="regEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="+60123456789" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPassword">Password</Label>
                  <Input id="regPassword" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral">Referral Code *</Label>
                  <Input id="referral" placeholder="Enter referral code" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="uppercase" />
                </div>
                <Button className="w-full" onClick={handleRegister} disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
                <Button variant="link" className="w-full text-xs" onClick={() => setStep("email")}>
                  ← Already have an account? Sign in
                </Button>
              </>
            )}

            {step === "registration-success" && (
              <>
                <div className="flex flex-col items-center space-y-4 py-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                    <CheckCircle2 className="h-8 w-8 text-secondary" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    We've sent a verification link to <span className="font-medium text-foreground">{email}</span>. Click the link in your email to activate your account, then come back to sign in.
                  </p>
                </div>
                <Button className="w-full" onClick={() => setStep("email")}>
                  Back to Sign In
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
