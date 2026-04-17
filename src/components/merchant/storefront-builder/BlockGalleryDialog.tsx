import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BLOCK_LIBRARY, BlockDefinition } from "@/lib/storeTemplates";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (block: BlockDefinition) => void;
}

const CATEGORIES = [
  { id: "hero", label: "Hero" },
  { id: "products", label: "Products" },
  { id: "content", label: "Content" },
  { id: "marketing", label: "Marketing" },
] as const;

const uid = () => Math.random().toString(36).slice(2, 10);

export default function BlockGalleryDialog({ open, onClose, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-primary border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add a section</DialogTitle>
          <p className="text-xs text-white/50 mt-1">Choose a block to insert into your store page</p>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {CATEGORIES.map((cat) => {
            const items = BLOCK_LIBRARY.filter((b) => b.category === cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">{cat.label}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {items.map((b) => (
                    <button
                      key={b.type}
                      onClick={() => {
                        const def = b.defaults();
                        onPick({ ...def, id: uid() });
                        onClose();
                      }}
                      className="flex flex-col items-start gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-left hover:border-secondary/40 hover:bg-secondary/5 transition-colors"
                    >
                      <span className="text-2xl">{b.icon}</span>
                      <p className="text-xs font-medium text-white">{b.label}</p>
                      <p className="text-[10px] text-white/40 leading-tight">{b.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
