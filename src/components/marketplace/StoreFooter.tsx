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
      className="mt-16 border-t pt-10 pb-8 px-4"
      style={{ borderColor: "var(--store-surface-border)" }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-10 w-10 rounded-xl object-cover shadow-sm" />
              ) : (
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "var(--store-surface)" }}
                >
                  <Store className="h-5 w-5" style={{ color: "var(--store-accent)" }} />
                </div>
              )}
              <span className="font-bold text-sm" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>
                {storeName}
              </span>
            </div>
            {description && (
              <p className="text-[11px] leading-relaxed max-w-xs" style={{ color: "var(--store-text-muted)" }}>
                {description}
              </p>
            )}
          </div>

          {/* Quick Links */}
          {footerMenus.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--store-text-muted)" }}>Quick Links</h4>
              <div className="flex flex-col gap-2">
                {footerMenus.map(m => (
                  <button
                    key={m.id}
                    onClick={() => navigate(m.url)}
                    className="text-xs text-left hover:opacity-80 transition-colors"
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
            <div className="text-center md:text-right">
              <p className="text-[10px] mb-1" style={{ color: "var(--store-text-muted)", opacity: 0.4 }}>
                Powered by
              </p>
              <p className="text-xs font-bold" style={{ color: "var(--store-text-muted)", opacity: 0.5 }}>
                NoCap
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
