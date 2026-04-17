// Starter templates for the storefront builder
// Each template provides a theme + a ready-to-go set of page blocks with sample copy

export interface BlockDefinition {
  id: string;
  type: string;
  title: string;
  content: string;
  imageUrl: string;
  settings: Record<string, any>;
  hidden?: boolean;
}

export interface StoreTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  themeId: string;
  thumbnail: string; // emoji or short label for preview
  accentColor?: string;
  blocks: Omit<BlockDefinition, "id">[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const STORE_TEMPLATES: StoreTemplate[] = [
  {
    id: "fashion",
    name: "Fashion Boutique",
    tagline: "Elegant, editorial layout",
    description: "Hero slideshow, lookbook collections, and storytelling.",
    themeId: "boutique",
    thumbnail: "👗",
    blocks: [
      {
        type: "hero_slideshow",
        title: "Spring Collection",
        content: JSON.stringify([
          { imageUrl: "", title: "New Season Drop", subtitle: "Crafted for everyday elegance", ctaText: "Shop New In", ctaUrl: "#store-all-products" },
          { imageUrl: "", title: "The Lookbook", subtitle: "Find your signature style", ctaText: "Explore", ctaUrl: "#store-all-products" },
        ]),
        imageUrl: "",
        settings: {},
      },
      {
        type: "featured_products",
        title: "Best Sellers",
        content: "",
        imageUrl: "",
        settings: { limit: "8" },
      },
      {
        type: "image_text",
        title: "Crafted with care",
        content: "Every piece is designed in-house and made from premium materials sourced from trusted partners.",
        imageUrl: "",
        settings: { layout: "image-left" },
      },
      {
        type: "cta_banner",
        title: "Members get 10% off",
        content: "Sign up to our list for early access to new arrivals.",
        imageUrl: "",
        settings: { cta_text: "Join the list", cta_url: "#" },
      },
      {
        type: "newsletter",
        title: "Stay in the loop",
        content: "Subscribe for exclusive offers and styling tips.",
        imageUrl: "",
        settings: {},
      },
    ],
  },
  {
    id: "fnb",
    name: "Restaurant / F&B",
    tagline: "Menu-forward & appetising",
    description: "Hero with mood image, featured dishes, story, and FAQ.",
    themeId: "classic",
    thumbnail: "🍜",
    blocks: [
      {
        type: "hero_banner",
        title: "Authentic flavours, made fresh daily",
        content: "Order ahead or visit us in store",
        imageUrl: "",
        settings: { cta_text: "Order Now", cta_url: "#store-all-products" },
      },
      {
        type: "featured_products",
        title: "Today's Specials",
        content: "",
        imageUrl: "",
        settings: { limit: "6" },
      },
      {
        type: "about",
        title: "Our Story",
        content: "We started with a simple goal: serve great food, made with love, using local ingredients. Years later, that's still our promise.",
        imageUrl: "",
        settings: {},
      },
      {
        type: "faq",
        title: "Frequently Asked",
        content: JSON.stringify([
          { q: "Do you deliver?", a: "Yes, we deliver across the city. Free delivery for orders over RM 50." },
          { q: "Are you halal certified?", a: "Yes, we are JAKIM certified." },
          { q: "Can I book a table?", a: "Reservations available via WhatsApp." },
        ]),
        imageUrl: "",
        settings: {},
      },
    ],
  },
  {
    id: "services",
    name: "Services / Bookings",
    tagline: "Clean & professional",
    description: "Service packages, testimonials, and clear CTA.",
    themeId: "minimal",
    thumbnail: "🛠️",
    blocks: [
      {
        type: "hero_banner",
        title: "Professional services you can trust",
        content: "Book a session in minutes",
        imageUrl: "",
        settings: { cta_text: "Browse Services", cta_url: "#store-all-products" },
      },
      {
        type: "featured_products",
        title: "Popular Packages",
        content: "",
        imageUrl: "",
        settings: { limit: "6" },
      },
      {
        type: "testimonials",
        title: "What clients say",
        content: "Reliable, friendly, and the results speak for themselves. Highly recommended.",
        imageUrl: "",
        settings: { author: "Aisha M." },
      },
      {
        type: "cta_banner",
        title: "Ready to get started?",
        content: "Book your first session today",
        imageUrl: "",
        settings: { cta_text: "Book Now", cta_url: "#store-all-products" },
      },
    ],
  },
  {
    id: "tech",
    name: "Electronics / Tech",
    tagline: "Bold, spec-focused",
    description: "Punchy hero, featured gadgets, comparison-friendly.",
    themeId: "modern",
    thumbnail: "📱",
    blocks: [
      {
        type: "hero_banner",
        title: "Next-gen tech, today",
        content: "Curated gadgets and accessories",
        imageUrl: "",
        settings: { cta_text: "Shop Now", cta_url: "#store-all-products" },
      },
      {
        type: "featured_products",
        title: "Trending Now",
        content: "",
        imageUrl: "",
        settings: { limit: "8" },
      },
      {
        type: "image_text",
        title: "Genuine warranty",
        content: "All our products come with manufacturer warranty and 7-day easy returns.",
        imageUrl: "",
        settings: { layout: "image-right" },
      },
      {
        type: "faq",
        title: "Buyer Questions",
        content: JSON.stringify([
          { q: "Do products come with warranty?", a: "Yes, all items have official manufacturer warranty." },
          { q: "What is your return policy?", a: "7-day easy returns, no questions asked." },
        ]),
        imageUrl: "",
        settings: {},
      },
    ],
  },
  {
    id: "minimal",
    name: "Minimal Portfolio",
    tagline: "Less is more",
    description: "Clean type, generous space, single focus.",
    themeId: "minimal",
    thumbnail: "◻️",
    blocks: [
      {
        type: "hero_banner",
        title: "Thoughtfully made.",
        content: "A small collection of objects we love.",
        imageUrl: "",
        settings: {},
      },
      {
        type: "featured_products",
        title: "Selected Works",
        content: "",
        imageUrl: "",
        settings: { limit: "6" },
      },
      {
        type: "text_block",
        title: "Studio Notes",
        content: "Designed in-house. Made in small batches. Built to last.",
        imageUrl: "",
        settings: {},
      },
    ],
  },
  {
    id: "bold",
    name: "Bold Promo",
    tagline: "High-energy & punchy",
    description: "Full-bleed hero, urgent CTAs, flash-sale ready.",
    themeId: "bold",
    thumbnail: "⚡",
    blocks: [
      {
        type: "hero_banner",
        title: "MEGA SALE — UP TO 70% OFF",
        content: "Limited time. Limited stock. Don't miss out.",
        imageUrl: "",
        settings: { cta_text: "Shop the Sale", cta_url: "#store-all-products" },
      },
      {
        type: "cta_banner",
        title: "Free shipping on orders over RM 100",
        content: "No code needed — applied at checkout.",
        imageUrl: "",
        settings: { cta_text: "Start Shopping", cta_url: "#store-all-products" },
      },
      {
        type: "featured_products",
        title: "Flash Deals",
        content: "",
        imageUrl: "",
        settings: { limit: "8" },
      },
      {
        type: "newsletter",
        title: "Be first to know",
        content: "Get notified about future drops & flash deals.",
        imageUrl: "",
        settings: {},
      },
    ],
  },
];

export function instantiateTemplate(template: StoreTemplate): BlockDefinition[] {
  return template.blocks.map((b) => ({ ...b, id: uid() }));
}

// ---------- Block Library (visual gallery) ----------

export interface BlockType {
  type: string;
  label: string;
  description: string;
  icon: string; // emoji
  category: "hero" | "products" | "content" | "marketing";
  defaults: () => Omit<BlockDefinition, "id">;
}

export const BLOCK_LIBRARY: BlockType[] = [
  {
    type: "hero_banner",
    label: "Hero Banner",
    description: "Single full-width hero with headline & CTA",
    icon: "🖼️",
    category: "hero",
    defaults: () => ({ type: "hero_banner", title: "Welcome to our store", content: "Discover our latest collection", imageUrl: "", settings: { cta_text: "Shop now", cta_url: "#store-all-products" } }),
  },
  {
    type: "hero_slideshow",
    label: "Hero Slideshow",
    description: "Rotating slides with multiple CTAs",
    icon: "🎞️",
    category: "hero",
    defaults: () => ({ type: "hero_slideshow", title: "Slideshow", content: JSON.stringify([{ imageUrl: "", title: "Slide 1", subtitle: "", ctaText: "Shop", ctaUrl: "#" }]), imageUrl: "", settings: {} }),
  },
  {
    type: "featured_products",
    label: "Featured Products",
    description: "Showcase your best items",
    icon: "⭐",
    category: "products",
    defaults: () => ({ type: "featured_products", title: "Featured Products", content: "", imageUrl: "", settings: { limit: "8" } }),
  },
  {
    type: "image_banner",
    label: "Image Banner",
    description: "Full-width promo image",
    icon: "🏞️",
    category: "marketing",
    defaults: () => ({ type: "image_banner", title: "Banner", content: "", imageUrl: "", settings: {} }),
  },
  {
    type: "image_text",
    label: "Image + Text",
    description: "Side-by-side image and copy",
    icon: "📰",
    category: "content",
    defaults: () => ({ type: "image_text", title: "Tell your story", content: "Add a paragraph that connects with your customers.", imageUrl: "", settings: { layout: "image-left" } }),
  },
  {
    type: "text_block",
    label: "Text Block",
    description: "Plain rich text content",
    icon: "📝",
    category: "content",
    defaults: () => ({ type: "text_block", title: "About this section", content: "Write something here…", imageUrl: "", settings: {} }),
  },
  {
    type: "about",
    label: "About Us",
    description: "Tell your store's story",
    icon: "ℹ️",
    category: "content",
    defaults: () => ({ type: "about", title: "Our Story", content: "We started with a simple idea…", imageUrl: "", settings: {} }),
  },
  {
    type: "testimonials",
    label: "Testimonial",
    description: "Quote from a happy customer",
    icon: "💬",
    category: "content",
    defaults: () => ({ type: "testimonials", title: "What customers say", content: "Best service I've experienced!", imageUrl: "", settings: { author: "Happy Customer" } }),
  },
  {
    type: "faq",
    label: "FAQ Accordion",
    description: "Answer common questions",
    icon: "❓",
    category: "content",
    defaults: () => ({ type: "faq", title: "FAQ", content: JSON.stringify([{ q: "Question 1?", a: "Answer 1" }]), imageUrl: "", settings: {} }),
  },
  {
    type: "newsletter",
    label: "Newsletter Signup",
    description: "Email capture form",
    icon: "✉️",
    category: "marketing",
    defaults: () => ({ type: "newsletter", title: "Stay in the loop", content: "Get updates on new arrivals & promos", imageUrl: "", settings: {} }),
  },
  {
    type: "cta_banner",
    label: "CTA Banner",
    description: "Promotional call-to-action",
    icon: "📣",
    category: "marketing",
    defaults: () => ({ type: "cta_banner", title: "Don't miss out", content: "Limited time offer", imageUrl: "", settings: { cta_text: "Shop Now", cta_url: "#" } }),
  },
  {
    type: "custom_html",
    label: "Custom HTML",
    description: "Advanced — paste raw HTML",
    icon: "</>",
    category: "content",
    defaults: () => ({ type: "custom_html", title: "Custom", content: "<div>Your HTML here</div>", imageUrl: "", settings: {} }),
  },
];

export function getBlockType(type: string): BlockType | undefined {
  return BLOCK_LIBRARY.find((b) => b.type === type);
}
