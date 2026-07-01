import { useRef, useState } from "react";
import { ArrowLeftRight, Check, Copy, Loader2, Square } from "lucide-react";
import type { TranslateStreamEvent } from "@opentranslator/shared-types";
import { ApiError, streamTranslate } from "@/lib/api-client";
import { LANGUAGES } from "@/lib/languages";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Status = "idle" | "streaming" | "done" | "error";

export function TranslatorPage() {
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const streaming = status === "streaming";
  const canTranslate =
    sourceText.trim().length > 0 &&
    targetLang !== "" &&
    sourceLang !== targetLang &&
    !streaming;

  async function handleTranslate() {
    if (!canTranslate) return;
    setStatus("streaming");
    setError(null);
    setTargetText("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      for await (const ev of streamTranslate(
        { text: sourceText, sourceLang, targetLang, stream: true },
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
    if (sourceLang === "auto") return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText(sourceText);
  }

  function handleCopy() {
    if (!targetText) return;
    void navigator.clipboard.writeText(targetText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* 顶部语言栏 */}
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Select
            value={sourceLang}
            onValueChange={setSourceLang}
            disabled={streaming}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            onClick={handleSwap}
            disabled={streaming || sourceLang === "auto"}
            title="交换语言"
          >
            <ArrowLeftRight className="size-3.5" />
          </Button>

          <Select
            value={targetLang}
            onValueChange={setTargetLang}
            disabled={streaming}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          {streaming ? (
            <Button type="button" variant="outline" onClick={handleAbort}>
              <Square className="size-3.5" />
              停止
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleTranslate}
              disabled={!canTranslate}
            >
              翻译
            </Button>
          )}
        </div>
      </div>

      {/* 双栏 */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col border-b md:border-b-0 md:border-r">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="输入要翻译的文本…"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleTranslate();
            }}
            disabled={streaming}
            className={cn(
              "flex-1 min-h-[300px] w-full resize-none border-0 bg-transparent px-4 py-3 text-base leading-relaxed shadow-none outline-none placeholder:text-muted-foreground/70 disabled:opacity-60",
              "focus:ring-0",
            )}
          />
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{sourceText.length} 字符</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground">
              ⌘/Ctrl + Enter
            </kbd>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex-1 min-h-[300px] overflow-auto whitespace-pre-wrap break-words px-4 py-3 text-base leading-relaxed">
            {targetText || (
              <span className="text-muted-foreground/70">
                {streaming ? "翻译中…" : "译文将显示在此处"}
              </span>
            )}
            {streaming && (
              <span className="animate-blink text-primary">▍</span>
            )}
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              <span className="tabular-nums text-muted-foreground">
                {targetText.length} 字符
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={handleCopy}
              disabled={!targetText}
            >
              {copied ? (
                <>
                  <Check className="size-3" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  复制
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {streaming && (
        <div className="flex items-center gap-2 border-t px-4 py-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          正在生成译文…
        </div>
      )}
    </div>
  );
}
