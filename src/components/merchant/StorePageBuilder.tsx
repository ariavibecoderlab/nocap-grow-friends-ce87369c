import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Loader2, ArrowUp, ArrowDown, Image, Type, ShoppingBag, Star, Info, Megaphone, SlidersHorizontal } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface Section {
  id: string;
  type: "hero_banner" | "hero_slideshow" | "featured_products" | "text_block" | "image_banner" | "testimonials" | "about" | "cta_banner";
  title: string;
  content: string;
  imageUrl: string;
  settings: Record<string, string>;
}

const SECTION_TYPES = [
  { value: "hero_banner", label: "Hero Banner", icon: Image, desc: "Large banner image with text overlay" },
  { value: "hero_slideshow", label: "Hero Slideshow", icon: SlidersHorizontal, desc: "Multiple slides with CTA buttons" },
  { value: "featured_products", label: "Featured Products", icon: ShoppingBag, desc: "Showcase your best products" },
  { value: "text_block", label: "Text Block", icon: Type, desc: "Custom text content" },
  { value: "image_banner", label: "Image Banner", icon: Image, desc: "Full-width image section" },
  { value: "testimonials", label: "Testimonials", icon: Star, desc: "Customer testimonials" },
  { value: "about", label: "About Us", icon: Info, desc: "Tell your store's story" },
  { value: "cta_banner", label: "CTA Banner", icon: Megaphone, desc: "Promotional call-to-action" },
] as const;

interface SlideData {
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
}

function SlideshowEditor({ slides, onChange }: { slides: SlideData[]; onChange: (slides: SlideData[]) => void }) {
  const addSlide = () => onChange([...slides, { imageUrl: "", title: "", subtitle: "", ctaText: "", ctaUrl: "" }]);
  const removeSlide = (idx: number) => onChange(slides.filter((_, i) => i !== idx));
  const updateSlide = (idx: number, field: keyof SlideData, value: string) => {
    const next = slides.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label className="text-white/60 text-[10px]">Slides ({slides.length})</Label>
      {slides.map((slide, idx) => (
        <div key={idx} className="p-2.5 rounded-lg border border-white/10 bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 font-medium">Slide {idx + 1}</span>
            <button onClick={() => removeSlide(idx)} className="text-red-400/60 hover:text-red-400 p-0.5">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <Input value={slide.imageUrl} onChange={e => updateSlide(idx, "imageUrl", e.target.value)}
            placeholder="Image URL" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
          <div className="grid grid-cols-2 gap-1.5">
            <Input value={slide.title} onChange={e => updateSlide(idx, "title", e.target.value)}
              placeholder="Headline" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
            <Input value={slide.subtitle} onChange={e => updateSlide(idx, "subtitle", e.target.value)}
              placeholder="Subtitle" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Input value={slide.ctaText} onChange={e => updateSlide(idx, "ctaText", e.target.value)}
              placeholder="Button text" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
            <Input value={slide.ctaUrl} onChange={e => updateSlide(idx, "ctaUrl", e.target.value)}
              placeholder="Button URL" className="bg-white/5 border-white/10 text-white h-7 text-[11px]" />
          </div>
        </div>
      ))}
      <button onClick={addSlide} className="w-full py-1.5 text-[11px] text-secondary border border-dashed border-white/10 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-1">
        <Plus className="h-3 w-3" /> Add Slide
      </button>
    </div>
  );
}

