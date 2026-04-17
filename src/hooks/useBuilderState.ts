import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BlockDefinition } from "@/lib/storeTemplates";
import { ThemeOverrides } from "@/lib/storeThemes";
import { Json } from "@/integrations/supabase/types";

const HISTORY_LIMIT = 50;
const AUTOSAVE_DEBOUNCE_MS = 1500;

export interface BuilderTheme {
  themeId: string;
  overrides: ThemeOverrides;
}

interface BuilderSnapshot {
  blocks: BlockDefinition[];
  theme: BuilderTheme;
}

interface UseBuilderStateOpts {
  storeId: string;
}

export function useBuilderState({ storeId }: UseBuilderStateOpts) {
  const [blocks, setBlocksRaw] = useState<BlockDefinition[]>([]);
  const [theme, setThemeRaw] = useState<BuilderTheme>({ themeId: "classic", overrides: {} });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const past = useRef<BuilderSnapshot[]>([]);
  const future = useRef<BuilderSnapshot[]>([]);
  const isApplyingHistory = useRef(false);
  const autosaveTimer = useRef<number | null>(null);
  const initialised = useRef(false);

  // ---------- Load ----------
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("marketplace_stores")
        .select("draft_layout, draft_theme, page_layout, theme, settings, draft_updated_at, published_at")
        .eq("id", storeId)
        .maybeSingle();
      if (cancel || !data) { setLoading(false); return; }

      const draft = (data.draft_layout && Array.isArray(data.draft_layout) && data.draft_layout.length > 0
        ? data.draft_layout
        : data.page_layout) as unknown as BlockDefinition[] | null;

      const draftTheme = data.draft_theme as { themeId?: string; overrides?: ThemeOverrides } | null;
      const settings = (data.settings || {}) as any;
      const themeOverrides = (settings.theme_overrides || {}) as ThemeOverrides;

      setBlocksRaw(Array.isArray(draft) ? draft : []);
      setThemeRaw({
        themeId: draftTheme?.themeId || data.theme || "classic",
        overrides: draftTheme?.overrides || themeOverrides,
      });
      setHasUnpublished(
        !!data.draft_updated_at &&
        (!data.published_at || new Date(data.draft_updated_at) > new Date(data.published_at))
      );
      setLoading(false);
      initialised.current = true;
    })();
    return () => { cancel = true; };
  }, [storeId]);

  // ---------- History helpers ----------
  const pushHistory = useCallback((snap: BuilderSnapshot) => {
    past.current.push(snap);
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
  }, []);

  const setBlocks = useCallback((updater: BlockDefinition[] | ((b: BlockDefinition[]) => BlockDefinition[])) => {
    setBlocksRaw((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      if (!isApplyingHistory.current) {
        pushHistory({ blocks: prev, theme });
        setIsDirty(true);
      }
      return next;
    });
  }, [theme, pushHistory]);

  const setTheme = useCallback((updater: BuilderTheme | ((t: BuilderTheme) => BuilderTheme)) => {
    setThemeRaw((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      if (!isApplyingHistory.current) {
        pushHistory({ blocks, theme: prev });
        setIsDirty(true);
      }
      return next;
    });
  }, [blocks, pushHistory]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ blocks, theme });
    isApplyingHistory.current = true;
    setBlocksRaw(prev.blocks);
    setThemeRaw(prev.theme);
    setIsDirty(true);
    setTimeout(() => { isApplyingHistory.current = false; }, 0);
  }, [blocks, theme]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ blocks, theme });
    isApplyingHistory.current = true;
    setBlocksRaw(next.blocks);
    setThemeRaw(next.theme);
    setIsDirty(true);
    setTimeout(() => { isApplyingHistory.current = false; }, 0);
  }, [blocks, theme]);

  // ---------- Block ops ----------
  const addBlock = useCallback((block: BlockDefinition, index?: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      if (index === undefined) next.push(block);
      else next.splice(index, 0, block);
      return next;
    });
    setSelectedId(block.id);
  }, [setBlocks]);

  const updateBlock = useCallback((id: string, patch: Partial<BlockDefinition>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, [setBlocks]);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, [setBlocks]);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      if (i === -1) return prev;
      const copy = { ...prev[i], id: Math.random().toString(36).slice(2, 10) };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
  }, [setBlocks]);

  const toggleHidden = useCallback((id: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b)));
  }, [setBlocks]);

  const reorderBlocks = useCallback((from: number, to: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  }, [setBlocks]);

  // ---------- Persistence ----------
  const saveDraft = useCallback(async (silent = false) => {
    if (!silent) setSaving(true);
    const { error } = await supabase
      .from("marketplace_stores")
      .update({
        draft_layout: blocks as unknown as Json,
        draft_theme: theme as unknown as Json,
        draft_updated_at: new Date().toISOString(),
      })
      .eq("id", storeId);
    if (!error) {
      setIsDirty(false);
      setHasUnpublished(true);
      setLastSavedAt(new Date());
    }
    if (!silent) setSaving(false);
    return !error;
  }, [blocks, theme, storeId]);

  const publish = useCallback(async () => {
    setPublishing(true);
    // Save current draft first then promote
    const settingsPatch: any = { theme_overrides: theme.overrides };
    const { error } = await supabase
      .from("marketplace_stores")
      .update({
        page_layout: blocks as unknown as Json,
        draft_layout: blocks as unknown as Json,
        draft_theme: theme as unknown as Json,
        theme: theme.themeId,
        settings: settingsPatch as unknown as Json,
        draft_updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .eq("id", storeId);
    setPublishing(false);
    if (!error) {
      setIsDirty(false);
      setHasUnpublished(false);
      setLastSavedAt(new Date());
    }
    return !error;
  }, [blocks, theme, storeId]);

  // ---------- Autosave ----------
  useEffect(() => {
    if (!initialised.current || !isDirty) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => { saveDraft(true); }, AUTOSAVE_DEBOUNCE_MS);
    return () => { if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current); };
  }, [blocks, theme, isDirty, saveDraft]);

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
      else if (e.key === "s") { e.preventDefault(); saveDraft(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, saveDraft]);

  return {
    blocks, theme, selectedId, loading, isDirty, saving, publishing, hasUnpublished, lastSavedAt,
    setSelectedId, setBlocks, setTheme,
    addBlock, updateBlock, removeBlock, duplicateBlock, toggleHidden, reorderBlocks,
    undo, redo, saveDraft, publish,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
