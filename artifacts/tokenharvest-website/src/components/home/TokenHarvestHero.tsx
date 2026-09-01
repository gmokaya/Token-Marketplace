import { useState } from "react";
import { ArrowRight, ArrowUpRight, BarChart3, ChevronDown, Globe2, ShieldCheck, WalletCards, X } from "lucide-react";
import { Link } from "wouter";
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
  onServicesClick: () => void;
};

export function TokenHarvestHero({ hero, image, onServicesClick }: TokenHarvestHeroProps) {
  const [flowOpen, setFlowOpen] = useState(false);
  const lines = hero.headline.split(/\r?\n/).filter(Boolean);
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width - 0.5) * 12}deg`);
    event.currentTarget.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height - 0.5) * 12}deg`);
  };
  const resetPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--mx", "0deg");
    event.currentTarget.style.setProperty("--my", "0deg");
  };

  return (
    <section className="th-prod-hero homepage-hero" aria-labelledby="th-prod-title">
      <div className="th-prod-aurora" aria-hidden="true" />
      <div className="th-prod-grid" aria-hidden="true" />
      <div className="th-prod-orb" aria-hidden="true" />
      <div className="th-prod-layout">
        <div className="th-prod-copy">
          <div className="th-prod-eyebrow"><span aria-hidden="true" />{hero.badge}</div>
          <h1 className="th-prod-title" id="th-prod-title">
            {lines.length ? lines.map((line, index) => index === 1
              ? <em key={`${line}-${index}`}>{line}</em>
              : index > 1 ? <strong key={`${line}-${index}`}>{line}</strong> : <span key={`${line}-${index}`}>{line}</span>) : hero.headline}
          </h1>
          <div className="th-prod-rule" aria-hidden="true" />
          <p className="th-prod-subheadline">{hero.subheadline}</p>
          <div className="th-prod-actions">
            <Link className="th-prod-primary" href="/sign-up">{hero.cta1}<ArrowUpRight size={16} aria-hidden="true" /></Link>
            <button className="th-prod-secondary" type="button" onClick={onServicesClick}>{hero.cta2}<ArrowRight size={16} aria-hidden="true" /></button>
          </div>
          <div className="th-prod-audience"><span aria-hidden="true" />Built for <strong>producers</strong> / brokers / buyers / financiers</div>
          {flowOpen && (
            <aside className="th-prod-flow" aria-label="How TokenHarvest works">
              <div className="th-prod-flow-header"><h2>One connected trade flow.</h2><button type="button" aria-label="Close how it works" onClick={() => setFlowOpen(false)}><X size={15} aria-hidden="true" /></button></div>
              <div className="th-prod-flow-list">
                <div><Globe2 size={15} aria-hidden="true" /><strong>Source</strong><span>Verified origin and quality.</span></div>
                <div><BarChart3 size={15} aria-hidden="true" /><strong>Trade</strong><span>Clear offers and demand signals.</span></div>
                <div><WalletCards size={15} aria-hidden="true" /><strong>Settle</strong><span>Capital and delivery aligned.</span></div>
              </div>
            </aside>
          )}
        </div>
        <div className="th-prod-stage-wrap" onPointerMove={handlePointerMove} onPointerLeave={resetPointer}>
          <div className="th-prod-stage">
            <div className="th-prod-photo-frame">
              {image ? <img src={image} alt="Producer inspecting an agricultural harvest" /> : <div className="th-prod-photo-fallback" />}
              <div className="th-prod-scanline" aria-hidden="true" />
              <div className="th-prod-stage-top"><span>Market signal / illustrative</span><span aria-hidden="true">TH / 01</span></div>
              <div className="th-prod-caption"><p>Origin / East Africa</p><h2>Good trade starts at the source.</h2><div><span aria-hidden="true" />Verified origin <span aria-hidden="true" />Trade-ready</div></div>
            </div>
            <div className="th-prod-float-card th-prod-price-card"><div>Market watch <BarChart3 size={13} aria-hidden="true" /></div><p>Demand signal</p><strong>Active <small>status</small></strong><span>Illustrative market view</span></div>
            <div className="th-prod-float-card th-prod-finance-card"><div>Settlement <ShieldCheck size={13} aria-hidden="true" /></div><p>Trade finance</p><strong>Ready <small>workflow</small></strong><span>Subject to verification</span></div>
            <div className="th-prod-terminal"><div><span>ORIGIN</span><strong>Verified</strong></div><div><span>QUALITY</span><strong>Reviewed</strong></div><div><span>DELIVERY</span><strong>Aligned</strong></div></div>
          </div>
        </div>
      </div>
      {flowOpen === false && <button className="th-prod-how" type="button" aria-expanded={false} onClick={() => setFlowOpen(true)}><ChevronDown size={15} aria-hidden="true" />How it works</button>}
    </section>
  );
}