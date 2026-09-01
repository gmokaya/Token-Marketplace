import { Check } from "lucide-react";
import type { PointerEvent } from "react";
import "./TokenHarvestHero.css";

export type ProductionHeroContent = {
  badge: string;
  headline: string;
  subheadline: string;
  cta1: string;
  cta2: string;
};

type TokenHarvestHeroProps = {
  hero: ProductionHeroContent;
  image?: string;
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const heroAsset = (name: string) => `${BASE}/hero/${name}`;
const withoutDashes = (value: string) => value.replace(/[—–]/g, "").replace(/\s{2,}/g, " ").trim();

const commodities = [
  { name: "green-coffee", src: heroAsset("tokenharvest-green-cherries.png"), alt: "Fresh green coffee cherries on a branch" },
  { name: "red-cherries", src: heroAsset("tokenharvest-red-cherries.png"), alt: "Ripe red coffee cherries on a branch" },
  { name: "tea", src: heroAsset("tokenharvest-tea.png"), alt: "Fresh tea leaves" },
  { name: "grain", src: heroAsset("tokenharvest-grain.png"), alt: "Golden grain stalks" },
  { name: "nuts", src: heroAsset("tokenharvest-nuts.png"), alt: "Macadamia nuts" },
  { name: "cacao", src: heroAsset("tokenharvest-cacao.png"), alt: "Open cacao pod" },
];

export function TokenHarvestHero({ hero, image }: TokenHarvestHeroProps) {
  const lines = withoutDashes(hero.headline).split(/\r?\n/).filter(Boolean);

  const moveStage = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--rx", `${((event.clientX - rect.left) / rect.width - .5) * 5}deg`);
    event.currentTarget.style.setProperty("--ry", `${((event.clientY - rect.top) / rect.height - .5) * -4}deg`);
  };

  const resetStage = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--rx", "0deg");
    event.currentTarget.style.setProperty("--ry", "0deg");
  };

  return (
    <section className="th-commodity-layer homepage-hero" aria-labelledby="th-prod-title">
      <div className="th-commodity-backdrop" aria-hidden="true" />

      <div className="th-commodity-layout">
        <div className="th-commodity-copy">
          <p className="th-commodity-quote-mark" aria-hidden="true">“</p>
          <p className="th-commodity-kicker">{withoutDashes(hero.badge)}</p>
          <p className="th-commodity-quote">
            From single origin<br />
            <strong>to final delivery.</strong>
          </p>
          <h1 className="th-commodity-title" id="th-prod-title">
            {lines.length
              ? lines.map((line, index) => index === 1
                ? <em key={`${line}-${index}`}>{line}</em>
                : index > 1
                  ? <strong key={`${line}-${index}`}>{line}</strong>
                  : <span key={`${line}-${index}`}>{line}</span>)
              : <span>{hero.headline}</span>}
          </h1>
          <p className="th-commodity-subline">{withoutDashes(hero.subheadline)}</p>
          <div className="th-commodity-proof">
            <span><Check size={12} aria-hidden="true" /> Single origin</span>
            <span><Check size={12} aria-hidden="true" /> Trade finance</span>
            <span><Check size={12} aria-hidden="true" /> Delivery ready</span>
          </div>
        </div>

        <div className="th-commodity-stage-wrap" aria-label="Featured TokenHarvest commodities">
          <div className="th-commodity-stage" onPointerMove={moveStage} onPointerLeave={resetStage}>
            {image && <img className="th-commodity-atmosphere" src={image} alt="" aria-hidden="true" />}
            <div className="th-commodity-disc" aria-hidden="true" />
            <div className="th-commodity-word" aria-hidden="true">TokenHarvest</div>
            <div className="th-commodity-index" aria-hidden="true">01</div>
            <span className="th-commodity-tag origin">Single origin / verified</span>
            <span className="th-commodity-tag finance">Finance ready</span>
            {commodities.map((commodity) => (
              <div className="th-commodity-item" data-name={commodity.name} key={commodity.name}>
                <img src={commodity.src} alt={commodity.alt} />
              </div>
            ))}
            <img
              className="th-commodity-portrait"
              src={heroAsset("tokenharvest-producer.png")}
              alt="East African coffee farmer holding a basket of ripe coffee cherries"
            />
          </div>
        </div>
      </div>

      <div className="th-commodity-footer">From first harvest to final settlement</div>
    </section>
  );
}