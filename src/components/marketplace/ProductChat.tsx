import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, X, Send, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

interface ProductChatProps {
  storeId: string;
  productId: string;
  productName: string;
  storeName?: string;
}

const ProductChat = ({ storeId, productId, productName, storeName }: ProductChatProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing messages when chat opens
  useEffect(() => {
    if (!open || !user) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("marketplace_chat_messages")
        .select("id, sender_id, sender_type, message, created_at")
        .eq("store_id", storeId)
        .eq("product_id", productId)
        .or(`sender_id.eq.${user.id}`)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setMessages(data as ChatMessage[]);
    };
    loadMessages();
  }, [open, user, storeId, productId]);

  // Realtime subscription
  useEffect(() => {
    if (!open || !user) return;

    const channel = supabase
      .channel(`chat-${productId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "marketplace_chat_messages",
          filter: `product_id=eq.${productId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Only add if it's part of our conversation
          if (newMsg.sender_id === user.id || newMsg.sender_type === "merchant") {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user, productId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    const msg = text.trim();
    setText("");

    const { error } = await supabase.from("marketplace_chat_messages").insert({
      store_id: storeId,
      product_id: productId,
      sender_id: user.id,
      sender_type: "buyer",
      message: msg,
    });

    if (error) {
      setText(msg);
      console.error("Chat send error:", error);
    }
    setSending(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-32 right-4 z-40 h-12 w-12 rounded-full bg-secondary text-primary shadow-lg hover:bg-secondary/90 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          aria-label="Chat with seller"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <div className="fixed bottom-16 right-0 left-0 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-200">
          <div className="mx-3 rounded-t-2xl border border-white/10 bg-primary shadow-2xl flex flex-col" style={{ height: "55vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Store className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{storeName || "Seller"}</p>
                  <p className="text-[10px] text-white/40 truncate max-w-[180px]">Re: {productName}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/10 text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-white/30 text-center">
                  <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs">Start a conversation with the seller</p>
                  <p className="text-[10px] mt-1">Ask about {productName}</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMine = msg.sender_id === user.id;
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
                        <p className="text-[10px] font-medium text-secondary mb-0.5">Seller</p>
                      )}
                      <p>{msg.message}</p>
                      <p className={`text-[9px] mt-1 ${isMine ? "text-primary/50" : "text-white/30"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-white/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
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
          </div>
        </div>
      )}
    </>
  );
};

export default ProductChat;
