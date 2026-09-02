import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

export interface BenefitSlide {
  eyebrow: string;
  title: string;
  description: string;
  accentWords?: string[];
}

interface AuthBenefitCarouselProps {
  eyebrow: string;
  slides: BenefitSlide[];
  accentColor: string;
}

function renderAccentedText(text: string, accentWords?: string[]) {
  if (!accentWords?.length) return text;

  const escapedWords = accentWords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(\\b(?:${escapedWords.join("|")})\\b)`, "gi");
  const words = new Set(accentWords.map((word) => word.toLowerCase()));

  return text.split(matcher).map((part, index) =>
    words.has(part.toLowerCase()) ? (
      <span key={`${part}-${index}`} className="market-auth-story-highlight">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function AuthBenefitCarousel({
  eyebrow,
  slides,
  accentColor,
}: AuthBenefitCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <section
      className="market-auth-story"
      aria-label={`${eyebrow} benefits`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="market-auth-story-kicker">
        <span style={{ backgroundColor: accentColor }} />
        {eyebrow}
      </div>

      <div className="market-auth-story-stage" aria-live="polite">
        {slides.map((slide, index) => (
          <article
            key={slide.title}
            className={`market-auth-story-slide ${index === activeIndex ? "is-active" : ""}`}
            aria-hidden={index !== activeIndex}
          >
            <p className="market-auth-story-eyebrow" style={{ color: accentColor }}>
              {slide.eyebrow}
            </p>
            <h2 className="market-auth-story-title">
              {slide.title.split("\n").map((line, lineIndex) => (
                <span key={line}>
                  {renderAccentedText(line, slide.accentWords)}
                  {lineIndex < slide.title.split("\n").length - 1 && <br />}
                </span>
              ))}
            </h2>
            <p className="market-auth-story-description">
              {renderAccentedText(slide.description, slide.accentWords)}
            </p>
          </article>
        ))}
      </div>

      <div className="market-auth-story-controls">
        <div className="market-auth-story-arrows">
          <button type="button" onClick={() => move(-1)} aria-label="Previous benefit">
            <ChevronLeft />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Next benefit">
            <ChevronRight />
          </button>
        </div>
        <div className="market-auth-story-progress">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show benefit ${index + 1}`}
              aria-current={index === activeIndex}
              style={index === activeIndex ? { backgroundColor: accentColor } : undefined}
            />
          ))}
        </div>
        <span className="market-auth-story-count">
          {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
        <ArrowUpRight className="market-auth-story-mark" style={{ color: accentColor }} />
      </div>
    </section>
  );
}