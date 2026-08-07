import { useContent } from "@/lib/i18n";

export function Pricing() {
  const { pricingSection, pricing, site } = useContent();

  return (
    <section id="pricing">
      <div className="section-head">
        <h2 className="section-title">{pricingSection.sectionTitle}</h2>
        {pricingSection.sectionLede ? (
          <p className="section-lede">{pricingSection.sectionLede}</p>
        ) : null}
      </div>
      <div className="price-card">
        <p className="price-amount">{pricing.price}</p>
        <ul className="price-benefits">
          {pricing.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p
          className="price-vs"
          dangerouslySetInnerHTML={{ __html: pricing.comparisonHtml }}
        />
        <a className="btn-primary" href={site.repoUrl}>
          {pricingSection.repoCta}
        </a>
        <p className="price-trial">{pricing.trial}</p>
        <p className="price-terms">{pricing.terms}</p>
      </div>
    </section>
  );
}
