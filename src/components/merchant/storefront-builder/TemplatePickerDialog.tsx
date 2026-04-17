import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STORE_TEMPLATES, StoreTemplate, instantiateTemplate, BlockDefinition } from "@/lib/storeTemplates";
import { getThemeById } from "@/lib/storeThemes";
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (blocks: BlockDefinition[], themeId: string) => void;
  forceOpen?: boolean; // first-time, no close button
}

export default function TemplatePickerDialog({ open, onClose, onApply, forceOpen }: Props) {
  const [selected, setSelected] = useState<StoreTemplate | null>(null);

  const apply = (t: StoreTemplate) => {
    onApply(instantiateTemplate(t), t.themeId);
    onClose();
    setSelected(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !forceOpen) onClose(); }}>
      <DialogContent
        className="bg-primary border-white/10 text-white max-w-3xl h-[88vh] sm:h-auto sm:max-h-[88vh] p-0 flex flex-col gap-0"
        onPointerDownOutside={(e) => { if (forceOpen) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (forceOpen) e.preventDefault(); }}
      >
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-white/10">
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            {forceOpen ? "Pick a starter template" : "Apply a template"}
          </DialogTitle>
          <p className="text-xs text-white/50 mt-1 text-left">
            {forceOpen
              ? "Get started fast with a curated layout. You can fully customize it after."
              : "Replace your current layout with a ready-made design. Your products are not affected."}
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STORE_TEMPLATES.map((t) => {
              const theme = getThemeById(t.themeId);
              const isSel = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  onDoubleClick={() => apply(t)}
                  className={`text-left rounded-xl border-2 transition-all overflow-hidden ${
                    isSel ? "border-secondary shadow-lg shadow-secondary/20" : "border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Preview */}
                  <div
                    className="aspect-[16/9] flex items-center justify-center text-5xl relative"
                    style={{ background: `linear-gradient(135deg, ${theme.preview.bg}, ${theme.preview.card})` }}
                  >
                    <span>{t.thumbnail}</span>
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.preview.accent }} />
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.preview.text }} />
                    </div>
                  </div>
                  <div className="p-3 bg-white/[0.02]">
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{t.tagline}</p>
                    <p className="text-[11px] text-white/60 mt-1.5 leading-relaxed">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-3 border-t border-white/10 shrink-0 bg-primary">
          <p className="text-[11px] text-white/40">
            {selected ? `Selected: ${selected.name}` : "Tap a template to preview, double-tap to apply"}
          </p>
          <div className="flex items-center gap-2">
            {!forceOpen && (
              <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white">
                Cancel
              </Button>
            )}
            <Button
              onClick={() => selected && apply(selected)}
              disabled={!selected}
              className="bg-secondary text-primary hover:bg-secondary/90"
            >
              Use this template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
