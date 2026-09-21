import { useState } from "react";
import { useContent } from "@/lib/i18n";
import { MockSelect, type MockOption } from "./mock-ui";

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

function toOptions(list: readonly string[]): MockOption[] {
  return list.map((item) => ({ value: item, label: item }));
}

/** Translator body — mirrors web TranslatorPage card. Shell lives in AppChrome. */
export function TranslatePanel() {
  const content = useContent();
  const data = content.product.translate;
  const ui = content.product.ui;
  const [sourceLang, setSourceLang] = useState(data.sourceLang);
  const [targetLang, setTargetLang] = useState(data.targetLang);
  const [sourceText, setSourceText] = useState(data.sourceText);
  const [targetText, setTargetText] = useState(data.targetText);
  const [expert, setExpert] = useState(data.expert);
  const [model, setModel] = useState(data.model);
  const [streaming, setStreaming] = useState(Boolean(data.streaming));
  const [copied, setCopied] = useState(false);

  function swap() {
    const nextSource = targetLang;
    // The source list alone carries "auto detect"; never leave the target
    // select on a value it has no option for.
    let nextTarget = sourceLang;
    if (nextTarget === data.sourceLang || nextTarget === nextSource) {
      nextTarget =
        data.targetLanguages.find((lang) => lang !== nextSource) ?? nextTarget;
    }
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
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
    <>
      <div className="mock-card">
        <div className="mock-card-accent" />
        <div className="mock-toolbar">
          <div className="mock-toolbar-left">
            <MockSelect
              value={sourceLang}
              options={toOptions(data.languages)}
              onChange={(next) => {
                setSourceLang(next);
                setStreaming(false);
              }}
              label={ui.sourceLangLabel}
            />
            <button
              type="button"
              className="mock-select mock-select-icon"
              aria-label={content.product.swapLabel}
              onClick={swap}
            >
              <SwapIcon />
            </button>
            <MockSelect
              value={targetLang}
              options={toOptions(data.targetLanguages)}
              onChange={(next) => {
                setTargetLang(next);
                setStreaming(false);
              }}
              label={ui.targetLangLabel}
            />
          </div>
          <div className="mock-toolbar-right">
            <MockSelect
              value={expert}
              options={toOptions(data.experts)}
              onChange={setExpert}
              label={ui.expertLabel}
            />
            <MockSelect
              value={model}
              options={toOptions(data.models)}
              onChange={setModel}
              label={ui.modelLabel}
            />
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
    </>
  );
}
