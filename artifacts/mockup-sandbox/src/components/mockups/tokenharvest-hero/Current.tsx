import "./_group.css";

export function Current() {
  return (
    <main className="th-hero-scope">
      <section className="th-current-hero" aria-label="TokenHarvest current homepage hero">
        <div className="th-current-panel" aria-hidden="true" />
        <div className="th-current-photo" aria-hidden="true">
          <img src="/__mockup/images/hero-soybean-farmer.jpg" alt="" />
        </div>
        <div className="th-current-overlay" aria-hidden="true" />
        <div className="th-current-grid" aria-hidden="true" />

        <div className="th-current-content">
          <div className="th-current-inner">
            <div className="th-current-badge">
              <span className="th-current-badge-dot" />
              <span>WRS Marketplace</span>
            </div>
            <h1 className="th-current-title">Trade.{"\n"}Finance.{"\n"}Deliver.</h1>
            <div className="th-current-rule" />
            <p className="th-current-copy">
              TokenHarvest enables businesses to trade agricultural commodities with confidence across East Africa and global markets.
            </p>
            <div className="th-current-actions">
              <a className="th-current-primary" href="#join">Join the Marketplace <span aria-hidden="true">→</span></a>
              <button className="th-current-secondary" type="button">Our Services <span aria-hidden="true">→</span></button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}