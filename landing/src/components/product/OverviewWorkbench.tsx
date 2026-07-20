import { useContent } from "@/lib/i18n";
import { AppChrome } from "./AppChrome";
import { useGalleryNav } from "./gallery-nav";
import type { GallerySlideId } from "@/content";

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

const SLIDE_TABS = new Set<string>(["overview", "providers"]);

/** Interactive dashboard overview — mirrors web OverviewSection. */
export function OverviewWorkbench() {
  const data = useContent().product.overview;
  const galleryNav = useGalleryNav();

  function onTab(id: string) {
    if (!SLIDE_TABS.has(id)) return;
    galleryNav?.goTo(id as GallerySlideId);
  }

  return (
    <AppChrome active="dashboard" title={data.pageTitle}>
      <div className="mock-card">
        <div className="mock-tabs" role="tablist">
          {data.tabs.map((tab) => {
            const linked = SLIDE_TABS.has(tab.id);
            const on = tab.id === "overview";
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={on ? "on" : undefined}
                disabled={!linked}
                onClick={() => onTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="mock-dash">
          <div className="mock-card-title">{data.cardTitle}</div>
          <div className="mock-stats">
            <div className="mock-stat">
              <div className="mock-stat-icon">
                <ActivityIcon />
              </div>
              <div className="v">{data.totalRequests}</div>
              <div className="k">{data.totalRequestsLabel}</div>
            </div>
            <div className="mock-stat">
              <div className="mock-stat-icon">
                <FileIcon />
              </div>
              <div className="v">{data.totalChars}</div>
              <div className="k">{data.totalCharsLabel}</div>
            </div>
          </div>
          <div className="mock-table">
            <table>
              <thead>
                <tr>
                  <th>{data.providerCol}</th>
                  <th className="num">{data.requestsCol}</th>
                  <th className="num">{data.charsCol}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.provider}>
                    <td>{row.provider}</td>
                    <td className="num">{row.requests}</td>
                    <td className="num">{row.chars}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
