import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BlockDefinition } from "@/lib/storeTemplates";
import { Loader2, RefreshCw } from "lucide-react";
import { Viewport } from "./BuilderToolbar";
import { BuilderTheme } from "@/hooks/useBuilderState";

const VIEWPORT_SIZES: Record<Viewport, { w: number; h: number }> = {
  desktop: { w: 1280, h: 800 },
  tablet: { w: 820, h: 1100 },
  mobile: { w: 390, h: 780 },
};

interface Props {
  storeSlug: string;
  storeId: string;
  blocks: BlockDefinition[];
  theme: BuilderTheme;
  viewport: Viewport;
}

export default function LivePreviewFrame({ storeSlug, storeId, blocks, theme, viewport }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch preview token on mount + every 8 minutes
  useEffect(() => {
    let cancelled = false;
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("builder-preview-token", {
          body: { store_id: storeId },
        });
        if (cancelled) return;
        if (error || !data?.token) {
          setError(error?.message || "Failed to create preview token");
          setLoading(false);
          return;
        }
        setToken(data.token);
        setError(null);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    };
    fetchToken();
    const interval = setInterval(fetchToken, 8 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [storeId]);

  // Push updates via postMessage when blocks/theme change
  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current) return;
    iframeRef.current.contentWindow?.postMessage(
      { type: "BUILDER_UPDATE", blocks, theme },
      window.location.origin
    );
  }, [blocks, theme, iframeLoaded]);

  const refresh = () => {
    setIframeLoaded(false);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const size = VIEWPORT_SIZES[viewport];
  const scale = viewport === "desktop" ? "min(1, 100%/1280)" : "1";

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black/40">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black/40 text-white/60 gap-2 p-6 text-center">
        <p className="text-sm">Preview unavailable</p>
        <p className="text-xs text-white/40">{error}</p>
        <button onClick={refresh} className="mt-2 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-md flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }

  const previewUrl = `/store/${storeSlug}?preview=draft&store=${storeId}&token=${encodeURIComponent(token)}`;

  return (
    <div className="flex-1 flex flex-col bg-black/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 text-[10px] text-white/40">
        <span className="font-mono">{size.w} × {size.h}</span>
        <button onClick={refresh} className="flex items-center gap-1 hover:text-white">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        <div
          className="bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
          style={{
            width: size.w,
            height: size.h,
            maxWidth: "100%",
            transformOrigin: "top center",
          }}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-full border-0"
            title="Storefront preview"
          />
        </div>
      </div>
    </div>
  );
}
