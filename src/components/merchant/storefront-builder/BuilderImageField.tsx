import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Replace } from "lucide-react";
import ImagePickerDialog from "./ImagePickerDialog";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  storeId: string;
  folder?: string;
  className?: string;
}

export default function BuilderImageField({ label, value, onChange, storeId, folder = "builder", className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <Label className="text-white/60 text-[10px]">{label}</Label>

      {value ? (
        <div className="mt-1 relative group">
          <img src={value} alt="" className="w-full h-24 object-cover rounded-lg border border-white/10" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 w-full h-20 rounded-lg border border-dashed border-white/20 bg-white/[0.02] flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white/60 hover:border-white/30 transition-colors"
        >
          <ImagePlus className="h-4 w-4" />
          <span className="text-[10px]">Choose image</span>
        </button>
      )}

      {value && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(true)}
          className="mt-1 h-6 text-[10px] text-white/40 hover:text-white p-0"
        >
          <Replace className="h-3 w-3 mr-1" /> Change image
        </Button>
      )}

      <ImagePickerDialog
        open={open}
        onOpenChange={setOpen}
        storeId={storeId}
        folder={folder}
        onSelect={(u) => onChange(u)}
      />
    </div>
  );
}
