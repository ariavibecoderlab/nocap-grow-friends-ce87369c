import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-help-chat`;

// Simple markdown-like rendering
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    let content: React.ReactNode = line;

    // Bold
    content = processInline(typeof content === "string" ? content : line);

    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="font-semibold text-sm mt-2 mb-1">{processInline(line.slice(4))}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="font-semibold text-sm mt-2 mb-1">{processInline(line.slice(3))}</h3>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<li key={i} className="ml-4 text-xs list-disc">{processInline(line.slice(2))}</li>);
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(<li key={i} className="ml-4 text-xs list-decimal">{processInline(line.replace(/^\d+\.\s/, ""))}</li>);
    } else if (line.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      elements.push(<p key={i} className="text-xs leading-relaxed">{content}</p>);
    }
  });

  return elements;
}

function processInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

interface AiHelpChatProps {
  defaultOpen?: boolean;
}

const AiHelpChat = ({ defaultOpen = false }: AiHelpChatProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (defaultOpen && !isOpen) setIsOpen(true);
  }, [defaultOpen]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const allMessages = [...messages, userMsg];

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      };

      // Forward user's auth token if available
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: allMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const errMsg = errData.error || "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
        setIsLoading(false);
        return;
      }

      const contentType = resp.headers.get("Content-Type") || "";

      if (contentType.includes("text/event-stream") && resp.body) {
        // Streaming response
        let assistantSoFar = "";
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        const upsertAssistant = (nextChunk: string) => {
          assistantSoFar += nextChunk;
          const snapshot = assistantSoFar;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
            }
            return [...prev, { role: "assistant", content: snapshot }];
          });
        };

        let streamDone = false;
        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") { streamDone = true; break; }
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) upsertAssistant(content);
            } catch { /* ignore */ }
          }
        }

        if (!assistantSoFar) {
          setMessages((prev) => [...prev, { role: "assistant", content: "I couldn't generate a response. Please try again." }]);
        }
      } else {
        // Non-streaming JSON response
        const data = await resp.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "I'm not sure how to help with that." }]);
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open AI chat"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md mx-4 mb-4 sm:mb-0 flex flex-col bg-primary border border-white/10 rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">NoCap AI Assistant</h3>
            <p className="text-[10px] text-white/40">Ask me anything about NoCap</p>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8"
              onClick={() => { setMessages([]); setInput(""); }}
              title="New Chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: "300px" }}>
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                <Bot className="h-6 w-6 text-secondary" />
              </div>
              <p className="text-xs text-white/50">Hi! I'm your NoCap AI assistant. Ask me about:</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {["How to top up?", "Search products", "My order status", "How cashback works"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-secondary/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2",
                  msg.role === "user"
                    ? "bg-secondary text-secondary-foreground rounded-br-sm"
                    : "bg-white/5 text-white/90 rounded-bl-sm"
                )}
              >
                {msg.role === "assistant" ? renderMarkdown(msg.content) : <p className="text-xs">{msg.content}</p>}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-[bounce_1.4s_ease-in-out_infinite]" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              rows={1}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-secondary/50 min-h-[36px] max-h-[80px]"
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiHelpChat;
