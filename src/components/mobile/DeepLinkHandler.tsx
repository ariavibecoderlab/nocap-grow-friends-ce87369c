import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNativeApp } from "@/lib/platform";

/**
 * Handles `appUrlOpen` events on native (Universal Links / App Links / custom scheme).
 * Critical for RaudhahPay top-up redirect — when the user finishes payment in the
 * external bank app, the deep link to https://nocap.life/top-up?status=success
 * brings them back inside the app on the success screen.
 */
const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp()) return;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appUrlOpen", (event) => {
        try {
          const url = new URL(event.url);
          // Strip scheme + host, keep path + query + hash
          const path = url.pathname + url.search + url.hash;
          if (path && path !== "/") navigate(path);
        } catch {
          // ignore malformed URLs
        }
      });
      cleanup = () => handle.remove();
    })();

    return () => {
      cleanup?.();
    };
  }, [navigate]);

  return null;
};

export default DeepLinkHandler;
