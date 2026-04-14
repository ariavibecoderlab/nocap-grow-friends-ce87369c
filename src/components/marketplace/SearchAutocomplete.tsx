import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, Store, X } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface AutocompleteResult {
  item_type: string;
  item_id: string;
  item_name: string;
  item_image: string | null;
  item_price: number | null;
  item_slug: string;
}

interface SearchAutocompleteProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function SearchAutocomplete({ search, onSearchChange }: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("autocomplete_marketplace", {
        search_term: term,
        max_results: 6,
      });
      if (!error && data) {
        setResults(data as AutocompleteResult[]);
      }
    } catch {
      // fallback silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(search), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = focused && search.length >= 2 && (results.length > 0 || loading);

  const handleSelect = (item: AutocompleteResult) => {
    setFocused(false);
    if (item.item_type === "store") {
      navigate(`/store/${item.item_slug}`);
    } else {
      navigate(`/store/${item.item_slug}/product/${item.item_id}`);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
      <Input
        placeholder="Search products & stores..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => setFocused(true)}
        className="pl-10 pr-8 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
      />
      {search && (
        <button
          onClick={() => onSearchChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-white/10 bg-primary shadow-xl overflow-hidden max-h-80 overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
            </div>
          ) : (
            <>
              {results.map((item) => (
                <button
                  key={`${item.item_type}-${item.item_id}`}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
                  onMouseDown={() => handleSelect(item)}
                >
                  <div className="h-8 w-8 shrink-0 rounded bg-white/5 overflow-hidden flex items-center justify-center">
                    {item.item_image ? (
                      <img
                        src={getOptimizedImageUrl(item.item_image.replace(/^"|"$/g, ""), 64, 64)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : item.item_type === "store" ? (
                      <Store className="h-4 w-4 text-white/20" />
                    ) : (
                      <ShoppingBag className="h-4 w-4 text-white/20" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white truncate">{item.item_name}</p>
                    <p className="text-[10px] text-white/40 capitalize">{item.item_type}</p>
                  </div>
                  {item.item_price != null && (
                    <p className="text-xs font-bold text-secondary shrink-0">
                      RM {item.item_price.toFixed(2)}
                    </p>
                  )}
                </button>
              ))}
              {search.length >= 2 && (
                <button
                  className="w-full px-3 py-2 text-xs text-secondary hover:bg-white/10 transition-colors text-center border-t border-white/5"
                  onMouseDown={() => {
                    setFocused(false);
                    // Let the parent handle filtering by search text
                  }}
                >
                  View all results for "{search}"
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
