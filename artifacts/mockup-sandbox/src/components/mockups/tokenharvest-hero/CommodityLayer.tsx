import { useState } from "react";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import type { PointerEvent } from "react";
import "./_group.css";
import "./CommodityLayer.css";

const commodities = [
  { name: "coffee", src: "/__mockup/images/th-coffee.png", alt: "Roasted coffee beans" },
  { name: "tea", src: "/__mockup/images/th-tea.png", alt: "Fresh tea leaves" },
  { name: "grain", src: "/__mockup/images/th-grain.png", alt: "Golden grain stalks" },
  { name: "nuts", src: "/__mockup/images/th-nuts.png", alt: "Macadamia nuts" },
  { name: "cacao", src: "/__mockup/images/th-cacao.png", alt: "Open cacao pod" },
];

export function CommodityLayer() {
  const [servicesOpen, setServicesOpen] = useState(false);
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
    <main className="th-hero-scope th-commodity-layer">
      <div className="th-commodity-backdrop" aria-hidden="true" />
      <div className="th-commodity-lines" aria-hidden="true" />

      <nav className="th-commodity-nav" aria-label="TokenHarvest primary navigation">
        <a className="th-commodity-brand" href="#marketplace">
          <span className="th-commodity-mark">TH</span>
          <span>TokenHarvest</span>
        </a>
        <div className="th-commodity-links">
          <a href="#marketplace">Commodities</a>
          <a href="#services">Services</a>
          <a href="#network">Network</a>
        </div>
        <div className="th-commodity-socials" aria-label="Social links">
          <span>LinkedIn</span><span>Instagram</span><span>Contact</span>
        </div>
      </nav>

      <div className="th-commodity-layout">
        <section className="th-commodity-copy" aria-labelledby="commodity-title">
          <p className="th-commodity-quote-mark" aria-hidden="true">“</p>
          <p className="th-commodity-kicker">TokenHarvest Commodities</p>
          <p className="th-commodity-quote">
            From single origin<br />
            <strong>to final delivery.</strong>
          </p>
          <h1 className="th-commodity-title" id="commodity-title">
            <span>Origin,</span><em>traded</em><strong>forward.</strong>
          </h1>
          <p className="th-commodity-subline">
            Specialty quality with trade finance built into every move.
          </p>
          <div className="th-commodity-actions" id="marketplace">
            <a className="th-commodity-primary" href="#network">
              Join the marketplace <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <button
              className="th-commodity-secondary"
              type="button"
              onClick={() => setServicesOpen((open) => !open)}
              aria-expanded={servicesOpen}
              aria-controls="services"
            >
              Our services
              <ChevronRight size={15} aria-hidden="true" style={{ transform: servicesOpen ? "rotate(90deg)" : undefined }} />
            </button>
          </div>
          <div className="th-commodity-proof" id="network">
            <span><Check size={12} /> Single origin</span>
            <span><Check size={12} /> Trade finance</span>
            <span><Check size={12} /> Delivery ready</span>
          </div>
          {servicesOpen && (
            <div className="th-commodity-service-note" id="services" role="status">
              Specialty sourcing / finance / delivery coordination
            </div>
          )}
        </section>

        <section className="th-commodity-stage-wrap" aria-label="Featured TokenHarvest commodities">
          <div className="th-commodity-stage" onPointerMove={moveStage} onPointerLeave={resetStage}>
            <div className="th-commodity-disc" aria-hidden="true" />
            <div className="th-commodity-word" aria-hidden="true">TOKENHARVEST</div>
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
              src="/__mockup/images/th-producer.png"
              alt="East African producer holding a sheaf of wheat"
            />
          </div>
        </section>
      </div>

      <div className="th-commodity-corner-card th-commodity-corner-card-left">
        <span>Specialty lots</span>
        <strong>Origin verified</strong>
        <small>Traceable from farm to market</small>
      </div>
      <div className="th-commodity-corner-card th-commodity-corner-card-right">
        <span>Trade finance</span>
        <strong>Delivery aligned</strong>
        <small>Move value with confidence</small>
      </div>
      <div className="th-commodity-footer">From first harvest to final settlement</div>
    </main>
  );
}