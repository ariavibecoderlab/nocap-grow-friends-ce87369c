import { useState, useEffect } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CartDrawer from "./CartDrawer";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface StoreStickyHeaderProps {
  storeName: string;
  logoUrl?: string | null;
  onSearchToggle: () => void;
}

export default function StoreStickyHeader({ storeName, logoUrl, onSearchToggle }: StoreStickyHeaderProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 280);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = () => {
    onSearchToggle();
    // Scroll to search area
    setTimeout(() => {
      const el = document.getElementById("store-all-products");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      }`}
      style={{
        backgroundColor: "color-mix(in srgb, var(--store-bg, hsl(var(--primary))) 85%, transparent)",
        borderBottom: "1px solid var(--store-surface-border)",
        backdropFilter: "blur(16px) saturate(1.5)",
        WebkitBackdropFilter: "blur(16px) saturate(1.5)",
      }}
    >
      <div className="mx-auto max-w-4xl flex items-center gap-3 px-4 h-14">
        <button onClick={() => navigate("/marketplace")} className="shrink-0 rounded-full p-1.5 hover:opacity-80 transition-opacity">
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--store-text)" }} />
        </button>
        {logoUrl && (
          <img
            src={getOptimizedImageUrl(logoUrl, 64, 64)}
            alt={storeName}
            className="h-8 w-8 rounded-lg object-cover shrink-0 shadow-sm"
          />
        )}
        <span
          className="font-semibold text-sm truncate flex-1"
          style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}
        >
          {storeName}
        </span>
        <button onClick={handleSearch} className="p-2 rounded-full hover:opacity-80 transition-opacity">
          <Search className="h-4 w-4" style={{ color: "var(--store-text-muted)" }} />
        </button>
        <CartDrawer />
      </div>
    </div>
  );
}
