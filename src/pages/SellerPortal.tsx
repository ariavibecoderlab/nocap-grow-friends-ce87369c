import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import SellerPortalSidebar from "@/components/seller-portal/SellerPortalSidebar";
import GuideContent from "@/components/seller-portal/GuideContent";
import { journeys } from "@/components/seller-portal/sellerPortalData";

const STORAGE_KEY = "seller-portal-completed";
const ACTIVE_KEY = "seller-portal-active";

export default function SellerPortal() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeGuide, setActiveGuide] = useState(() => {
    const saved = localStorage.getItem(ACTIVE_KEY);
    return saved || journeys[0].guides[0].id;
  });

  const [completedGuides, setCompletedGuides] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedGuides));
  }, [completedGuides]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeGuide);
  }, [activeGuide]);

  const handleSelectGuide = useCallback((id: string) => {
    setActiveGuide(id);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleMarkComplete = useCallback((id: string) => {
    setCompletedGuides(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  }, []);

  const sidebarContent = (
    <SellerPortalSidebar
      activeGuide={activeGuide}
      onSelectGuide={handleSelectGuide}
      completedGuides={completedGuides}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    />
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center h-14 px-4 gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-bold text-lg text-secondary">Seller Portal</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline ml-1">— Knowledge Base for Merchants</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="w-72 border-r border-border shrink-0 bg-card/30">
            {sidebarContent}
          </aside>
        )}

        {/* Mobile sidebar sheet */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="p-0 w-80">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        )}

        {/* Main content */}
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-8">
            <GuideContent
              guideId={activeGuide}
              completedGuides={completedGuides}
              onMarkComplete={handleMarkComplete}
              onSelectGuide={handleSelectGuide}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
