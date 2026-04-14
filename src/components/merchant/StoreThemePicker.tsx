import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { THEME_TEMPLATES, ThemeTemplate, ThemeOverrides, getThemeById, getButtonRadiusClass } from "@/lib/storeThemes";
import { Check, Palette, Type } from "lucide-react";

interface ThemePickerProps {
  currentTheme: string;
  overrides: ThemeOverrides;
  onThemeChange: (themeId: string) => void;
  onOverridesChange: (overrides: ThemeOverrides) => void;
}

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Lora', serif", label: "Lora" },
  { value: "'Montserrat', sans-serif", label: "Montserrat" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
];

const RADIUS_OPTIONS = [
  { value: "0px", label: "None" },
  { value: "0.25rem", label: "Sharp" },
  { value: "0.5rem", label: "Soft" },
  { value: "0.75rem", label: "Rounded" },
  { value: "1rem", label: "More Rounded" },
  { value: "1.25rem", label: "Pill-like" },
];

const BUTTON_STYLES: { value: ThemeTemplate["buttonStyle"]; label: string }[] = [
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
  { value: "square", label: "Square" },
  { value: "soft", label: "Soft" },
];

export default function StoreThemePicker({ currentTheme, overrides, onThemeChange, onOverridesChange }: ThemePickerProps) {
  const [showCustomize, setShowCustomize] = useState(false);
  const activeTheme = getThemeById(currentTheme);

  const updateOverride = (key: keyof ThemeOverrides, value: string) => {
    onOverridesChange({ ...overrides, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-secondary" />
        <h3 className="text-sm font-semibold text-white">Store Theme</h3>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEME_TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => onThemeChange(t.id)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all ${
              currentTheme === t.id ? "border-secondary shadow-lg shadow-secondary/20" : "border-white/10 hover:border-white/20"
            }`}
          >
            {/* Mini preview */}
            <div className="aspect-[4/3] p-2.5" style={{ backgroundColor: t.preview.bg }}>
              {/* Mini banner */}
              <div className="h-5 rounded-t-md" style={{ backgroundColor: t.preview.accent + "33" }} />
              {/* Mini cards */}
              <div className="grid grid-cols-2 gap-1 mt-1.5">
                {[0, 1].map(i => (
                  <div key={i} className="rounded" style={{ backgroundColor: t.preview.card, border: `1px solid ${t.preview.accent}22` }}>
                    <div className="h-5 rounded-t" style={{ backgroundColor: t.preview.accent + "15" }} />
                    <div className="p-1">
                      <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: t.preview.text + "40" }} />
                      <div className="h-1 w-1/2 rounded-full mt-0.5" style={{ backgroundColor: t.preview.accent }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Mini button */}
              <div
                className="h-3 mt-1.5 mx-auto w-2/3"
                style={{
                  backgroundColor: t.preview.accent,
                  borderRadius: getButtonRadiusClass(t.buttonStyle),
                }}
              />
            </div>
            {/* Label */}
            <div className="px-2 py-1.5 bg-white/5">
              <p className="text-[10px] font-semibold text-white text-center">{t.name}</p>
            </div>
            {currentTheme === t.id && (
              <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-secondary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Active theme info */}
      <div className="text-[11px] text-white/40 text-center">{activeTheme.description}</div>

      {/* Customize toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCustomize(!showCustomize)}
        className="w-full border-white/10 text-white/70 hover:bg-white/10 hover:text-white gap-2"
      >
        <Palette className="h-3.5 w-3.5" />
        {showCustomize ? "Hide Customization" : "Customize Theme"}
      </Button>

      {/* Customization Panel */}
      {showCustomize && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4 space-y-4">
            <p className="text-xs text-white/50">Override the selected template's defaults:</p>

            {/* Primary Color */}
            <div>
              <Label className="text-white/70 text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Accent Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={overrides.primary_color || activeTheme.colors.primary}
                  onChange={e => updateOverride("primary_color", e.target.value)}
                  className="h-9 w-12 rounded border border-white/10 cursor-pointer bg-transparent"
                />
                <Input
                  value={overrides.primary_color || activeTheme.colors.primary}
                  onChange={e => updateOverride("primary_color", e.target.value)}
                  className="bg-white/5 border-white/10 text-white font-mono text-xs"
                />
                {overrides.primary_color && (
                  <Button size="sm" variant="ghost" className="text-white/40 hover:text-white text-xs h-9 px-2"
                    onClick={() => updateOverride("primary_color", "")}>Reset</Button>
                )}
              </div>
            </div>

            {/* Fonts */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70 text-xs flex items-center gap-1"><Type className="h-3 w-3" /> Heading Font</Label>
                <Select value={overrides.heading_font || activeTheme.fonts.heading} onValueChange={v => updateOverride("heading_font", v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                    {FONT_OPTIONS.map(f => (
                      <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs flex items-center gap-1"><Type className="h-3 w-3" /> Body Font</Label>
                <Select value={overrides.body_font || activeTheme.fonts.body} onValueChange={v => updateOverride("body_font", v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                    {FONT_OPTIONS.map(f => (
                      <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <Label className="text-white/70 text-xs">Corner Radius</Label>
              <Select value={overrides.border_radius || activeTheme.borderRadius} onValueChange={v => updateOverride("border_radius", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  {RADIUS_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label} ({r.value})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Button Style */}
            <div>
              <Label className="text-white/70 text-xs">Button Style</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {BUTTON_STYLES.map(bs => (
                  <button
                    key={bs.value}
                    onClick={() => updateOverride("button_style", bs.value)}
                    className={`py-1.5 text-[10px] font-medium border transition-all ${
                      (overrides.button_style || activeTheme.buttonStyle) === bs.value
                        ? "border-secondary bg-secondary/10 text-secondary"
                        : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"
                    }`}
                    style={{ borderRadius: getButtonRadiusClass(bs.value) }}
                  >
                    {bs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="mt-2">
              <p className="text-[10px] text-white/40 mb-2">Preview</p>
              <div
                className="rounded-lg overflow-hidden border p-3 space-y-2"
                style={{
                  backgroundColor: activeTheme.colors.background,
                  borderColor: activeTheme.colors.surfaceBorder,
                  fontFamily: overrides.body_font || activeTheme.fonts.body,
                }}
              >
                <h4
                  className="text-sm font-bold"
                  style={{
                    color: activeTheme.colors.text,
                    fontFamily: overrides.heading_font || activeTheme.fonts.heading,
                  }}
                >
                  Sample Heading
                </h4>
                <p className="text-[11px]" style={{ color: activeTheme.colors.textMuted }}>
                  This is how your store text will look.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2].map(i => (
                    <div
                      key={i}
                      className="border p-2"
                      style={{
                        backgroundColor: activeTheme.colors.surface,
                        borderColor: activeTheme.colors.surfaceBorder,
                        borderRadius: overrides.border_radius || activeTheme.borderRadius,
                      }}
                    >
                      <div
                        className="h-8 mb-1.5"
                        style={{
                          backgroundColor: (overrides.primary_color || activeTheme.colors.primary) + "15",
                          borderRadius: overrides.border_radius || activeTheme.borderRadius,
                        }}
                      />
                      <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: activeTheme.colors.text + "30" }} />
                      <div className="h-1 w-1/2 rounded-full mt-0.5" style={{ backgroundColor: overrides.primary_color || activeTheme.colors.primary }} />
                    </div>
                  ))}
                </div>
                <button
                  className="w-full py-1.5 text-xs font-semibold"
                  style={{
                    backgroundColor: overrides.primary_color || activeTheme.colors.primary,
                    color: activeTheme.colors.primaryForeground,
                    borderRadius: getButtonRadiusClass((overrides.button_style as ThemeTemplate["buttonStyle"]) || activeTheme.buttonStyle),
                  }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
