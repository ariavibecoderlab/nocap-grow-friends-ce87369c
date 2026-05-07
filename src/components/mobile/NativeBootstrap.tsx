import { useEffect } from "react";
import { isNativeApp } from "@/lib/platform";

/**
 * One-time native setup: status bar style, keyboard behavior, splash hide,
 * Android back button → react-router history, app resume hook.
 */
const NativeBootstrap = () => {
  useEffect(() => {
    if (!isNativeApp()) return;
    let removers: Array<() => void> = [];

    (async () => {
      try {
        const [{ StatusBar, Style }, { SplashScreen }, { Keyboard }, { App }] = await Promise.all([
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
          import("@capacitor/keyboard"),
          import("@capacitor/app"),
        ]);

        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#000000" });
        } catch {/* iOS may not support setBackgroundColor */}

        try { await Keyboard.setAccessoryBarVisible({ isVisible: false }); } catch {}

        await SplashScreen.hide({ fadeOutDuration: 300 });

        const back = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else App.exitApp();
        });
        removers.push(() => back.remove());
      } catch (e) {
        console.error("Native bootstrap failed", e);
      }
    })();

    return () => removers.forEach((r) => r());
  }, []);

  return null;
};

export default NativeBootstrap;
