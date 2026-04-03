import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquareText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface CannedResponsePickerProps {
  onSelect: (content: string) => void;
}

export default function CannedResponsePicker({ onSelect }: CannedResponsePickerProps) {
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase.from("canned_responses").select("id, title, content, category").order("category").order("title")
      .then(({ data }) => setResponses((data as CannedResponse[]) || []));
  }, [open]);

  const filtered = responses.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.content.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map(r => r.category))];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0" title="Canned responses">
          <MessageSquareText className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="top">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search responses..." className="h-8 pl-8 text-xs" />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {responses.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No canned responses yet. Add some in Analytics → Canned Responses.</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No matches found</p>
          ) : (
            categories.map(cat => (
              <div key={cat}>
                <div className="px-3 py-1.5 bg-muted/50">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">{cat}</span>
                </div>
                {filtered.filter(r => r.category === cat).map(r => (
                  <button key={r.id} className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors border-b border-border/30"
                    onClick={() => { onSelect(r.content); setOpen(false); setSearch(""); }}>
                    <p className="text-xs font-medium truncate">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{r.content}</p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
