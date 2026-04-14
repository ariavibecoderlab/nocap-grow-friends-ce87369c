import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Send, User, Package, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatThread {
  sender_id: string;
  product_id: string;
  product_name: string;
  sender_name: string;
  sender_avatar: string | null;
  last_message: string;
  last_time: string;
  unread: number;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  created_at: string;
  product_id: string;
  is_read: boolean;
  read_at: string | null;
}

interface MerchantChatProps {
  storeId: string;
}

const MerchantChat = ({ storeId }: MerchantChatProps) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<{ senderId: string; productId: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load all chat threads for this store
  useEffect(() => {
    if (!storeId || !user) return;

    const loadThreads = async () => {
      const { data } = await supabase
        .from("marketplace_chat_messages")
        .select("sender_id, sender_type, product_id, message, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      // Group by buyer+product
      const threadMap = new Map<string, ChatThread>();
      const productIds = new Set<string>();
      const senderIds = new Set<string>();

      for (const msg of data) {
        if (msg.sender_type !== "buyer") continue;
        const key = `${msg.sender_id}::${msg.product_id}`;
        productIds.add(msg.product_id);
        senderIds.add(msg.sender_id);
        if (!threadMap.has(key)) {
          threadMap.set(key, {
            sender_id: msg.sender_id,
            product_id: msg.product_id,
            product_name: "",
            sender_name: "",
            sender_avatar: null,
            last_message: msg.message,
            last_time: msg.created_at,
            unread: 0,
          });
        }
      }

      // Fetch product names
      if (productIds.size > 0) {
        const { data: products } = await supabase
          .from("marketplace_products")
          .select("id, name")
          .in("id", Array.from(productIds));
        const nameMap = new Map(products?.map((p) => [p.id, p.name]) || []);
        threadMap.forEach((t) => {
          t.product_name = nameMap.get(t.product_id) || "Unknown Product";
        });
      }

      // Fetch sender profiles
      if (senderIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, avatar_url")
          .in("user_id", Array.from(senderIds));
        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, { name: p.full_name || p.phone || "Customer", avatar: p.avatar_url }]) || []
        );
        threadMap.forEach((t) => {
          const profile = profileMap.get(t.sender_id);
          t.sender_name = profile?.name || "Customer";
          t.sender_avatar = profile?.avatar || null;
        });
      }

      setThreads(Array.from(threadMap.values()));
      setLoading(false);
    };
    loadThreads();
  }, [storeId, user]);

  // Load messages for selected thread
  useEffect(() => {
    if (!selectedThread || !user) return;

    const load = async () => {
      const { data } = await supabase
        .from("marketplace_chat_messages")
        .select("id, sender_id, sender_type, message, created_at, product_id, is_read, read_at")
        .eq("store_id", storeId)
        .eq("product_id", selectedThread.productId)
        .or(`sender_id.eq.${selectedThread.senderId},sender_id.eq.${user.id}`)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) {
        setMessages(data as ChatMessage[]);
        // Mark unread buyer messages as read
        const unreadIds = data.filter(m => m.sender_type === "buyer" && !m.is_read).map(m => m.id);
        if (unreadIds.length > 0) {
          supabase.from("marketplace_chat_messages")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .in("id", unreadIds)
            .then(() => {});
        }
      }
    };
    load();
  }, [selectedThread, storeId, user]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!storeId || !user) return;

    const channel = supabase
      .channel(`merchant-chat-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "marketplace_chat_messages",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Update messages list if we're viewing this thread
          if (
            selectedThread &&
            newMsg.product_id === selectedThread.productId &&
            (newMsg.sender_id === selectedThread.senderId || newMsg.sender_id === user.id)
          ) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          // Refresh threads for new buyer messages
          if (newMsg.sender_type === "buyer") {
            setThreads((prev) => {
              const key = `${newMsg.sender_id}::${newMsg.product_id}`;
              const existing = prev.find(
                (t) => t.sender_id === newMsg.sender_id && t.product_id === newMsg.product_id
              );
              if (existing) {
                return prev.map((t) =>
                  t.sender_id === newMsg.sender_id && t.product_id === newMsg.product_id
                    ? { ...t, last_message: newMsg.message, last_time: newMsg.created_at }
                    : t
                );
              }
              return [
                {
                  sender_id: newMsg.sender_id,
                  product_id: newMsg.product_id,
                  product_name: "New Conversation",
                  sender_name: "Customer",
                  sender_avatar: null,
                  last_message: newMsg.message,
                  last_time: newMsg.created_at,
                  unread: 1,
                },
                ...prev,
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, user, selectedThread]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user || !selectedThread || sending) return;
    setSending(true);
    const msg = text.trim();
    setText("");

    const { data: inserted, error } = await supabase.from("marketplace_chat_messages").insert({
      store_id: storeId,
      product_id: selectedThread.productId,
      sender_id: user.id,
      sender_type: "merchant",
      message: msg,
    }).select("id, sender_id, sender_type, message, created_at, product_id").single();

    if (error) {
      setText(msg);
      console.error("Merchant chat send error:", error);
    } else if (inserted) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === inserted.id)) return prev;
        return [...prev, inserted as ChatMessage];
      });
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  // Thread list view
  if (!selectedThread) {
    return (
      <div className="space-y-2">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-white/30">
            <MessageCircle className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Customer messages will appear here</p>
          </div>
        ) : (
          threads.map((t) => (
            <button
              key={`${t.sender_id}-${t.product_id}`}
              onClick={() => setSelectedThread({ senderId: t.sender_id, productId: t.product_id })}
              className="w-full text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-3 transition-colors"
            >
              <div className="flex items-start gap-3">
                {t.sender_avatar ? (
                  <img src={t.sender_avatar} alt={t.sender_name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-secondary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.sender_name}</p>
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-secondary/60" />
                    <p className="text-xs text-secondary/80 truncate">{t.product_name}</p>
                  </div>
                  <p className="text-xs text-white/60 truncate mt-0.5">{t.last_message}</p>
                  <p className="text-[10px] text-white/30 mt-1">
                    {new Date(t.last_time).toLocaleDateString()} · {new Date(t.last_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    );
  }

  // Conversation view
  const thread = threads.find(
    (t) => t.sender_id === selectedThread.senderId && t.product_id === selectedThread.productId
  );

  return (
    <div className="flex flex-col" style={{ height: "60vh" }}>
      {/* Thread header */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
        <button
          onClick={() => setSelectedThread(null)}
          className="text-xs text-secondary hover:text-secondary/80"
        >
          ← Back
        </button>
        {thread?.sender_avatar ? (
          <img src={thread.sender_avatar} alt={thread.sender_name} className="h-8 w-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-secondary" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-white">{thread?.sender_name || "Customer"}</p>
          <p className="text-[10px] text-white/40">Re: {thread?.product_name || "Conversation"}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-2">
        {messages.map((msg) => {
          const isMine = msg.sender_type === "merchant";
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  isMine
                    ? "bg-secondary text-primary rounded-br-md"
                    : "bg-white/10 text-white rounded-bl-md"
                }`}
              >
                {!isMine && (
                  <p className="text-[10px] font-medium text-secondary/80 mb-0.5">{thread?.sender_name || "Customer"}</p>
                )}
                <p>{msg.message}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                  <span className={`text-[9px] ${isMine ? "text-primary/50" : "text-white/30"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isMine && (
                    msg.is_read
                      ? <CheckCheck className="h-3 w-3 text-blue-400" />
                      : <Check className="h-3 w-3 text-primary/40" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {/* Typing indicator */}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-md px-3 py-2">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-2 border-t border-white/10"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Reply..."
          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm rounded-full px-4"
          maxLength={500}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || sending}
          className="h-9 w-9 rounded-full bg-secondary text-primary hover:bg-secondary/90 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default MerchantChat;
