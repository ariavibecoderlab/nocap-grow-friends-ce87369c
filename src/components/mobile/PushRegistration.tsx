import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, isIOS } from "@/lib/platform";

/**
 * Registers the device for push notifications and stores the FCM/APNs token
 * in `mobile_push_tokens` so the backend can fan out notifications.
 * Only runs on native + when a user is logged in.
 */
const PushRegistration = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!isNativeApp() || !user) return;
    let removers: Array<() => void> = [];

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const perm = await PushNotifications.checkPermissions();
        let status = perm.receive;
        if (status === "prompt" || status === "prompt-with-rationale") {
          status = (await PushNotifications.requestPermissions()).receive;
        }
        if (status !== "granted") return;

        await PushNotifications.register();

        const reg = await PushNotifications.addListener("registration", async (token) => {
          try {
            await (supabase.from as any)("mobile_push_tokens").upsert(
              {
                user_id: user.id,
                token: token.value,
                platform: isIOS() ? "ios" : "android",
                last_seen_at: new Date().toISOString(),
              },
              { onConflict: "token" },
            );
          } catch (e) {
            console.error("Failed to store push token", e);
          }
        });
        removers.push(() => reg.remove());

        const errReg = await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error", err);
        });
        removers.push(() => errReg.remove());
      } catch (e) {
        console.error("Push setup failed", e);
      }
    })();

    return () => {
      removers.forEach((r) => r());
    };
  }, [user?.id]);

  return null;
};

export default PushRegistration;
