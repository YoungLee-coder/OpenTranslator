import { useContent } from "@/lib/i18n";

export function Principles() {
  const { principlesSection, principles } = useContent();

  return (
    <section id="principles">
      <div className="section-head">
        <h2 className="section-title">{principlesSection.sectionTitle}</h2>
      </div>
      <div className="principles-card">
        {principlesSection.lead ? (
          <p
            className="principles-lead"
            dangerouslySetInnerHTML={{ __html: principlesSection.lead }}
          />
        ) : null}
        <ol className="principles">
          {principles.map((p) => (
            <li key={p.title}>
              <span className="body">
                <b>{p.title}</b>
                <span>{p.description}</span>
              </span>
            </li>
          ))}
        </ol>
        {principlesSection.sign ? (
          <span className="principles-sign">{principlesSection.sign}</span>
        ) : null}
      </div>
    </section>
  );
}
