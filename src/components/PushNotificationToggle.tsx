import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

const PushNotificationToggle = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
        setSupported(false);
        setLoading(false);
        return;
      }
      setSupported(true);

      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setEnabled(!!sub);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };
    check();
  }, []);

  const subscribe = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh || "",
          auth: json.keys?.auth || "",
        },
        { onConflict: "user_id,endpoint" }
      );

      setEnabled(true);
      toast({ title: "Push notifications enabled" });
    } catch (err: any) {
      console.error("Push subscribe error:", err);
      toast({ title: "Could not enable push", description: err?.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const unsubscribe = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", sub.endpoint);
          await sub.unsubscribe();
        }
      }
      setEnabled(false);
      toast({ title: "Push notifications disabled" });
    } catch (err: any) {
      console.error("Push unsubscribe error:", err);
    }
    setLoading(false);
  };

  if (!supported || !user) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-card/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-secondary" />
        <div>
          <p className="text-sm font-medium">Push Notifications</p>
          <p className="text-[10px] text-muted-foreground">Get notified about order updates</p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={(val) => (val ? subscribe() : unsubscribe())}
        disabled={loading}
      />
    </div>
  );
};

export default PushNotificationToggle;
