import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { verifyOtp, updatePassword } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";

type AuthStep = "email" | "otp" | "set-password";

const Auth = () => {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const sendOtp = async (targetEmail: string) => {
    const response = await supabase.functions.invoke('send-otp', {
      body: { email: targetEmail },
    });
    return response;
  };

  const handleEmailSubmit = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { data, error } = await sendOtp(email);
      if (error || data?.error) {
        toast({ title: "Error", description: data?.error || "Failed to send OTP. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "OTP Sent", description: "Check your email for the 6-digit code." });
        setStep("otp");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const { error } = await sendOtp(email);
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
              {step === "set-password" && "Set Your Password"}
            </CardTitle>
            <CardDescription>
              {step === "email" && "Enter your email to continue"}
              {step === "otp" && `Enter the 6-digit code sent to ${email}`}
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
                  {loading ? "Sending OTP..." : "Continue"}
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
