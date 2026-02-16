import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

type Step = "current" | "new" | "confirm";

const SetPin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [hasPin, setHasPin] = useState(false);
  const [step, setStep] = useState<Step>("new");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("has_pin, pin_locked_until").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.has_pin) {
          setHasPin(true);
          setStep("current");
        }
        if (data?.pin_locked_until && new Date(data.pin_locked_until) > new Date()) {
          setLocked(true);
          setLockedUntil(data.pin_locked_until);
        }
      });
  }, [user]);

  const handleCurrentPin = () => {
    if (currentPin.length < 6) {
      setError("Please enter your current 6-digit PIN");
      return;
    }
    setError("");
    setStep("new");
  };

  const handleNewPin = () => {
    if (newPin.length < 6) {
      setError("Please enter a 6-digit PIN");
      return;
    }
    setError("");
    setStep("confirm");
  };

  const handleConfirmPin = async () => {
    if (confirmPin !== newPin) {
      setError("PINs do not match");
      return;
    }
    if (!user) return;

    setSaving(true);
    setError("");

    try {
      const action = hasPin ? "change" : "set";
      const body: any = { action, new_pin: newPin };
      if (hasPin) body.current_pin = currentPin;

      const { data, error: fnError } = await supabase.functions.invoke("manage-pin", { body });

      if (fnError || data?.error) {
        const errMsg = data?.error || "Failed to update PIN";
        setError(errMsg);

        if (data?.locked) {
          setLocked(true);
          setLockedUntil(data.locked_until);
        }
        if (data?.attempts_remaining !== undefined) {
          setAttemptsRemaining(data.attempts_remaining);
        }
        if (data?.error?.includes("Incorrect")) {
          setStep("current");
          setCurrentPin("");
        }
      } else {
        toast({ title: hasPin ? "PIN changed" : "PIN set", description: "Your transaction PIN has been updated." });
        navigate("/profile");
      }
    } catch {
      setError("Failed to update PIN");
    }

    setSaving(false);
  };

  if (authLoading) return null;

  const lockMinutes = lockedUntil ? Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000)) : 0;

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/profile")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-white">{hasPin ? "Change PIN" : "Set PIN"}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 space-y-5">
            {locked ? (
              <div className="flex flex-col items-center py-6 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <h2 className="text-sm font-semibold text-white">PIN Locked</h2>
                <p className="text-xs text-white/50 max-w-[260px]">
                  Too many failed attempts. Try again in {lockMinutes} minute(s), or reset your PIN via email.
                </p>
                <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={() => navigate("/reset-pin")}>
                  Reset PIN via Email
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center py-2 text-center space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                    {step === "current" ? <Lock className="h-6 w-6 text-secondary" /> : <ShieldCheck className="h-6 w-6 text-secondary" />}
                  </div>
                  <h2 className="text-sm font-semibold text-white">
                    {step === "current" ? "Enter Current PIN" : step === "new" ? "Enter New PIN" : "Confirm New PIN"}
                  </h2>
                  <p className="text-xs text-white/50 max-w-[260px]">
                    {step === "current"
                      ? "Enter your current 6-digit PIN to proceed."
                      : step === "new"
                      ? "Choose a 6-digit PIN for securing your transactions."
                      : "Re-enter your new PIN to confirm."}
                  </p>
                </div>

                {step === "current" && (
                  <>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={currentPin} onChange={(val) => { setCurrentPin(val); setError(""); }}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && <p className="text-xs text-destructive text-center">{error}</p>}
                    {attemptsRemaining !== null && attemptsRemaining <= 2 && (
                      <p className="text-xs text-amber-400 text-center">{attemptsRemaining} attempt(s) remaining</p>
                    )}
                    <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleCurrentPin} disabled={currentPin.length < 6}>
                      Continue
                    </Button>
                    <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white/60" onClick={() => navigate("/reset-pin")}>
                      Forgot PIN?
                    </Button>
                  </>
                )}

                {step === "new" && (
                  <>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={newPin} onChange={(val) => { setNewPin(val); setError(""); }}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && <p className="text-xs text-destructive text-center">{error}</p>}
                    <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleNewPin} disabled={newPin.length < 6}>
                      Continue
                    </Button>
                    {hasPin && (
                      <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white/60" onClick={() => { setStep("current"); setNewPin(""); }}>
                        ← Back
                      </Button>
                    )}
                  </>
                )}

                {step === "confirm" && (
                  <>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={confirmPin} onChange={(val) => { setConfirmPin(val); setError(""); }}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && <p className="text-xs text-destructive text-center">{error}</p>}
                    <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={handleConfirmPin} disabled={saving || confirmPin.length < 6}>
                      {saving ? "Saving..." : hasPin ? "Change PIN" : "Set PIN"}
                    </Button>
                    <Button variant="ghost" className="w-full text-xs text-white/40 hover:text-white/60" onClick={() => { setStep("new"); setConfirmPin(""); }}>
                      ← Back
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default SetPin;
