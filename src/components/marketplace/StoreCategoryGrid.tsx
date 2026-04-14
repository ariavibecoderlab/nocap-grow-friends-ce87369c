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
      <h2 className="text-base font-bold" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>
        Shop by Category
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button
          onClick={() => onSelect("all")}
          className="group relative h-28 md:h-32 overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg"
          style={{
            borderRadius: "var(--store-radius)",
            border: selectedCat === "all" ? `2px solid ${accentColor}` : "1px solid var(--store-surface-border)",
            backgroundColor: "var(--store-surface)",
          }}
        >
          <div
            className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-100 opacity-80"
            style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)` }}
          />
          <span
            className="relative z-10 flex h-full items-center justify-center text-sm font-bold tracking-wide"
            style={{ color: selectedCat === "all" ? accentColor : "var(--store-text)" }}
          >
            All Products
          </span>
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="group relative h-28 md:h-32 overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg"
            style={{
              borderRadius: "var(--store-radius)",
              border: selectedCat === cat.id ? `2px solid ${accentColor}` : "1px solid var(--store-surface-border)",
            }}
          >
            {cat.image_url ? (
              <img
                src={cat.image_url}
                alt={cat.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <span className="relative z-10 flex h-full items-end justify-start p-3 text-sm font-bold text-white drop-shadow-md">
              {cat.name}
            </span>
            {selectedCat === cat.id && (
              <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
