import { useContent } from "@/lib/i18n";

export function Footer() {
  const { footer, site } = useContent();

  return (
    <footer className="foot">
      <div className="mark">
        <img src="/assets/icon.svg" alt={site.productName} />
        <span className="wm-name">{site.productName}</span>
        <span className="wm-line">{footer.tagline}</span>
      </div>
      <div className="colophon">
        <div className="links">
          <a href={site.repoUrl} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>{" "}
          &middot;{" "}
          <a href={site.readmeMdUrl} target="_blank" rel="noopener noreferrer">
            README
          </a>{" "}
          &middot;{" "}
          <a href={site.licenseUrl} target="_blank" rel="noopener noreferrer">
            GPL-3.0
          </a>{" "}
          &middot;{" "}
          <a href={site.issuesUrl} target="_blank" rel="noopener noreferrer">
            Issues
          </a>
        </div>
        <p className="ethos">{footer.ethos}</p>
      </div>
    </footer>
  );
}
