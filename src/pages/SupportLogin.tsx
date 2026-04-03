import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Headphones, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import NocapLogo from "@/components/NocapLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Step = "email" | "otp";

const SupportLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-otp", {
        body: { email },
      });
      if (error) throw error;
      setStep("otp");
      toast({ title: "OTP Sent", description: `A verification code has been sent to ${email}` });
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });
      if (error) throw error;
      if (!data.user) throw new Error("Authentication failed");

      // Check for support role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "support");

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "You do not have support agent access.", variant: "destructive" });
        return;
      }

      navigate("/support-portal");
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
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
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/70">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@nocap.com"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" /> Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <button
                type="button"
                onClick={() => { setStep("email"); setOtpCode(""); }}
                className="flex items-center gap-1 text-white/60 hover:text-white text-sm mb-2"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <p className="text-white/60 text-sm text-center">
                Enter the verification code sent to <span className="text-white font-medium">{email}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={7} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} className="bg-white/5 border-white/10 text-white" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={loading || otpCode.length < 6}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" /> Verifying...
                  </>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-white/50 hover:text-white"
                onClick={handleSendOtp}
                disabled={loading}
              >
                Resend Code
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportLogin;
