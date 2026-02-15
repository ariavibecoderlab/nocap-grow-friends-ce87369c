import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { signUp, signInWithPassword, signInWithOtp, verifyOtp, updatePassword } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type AuthStep = "email" | "password" | "otp" | "register" | "set-password";

const Auth = () => {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEmailSubmit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      // Try signing in with a dummy password to check if user exists
      const { error } = await signInWithPassword(email, "__check_existence__");
      if (error?.message?.includes("Invalid login credentials")) {
        // User exists with a password
        setHasPassword(true);
        setStep("password");
      } else if (error?.message?.includes("Email not confirmed")) {
        toast({ title: "Check your email", description: "Please verify your email first." });
      } else {
        // User might not exist — show register
        setStep("register");
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

  const handleSendOtp = async () => {
    setLoading(true);
    const { error } = await signInWithOtp(email);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "OTP Sent", description: "Check your email for the login code." });
      setStep("otp");
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

  const handleRegister = async () => {
    if (!referralCode) {
      toast({ title: "Referral code required", description: "Please enter a valid referral code.", variant: "destructive" });
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
    const { error } = await signUp(email, password, fullName, phone, referralCode.toUpperCase());
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Please check your email to verify your account." });
      setStep("email");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
            NO<span className="text-primary">cap</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Affiliate Cashback Platform</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">
              {step === "email" && "Welcome"}
              {step === "password" && "Enter Password"}
              {step === "otp" && "Verify OTP"}
              {step === "register" && "Create Account"}
              {step === "set-password" && "Set Your Password"}
            </CardTitle>
            <CardDescription>
              {step === "email" && "Enter your email to continue"}
              {step === "password" && "Sign in to your account"}
              {step === "otp" && "Enter the code sent to your email"}
              {step === "register" && "Fill in your details to get started"}
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
                <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={handleSendOtp}>
                  Sign in with OTP instead
                </Button>
                <Button variant="link" className="w-full text-xs" onClick={() => setStep("email")}>
                  ← Back
                </Button>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="flex flex-col items-center space-y-4">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button className="w-full" onClick={handleVerifyOtp} disabled={loading || otpCode.length < 6}>
                  {loading ? "Verifying..." : "Verify"}
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
