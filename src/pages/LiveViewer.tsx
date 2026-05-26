import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LiveKitRoom,
  useRemoteParticipants,
  VideoTrack,
  AudioTrack,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Send,
  ShoppingBag,
  Users,
  Loader2,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── types ────────────────────────────────────────────────────────────────────

interface LiveStream {
  id: string;
  title: string;
  store_id: string;
  seller_user_id: string;
  status: "scheduled" | "live" | "ended";
  viewer_count: number;
  livekit_room: string;
  thumbnail_url: string | null;
  scheduled_at: string | null;
}

interface PinnedProduct {
  product_id: string;
  live_price: number | null;
  is_pinned: boolean;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    stock_quantity: number;
  };
}

interface ChatMessage {
  id: string;
  user_id: string;
  display_name: string;
  message: string;
  created_at: string;
  is_pinned: boolean;
}

// ─── inner watch UI ───────────────────────────────────────────────────────────

function WatchScreen({
  stream,
  pinnedProducts,
  messages,
  onSendMessage,
  chatText,
  setChatText,
}: {
  stream: LiveStream;
  pinnedProducts: PinnedProduct[];
  messages: ChatMessage[];
  onSendMessage: () => void;
  chatText: string;
  setChatText: (v: string) => void;
}) {
  const remoteParticipants = useRemoteParticipants();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const { toast } = useToast();

  // Host is the seller — first remote participant with a camera track
  const host = remoteParticipants[0];
  const camPub = host?.videoTrackPublications.get(Track.Source.Camera);
  const audioPub = host?.audioTrackPublications.get(Track.Source.Microphone);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleAddToCart = (pp: PinnedProduct) => {
    const price = pp.live_price ?? pp.product.price;
    addItem({
      productId: pp.product.id,
      storeId: stream.store_id,
      name: pp.product.name,
      price,
      image: pp.product.images[0] ?? null,
      stock: pp.product.stock_quantity,
    });
    toast({
      title: "Added to cart",
      description: `${pp.product.name} — RM ${price.toFixed(2)}`,
    });
  };

  const active = pinnedProducts.filter((p) => p.is_pinned);

  return (
    <div className="relative h-screen bg-black flex flex-col overflow-hidden">
      {/* Video fills full viewport */}
      <div className="absolute inset-0">
        {host && camPub?.videoTrack ? (
          <VideoTrack
            trackRef={{
              participant: host,
              source: Track.Source.Camera,
              publication: camPub,
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-black text-white/20">
            <WifiOff className="h-12 w-12 mb-2" />
            <p className="text-sm">Waiting for host…</p>
          </div>
        )}
        {/* Audio (render but invisible) */}
        {host && audioPub?.audioTrack && (
          <AudioTrack
            trackRef={{
              participant: host,
              source: Track.Source.Microphone,
              publication: audioPub,
            }}
          />
        )}
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40 pointer-events-none" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-2 px-4 pt-4 pb-2">
        <Badge className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 animate-pulse">
          ● LIVE
        </Badge>
        <span className="text-sm font-medium text-white flex-1 truncate">
          {stream.title}
        </span>
        <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5">
          <Users className="h-3 w-3 text-white/70" />
          <span className="text-xs text-white font-medium">
            {stream.viewer_count}
          </span>
        </div>
      </div>

      {/* Pinned products — horizontal scroll */}
      {active.length > 0 && (
        <div className="relative z-10 px-4 mt-1">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {active.map((pp) => {
              const price = pp.live_price ?? pp.product.price;
              const discounted =
                pp.live_price !== null && pp.live_price < pp.product.price;
              return (
                <button
                  key={pp.product_id}
                  onClick={() => handleAddToCart(pp)}
                  className="shrink-0 flex items-center gap-2 rounded-xl bg-black/70 border border-white/10 px-3 py-2 active:scale-95 transition-transform"
                >
                  {pp.product.images[0] && (
                    <img
                      src={pp.product.images[0]}
                      alt={pp.product.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  )}
                  <div className="text-left">
                    <p className="text-[11px] text-white font-medium leading-tight max-w-24 truncate">
                      {pp.product.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-secondary font-bold">
                        RM {price.toFixed(2)}
                      </span>
                      {discounted && (
                        <span className="text-[10px] text-white/40 line-through">
                          RM {pp.product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-1 flex items-center justify-center h-6 w-6 rounded-full bg-secondary shrink-0">
                    <ShoppingBag className="h-3 w-3 text-primary" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer to push chat to bottom */}
      <div className="flex-1" />

      {/* Chat overlay */}
      <div className="relative z-10 px-4 pb-2">
        {/* Messages */}
        <div className="max-h-48 overflow-y-auto flex flex-col gap-1 mb-2 scrollbar-hide">
          {messages.map((m) => (
            <div key={m.id} className="flex items-start gap-1.5">
              <span
                className={cn(
                  "text-xs font-semibold shrink-0",
                  m.is_pinned ? "text-secondary" : "text-white/70"
                )}
              >
                {m.display_name}
              </span>
              <span className="text-xs text-white/80 break-words">
                {m.message}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div className="flex gap-2">
          <Input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
            placeholder="Say something…"
            className="flex-1 h-9 bg-black/60 border-white/20 text-white placeholder:text-white/30 text-sm"
            maxLength={200}
          />
          <button
            onClick={onSendMessage}
            disabled={!chatText.trim()}
            className="h-9 w-9 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

const LiveViewer = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [stream, setStream] = useState<LiveStream | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState("");
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [hasReminder, setHasReminder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const displayName = useRef("Viewer");

  // Load stream data
  useEffect(() => {
    if (!streamId) return;
    supabase
      .from("live_streams")
      .select("*")
      .eq("id", streamId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "Stream not found", variant: "destructive" });
          navigate("/marketplace");
          return;
        }
        setStream(data as LiveStream);
        setLoading(false);
      });
  }, [streamId, navigate, toast]);

  // Load display name
  useEffect(() => {
    if (!user) return;
    supabase
      .from("members")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        displayName.current = data?.full_name ?? user.email ?? "Viewer";
      });
  }, [user]);

  // Check reminder
  useEffect(() => {
    if (!user || !streamId) return;
    supabase
      .from("live_stream_reminders")
      .select("stream_id")
      .eq("stream_id", streamId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setHasReminder(!!data));
  }, [user, streamId]);

  // Load + realtime pinned products
  useEffect(() => {
    if (!streamId) return;
    const fetchPinned = () =>
      supabase
        .from("live_stream_products")
        .select(
          `product_id, live_price, is_pinned,
           product:marketplace_products(id, name, price, images, stock_quantity)`
        )
        .eq("stream_id", streamId)
        .order("position")
        .then(({ data }) => {
          if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setPinnedProducts(data as any);
          }
        });

    fetchPinned();

    const ch = supabase
      .channel(`pinned-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_stream_products",
          filter: `stream_id=eq.${streamId}`,
        },
        () => fetchPinned()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [streamId]);

  // Load + realtime chat
  useEffect(() => {
    if (!streamId) return;
    supabase
      .from("live_stream_chat")
      .select("*")
      .eq("stream_id", streamId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

    const ch = supabase
      .channel(`chat-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_stream_chat",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [streamId]);

  // Realtime viewer count + stream status
  useEffect(() => {
    if (!streamId) return;
    const ch = supabase
      .channel(`stream-meta-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_streams",
          filter: `id=eq.${streamId}`,
        },
        (payload) => {
          const updated = payload.new as Partial<LiveStream>;
          setStream((prev) => (prev ? { ...prev, ...updated } : prev));
          if (updated.status === "ended") {
            toast({
              title: "Stream ended",
              description: "The host has ended this stream.",
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [streamId, toast]);

  // Increment viewer count on join, decrement on leave
  useEffect(() => {
    if (!streamId || !stream || stream.status !== "live") return;
    supabase.rpc("increment_viewer_count" as never, { p_stream_id: streamId });
    return () => {
      supabase.rpc("decrement_viewer_count" as never, {
        p_stream_id: streamId,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, stream?.status]);

  const joinStream = async () => {
    if (!stream || !user) return;
    setConnecting(true);
    try {
      const res = await supabase.functions.invoke("livekit-token", {
        body: {
          roomName: stream.livekit_room,
          role: "viewer",
          displayName: displayName.current,
        },
      });
      if (res.error) throw res.error;
      const { token: lkToken, livekitUrl: lkUrl } = res.data as {
        token: string;
        livekitUrl: string;
      };
      setToken(lkToken);
      setLivekitUrl(lkUrl);
    } catch (e) {
      toast({
        title: "Failed to join stream",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const toggleReminder = async () => {
    if (!user || !streamId) return;
    if (hasReminder) {
      await supabase
        .from("live_stream_reminders")
        .delete()
        .eq("stream_id", streamId)
        .eq("user_id", user.id);
      setHasReminder(false);
      toast({ title: "Reminder removed" });
    } else {
      await supabase
        .from("live_stream_reminders")
        .insert({ stream_id: streamId, user_id: user.id });
      setHasReminder(true);
      toast({
        title: "Reminder set!",
        description: "We'll notify you when this stream starts.",
      });
    }
  };

  const sendMessage = async () => {
    if (!chatText.trim() || !user || !streamId) return;
    const msg = chatText.trim();
    setChatText("");
    await supabase.from("live_stream_chat").insert({
      stream_id: streamId,
      user_id: user.id,
      display_name: displayName.current,
      message: msg,
      is_pinned: false,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!stream) return null;

  // ── Scheduled / waiting screen ──
  if (stream.status === "scheduled" || !token) {
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
            <h1 className="font-display text-lg font-bold text-white flex-1 truncate">
              {stream.title}
            </h1>
          </div>
        </div>

        <div className="flex-1 mx-auto w-full max-w-md px-4 py-8 flex flex-col items-center">
          {/* Thumbnail or placeholder */}
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-white/5 mb-6">
            {stream.thumbnail_url ? (
              <img
                src={stream.thumbnail_url}
                alt={stream.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/20">
                <Users className="h-16 w-16" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-white text-center mb-1">
            {stream.title}
          </h2>

          {stream.status === "scheduled" && stream.scheduled_at && (
            <p className="text-sm text-white/50 mb-6">
              Scheduled for{" "}
              {new Date(stream.scheduled_at).toLocaleString("en-MY", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}

          {stream.status === "live" && (
            <div className="w-full space-y-3">
              <Button
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold text-base gap-2"
                onClick={joinStream}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
                {connecting ? "Joining…" : "Watch Live"}
              </Button>
            </div>
          )}

          {stream.status === "scheduled" && user && (
            <Button
              variant="outline"
              className={cn(
                "w-full h-12 border-white/20 font-semibold gap-2",
                hasReminder
                  ? "bg-secondary/10 text-secondary border-secondary/30"
                  : "bg-white/5 text-white"
              )}
              onClick={toggleReminder}
            >
              {hasReminder ? (
                <BellOff className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {hasReminder ? "Remove Reminder" : "Set Reminder"}
            </Button>
          )}

          {stream.status === "ended" && (
            <div className="flex flex-col items-center gap-3 text-white/40">
              <WifiOff className="h-10 w-10" />
              <p className="font-medium">This stream has ended</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Live watch screen ──
  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect
      video={false}
      audio={false}
      className="h-screen"
    >
      <WatchScreen
        stream={stream}
        pinnedProducts={pinnedProducts}
        messages={messages}
        onSendMessage={sendMessage}
        chatText={chatText}
        setChatText={setChatText}
      />
    </LiveKitRoom>
  );
};

export default LiveViewer;