export default function StorePageBuilder({ storeId }: { storeId: string }) {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLayout();
  }, [storeId]);

  const loadLayout = async () => {
    const { data } = await supabase
      .from("marketplace_stores")
      .select("page_layout")
      .eq("id", storeId)
      .single();
    if (data?.page_layout && Array.isArray(data.page_layout)) {
      setSections(data.page_layout as unknown as Section[]);
    }
    setLoading(false);
  };

  const addSection = (type: Section["type"]) => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      type,
      title: SECTION_TYPES.find(s => s.value === type)?.label || "",
      content: "",
      imageUrl: "",
      settings: {},
    };
    setSections(prev => [...prev, newSection]);
  };

  const updateSection = (id: string, updates: Partial<Section>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const next = [...sections];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setSections(next);
  };

  const saveLayout = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("marketplace_stores")
      .update({ page_layout: sections as unknown as Json })
      .eq("id", storeId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Page layout saved!" });
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-white">Store Page Builder</h3>
        <Button size="sm" className="bg-secondary text-primary text-xs" onClick={saveLayout} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          Save Layout
        </Button>
      </div>

      <p className="text-[11px] text-white/40">Arrange sections to customize your store page. Visitors will see these sections on your storefront.</p>

      {sections.map((section, idx) => {
        const typeInfo = SECTION_TYPES.find(t => t.value === section.type);
        const Icon = typeInfo?.icon || Type;
        return (
          <Card key={section.id} className="border-white/10 bg-white/5">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-white/20 shrink-0" />
                <Icon className="h-4 w-4 text-secondary shrink-0" />
                <span className="text-xs font-medium text-white flex-1">{typeInfo?.label}</span>
                <div className="flex gap-1">
                  <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-1 text-white/30 hover:text-white disabled:opacity-20">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1} className="p-1 text-white/30 hover:text-white disabled:opacity-20">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => removeSection(section.id)} className="p-1 text-red-400/60 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-white/60 text-[10px]">Section Title</Label>
                <Input value={section.title} onChange={e => updateSection(section.id, { title: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-0.5 h-8 text-xs" />
              </div>

              {(section.type === "text_block" || section.type === "about" || section.type === "testimonials") && (
                <div>
                  <Label className="text-white/60 text-[10px]">Content</Label>
                  <Textarea value={section.content} onChange={e => updateSection(section.id, { content: e.target.value })}
                    className="bg-white/5 border-white/10 text-white mt-0.5 text-xs min-h-[60px]" />
                </div>
              )}

              {(section.type === "hero_banner" || section.type === "image_banner") && (
                <div>
                  <Label className="text-white/60 text-[10px]">Image URL</Label>
                  <Input value={section.imageUrl} onChange={e => updateSection(section.id, { imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10 text-white mt-0.5 h-8 text-xs" />
                </div>
              )}

              {section.type === "hero_banner" && (
                <div>
                  <Label className="text-white/60 text-[10px]">Subtitle</Label>
                  <Input value={section.content} onChange={e => updateSection(section.id, { content: e.target.value })}
                    className="bg-white/5 border-white/10 text-white mt-0.5 h-8 text-xs" />
                </div>
              )}

              {section.type === "hero_slideshow" && (
                <SlideshowEditor
                  slides={(() => { try { return JSON.parse(section.content || "[]"); } catch { return []; } })()}
                  onChange={(slides) => updateSection(section.id, { content: JSON.stringify(slides) })}
                />
              )}

              {section.type === "cta_banner" && (
                <>
                  <div>
                    <Label className="text-white/60 text-[10px]">Description</Label>
                    <Input value={section.content} onChange={e => updateSection(section.id, { content: e.target.value })}
                      className="bg-white/5 border-white/10 text-white mt-0.5 h-8 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-white/60 text-[10px]">Button Text</Label>
                      <Input value={section.settings?.cta_text || ""} onChange={e => updateSection(section.id, { settings: { ...section.settings, cta_text: e.target.value } })}
                        placeholder="Shop Now"
                        className="bg-white/5 border-white/10 text-white mt-0.5 h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-white/60 text-[10px]">Button URL</Label>
                      <Input value={section.settings?.cta_url || ""} onChange={e => updateSection(section.id, { settings: { ...section.settings, cta_url: e.target.value } })}
                        placeholder="#"
                        className="bg-white/5 border-white/10 text-white mt-0.5 h-8 text-xs" />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-dashed border-white/10 bg-white/[0.02]">
        <CardContent className="p-3">
          <p className="text-[10px] text-white/40 mb-2">Add a section:</p>
          <div className="grid grid-cols-2 gap-2">
            {SECTION_TYPES.map(st => (
              <button
                key={st.value}
                onClick={() => addSection(st.value)}
                className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-left hover:bg-white/5 transition-colors"
              >
                <st.icon className="h-4 w-4 text-secondary shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-white">{st.label}</p>
                  <p className="text-[9px] text-white/30">{st.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
