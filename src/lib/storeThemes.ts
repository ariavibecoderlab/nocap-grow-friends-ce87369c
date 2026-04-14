// Theme template definitions for marketplace stores

export interface ThemeTemplate {
  id: string;
  name: string;
  description: string;
  preview: {
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  colors: {
    background: string;
    surface: string;
    surfaceBorder: string;
    primary: string;
    primaryForeground: string;
    text: string;
    textMuted: string;
    accent: string;
  };
  borderRadius: string; // e.g. "0.75rem"
  buttonStyle: "rounded" | "pill" | "square" | "soft";
}

export const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Clean and professional with warm gold accents",
    preview: { bg: "#1A1A2E", card: "#242440", accent: "#FFC800", text: "#FFFFFF" },
    fonts: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    colors: {
      background: "#1A1A2E",
      surface: "rgba(255,255,255,0.05)",
      surfaceBorder: "rgba(255,255,255,0.1)",
      primary: "#FFC800",
      primaryForeground: "#1A1A2E",
      text: "#FFFFFF",
      textMuted: "rgba(255,255,255,0.5)",
      accent: "#FFC800",
    },
    borderRadius: "0.75rem",
    buttonStyle: "rounded",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Sleek gradients with electric blue highlights",
    preview: { bg: "#0F0F1A", card: "#1A1A30", accent: "#4F8CFF", text: "#E8ECF4" },
    fonts: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    colors: {
      background: "#0F0F1A",
      surface: "rgba(79,140,255,0.06)",
      surfaceBorder: "rgba(79,140,255,0.15)",
      primary: "#4F8CFF",
      primaryForeground: "#FFFFFF",
      text: "#E8ECF4",
      textMuted: "rgba(232,236,244,0.5)",
      accent: "#4F8CFF",
    },
    borderRadius: "1rem",
    buttonStyle: "pill",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Stripped-back monochrome with subtle warmth",
    preview: { bg: "#FAFAF8", card: "#FFFFFF", accent: "#2C2C2C", text: "#2C2C2C" },
    fonts: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    colors: {
      background: "#FAFAF8",
      surface: "#FFFFFF",
      surfaceBorder: "rgba(0,0,0,0.08)",
      primary: "#2C2C2C",
      primaryForeground: "#FFFFFF",
      text: "#2C2C2C",
      textMuted: "rgba(44,44,44,0.5)",
      accent: "#8B7355",
    },
    borderRadius: "0.5rem",
    buttonStyle: "soft",
  },
  {
    id: "bold",
    name: "Bold",
    description: "High-contrast with punchy red and dark base",
    preview: { bg: "#0D0D0D", card: "#1A1A1A", accent: "#FF3B30", text: "#FFFFFF" },
    fonts: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    colors: {
      background: "#0D0D0D",
      surface: "rgba(255,255,255,0.04)",
      surfaceBorder: "rgba(255,59,48,0.2)",
      primary: "#FF3B30",
      primaryForeground: "#FFFFFF",
      text: "#FFFFFF",
      textMuted: "rgba(255,255,255,0.45)",
      accent: "#FF3B30",
    },
    borderRadius: "0.25rem",
    buttonStyle: "square",
  },
  {
    id: "boutique",
    name: "Boutique",
    description: "Elegant warmth with champagne tones and soft curves",
    preview: { bg: "#1E1A15", card: "#2A2520", accent: "#D4A574", text: "#F5EDE4" },
    fonts: { heading: "'Playfair Display', serif", body: "'Inter', sans-serif" },
    colors: {
      background: "#1E1A15",
      surface: "rgba(212,165,116,0.06)",
      surfaceBorder: "rgba(212,165,116,0.15)",
      primary: "#D4A574",
      primaryForeground: "#1E1A15",
      text: "#F5EDE4",
      textMuted: "rgba(245,237,228,0.5)",
      accent: "#D4A574",
    },
    borderRadius: "1.25rem",
    buttonStyle: "pill",
  },
];

export function getThemeById(id: string): ThemeTemplate {
  return THEME_TEMPLATES.find(t => t.id === id) || THEME_TEMPLATES[0];
}

export interface ThemeOverrides {
  primary_color?: string;
  heading_font?: string;
  body_font?: string;
  border_radius?: string;
  button_style?: string;
}

export function resolveTheme(themeId: string, overrides?: ThemeOverrides): ThemeTemplate {
  const base = { ...getThemeById(themeId) };
  if (!overrides) return base;

  if (overrides.primary_color) {
    base.colors = {
      ...base.colors,
      primary: overrides.primary_color,
      accent: overrides.primary_color,
    };
  }
  if (overrides.heading_font) {
    base.fonts = { ...base.fonts, heading: overrides.heading_font };
  }
  if (overrides.body_font) {
    base.fonts = { ...base.fonts, body: overrides.body_font };
  }
  if (overrides.border_radius) {
    base.borderRadius = overrides.border_radius;
  }
  if (overrides.button_style) {
    base.buttonStyle = overrides.button_style as ThemeTemplate["buttonStyle"];
  }
  return base;
}

export function getButtonRadiusClass(style: ThemeTemplate["buttonStyle"]): string {
  switch (style) {
    case "pill": return "9999px";
    case "square": return "0px";
    case "soft": return "0.375rem";
    default: return "0.5rem";
  }
}

export function themeToCSS(theme: ThemeTemplate): Record<string, string> {
  return {
    "--store-bg": theme.colors.background,
    "--store-surface": theme.colors.surface,
    "--store-surface-border": theme.colors.surfaceBorder,
    "--store-primary": theme.colors.primary,
    "--store-primary-fg": theme.colors.primaryForeground,
    "--store-text": theme.colors.text,
    "--store-text-muted": theme.colors.textMuted,
    "--store-accent": theme.colors.accent,
    "--store-radius": theme.borderRadius,
    "--store-btn-radius": getButtonRadiusClass(theme.buttonStyle),
    "--store-font-heading": theme.fonts.heading,
    "--store-font-body": theme.fonts.body,
  };
}
