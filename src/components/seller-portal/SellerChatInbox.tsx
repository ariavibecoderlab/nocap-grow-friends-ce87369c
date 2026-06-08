import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  MessageCircle,
  Send,
  User,
  Package,
  ArrowLeft,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConversationThread {
  buyer_user_id: string;
  product_id: string;
  product_name: string;
  buyer_name: string;
  buyer_avatar: string | null;
  last_message: string;
  last_time: string;
  unread_count: number;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  created_at: string;
  is_read: boolean;
  buyer_user_id?: string;
}

interface ActiveThread {
  buyerUserId: string;
  productId: string;
}

interface SellerChatInboxProps {
  storeId: string;
}

const SellerChatInbox = ({ storeId }: SellerChatInboxProps) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    if (!storeId) return;
    setLoadingThreads(true);

    const { data: rawMessages } = await (supabase as any)
      .from("marketplace_chat_messages")
      .select(
        "buyer_user_id, product_id, sender_type, message, created_at, is_read"
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (!rawMessages) {
      setLoadingThreads(false);
      return;
    }

    // Group into conversations keyed by buyer+product
    const threadMap = new Map<string, ConversationThread>();
    const productIds = new Set<string>();
    const buyerIds = new Set<string>();

    for (const msg of rawMessages) {
      if (!msg.buyer_user_id || !msg.product_id) continue;
      const key = `${msg.buyer_user_id}::${msg.product_id}`;
      productIds.add(msg.product_id);
      buyerIds.add(msg.buyer_user_id);

      if (!threadMap.has(key)) {
        threadMap.set(key, {
          buyer_user_id: msg.buyer_user_id,
          product_id: msg.product_id,
          product_name: "",
          buyer_name: "",
          buyer_avatar: null,
          last_message: msg.message,
          last_time: msg.created_at,
          unread_count: 0,
        });
      }

      const thread = threadMap.get(key)!;
      // Count unread buyer messages (seller hasn't read them)
      if (msg.sender_type === "buyer" && !msg.is_read) {
        thread.unread_count += 1;
      }
    }

    // Enrich with product names
    if (productIds.size > 0) {
      const { data: products } = await supabase
        .from("marketplace_products")
        .select("id, name")
        .in("id", Array.from(productIds));
      const nameMap = new Map(products?.map((p) => [p.id, p.name]) ?? []);
      threadMap.forEach((t) => {
        t.product_name = nameMap.get(t.product_id) ?? "Unknown Product";
      });
    }

    // Enrich with buyer profiles
    if (buyerIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url")
        .in("user_id", Array.from(buyerIds));
      const profileMap = new Map(
        profiles?.map((p) => [
          p.user_id,
          {
            name: p.full_name ?? p.phone ?? "Customer",
            avatar: p.avatar_url ?? null,
          },
        ]) ?? []
      );
      threadMap.forEach((t) => {
        const profile = profileMap.get(t.buyer_user_id);
        t.buyer_name = profile?.name ?? "Customer";
        t.buyer_avatar = profile?.avatar ?? null;
      });
    }

    setThreads(Array.from(threadMap.values()));
    setLoadingThreads(false);
  }, [storeId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load messages for the active thread
  useEffect(() => {
    if (!activeThread || !user) return;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("marketplace_chat_messages")
        .select(
          "id, sender_id, sender_type, message, created_at, is_read, buyer_user_id, product_id"
        )
        .eq("store_id", storeId)
        .eq("product_id", activeThread.productId)
        .eq("buyer_user_id", activeThread.buyerUserId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) {
        setMessages(data as ChatMessage[]);

        // Mark unread buyer messages as read now that seller opened the thread
        const unreadIds = data
          .filter((m) => m.sender_type === "buyer" && !m.is_read)
          .map((m) => m.id);
        if (unreadIds.length > 0) {
          supabase
            .from("marketplace_chat_messages")
            .update({ is_read: true })
            .in("id", unreadIds)
            .then(() => {
              // Clear unread badge for this thread
              setThreads((prev) =>
                prev.map((t) =>
                  t.buyer_user_id === activeThread.buyerUserId &&
                  t.product_id === activeThread.productId
                    ? { ...t, unread_count: 0 }
                    : t
                )
              );
            });
        }
      }
    };
    load();
  }, [activeThread, storeId, user]);

  // Realtime: listen for all messages in this store
  useEffect(() => {
    if (!storeId || !user) return;

    const channel = supabase
      .channel(`seller-inbox-${storeId}`)
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

          // Update active thread messages
          if (
            activeThread &&
            newMsg.product_id === activeThread.productId &&
            newMsg.buyer_user_id === activeThread.buyerUserId
          ) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Auto-mark incoming buyer messages as read (seller is viewing)
            if (newMsg.sender_type === "buyer") {
              supabase
                .from("marketplace_chat_messages")
                .update({ is_read: true })
                .eq("id", newMsg.id)
                .then(() => {});
            }
          }

          // Update thread list for new buyer messages
          if (
            newMsg.sender_type === "buyer" &&
            newMsg.buyer_user_id &&
            newMsg.product_id
          ) {
            setThreads((prev) => {
              const exists = prev.find(
                (t) =>
                  t.buyer_user_id === newMsg.buyer_user_id &&
                  t.product_id === newMsg.product_id
              );
              const isViewing =
                activeThread?.buyerUserId === newMsg.buyer_user_id &&
                activeThread?.productId === newMsg.product_id;

              if (exists) {
                return prev.map((t) =>
                  t.buyer_user_id === newMsg.buyer_user_id &&
                  t.product_id === newMsg.product_id
                    ? {
                        ...t,
                        last_message: newMsg.message,
                        last_time: newMsg.created_at,
                        unread_count: isViewing ? 0 : t.unread_count + 1,
                      }
                    : t
                );
              }

              // New conversation — prepend with placeholder names
              return [
                {
                  buyer_user_id: newMsg.buyer_user_id,
                  product_id: newMsg.product_id,
                  product_name: "New Conversation",
                  buyer_name: "Customer",
                  buyer_avatar: null,
                  last_message: newMsg.message,
                  last_time: newMsg.created_at,
                  unread_count: isViewing ? 0 : 1,
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
  }, [storeId, user, activeThread]);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user || !activeThread || sending) return;
    setSending(true);
    const msg = text.trim();
    setText("");

    // Optimistic insert
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      sender_id: user.id,
      sender_type: "merchant",
      message: msg,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data: inserted, error } = await supabase
      .from("marketplace_chat_messages")
      .insert({
        store_id: storeId,
        product_id: activeThread.productId,
        buyer_user_id: activeThread.buyerUserId,
        seller_user_id: user.id,
        sender_id: user.id,
        sender_type: "merchant",
        message: msg,
      })
      .select("id, sender_id, sender_type, message, created_at, is_read")
      .single();

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setText(msg);
      console.error("SellerChatInbox send error:", error);
    } else if (inserted) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? (inserted as ChatMessage) : m))
      );
    }
    setSending(false);
  };

  const currentThread = activeThread
    ? threads.find(
        (t) =>
          t.buyer_user_id === activeThread.buyerUserId &&
          t.product_id === activeThread.productId
      )
    : null;

  if (loadingThreads) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  // Split-panel layout: thread list on left, conversation on right (desktop)
  // Stacked on mobile (show either list or conversation)
  return (
    <div className="flex gap-4 h-[65vh] min-h-[400px]">
      {/* Thread list — always visible on desktop, hidden on mobile when conversation open */}
      <div
        className={`flex flex-col gap-1 overflow-y-auto md:w-72 md:block shrink-0 ${
          activeThread ? "hidden md:flex" : "flex w-full"
        }`}
      >
        {threads.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-white/30">
            <MessageCircle className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Customer messages will appear here</p>
          </div>
        ) : (
          threads.map((t) => {
            const isActive =
              activeThread?.buyerUserId === t.buyer_user_id &&
              activeThread?.productId === t.product_id;
            return (
              <button
                key={`${t.buyer_user_id}-${t.product_id}`}
                onClick={() =>
                  setActiveThread({
                    buyerUserId: t.buyer_user_id,
                    productId: t.product_id,
                  })
                }
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  isActive
                    ? "border-secondary/40 bg-secondary/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  {t.buyer_avatar ? (
                    <img
                      src={t.buyer_avatar}
                      alt={t.buyer_name}
                      className="h-9 w-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-secondary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium text-white truncate">
                        {t.buyer_name}
                      </p>
                      {t.unread_count > 0 && (
                        <span className="shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                          {t.unread_count > 99 ? "99+" : t.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3 w-3 text-secondary/60 shrink-0" />
                      <p className="text-xs text-secondary/80 truncate">
                        {t.product_name}
                      </p>
                    </div>
                    <p className="text-xs text-white/50 truncate mt-0.5">
                      {t.last_message}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {new Date(t.last_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Conversation panel */}
      {activeThread ? (
        <div className="flex flex-col flex-1 min-w-0 border border-white/10 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
            <button
              onClick={() => setActiveThread(null)}
              className="md:hidden text-secondary hover:text-secondary/80 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {currentThread?.buyer_avatar ? (
              <img
                src={currentThread.buyer_avatar}
                alt={currentThread.buyer_name}
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-secondary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {currentThread?.buyer_name ?? "Customer"}
              </p>
              <p className="text-[10px] text-white/40 truncate">
                Re: {currentThread?.product_name ?? "Conversation"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {messages.map((msg) => {
              const isMine = msg.sender_type === "merchant";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      isMine
                        ? "bg-secondary text-primary rounded-br-md"
                        : "bg-white/10 text-white rounded-bl-md"
                    }`}
                  >
                    {!isMine && (
                      <p className="text-[10px] font-medium text-secondary/80 mb-0.5">
                        {currentThread?.buyer_name ?? "Customer"}
                      </p>
                    )}
                    <p>{msg.message}</p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isMine ? "justify-end" : ""
                      }`}
                    >
                      <span
                        className={`text-[9px] ${
                          isMine ? "text-primary/50" : "text-white/30"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMine &&
                        (msg.is_read ? (
                          <CheckCheck className="h-3 w-3 text-blue-400" />
                        ) : (
                          <Check className="h-3 w-3 text-primary/40" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 px-3 py-2 border-t border-white/10 shrink-0"
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
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-white/20">
          <div className="text-center">
            <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerChatInbox;
