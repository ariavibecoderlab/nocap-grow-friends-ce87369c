import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Undo2, Redo2, Save, Globe, Loader2, Monitor, Tablet, Smartphone, ExternalLink, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type Viewport = "desktop" | "tablet" | "mobile";

interface Props {
  storeName: string;
  storeSlug: string;
  viewport: Viewport;
  onViewportChange: (v: Viewport) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onOpenTemplates: () => void;
  saving: boolean;
  publishing: boolean;
  isDirty: boolean;
  hasUnpublished: boolean;
  lastSavedAt: Date | null;
}

export default function BuilderToolbar({
  storeName, storeSlug, viewport, onViewportChange,
  onUndo, onRedo, canUndo, canRedo, onSaveDraft, onPublish, onOpenTemplates,
  saving, publishing, isDirty, hasUnpublished, lastSavedAt,
}: Props) {
  const navigate = useNavigate();

  return (
    <header className="border-b border-white/10 bg-primary/95 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 lg:px-4 h-14">
        <button
          onClick={() => navigate("/merchant")}
          className="p-2 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors"
          aria-label="Back to merchant"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{storeName}</p>
            {hasUnpublished && (
              <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-300 bg-amber-400/10">
                Unpublished changes
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-white/40 truncate">
            {saving ? "Saving…" : isDirty ? "Unsaved" : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : "Draft"}
          </p>
        </div>

        {/* Viewport switcher */}
        <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
          {([
            { v: "desktop", Icon: Monitor },
            { v: "tablet", Icon: Tablet },
            { v: "mobile", Icon: Smartphone },
          ] as const).map(({ v, Icon }) => (
            <button
              key={v}
              onClick={() => onViewportChange(v)}
              className={`p-1.5 rounded-md transition-colors ${viewport === v ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
              aria-label={v}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <Button size="sm" variant="ghost" onClick={onOpenTemplates} className="hidden lg:inline-flex text-xs text-white/70 hover:text-white">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Templates
        </Button>

        <Button size="sm" variant="ghost" onClick={() => window.open(`/store/${storeSlug}`, "_blank")} className="hidden md:inline-flex text-xs text-white/70 hover:text-white">
          <ExternalLink className="h-3.5 w-3.5 mr-1" /> View live
        </Button>

        <Button size="sm" variant="outline" onClick={onSaveDraft} disabled={saving} className="text-xs border-white/20 text-white hover:bg-white/5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" /> Save</>}
        </Button>

        <Button size="sm" onClick={onPublish} disabled={publishing} className="bg-secondary text-primary hover:bg-secondary/90 text-xs font-semibold">
          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Globe className="h-3.5 w-3.5 mr-1" /> Publish</>}
        </Button>
      </div>
    </header>
  );
}
