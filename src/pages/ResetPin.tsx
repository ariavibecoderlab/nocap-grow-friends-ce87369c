import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

type Step = "email" | "otp" | "new_pin" | "confirm_pin";

const ResetPin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill email from current user
  const userEmail = user?.email || "";

  const handleSendOtp = async () => {
    const targetEmail = email || userEmail;
    if (!targetEmail) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { email: targetEmail },
      });

      if (fnError || data?.error) {
        setError(data?.error || "Failed to send OTP");
      } else {
        setEmail(targetEmail);
        setStep("otp");
        toast({ title: "OTP Sent", description: `Verification code sent to ${targetEmail}` });
      }
    } catch {
      setError("Failed to send OTP");
    }

    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setError("Enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verify OTP via Supabase auth
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (verifyError) {
        setError("Invalid or expired code");
      } else {
        setStep("new_pin");
      }
    } catch {
      setError("Verification failed");
    }

    setLoading(false);
  };

  const handleSetNewPin = () => {
    if (newPin.length < 6) {
      setError("Enter a 6-digit PIN");
      return;
    }
    setError("");
    setStep("confirm_pin");
  };

  const handleConfirmNewPin = async () => {
    if (confirmPin !== newPin) {
      setError("PINs do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke("manage-pin", {
        body: { action: "reset", new_pin: newPin },
      });

      if (fnError || data?.error) {
        setError(data?.error || "Failed to reset PIN");
      } else {
        toast({ title: "PIN Reset", description: "Your new PIN has been set successfully." });
        navigate("/profile");
      }
    } catch {
      setError("Failed to reset PIN");
    }

    setLoading(false);
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/profile")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-white">Reset PIN</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 space-y-5">
            <div className="flex flex-col items-center py-2 text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                {step === "email" ? <Mail className="h-6 w-6 text-secondary" /> :
                 step === "otp" ? <KeyRound className="h-6 w-6 text-secondary" /> :
                 <ShieldCheck className="h-6 w-6 text-secondary" />}
              </div>
              <h2 className="text-sm font-semibold text-white">
                {step === "email" ? "Verify Your Identity" :
                 step === "otp" ? "Enter Verification Code" :
                 step === "new_pin" ? "Set New PIN" :
                 "Confirm New PIN"}
              </h2>
              <p className="text-xs text-white/50 max-w-[260px]">
                {step === "email" ? "We'll send a verification code to your email." :
                 step === "otp" ? `Enter the 6-digit code sent to ${email}` :
                 step === "new_pin" ? "Choose a new 6-digit PIN." :
                 "Re-enter your new PIN to confirm."}
              </p>
            </div>

            {step === "email" && (
              <>
                <Input
                  value={email || userEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  type="email"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  disabled={!!userEmail}
                />
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleSendOtp} disabled={loading}>
                  {loading ? "Sending..." : "Send Verification Code"}
                </Button>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={(val) => { setOtp(val); setError(""); }}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleVerifyOtp} disabled={loading || otp.length < 6}>
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>
                <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white/60" onClick={() => { setStep("email"); setOtp(""); }}>
                  ← Back
                </Button>
              </>
            )}

            {step === "new_pin" && (
              <>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={newPin} onChange={(val) => { setNewPin(val); setError(""); }}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleSetNewPin} disabled={newPin.length < 6}>
                  Continue
                </Button>
              </>
            )}

            {step === "confirm_pin" && (
              <>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={confirmPin} onChange={(val) => { setConfirmPin(val); setError(""); }}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleConfirmNewPin} disabled={loading || confirmPin.length < 6}>
                  {loading ? "Resetting..." : "Reset PIN"}
                </Button>
                <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white/60" onClick={() => { setStep("new_pin"); setConfirmPin(""); }}>
                  ← Back
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default ResetPin;
