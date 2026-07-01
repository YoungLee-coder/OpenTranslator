import { useRef, useState } from "react";
import type { TranslateStreamEvent } from "@opentranslator/shared-types";
import { ApiError, streamTranslate } from "../../lib/api-client";
import { LANGUAGES } from "../../lib/languages";

type Status = "idle" | "streaming" | "done" | "error";

export function TranslatorPage() {
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canTranslate =
    sourceText.trim().length > 0 &&
    targetLang &&
    sourceLang !== targetLang &&
    status !== "streaming";

  async function handleTranslate() {
    if (!canTranslate) return;
    setStatus("streaming");
    setError(null);
    setTargetText("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      for await (const ev of streamTranslate(
        {
          text: sourceText,
          sourceLang,
          targetLang,
          stream: true,
        },
        controller.signal,
      )) {
        if (ev.type === "delta") {
          setTargetText((prev) => prev + ev.text);
        } else if (ev.type === "done") {
          setTargetText(ev.translatedText);
          setStatus("done");
        } else if (ev.type === "error") {
          setError(ev.error);
          setStatus("error");
        }
      }
      // If the stream ended without an explicit done event.
      setStatus((s) => (s === "streaming" ? "done" : s));
    } catch (e) {
      if (controller.signal.aborted) {
        setStatus("idle");
      } else {
        setError(e instanceof ApiError ? e.message : String(e));
        setStatus("error");
      }
    } finally {
      abortRef.current = null;
    }
  }

  function handleAbort() {
    abortRef.current?.abort();
  }

  function handleSwap() {
    if (sourceLang === "auto") return; // can't swap detection direction
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText(sourceText);
  }

  function handleCopy() {
    if (targetText) void navigator.clipboard.writeText(targetText);
  }

  return (
    <div className="translator">
      <div className="translator__bar">
        <div className="lang-group">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            disabled={status === "streaming"}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            className="swap-btn"
            onClick={handleSwap}
            disabled={status === "streaming" || sourceLang === "auto"}
            title="交换语言"
            type="button"
          >
            ⇄
          </button>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            disabled={status === "streaming"}
          >
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="action-group">
          {status === "streaming" ? (
            <button className="btn btn-secondary" onClick={handleAbort} type="button">
              停止
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleTranslate}
              disabled={!canTranslate}
              type="button"
            >
              翻译
            </button>
          )}
        </div>
      </div>

      <div className="translator__panes">
        <div className="pane pane-source">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="输入要翻译的文本…"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleTranslate();
            }}
            disabled={status === "streaming"}
          />
          <div className="pane__footer">
            <span className="char-count">{sourceText.length} 字符</span>
            <span className="hint">⌘/Ctrl + Enter 翻译</span>
          </div>
        </div>
        <div className="pane pane-target">
          <div className="pane__output">
            {targetText || (
              <span className="placeholder">
                {status === "streaming" ? "翻译中…" : "译文将显示在此处"}
              </span>
            )}
            {status === "streaming" && <span className="cursor">▍</span>}
          </div>
          <div className="pane__footer">
            {error ? (
              <span className="error-text">{error}</span>
            ) : (
              <span className="char-count">{targetText.length} 字符</span>
            )}
            <button
              className="link-btn"
              onClick={handleCopy}
              disabled={!targetText}
              type="button"
            >
              复制
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
