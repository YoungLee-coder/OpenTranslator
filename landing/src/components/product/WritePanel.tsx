import { useState } from "react";
import { useContent } from "@/lib/i18n";
import { MockSelect, type MockOption } from "./mock-ui";

function toOptions(list: readonly string[]): MockOption[] {
  return list.map((item) => ({ value: item, label: item }));
}

/** Write body — mirrors web WritePage card. Shell lives in AppChrome. */
export function WritePanel() {
  const { product } = useContent();
  const data = product.write;

  const initialMode =
    data.modes.find((m) => m.active)?.id ?? data.modes[0]?.id ?? "polish";
  const [modeId, setModeId] = useState(initialMode);
  const [model, setModel] = useState(data.model);
  const [resultText, setResultText] = useState(
    data.modeResults[initialMode] ?? data.resultText,
  );
  const [streaming, setStreaming] = useState(Boolean(data.streaming));
  const [copied, setCopied] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [sourceText, setSourceText] = useState(data.sourceText);

  function selectMode(id: string) {
    setModeId(id);
    setResultText(data.modeResults[id] ?? data.resultText);
    setStreaming(true);
    setCopied(false);
    setReplaced(false);
  }

  function runImprove() {
    setResultText(data.modeResults[modeId] ?? data.resultText);
    setStreaming(true);
    setCopied(false);
    setReplaced(false);
  }

  function replaceSource() {
    setSourceText(resultText);
    setReplaced(true);
    setStreaming(false);
    window.setTimeout(() => setReplaced(false), 1200);
  }

  function copyResult() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <>
      <div className="mock-card">
        <div className="mock-card-accent" />
        <div className="mock-toolbar">
          <div className="mock-toolbar-left" role="tablist" aria-label={data.pageTitle}>
            {data.modes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={mode.id === modeId}
                className={mode.id === modeId ? "mock-chip on" : "mock-chip"}
                onClick={() => selectMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="mock-toolbar-right">
            <MockSelect
              value={model}
              options={toOptions(data.models)}
              onChange={setModel}
              label={product.ui.modelLabel}
            />
            <button type="button" className="mock-btn" onClick={runImprove}>
              {data.action}
            </button>
          </div>
        </div>
        <div className="mock-split">
          <div className="mock-pane">
            <div className="mock-pane-body muted">{sourceText}</div>
            <div className="mock-foot">
              <span>{data.sourceMeta}</span>
              <span />
            </div>
          </div>
          <div className="mock-split-rule" />
          <div className="mock-pane">
            <div className="mock-pane-body serif">
              {resultText}
              {streaming ? <span className="mock-cursor">▍</span> : null}
            </div>
            <div className="mock-foot">
              <button
                type="button"
                className="mock-foot-action"
                onClick={replaceSource}
              >
                {replaced ? "✓" : data.resultMetaLeft}
              </button>
              <button
                type="button"
                className="mock-foot-action"
                onClick={copyResult}
              >
                {copied ? "✓" : data.resultMetaRight}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
