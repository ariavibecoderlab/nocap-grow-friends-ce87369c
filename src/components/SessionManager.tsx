import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Timer, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE = 2 * 60 * 1000; // Show warning 2 min before logout
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"];

const SessionManager = () => {
  const { user, session } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    await signOut();
    window.location.href = "/auth";
  }, [clearAllTimers]);

  const resetTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setCountdown(120);

    if (!user) return;

    // Show warning dialog after (INACTIVITY_TIMEOUT - WARNING_BEFORE)
    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(Math.floor(WARNING_BEFORE / 1000));

      countdownInterval.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);
  }, [user, clearAllTimers, handleLogout]);

  const handleExtendSession = useCallback(() => {
    setShowWarning(false);
    resetTimers();
  }, [resetTimers]);

  // Single session enforcement — sign out other sessions on mount
  useEffect(() => {
    if (!session) return;
    // Sign out all other sessions when this one starts
    supabase.auth.signOut({ scope: "others" }).catch(() => {
      // Silently ignore — not all providers support this
    });
  }, [session?.access_token]);

  // Activity listeners
  useEffect(() => {
    if (!user) return;

    const onActivity = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    resetTimers();

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      clearAllTimers();
    };
  }, [user, showWarning, resetTimers, clearAllTimers]);

  if (!user) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent className="border-white/10 bg-primary text-white max-w-sm">
        <AlertDialogHeader>
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
              <Timer className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-white">Session Expiring</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-white/60">
            You've been inactive. Your session will expire in{" "}
            <span className="font-mono font-bold text-amber-400">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            . Would you like to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={handleExtendSession}
            className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold"
          >
            Stay Logged In
          </AlertDialogAction>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out Now
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionManager;
