import { BlockDefinition, getBlockType } from "@/lib/storeTemplates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import BuilderImageField from "./BuilderImageField";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  block: BlockDefinition | null;
  storeId: string;
  onUpdate: (patch: Partial<BlockDefinition>) => void;
}

export default function BlockPropertiesPanel({ block, storeId, onUpdate }: Props) {
  if (!block) {
    return (
      <div className="p-6 text-center text-white/30">
        <p className="text-xs">Select a section to edit its properties</p>
      </div>
    );
  }

  const meta = getBlockType(block.type);

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <span className="text-lg">{meta?.icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">{meta?.label}</p>
          <p className="text-[10px] text-white/40 truncate">{meta?.description}</p>
        </div>
      </div>

      <div>
        <Label className="text-[10px] text-white/60">Section Title</Label>
        <Input
          value={block.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="bg-white/5 border-white/10 text-white mt-1 h-8 text-xs"
        />
      </div>

      {/* Type-specific fields */}
      {block.type === "hero_banner" && (
        <>
          <BuilderImageField label="Hero Image" value={block.imageUrl} onChange={(u) => onUpdate({ imageUrl: u })} storeId={storeId} folder="builder" />
          <div>
            <Label className="text-[10px] text-white/60">Subtitle</Label>
            <Input value={block.content} onChange={(e) => onUpdate({ content: e.target.value })} className="bg-white/5 border-white/10 text-white mt-1 h-8 text-xs" />
          </div>
          <CtaFields block={block} onUpdate={onUpdate} />
        </>
      )}

      {block.type === "hero_slideshow" && (
        <SlideshowEditor block={block} storeId={storeId} onUpdate={onUpdate} />
      )}

      {block.type === "image_banner" && (
        <BuilderImageField label="Image" value={block.imageUrl} onChange={(u) => onUpdate({ imageUrl: u })} storeId={storeId} folder="builder" />
      )}

      {block.type === "image_text" && (
        <>
          <BuilderImageField label="Image" value={block.imageUrl} onChange={(u) => onUpdate({ imageUrl: u })} storeId={storeId} folder="builder" />
          <div>
            <Label className="text-[10px] text-white/60">Body Text</Label>
            <Textarea value={block.content} onChange={(e) => onUpdate({ content: e.target.value })} className="bg-white/5 border-white/10 text-white mt-1 text-xs min-h-[80px]" />
          </div>
          <SelectField label="Layout" value={block.settings?.layout || "image-left"} options={[{ v: "image-left", l: "Image left" }, { v: "image-right", l: "Image right" }]} onChange={(v) => onUpdate({ settings: { ...block.settings, layout: v } })} />
        </>
      )}

      {(block.type === "text_block" || block.type === "about" || block.type === "testimonials") && (
        <>
          <div>
            <Label className="text-[10px] text-white/60">Content</Label>
            <Textarea value={block.content} onChange={(e) => onUpdate({ content: e.target.value })} className="bg-white/5 border-white/10 text-white mt-1 text-xs min-h-[100px]" />
          </div>
          {block.type === "testimonials" && (
            <div>
              <Label className="text-[10px] text-white/60">Author</Label>
              <Input value={block.settings?.author || ""} onChange={(e) => onUpdate({ settings: { ...block.settings, author: e.target.value } })} className="bg-white/5 border-white/10 text-white mt-1 h-8 text-xs" />
            </div>
          )}
        </>
      )}

      {block.type === "featured_products" && (
        <div>
          <Label className="text-[10px] text-white/60">Number of products</Label>
          <Input type="number" min={2} max={20} value={block.settings?.limit || "8"} onChange={(e) => onUpdate({ settings: { ...block.settings, limit: e.target.value } })} className="bg-white/5 border-white/10 text-white mt-1 h-8 text-xs" />
          <p className="text-[10px] text-white/40 mt-1">Pulls from your featured products on the live store.</p>
        </div>
      )}

      {block.type === "cta_banner" && (
        <>
          <div>
            <Label className="text-[10px] text-white/60">Description</Label>
            <Input value={block.content} onChange={(e) => onUpdate({ content: e.target.value })} className="bg-white/5 border-white/10 text-white mt-1 h-8 text-xs" />
          </div>
          <CtaFields block={block} onUpdate={onUpdate} />
        </>
      )}

      {block.type === "newsletter" && (
        <div>
          <Label className="text-[10px] text-white/60">Subtitle</Label>
          <Input value={block.content} onChange={(e) => onUpdate({ content: e.target.value })} className="bg-white/5 border-white/10 text-white mt-1 h-8 text-xs" />
        </div>
      )}

      {block.type === "faq" && <FaqEditor block={block} onUpdate={onUpdate} />}

      {block.type === "custom_html" && (
        <div>
          <Label className="text-[10px] text-white/60">HTML</Label>
          <Textarea value={block.content} onChange={(e) => onUpdate({ content: e.target.value })} className="bg-white/5 border-white/10 text-white mt-1 text-xs min-h-[140px] font-mono" />
          <p className="text-[10px] text-amber-300/70 mt-1">Sanitized at render time. Scripts are stripped.</p>
        </div>
      )}
    </div>
  );
}

function CtaFields({ block, onUpdate }: { block: BlockDefinition; onUpdate: (p: Partial<BlockDefinition>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-[10px] text-white/60">Button Text</Label>
        <Input value={block.settings?.cta_text || ""} onChange={(e) => onUpdate({ settings: { ...block.settings, cta_text: e.target.value } })} placeholder="Shop Now" className="bg-white/5 border-white/10 text-white mt-1 h-8 text-xs" />
      </div>
      <div>
        <Label className="text-[10px] text-white/60">Button URL</Label>
        <Input value={block.settings?.cta_url || ""} onChange={(e) => onUpdate({ settings: { ...block.settings, cta_url: e.target.value } })} placeholder="#" className="bg-white/5 border-white/10 text-white mt-1 h-8 text-xs" />
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] text-white/60">{label}</Label>
      <div className="relative mt-1">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none bg-white/5 border border-white/10 text-white h-8 text-xs px-2 pr-7 rounded-md">
          {options.map((o) => <option key={o.v} value={o.v} className="bg-primary">{o.l}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40 pointer-events-none" />
      </div>
    </div>
  );
}

function SlideshowEditor({ block, storeId, onUpdate }: { block: BlockDefinition; storeId: string; onUpdate: (p: Partial<BlockDefinition>) => void }) {
  const slides: any[] = (() => { try { return JSON.parse(block.content || "[]"); } catch { return []; } })();
  const set = (next: any[]) => onUpdate({ content: JSON.stringify(next) });

  return (
    <div className="space-y-2">
      <Label className="text-[10px] text-white/60">Slides ({slides.length})</Label>
      {slides.map((s, i) => (
        <div key={i} className="p-2 rounded-lg border border-white/10 bg-white/[0.02] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">Slide {i + 1}</span>
            <button onClick={() => set(slides.filter((_, j) => j !== i))} className="text-red-400/60 hover:text-red-400 p-0.5">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <BuilderImageField label="Image" value={s.imageUrl || ""} onChange={(u) => set(slides.map((sl, j) => j === i ? { ...sl, imageUrl: u } : sl))} storeId={storeId} folder="builder/slides" />
          <Input value={s.title || ""} onChange={(e) => set(slides.map((sl, j) => j === i ? { ...sl, title: e.target.value } : sl))} placeholder="Headline" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
          <Input value={s.subtitle || ""} onChange={(e) => set(slides.map((sl, j) => j === i ? { ...sl, subtitle: e.target.value } : sl))} placeholder="Subtitle" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
          <div className="grid grid-cols-2 gap-1">
            <Input value={s.ctaText || ""} onChange={(e) => set(slides.map((sl, j) => j === i ? { ...sl, ctaText: e.target.value } : sl))} placeholder="Button" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
            <Input value={s.ctaUrl || ""} onChange={(e) => set(slides.map((sl, j) => j === i ? { ...sl, ctaUrl: e.target.value } : sl))} placeholder="Link" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => set([...slides, { imageUrl: "", title: "", subtitle: "", ctaText: "", ctaUrl: "" }])} className="w-full h-8 text-[11px] border-dashed border-white/20 text-white/70 hover:bg-white/5">
        <Plus className="h-3 w-3 mr-1" /> Add Slide
      </Button>
    </div>
  );
}

function FaqEditor({ block, onUpdate }: { block: BlockDefinition; onUpdate: (p: Partial<BlockDefinition>) => void }) {
  const items: { q: string; a: string }[] = (() => { try { return JSON.parse(block.content || "[]"); } catch { return []; } })();
  const set = (next: any[]) => onUpdate({ content: JSON.stringify(next) });

  return (
    <div className="space-y-2">
      <Label className="text-[10px] text-white/60">Questions ({items.length})</Label>
      {items.map((it, i) => (
        <div key={i} className="p-2 rounded-lg border border-white/10 bg-white/[0.02] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">Q{i + 1}</span>
            <button onClick={() => set(items.filter((_, j) => j !== i))} className="text-red-400/60 hover:text-red-400 p-0.5">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <Input value={it.q} onChange={(e) => set(items.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} placeholder="Question" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
          <Textarea value={it.a} onChange={(e) => set(items.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} placeholder="Answer" className="bg-white/5 border-white/10 text-white text-[11px] min-h-[50px]" />
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => set([...items, { q: "", a: "" }])} className="w-full h-8 text-[11px] border-dashed border-white/20 text-white/70 hover:bg-white/5">
        <Plus className="h-3 w-3 mr-1" /> Add Question
      </Button>
    </div>
  );
}
