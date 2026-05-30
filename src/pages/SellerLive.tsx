import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  useLocalParticipant,
  VideoTrack,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Radio,
  Users,
  Package,
  Plus,
  Pin,
  PinOff,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── types ───────────────────────────────────────────────────────────────────

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  livekit_room: string;
  status: "scheduled" | "live" | "ended";
  viewer_count: number;
  store_id: string;
}

interface StoreProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  stock_quantity: number;
}

interface PinnedProduct {
  product_id: string;
  live_price: number | null;
  is_pinned: boolean;
  position: number;
  product: StoreProduct;
}

// ─── inner broadcast controls ─────────────────────────────────────────────────

function BroadcastControls({
  stream,
  onEnd,
}: {
  stream: LiveStream;
  onEnd: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [viewerCount, setViewerCount] = useState(stream.viewer_count);
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [showProducts, setShowProducts] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const cameraTrack = localParticipant.videoTrackPublications.get(
    Track.Source.Camera,
  );

  // Realtime: viewer count
  useEffect(() => {
    const ch = supabase
      .channel(`live-stream-${stream.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_streams",
          filter: `id=eq.${stream.id}`,
        },
        (payload) => {
          const updated = payload.new as { viewer_count?: number };
          if (typeof updated.viewer_count === "number") {
            setViewerCount(updated.viewer_count);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [stream.id]);

  // Load pinned products
  useEffect(() => {
    supabase
      .from("live_stream_products")
      .select(
        `product_id, live_price, is_pinned, position,
         product:marketplace_products(id, name, price, images, stock_quantity)`,
      )
      .eq("stream_id", stream.id)
      .order("position")
      .then(({ data }) => {
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setPinnedProducts(data as any);
        }
      });
  }, [stream.id]);

  // Load store products
  useEffect(() => {
    supabase
      .from("marketplace_products")
      .select("id, name, price, images, stock_quantity")
      .eq("store_id", stream.store_id)
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        if (data) {
          setStoreProducts(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data as any[]).map((p) => ({
              ...p,
              images: Array.isArray(p.images) ? p.images : [],
            })),
          );
        }
      });
  }, [stream.store_id]);

  const toggleCam = async () => {
    await room.localParticipant.setCameraEnabled(!camOn);
    setCamOn(!camOn);
  };

  const toggleMic = async () => {
    await room.localParticipant.setMicrophoneEnabled(!micOn);
    setMicOn(!micOn);
  };

  const pinProduct = async (product: StoreProduct) => {
    const lp = livePrices[product.id];
    const livePrice = lp ? parseFloat(lp) : null;
    if (livePrice !== null && (isNaN(livePrice) || livePrice <= 0)) {
      toast({
        title: "Invalid price",
        description: "Enter a valid live price or leave blank.",
        variant: "destructive",
      });
      return;
    }

    const existing = pinnedProducts.find((p) => p.product_id === product.id);
    if (existing) {
      await supabase
        .from("live_stream_products")
        .update({ is_pinned: true, live_price: livePrice })
        .eq("stream_id", stream.id)
        .eq("product_id", product.id);
      setPinnedProducts((prev) =>
        prev.map((p) =>
          p.product_id === product.id
            ? { ...p, is_pinned: true, live_price: livePrice }
            : p,
        ),
      );
    } else {
      await supabase.from("live_stream_products").insert({
        stream_id: stream.id,
        product_id: product.id,
        live_price: livePrice,
        is_pinned: true,
        position: pinnedProducts.length + 1,
        sold_count: 0,
      });
      setPinnedProducts((prev) => [
        ...prev,
        {
          product_id: product.id,
          live_price: livePrice,
          is_pinned: true,
          position: prev.length + 1,
          product,
        },
      ]);
    }
    setShowProducts(false);
    toast({
      title: "Product pinned",
      description: `${product.name} is now featured in your stream`,
    });
  };

  const unpinProduct = async (productId: string) => {
    await supabase
      .from("live_stream_products")
      .update({ is_pinned: false })
      .eq("stream_id", stream.id)
      .eq("product_id", productId);
    setPinnedProducts((prev) =>
      prev.map((p) =>
        p.product_id === productId ? { ...p, is_pinned: false } : p,
      ),
    );
  };

  const active = pinnedProducts.filter((p) => p.is_pinned);

  return (
    <div className="flex flex-col h-full">
      {/* Camera preview */}
      <div className="relative flex-1 bg-black rounded-2xl overflow-hidden">
        {cameraTrack?.videoTrack && camOn ? (
          <VideoTrack
            trackRef={{
              participant: localParticipant,
              source: Track.Source.Camera,
              publication: cameraTrack,
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <CameraOff className="h-12 w-12 mb-2" />
            <p className="text-sm">Camera off</p>
          </div>
        )}

        {/* Live badge + viewer count */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 animate-pulse">
            ● LIVE
          </Badge>
          <div className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
            <Users className="h-3 w-3 text-white/70" />
            <span className="text-xs text-white font-medium">
              {viewerCount}
            </span>
          </div>
        </div>

        {/* Pinned products overlay (bottom of video) */}
        {active.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {active.map((pp) => (
              <div
                key={pp.product_id}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-black/70 px-2 py-1.5"
              >
                {pp.product.images[0] && (
                  <img
                    src={pp.product.images[0]}
                    alt={pp.product.name}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-white font-medium leading-tight truncate max-w-20">
                    {pp.product.name}
                  </p>
                  <p className="text-[10px] text-secondary font-bold">
                    RM {(pp.live_price ?? pp.product.price).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => unpinProduct(pp.product_id)}
                  className="ml-1 text-white/50 hover:text-white"
                >
                  <PinOff className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="mt-4 flex items-center justify-between gap-3">
        {/* Cam + Mic toggles */}
        <div className="flex gap-2">
          <button
            onClick={toggleCam}
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center transition-colors",
              camOn
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-red-600/20 text-red-400",
            )}
          >
            {camOn ? (
              <Camera className="h-5 w-5" />
            ) : (
              <CameraOff className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={toggleMic}
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center transition-colors",
              micOn
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-red-600/20 text-red-400",
            )}
          >
            {micOn ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Pin product */}
        <Sheet open={showProducts} onOpenChange={setShowProducts}>
          <SheetTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5"
            >
              <Pin className="h-3.5 w-3.5" />
              Pin Product
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-[#0a0a0a] border-white/10 text-white max-h-[70vh] overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle className="text-white">Pin a product</SheetTitle>
            </SheetHeader>
            <p className="text-xs text-white/50 mt-1 mb-4">
              Pinned products appear as a live CTA for viewers to buy instantly.
            </p>
            <div className="space-y-3">
              {storeProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  {p.images[0] && (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-snug truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-white/50">
                      Normal: RM {p.price.toFixed(2)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Label className="text-[10px] text-white/40">
                        Live price (optional)
                      </Label>
                      <Input
                        type="number"
                        placeholder="RM"
                        value={livePrices[p.id] ?? ""}
                        onChange={(e) =>
                          setLivePrices((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        className="h-6 w-20 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 bg-secondary text-primary hover:bg-secondary/90 text-xs h-8"
                    onClick={() => pinProduct(p)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Pin
                  </Button>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* End stream */}
        <Button
          size="sm"
          variant="destructive"
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={onEnd}
        >
          End Stream
        </Button>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

const SellerLive = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [phase, setPhase] = useState<"setup" | "live">("setup");
  const [loading, setLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(true);
  const displayName = useRef("");

  // Fetch seller's store
  useEffect(() => {
    if (!user) return;
    setStoreLoading(true);
    supabase
      .from("marketplace_stores")
      .select("id, store_name")
      .eq("merchant_user_id", user.id)
      .eq("status", "live")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStoreId(data.id);
          setStoreName(data.store_name);
        }
        setStoreLoading(false);
      });

    // Also grab display name
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        displayName.current = data?.full_name ?? user.email ?? "Seller";
      });
  }, [user]);

  const startStream = async () => {
    if (!storeId || !title.trim()) {
      toast({
        title: "Missing info",
        description: "Add a title for your stream.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const roomName = `store-${storeId}-${Date.now()}`;

      // 1. Insert live_streams row
      const { data: streamRow, error: dbErr } = await supabase
        .from("live_streams")
        .insert({
          store_id: storeId,
          seller_user_id: user!.id,
          title: title.trim(),
          description: description.trim() || null,
          status: "live",
          livekit_room: roomName,
          viewer_count: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbErr || !streamRow)
        throw dbErr ?? new Error("Failed to create stream");

      // 2. Get LiveKit token
      const res = await supabase.functions.invoke("livekit-token", {
        body: {
          roomName,
          role: "host",
          displayName: displayName.current,
        },
      });
      if (res.error) throw res.error;
      const { token: lkToken, livekitUrl: lkUrl } = res.data as {
        token: string;
        livekitUrl: string;
      };

      setStream(streamRow as LiveStream);
      setToken(lkToken);
      setLivekitUrl(lkUrl);
      setPhase("live");
    } catch (e) {
      console.error(e);
      toast({
        title: "Failed to start stream",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const endStream = async () => {
    if (!stream) return;
    await supabase
      .from("live_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", stream.id);
    toast({
      title: "Stream ended",
      description: "Your live stream has ended.",
    });
    navigate("/seller-portal");
  };

  // ── Setup screen ──
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-primary flex flex-col">
        <div className="sticky top-0 z-40 bg-primary/95 backdrop-blur-sm border-b border-white/10">
          <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-1.5 hover:bg-white/10 transition-colors text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold text-white flex-1">
              Go Live
            </h1>
          </div>
        </div>

        <div className="flex-1 mx-auto w-full max-w-md px-4 py-6 space-y-5">
          {storeLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
          ) : !storeId ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <Radio className="h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium text-white/60">No active store found</p>
              <p className="text-sm mt-1 text-center">
                You need an approved store to go live.
              </p>
            </div>
          ) : (
            <>
              {/* Store badge */}
              <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <Radio className="h-4 w-4 text-secondary" />
                <div>
                  <p className="text-xs text-white/50">Broadcasting as</p>
                  <p className="text-sm font-semibold text-white">
                    {storeName}
                  </p>
                </div>
              </div>

              {/* Stream title */}
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Stream title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Flash Sale Friday — Up to 50% Off!"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">
                  Description (optional)
                </Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what you'll be showing..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  maxLength={300}
                />
              </div>

              {/* Tips */}
              <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4 space-y-1.5">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  Tips for a great stream
                </p>
                {[
                  "Good lighting — face a window or lamp",
                  "Stable internet — 4G or Wi-Fi recommended",
                  "Pin your best-selling products as featured deals",
                  "Announce a live-only discount to boost sales",
                ].map((tip) => (
                  <p key={tip} className="text-xs text-white/60">
                    • {tip}
                  </p>
                ))}
              </div>

              {/* Go Live button */}
              <Button
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold text-base gap-2"
                onClick={startStream}
                disabled={loading || !title.trim()}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Radio className="h-5 w-5" />
                )}
                {loading ? "Starting…" : "Go Live"}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Live screen ──
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Badge className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 animate-pulse">
              ● LIVE
            </Badge>
            <span className="text-sm font-medium text-white truncate">
              {stream?.title}
            </span>
          </div>
          <button
            onClick={endStream}
            className="rounded-full p-1.5 text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-md px-4 py-4">
        {token && stream && (
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl}
            connect
            video
            audio
            className="h-full"
          >
            <BroadcastControls stream={stream} onEnd={endStream} />
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
};

export default SellerLive;
