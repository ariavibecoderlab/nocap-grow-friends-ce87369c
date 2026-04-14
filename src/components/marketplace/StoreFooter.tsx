import { Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MenuItem {
  id: string;
  label: string;
  url: string;
}

interface StoreFooterProps {
  storeName: string;
  description?: string | null;
  logoUrl?: string | null;
  footerMenus: MenuItem[];
}

export default function StoreFooter({ storeName, description, logoUrl, footerMenus }: StoreFooterProps) {
  const navigate = useNavigate();

  return (
    <footer
      className="mt-12 border-t pt-8 pb-6 px-4"
      style={{ borderColor: "var(--store-surface-border)" }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "var(--store-surface)" }}
                >
                  <Store className="h-4 w-4" style={{ color: "var(--store-accent)" }} />
                </div>
              )}
              <span className="font-semibold text-sm" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>
                {storeName}
              </span>
            </div>
            {description && (
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--store-text-muted)" }}>
                {description}
              </p>
            )}
          </div>

          {/* Quick Links */}
          {footerMenus.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold" style={{ color: "var(--store-text)" }}>Quick Links</h4>
              <div className="flex flex-col gap-1.5">
                {footerMenus.map(m => (
                  <button
                    key={m.id}
                    onClick={() => navigate(m.url)}
                    className="text-[11px] text-left hover:opacity-80 transition-colors"
                    style={{ color: "var(--store-text-muted)" }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Powered By */}
          <div className="flex items-end md:justify-end">
            <p className="text-[10px]" style={{ color: "var(--store-text-muted)", opacity: 0.5 }}>
              Powered by NoCap
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
