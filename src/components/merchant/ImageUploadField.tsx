import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compressImage";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
}

export default function ImageUploadField({ label, value, onChange, folder = "builder", className }: ImageUploadFieldProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Only image files are allowed", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImageFile(file);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("marketplace-assets")
        .upload(path, compressed, { contentType: compressed.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("marketplace-assets")
        .getPublicUrl(path);

      onChange(urlData.publicUrl);
      toast({ title: "Image uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className={className}>
      <Label className="text-white/60 text-[10px]">{label}</Label>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {value ? (
        <div className="mt-1 relative group">
          <img src={value} alt="" className="w-full h-24 object-cover rounded-lg border border-white/10" />
          <button
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-1 w-full h-20 rounded-lg border border-dashed border-white/20 bg-white/[0.02] flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white/60 hover:border-white/30 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span className="text-[10px]">Click to upload image</span>
            </>
          )}
        </button>
      )}

      {value && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-1 h-6 text-[10px] text-white/40 hover:text-white p-0"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ImageIcon className="h-3 w-3 mr-1" />}
          Replace image
        </Button>
      )}
    </div>
  );
}
