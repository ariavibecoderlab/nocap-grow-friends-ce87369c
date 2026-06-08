import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, X } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface AutocompleteSuggestion {
  id: string;
  name: string;
  price: number | null;
  cover_image: string | null;
  store_name: string | null;
  store_slug: string | null;
}

interface SearchBarProps {
  defaultValue?: string;
  onSearch: (q: string) => void;
  autoFocus?: boolean;
}

export default function SearchBar({
  defaultValue = "",
  onSearch,
  autoFocus = false,
}: SearchBarProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync defaultValue when it changes (e.g. navigating back with different query)
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const { data, error } = await (supabase as any).rpc("autocomplete_products", {
        p_query: term,
        p_limit: 8,
      });
      if (!error && data) {
        setSuggestions(data as AutocompleteSuggestion[]);
      }
    } catch {
      // fail silently
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setFocused(false);
    onSearch(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleSuggestionClick = (s: AutocompleteSuggestion) => {
    setFocused(false);
    navigate(`/marketplace/search?q=${encodeURIComponent(s.name)}`);
  };

  const showDropdown =
    focused &&
    value.length >= 2 &&
    (suggestions.length > 0 || loadingSuggestions);

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none z-10" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search products..."
        autoFocus={autoFocus}
        className="pl-9 pr-16 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
      />
      <div className="absolute right-0 top-0 h-full flex items-center gap-0.5 pr-1">
        {value && (
          <button
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            className="p-1 text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleSubmit}
          className="h-7 px-2 rounded text-[11px] font-semibold bg-secondary text-primary hover:bg-secondary/90 transition-colors"
        >
          Go
        </button>
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-white/10 bg-primary shadow-xl overflow-hidden max-h-80 overflow-y-auto">
          {loadingSuggestions && suggestions.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
            </div>
          ) : (
            <>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
                  onMouseDown={() => handleSuggestionClick(s)}
                >
                  <div className="h-8 w-8 shrink-0 rounded bg-white/5 overflow-hidden flex items-center justify-center">
                    {s.cover_image ? (
                      <img
                        src={getOptimizedImageUrl(s.cover_image, 64, 64)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="h-4 w-4 text-white/20" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white truncate">{s.name}</p>
                    {s.store_name && (
                      <p className="text-[10px] text-white/40 truncate">
                        {s.store_name}
                      </p>
                    )}
                  </div>
                  {s.price != null && (
                    <p className="text-xs font-bold text-secondary shrink-0">
                      RM {s.price.toFixed(2)}
                    </p>
                  )}
                </button>
              ))}
              {value.length >= 2 && (
                <button
                  className="w-full px-3 py-2 text-xs text-secondary hover:bg-white/10 transition-colors text-center border-t border-white/5"
                  onMouseDown={handleSubmit}
                >
                  Search all results for "{value}"
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
