import { useState, useEffect, useCallback, useRef } from "react";
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
  const effectiveSlides: Slide[] = slides.length > 0
    ? slides
    : bannerUrl
      ? [{ imageUrl: bannerUrl, title: "" }]
      : [{ imageUrl: "", title: "" }];

  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [textVisible, setTextVisible] = useState(true);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const count = effectiveSlides.length;

  const next = useCallback(() => {
    setTextVisible(false);
    setTimeout(() => {
      setCurrent(i => (i + 1) % count);
      setTextVisible(true);
    }, 150);
  }, [count]);

  const prev = useCallback(() => {
    setTextVisible(false);
    setTimeout(() => {
      setCurrent(i => (i - 1 + count) % count);
      setTextVisible(true);
    }, 150);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || isHovered) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [count, next, isHovered]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(260px, 42vw, 450px)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {effectiveSlides.map((slide, idx) => (
          <div key={idx} className="relative h-full w-full flex-shrink-0">
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={slide.title || `Slide ${idx + 1}`}
                className="h-full w-full object-cover"
                style={{ transition: "transform 8s ease-out", transform: idx === current ? "scale(1.05)" : "scale(1)" }}
              />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(135deg, ${accentColor}44, ${accentColor}11)` }}
              />
            )}
            {/* Gradient overlay — always show */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
            {/* Text overlay */}
            {(slide.title || slide.subtitle || slide.ctaText) && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-end pb-14 md:pb-20 px-6 text-center transition-all duration-500"
                style={{ opacity: idx === current && textVisible ? 1 : 0, transform: idx === current && textVisible ? "translateY(0)" : "translateY(12px)" }}
              >
                {slide.title && (
                  <h2
                    className="text-2xl md:text-5xl font-bold text-white drop-shadow-lg mb-2 tracking-tight"
                    style={{ fontFamily: "var(--store-font-heading)" }}
                  >
                    {slide.title}
                  </h2>
                )}
                {slide.subtitle && (
                  <p className="text-sm md:text-lg text-white/80 max-w-xl mb-5 font-light">{slide.subtitle}</p>
                )}
                {slide.ctaText && (
                  <a
                    href={slide.ctaUrl || "#"}
                    className="px-7 py-3 text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg"
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

      {/* Arrows — desktop only */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white/80 hover:bg-black/50 backdrop-blur-md transition-all hidden md:flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white/80 hover:bg-black/50 backdrop-blur-md transition-all hidden md:flex items-center justify-center"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {count > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {effectiveSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTextVisible(false);
                setTimeout(() => { setCurrent(idx); setTextVisible(true); }, 150);
              }}
              className="h-2.5 rounded-full transition-all duration-400 shadow-sm"
              style={{
                width: idx === current ? "2rem" : "0.625rem",
                backgroundColor: idx === current ? accentColor : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
