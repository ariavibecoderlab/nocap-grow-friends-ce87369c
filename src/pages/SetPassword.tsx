import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Save, Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

type Step = "request" | "verify";

const SetPassword = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ otp?: string; newPassword?: string; confirmPassword?: string }>({});

  const handleSendOtp = async () => {
    if (!user?.email) return;
    setSending(true);

    const { error } = await supabase.functions.invoke("send-otp", {
      body: { email: user.email },
    });

    setSending(false);
    if (error) {
      toast({ title: "Error", description: "Failed to send verification code. Please try again.", variant: "destructive" });
    } else {
      setStep("verify");
      toast({ title: "Code sent!", description: `A verification code has been sent to ${user.email}` });
    }
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!otp || otp.length < 6) {
      newErrors.otp = "Please enter the full verification code";
    }
    if (!newPassword) {
      newErrors.newPassword = "Password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.email || !validate()) return;
    setSaving(true);

    // Verify OTP first by signing in with it
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: user.email,
      token: otp,
      type: "magiclink",
    });

    if (otpError) {
      setSaving(false);
      setErrors((p) => ({ ...p, otp: "Invalid or expired verification code" }));
      return;
    }

    // OTP verified — now update password
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      navigate("/profile");
    }
  };

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/profile")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-white">Set Password</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {step === "request" ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col items-center py-4 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                  <Mail className="h-6 w-6 text-secondary" />
                </div>
                <h2 className="text-sm font-semibold text-white">Email Verification Required</h2>
                <p className="text-xs text-white/50 max-w-[280px]">
                  For your security, we'll send a verification code to <span className="text-white/70 font-medium">{user?.email}</span> before you can set a new password.
                </p>
              </div>
              <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleSendOtp} disabled={sending}>
                <Mail className="mr-2 h-4 w-4" />
                {sending ? "Sending..." : "Send Verification Code"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-center">
                <ShieldCheck className="h-4 w-4 text-secondary" />
                <p className="text-xs text-white/50">Enter the code sent to <span className="text-white/70 font-medium">{user?.email}</span></p>
              </div>

              {/* OTP Input */}
              <div className="space-y-1.5">
                <Label className="text-white/70">Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={(val) => { setOtp(val); setErrors((p) => ({ ...p, otp: undefined })); }}>
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
                {errors.otp && <p className="text-xs text-destructive text-center">{errors.otp}</p>}
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-white/70">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, newPassword: undefined })); }}
                    placeholder="At least 8 characters"
                    className={`border-white/10 bg-white/5 text-white placeholder:text-white/30 pr-10 ${errors.newPassword ? "border-destructive" : ""}`}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-white/70">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                    placeholder="Confirm new password"
                    className={`border-white/10 bg-white/5 text-white placeholder:text-white/30 pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Verifying & Saving..." : "Update Password"}
              </Button>

              <button onClick={handleSendOtp} disabled={sending} className="w-full text-center text-xs text-white/40 hover:text-white/60 transition-colors">
                {sending ? "Sending..." : "Didn't receive the code? Resend"}
              </button>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SetPassword;
