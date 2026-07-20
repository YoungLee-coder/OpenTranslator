import { useContent } from "@/lib/i18n";

export function Features() {
  const { featuresSection, features } = useContent();

  return (
    <section>
      <div className="section-head">
        <p className="section-num">{featuresSection.sectionNum}</p>
        <h2 className="section-title">{featuresSection.sectionTitle}</h2>
      </div>
      <ol className="features">
        {features.map((f) => (
          <li key={f.name}>
            <p className="name">
              {f.name}
              <small>{f.subtitle}</small>
            </p>
            <p className="what">{f.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
