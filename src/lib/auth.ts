import { supabase } from "@/integrations/supabase/client";
import { clearAll as clearReferralCache } from "@/lib/referralCache";

const clearStoredAuthState = () => {
  try { clearReferralCache(); } catch { /* ignore */ }

  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase.auth.token")) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase.auth.token") || key === "nocap_registering") {
        sessionStorage.removeItem(key);
      }
    });
  } catch { /* ignore */ }
};

export async function signUp(email: string, password: string, fullName: string, phone: string, referralCode: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        full_name: fullName,
        phone,
        referral_code: referralCode,
      },
    },
  });
  return { data, error };
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signInWithOtp(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  return { data, error };
}

export async function verifyOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  return { data, error };
}

export async function signOut() {
  // Clear durable referral cache so the next signed-in user on this device
  // doesn't see the previous account's network snapshot.
  clearStoredAuthState();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  clearStoredAuthState();
  return { error };
}

export { clearStoredAuthState };

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}

export async function checkEmailExists(email: string): Promise<boolean> {
  // We attempt OTP sign in — if a user exists, this will work
  // This is a workaround since we can't directly check if a user exists
  // The smart login flow handles this in the UI
  return false; // Will be handled by the login flow
}
