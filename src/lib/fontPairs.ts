export interface FontPair {
  id: string;
  name: string;
  vibe: string;
  heading: string;
  body: string;
  googleFonts: string[]; // family names for Google Fonts loader
}

export const FONT_PAIRS: FontPair[] = [
  { id: "modern-sans",   name: "Modern Sans",   vibe: "Clean & versatile",   heading: "'Inter', sans-serif",          body: "'Inter', sans-serif",          googleFonts: ["Inter:wght@400;600;700"] },
  { id: "editorial",     name: "Editorial",     vibe: "Magazine elegance",   heading: "'Playfair Display', serif",    body: "'Inter', sans-serif",          googleFonts: ["Playfair+Display:wght@500;700", "Inter:wght@400;500"] },
  { id: "boutique",      name: "Boutique",      vibe: "Refined & feminine",  heading: "'Cormorant Garamond', serif",  body: "'Lato', sans-serif",           googleFonts: ["Cormorant+Garamond:wght@500;700", "Lato:wght@300;400"] },
  { id: "tech",          name: "Tech",          vibe: "Sharp & confident",   heading: "'Space Grotesk', sans-serif",  body: "'Inter', sans-serif",          googleFonts: ["Space+Grotesk:wght@500;700", "Inter:wght@400;500"] },
  { id: "warm-friendly", name: "Warm",          vibe: "Friendly & rounded",  heading: "'Quicksand', sans-serif",      body: "'Nunito', sans-serif",         googleFonts: ["Quicksand:wght@500;700", "Nunito:wght@400;500"] },
  { id: "luxe-serif",    name: "Luxe Serif",    vibe: "Timeless & premium",  heading: "'DM Serif Display', serif",    body: "'DM Sans', sans-serif",        googleFonts: ["DM+Serif+Display", "DM+Sans:wght@400;500"] },
  { id: "playful",       name: "Playful",       vibe: "Bold & expressive",   heading: "'Fraunces', serif",            body: "'Manrope', sans-serif",        googleFonts: ["Fraunces:wght@500;700", "Manrope:wght@400;500"] },
  { id: "minimal-mono",  name: "Minimal Mono",  vibe: "Editorial brutalism", heading: "'Space Mono', monospace",      body: "'IBM Plex Sans', sans-serif",  googleFonts: ["Space+Mono:wght@400;700", "IBM+Plex+Sans:wght@400;500"] },
];

export function getFontPair(headingFont?: string): FontPair {
  return FONT_PAIRS.find((p) => p.heading === headingFont) || FONT_PAIRS[0];
}

export function buildGoogleFontsUrl(pair: FontPair): string {
  const families = pair.googleFonts.map((f) => `family=${f}`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
