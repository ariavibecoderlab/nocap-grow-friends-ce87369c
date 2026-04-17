import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useBuilderState } from "@/hooks/useBuilderState";
import BuilderToolbar, { Viewport } from "@/components/merchant/storefront-builder/BuilderToolbar";
import SectionsPanel from "@/components/merchant/storefront-builder/SectionsPanel";
import BlockPropertiesPanel from "@/components/merchant/storefront-builder/BlockPropertiesPanel";
import LivePreviewFrame from "@/components/merchant/storefront-builder/LivePreviewFrame";
import BlockGalleryDialog from "@/components/merchant/storefront-builder/BlockGalleryDialog";
import TemplatePickerDialog from "@/components/merchant/storefront-builder/TemplatePickerDialog";
import ThemeCustomizerPanel from "@/components/merchant/storefront-builder/ThemeCustomizerPanel";
import { Loader2, PanelLeft, Eye, Layers, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MerchantStorefrontBuilder() {
  const { storeId: storeIdParam } = useParams<{ storeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [storeId, setStoreId] = useState<string | null>(storeIdParam || null);
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [storeReady, setStoreReady] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [showBlockGallery, setShowBlockGallery] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [forceTemplates, setForceTemplates] = useState(false);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

  // Resolve store: use param OR find first store owned by user
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    (async () => {
      let id = storeIdParam;
      if (!id) {
        const { data } = await supabase
          .from("marketplace_stores")
          .select("id, store_name, slug, page_layout, draft_layout")
          .eq("merchant_user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (!data) {
          toast({ title: "No store found", description: "Create a store first from the merchant dashboard.", variant: "destructive" });
          navigate("/merchant");
          return;
        }
        id = data.id;
        setStoreName(data.store_name);
        setStoreSlug(data.slug);
        setStoreId(id);
        // Detect first-time builder use → show templates picker
        const hasContent = (data.page_layout && Array.isArray(data.page_layout) && data.page_layout.length > 0) ||
                          (data.draft_layout && Array.isArray(data.draft_layout) && data.draft_layout.length > 0);
        if (!hasContent && !searchParams.get("skip_templates")) {
          setForceTemplates(true);
          setShowTemplates(true);
        }
      } else {
        const { data } = await supabase
          .from("marketplace_stores")
          .select("store_name, slug, merchant_user_id, page_layout, draft_layout")
          .eq("id", id)
          .maybeSingle();
        if (!data || data.merchant_user_id !== user.id) {
          toast({ title: "Access denied", variant: "destructive" });
          navigate("/merchant");
          return;
        }
        setStoreName(data.store_name);
        setStoreSlug(data.slug);
        const hasContent = (data.page_layout && Array.isArray(data.page_layout) && data.page_layout.length > 0) ||
                          (data.draft_layout && Array.isArray(data.draft_layout) && data.draft_layout.length > 0);
        if (!hasContent && !searchParams.get("skip_templates")) {
          setForceTemplates(true);
          setShowTemplates(true);
        }
      }
      setStoreReady(true);
    })();
  }, [user, authLoading, storeIdParam, navigate, toast, searchParams]);

  if (authLoading || !storeReady || !storeId) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return <BuilderInner
    storeId={storeId}
    storeName={storeName}
    storeSlug={storeSlug}
    viewport={viewport}
    setViewport={setViewport}
    showBlockGallery={showBlockGallery}
    setShowBlockGallery={setShowBlockGallery}
    showTemplates={showTemplates}
    setShowTemplates={setShowTemplates}
    forceTemplates={forceTemplates}
    setForceTemplates={setForceTemplates}
    mobileTab={mobileTab}
    setMobileTab={setMobileTab}
  />;
}

