import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lightbulb, ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { journeys, type Guide } from "./sellerPortalData";

interface Props {
  guideId: string;
  completedGuides: string[];
  onMarkComplete: (id: string) => void;
  onSelectGuide: (id: string) => void;
}

function findGuide(id: string): Guide | undefined {
  for (const j of journeys) {
    const g = j.guides.find(g => g.id === id);
    if (g) return g;
  }
  return undefined;
}

function findJourneyTitle(guideId: string): string {
  for (const j of journeys) {
    if (j.guides.some(g => g.id === guideId)) return j.title;
  }
  return "";
}

export default function GuideContent({ guideId, completedGuides, onMarkComplete, onSelectGuide }: Props) {
  const guide = findGuide(guideId);
  if (!guide) return <div className="p-8 text-muted-foreground">Select a guide from the sidebar.</div>;

  const isComplete = completedGuides.includes(guide.id);
  const nextGuide = guide.nextGuide ? findGuide(guide.nextGuide) : undefined;
  const journeyTitle = findJourneyTitle(guide.id);
  const Icon = guide.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <BookOpen className="h-3.5 w-3.5" />
          <span className="truncate">{journeyTitle}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-lg bg-secondary/15 text-secondary shrink-0">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 sm:hidden">
              <h1 className="text-lg font-bold text-foreground leading-tight">{guide.title}</h1>
            </div>
            {isComplete && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shrink-0 sm:hidden text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-0.5" /> Done
              </Badge>
            )}
          </div>
          <div className="flex-1 hidden sm:block">
            <h1 className="text-2xl font-bold text-foreground">{guide.title}</h1>
            <p className="text-muted-foreground mt-1">{guide.subtitle}</p>
          </div>
          <p className="text-sm text-muted-foreground sm:hidden">{guide.subtitle}</p>
          {isComplete && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shrink-0 hidden sm:flex">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Completed
            </Badge>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2 sm:space-y-3">
        {guide.steps.map((step, idx) => (
          <Card key={idx} className="border-border/50 bg-card/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex gap-2 sm:gap-3">
                <div className="flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-secondary text-secondary-foreground text-xs sm:text-sm font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-1 sm:space-y-1.5 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  {step.tip && (
                    <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 p-2 sm:p-2.5 rounded-md bg-secondary/10 border border-secondary/20">
                      <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary shrink-0 mt-0.5" />
                      <p className="text-[11px] sm:text-xs text-secondary/90">{step.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2 pb-6 sm:pb-8">
        <Button
          onClick={() => onMarkComplete(guide.id)}
          variant={isComplete ? "outline" : "default"}
          size="default"
          className={cn(
            "w-full sm:w-auto text-sm",
            !isComplete && "bg-secondary text-secondary-foreground hover:bg-secondary/90"
          )}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {isComplete ? "Mark as Incomplete" : "Mark as Complete"}
        </Button>

        {nextGuide && (
          <Button
            variant="ghost"
            onClick={() => onSelectGuide(nextGuide.id)}
            className="w-full sm:w-auto text-muted-foreground hover:text-foreground text-sm"
          >
            Next: {nextGuide.title}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
