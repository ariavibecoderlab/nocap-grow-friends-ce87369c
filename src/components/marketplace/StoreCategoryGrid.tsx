interface CategoryItem {
  id: string;
  name: string;
  image_url?: string | null;
}

interface StoreCategoryGridProps {
  categories: CategoryItem[];
  selectedCat: string;
  onSelect: (id: string) => void;
  accentColor?: string;
}

export default function StoreCategoryGrid({ categories, selectedCat, onSelect, accentColor = "#FFC800" }: StoreCategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>
        Shop by Category
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button
          onClick={() => onSelect("all")}
          className="relative h-24 md:h-28 overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            borderRadius: "var(--store-radius)",
            border: selectedCat === "all" ? `2px solid ${accentColor}` : "1px solid var(--store-surface-border)",
            backgroundColor: "var(--store-surface)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)` }}
          />
          <span
            className="relative z-10 flex h-full items-center justify-center text-sm font-semibold"
            style={{ color: "var(--store-text)" }}
          >
            All Products
          </span>
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="relative h-24 md:h-28 overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              borderRadius: "var(--store-radius)",
              border: selectedCat === cat.id ? `2px solid ${accentColor}` : "1px solid var(--store-surface-border)",
            }}
          >
            {cat.image_url ? (
              <img src={cat.image_url} alt={cat.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)` }}
              />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <span className="relative z-10 flex h-full items-center justify-center text-sm font-semibold text-white drop-shadow-md px-2 text-center">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
