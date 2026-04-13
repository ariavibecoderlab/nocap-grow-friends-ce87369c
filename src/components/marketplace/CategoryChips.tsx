import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryChipsProps {
  categories: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
}

export default function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (categories.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -120 : 120, behavior: "smooth" });
  };

  return (
    <div className="relative mb-3">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-primary/90 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shadow-md"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-7"
      >
        <button
          onClick={() => onSelect("all")}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selected === "all"
              ? "bg-secondary text-primary"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              selected === c.id
                ? "bg-secondary text-primary"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-primary/90 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shadow-md"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
