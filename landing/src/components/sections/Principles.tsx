import { useContent } from "@/lib/i18n";

export function Principles() {
  const { principlesSection, principles } = useContent();

  return (
    <section>
      <div className="section-head">
        <p className="section-num">{principlesSection.sectionNum}</p>
        <h2 className="section-title">{principlesSection.sectionTitle}</h2>
      </div>
      <ol className="principles">
        {principles.map((p, i) => (
          <li key={p.title}>
            <span className="n">{i + 1}</span>
            <span className="body">
              <b>{p.title}</b>
              <span>{p.description}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
