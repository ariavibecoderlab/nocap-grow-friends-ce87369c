import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  imageUrl: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
}

interface StoreHeroCarouselProps {
  bannerUrl?: string | null;
  slides?: Slide[];
  accentColor?: string;
}

export default function StoreHeroCarousel({ bannerUrl, slides = [], accentColor = "#FFC800" }: StoreHeroCarouselProps) {
  // Build effective slides: use provided slides, or fallback to single banner
  const effectiveSlides: Slide[] = slides.length > 0
    ? slides
    : bannerUrl
      ? [{ imageUrl: bannerUrl, title: "" }]
      : [{ imageUrl: "", title: "" }];

  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const count = effectiveSlides.length;

  const next = useCallback(() => setCurrent(i => (i + 1) % count), [count]);
  const prev = useCallback(() => setCurrent(i => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (count <= 1 || isHovered) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [count, next, isHovered]);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(240px, 40vw, 420px)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {effectiveSlides.map((slide, idx) => (
          <div key={idx} className="relative h-full w-full flex-shrink-0">
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={slide.title || `Slide ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(135deg, ${accentColor}44, ${accentColor}11)` }}
              />
            )}
            {/* Overlay */}
            {(slide.title || slide.subtitle || slide.ctaText) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col items-center justify-end pb-12 md:pb-16 px-6 text-center">
                {slide.title && (
                  <h2
                    className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg mb-2"
                    style={{ fontFamily: "var(--store-font-heading)" }}
                  >
                    {slide.title}
                  </h2>
                )}
                {slide.subtitle && (
                  <p className="text-sm md:text-base text-white/80 max-w-xl mb-4">{slide.subtitle}</p>
                )}
                {slide.ctaText && (
                  <a
                    href={slide.ctaUrl || "#"}
                    className="px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105 shadow-lg"
                    style={{
                      backgroundColor: accentColor,
                      color: "var(--store-primary-fg, #000)",
                      borderRadius: "var(--store-btn-radius, 0.5rem)",
                    }}
                  >
                    {slide.ctaText}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Arrows */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 backdrop-blur-sm transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 backdrop-blur-sm transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {count > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {effectiveSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: idx === current ? "1.5rem" : "0.5rem",
                backgroundColor: idx === current ? accentColor : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
