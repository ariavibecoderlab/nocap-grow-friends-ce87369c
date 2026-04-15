import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { journeys } from "./sellerPortalData";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  activeGuide: string;
  onSelectGuide: (id: string) => void;
  completedGuides: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function SellerPortalSidebar({ activeGuide, onSelectGuide, completedGuides, searchQuery, onSearchChange }: Props) {
  const [openJourneys, setOpenJourneys] = useState<string[]>(journeys.map(j => j.id));

  const toggle = (id: string) =>
    setOpenJourneys(prev => prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id]);

  const matchesSearch = (text: string) =>
    !searchQuery || text.toLowerCase().includes(searchQuery.toLowerCase());

  const filteredJourneys = journeys.map(j => ({
    ...j,
    guides: j.guides.filter(g => matchesSearch(g.title) || matchesSearch(g.subtitle) || g.steps.some(s => matchesSearch(s.title))),
  })).filter(j => j.guides.length > 0);

  const totalGuides = journeys.reduce((n, j) => n + j.guides.length, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-secondary mb-1">Seller Portal</h2>
        <p className="text-xs text-muted-foreground mb-3">
          {completedGuides.length}/{totalGuides} guides completed
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guides..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredJourneys.map(journey => (
            <Collapsible
              key={journey.id}
              open={openJourneys.includes(journey.id)}
              onOpenChange={() => toggle(journey.id)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 rounded-md">
                {openJourneys.includes(journey.id) ? <ChevronDown className="h-4 w-4 text-secondary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="truncate">{journey.title}</span>
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                  {journey.guides.filter(g => completedGuides.includes(g.id)).length}/{journey.guides.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {journey.guides.map(guide => {
                    const isActive = activeGuide === guide.id;
                    const isComplete = completedGuides.includes(guide.id);
                    return (
                      <button
                        key={guide.id}
                        onClick={() => onSelectGuide(guide.id)}
                        className={cn(
                          "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                          isActive ? "bg-secondary/15 text-secondary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <guide.icon className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">{guide.title}</span>
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
