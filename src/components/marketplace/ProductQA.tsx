import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpCircle, Send, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QAItem {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

interface ProductQAProps {
  productId: string;
}

const ProductQA = ({ productId }: ProductQAProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<QAItem[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    supabase
      .from("marketplace_product_qa")
      .select("id, question, answer, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setItems(data as QAItem[]);
      });
  }, [productId]);

  const handleAsk = async () => {
    if (!question.trim() || !user || sending) return;
    setSending(true);
    const q = question.trim();
    setQuestion("");

    const { data, error } = await supabase
      .from("marketplace_product_qa")
      .insert({
        product_id: productId,
        user_id: user.id,
        question: q,
      })
      .select("id, question, answer, created_at")
      .single();

    if (error) {
      setQuestion(q);
      toast({ title: "Error", description: "Failed to post question", variant: "destructive" });
    } else if (data) {
      setItems((prev) => [data as QAItem, ...prev]);
      toast({ title: "Question posted" });
    }
    setSending(false);
  };

  const visible = showAll ? items : items.slice(0, 3);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-1.5 mb-3">
        <HelpCircle className="h-4 w-4 text-secondary" />
        <h3 className="font-display text-sm font-semibold text-white">Q&A</h3>
        {items.length > 0 && (
          <span className="text-[10px] text-white/30">({items.length})</span>
        )}
      </div>

      {/* Ask form */}
      {user && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex gap-2 mb-3"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this product..."
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
            maxLength={300}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!question.trim() || sending}
            className="h-9 w-9 bg-secondary text-primary hover:bg-secondary/90 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      {/* Q&A list */}
      {visible.length > 0 ? (
        <div className="space-y-2">
          {visible.map((qa) => (
            <div key={qa.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex gap-2">
                <span className="text-secondary font-bold text-xs mt-0.5">Q:</span>
                <p className="text-xs text-white/80">{qa.question}</p>
              </div>
              {qa.answer ? (
                <div className="flex gap-2 mt-1.5 ml-1 pl-3 border-l-2 border-secondary/30">
                  <span className="text-secondary/70 font-bold text-xs mt-0.5">A:</span>
                  <p className="text-xs text-white/60">{qa.answer}</p>
                </div>
              ) : (
                <p className="text-[10px] text-white/25 mt-1 ml-5">Awaiting merchant reply</p>
              )}
            </div>
          ))}
          {items.length > 3 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-secondary hover:underline"
            >
              View all {items.length} questions
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center py-4 text-white/20">
          <MessageSquare className="h-6 w-6 mb-1 opacity-40" />
          <p className="text-[10px]">No questions yet. Be the first to ask!</p>
        </div>
      )}
    </div>
  );
};

export default ProductQA;