function BuilderInner({
  storeId, storeName, storeSlug, viewport, setViewport,
  showBlockGallery, setShowBlockGallery, showTemplates, setShowTemplates,
  forceTemplates, setForceTemplates, mobileTab, setMobileTab,
}: {
  storeId: string; storeName: string; storeSlug: string;
  viewport: Viewport; setViewport: (v: Viewport) => void;
  showBlockGallery: boolean; setShowBlockGallery: (v: boolean) => void;
  showTemplates: boolean; setShowTemplates: (v: boolean) => void;
  forceTemplates: boolean; setForceTemplates: (v: boolean) => void;
  mobileTab: "editor" | "preview"; setMobileTab: (v: "editor" | "preview") => void;
}) {
  const { toast } = useToast();
  const builder = useBuilderState({ storeId });
  const [editorTab, setEditorTab] = useState<"sections" | "theme">("sections");

  if (builder.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  const selected = builder.blocks.find((b) => b.id === builder.selectedId) || null;

  return (
    <div className="h-screen flex flex-col bg-primary">
      <BuilderToolbar
        storeName={storeName}
        storeSlug={storeSlug}
        viewport={viewport}
        onViewportChange={setViewport}
        onUndo={builder.undo}
        onRedo={builder.redo}
        canUndo={builder.canUndo}
        canRedo={builder.canRedo}
        onSaveDraft={async () => {
          const ok = await builder.saveDraft();
          toast({ title: ok ? "Draft saved" : "Save failed", variant: ok ? "default" : "destructive" });
        }}
        onPublish={async () => {
          const ok = await builder.publish();
          toast({ title: ok ? "Published! 🎉" : "Publish failed", description: ok ? "Your changes are now live." : undefined, variant: ok ? "default" : "destructive" });
        }}
        onOpenTemplates={() => { setForceTemplates(false); setShowTemplates(true); }}
        saving={builder.saving}
        publishing={builder.publishing}
        isDirty={builder.isDirty}
        hasUnpublished={builder.hasUnpublished}
        lastSavedAt={builder.lastSavedAt}
      />

      {/* Mobile tab switcher */}
      <div className="lg:hidden flex border-b border-white/10 bg-primary">
        <button
          onClick={() => setMobileTab("editor")}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 ${mobileTab === "editor" ? "text-white border-b-2 border-secondary" : "text-white/40"}`}
        >
          <PanelLeft className="h-3.5 w-3.5" /> Editor
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 ${mobileTab === "preview" ? "text-white border-b-2 border-secondary" : "text-white/40"}`}
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        <div className={`${mobileTab === "editor" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-[380px] border-r border-white/10 bg-primary/50`}>
          {/* Tab switcher: Sections | Theme */}
          <div className="flex border-b border-white/10 shrink-0">
            <button
              onClick={() => setEditorTab("sections")}
              className={`flex-1 py-2 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${editorTab === "sections" ? "text-white border-b-2 border-secondary bg-white/[0.02]" : "text-white/40 hover:text-white/70"}`}
            >
              <Layers className="h-3.5 w-3.5" /> Sections
            </button>
            <button
              onClick={() => setEditorTab("theme")}
              className={`flex-1 py-2 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${editorTab === "theme" ? "text-white border-b-2 border-secondary bg-white/[0.02]" : "text-white/40 hover:text-white/70"}`}
            >
              <Palette className="h-3.5 w-3.5" /> Theme
            </button>
          </div>

          {editorTab === "sections" ? (
            <div className="flex-1 min-h-0 grid grid-rows-2">
              <div className="border-b border-white/10 overflow-hidden">
                <SectionsPanel
                  blocks={builder.blocks}
                  selectedId={builder.selectedId}
                  onSelect={builder.setSelectedId}
                  onReorder={builder.reorderBlocks}
                  onDuplicate={builder.duplicateBlock}
                  onDelete={builder.removeBlock}
                  onToggleHidden={builder.toggleHidden}
                  onAddBlock={() => setShowBlockGallery(true)}
                />
              </div>
              <div className="overflow-hidden">
                <BlockPropertiesPanel
                  block={selected}
                  storeId={storeId}
                  onUpdate={(patch) => selected && builder.updateBlock(selected.id, patch)}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <ThemeCustomizerPanel
                storeId={storeId}
                theme={builder.theme}
                onChange={builder.setTheme}
              />
            </div>
          )}
        </div>

        {/* Preview pane */}
        <div className={`${mobileTab === "preview" ? "flex" : "hidden"} lg:flex flex-1 min-w-0`}>
          <LivePreviewFrame
            storeSlug={storeSlug}
            storeId={storeId}
            blocks={builder.blocks}
            theme={builder.theme}
            viewport={viewport}
          />
        </div>
      </div>

      <BlockGalleryDialog
        open={showBlockGallery}
        onClose={() => setShowBlockGallery(false)}
        onPick={(b) => builder.addBlock(b)}
      />

      <TemplatePickerDialog
        open={showTemplates}
        forceOpen={forceTemplates}
        onClose={() => { setShowTemplates(false); setForceTemplates(false); }}
        onApply={(blocks, themeId) => {
          builder.setBlocks(blocks);
          builder.setTheme({ themeId, overrides: {} });
          toast({ title: "Template applied", description: "Customize each section, then publish when ready." });
        }}
      />
    </div>
  );
}
