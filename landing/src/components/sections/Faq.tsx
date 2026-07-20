import { useContent } from "@/lib/i18n";

export function Faq() {
  const { faqSection, faq, site } = useContent();

  return (
    <section>
      <div className="section-head">
        <p className="section-num">{faqSection.sectionNum}</p>
        <h2 className="section-title">{faqSection.sectionTitle}</h2>
      </div>
      <dl className="faq">
        {faq.map((item) => (
          <div className="faq-pair" key={item.q}>
            <dt>{item.q}</dt>
            <dd>{item.a}</dd>
          </div>
        ))}
      </dl>
      <p className="faq-tail">
        {faqSection.tailBefore}{" "}
        <a href={site.deployUrl}>{faqSection.tailLink}</a>
        {faqSection.tailAfter}
      </p>
    </section>
  );
}
