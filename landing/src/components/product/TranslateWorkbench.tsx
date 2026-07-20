import { useState } from "react";
import { useContent } from "@/lib/i18n";
import { AppChrome } from "./AppChrome";

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  );
}

function cycleNext(list: readonly string[], current: string): string {
  const i = list.indexOf(current);
  return list[(i + 1) % list.length]!;
}

/** Interactive translator workbench — mirrors web TranslatorPage card. */
export function TranslateWorkbench() {
  const data = useContent().product.translate;
  const [sourceLang, setSourceLang] = useState(data.sourceLang);
  const [targetLang, setTargetLang] = useState(data.targetLang);
  const [sourceText, setSourceText] = useState(data.sourceText);
  const [targetText, setTargetText] = useState(data.targetText);
  const [expert, setExpert] = useState(data.expert);
  const [model, setModel] = useState(data.model);
  const [streaming, setStreaming] = useState(Boolean(data.streaming));
  const [copied, setCopied] = useState(false);

  function swap() {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText(sourceText);
    setStreaming(false);
    setCopied(false);
  }

  function runTranslate() {
    setStreaming(true);
    setCopied(false);
  }

  function copyTarget() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <AppChrome active="translate" title={data.pageTitle}>
      <div className="mock-card">
        <div className="mock-card-accent" />
        <div className="mock-toolbar">
          <div className="mock-toolbar-left">
            <button type="button" className="mock-select" disabled>
              {sourceLang}
            </button>
            <button
              type="button"
              className="mock-select mock-select-icon"
              aria-label="Swap languages"
              onClick={swap}
            >
              <SwapIcon />
            </button>
            <button type="button" className="mock-select" disabled>
              {targetLang}
            </button>
          </div>
          <div className="mock-toolbar-right">
            <button
              type="button"
              className="mock-select"
              onClick={() => setExpert(cycleNext(data.experts, expert))}
            >
              {expert}
            </button>
            <button
              type="button"
              className="mock-select"
              onClick={() => setModel(cycleNext(data.models, model))}
            >
              {model}
            </button>
            <button type="button" className="mock-btn" onClick={runTranslate}>
              {data.action}
            </button>
          </div>
        </div>
        <div className="mock-split">
          <div className="mock-pane">
            <div className="mock-pane-body">{sourceText}</div>
            <div className="mock-foot">
              <span>{data.sourceMeta}</span>
              <span className="mock-kbd">⌘/Ctrl + Enter</span>
            </div>
          </div>
          <div className="mock-split-rule" />
          <div className="mock-pane">
            <div className="mock-pane-body serif">
              {targetText}
              {streaming ? <span className="mock-cursor">▍</span> : null}
            </div>
            <div className="mock-foot">
              <span />
              <button type="button" className="mock-foot-action" onClick={copyTarget}>
                {copied ? "✓" : data.targetMeta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
