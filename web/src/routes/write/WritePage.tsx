import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Replace, Square } from "lucide-react";
import type {
  TranslateModelOption,
  TranslateModelsResponse,
  WriteFormality,
  WriteMode,
  WriteStyle,
} from "@opentranslator/shared-types";
import { ApiError, apiGet, streamWrite } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, languageName } from "@/lib/languages";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Status = "idle" | "streaming" | "done" | "error";

export function WritePage() {
  const { t, locale } = useTranslation();
  const writeModes = useMemo(
    () =>
      [
        { value: "improve" as const, label: t("write.modeImprove") },
        { value: "style" as const, label: t("write.modeStyle") },
        { value: "formality" as const, label: t("write.modeFormality") },
        { value: "shorten" as const, label: t("write.modeShorten") },
      ],
    [locale, t],
  );
  const writeStyles = useMemo(
    () =>
      [
        { value: "simple" as const, label: t("write.styleSimple") },
        { value: "business" as const, label: t("write.styleBusiness") },
        { value: "academic" as const, label: t("write.styleAcademic") },
        { value: "casual" as const, label: t("write.styleCasual") },
      ],
    [locale, t],
  );
  const writeFormalities = useMemo(
    () =>
      [
        { value: "formal" as const, label: t("write.formalityFormal") },
        { value: "informal" as const, label: t("write.formalityInformal") },
      ],
    [locale, t],
  );
  const [sourceText, setSourceText] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [lang, setLang] = useState("zh-CN");
  const [mode, setMode] = useState<WriteMode>("improve");
  const [style, setStyle] = useState<WriteStyle>("simple");
  const [formality, setFormality] = useState<WriteFormality>("formal");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { user } = useAuth();
  const [modelOptions, setModelOptions] = useState<TranslateModelOption[]>([]);
  const [modelKey, setModelKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGet<TranslateModelsResponse>("/api/translate/models");
        if (!cancelled) {
          // DeepL 不支持 AI Write，从可选模型中排除
          setModelOptions(res.models.filter((m) => m.providerType !== "deepl"));
        }
      } catch {
        // 静默
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const streaming = status === "streaming";
  const noModel = modelOptions.length === 0;
  const canWrite =
    sourceText.trim().length > 0 && !streaming && !noModel;

  async function handleWrite() {
    if (!canWrite) return;
    setStatus("streaming");
    setError(null);
    setRevisedText("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let providerId: string | undefined;
      let model: string | undefined;
      if (modelKey) {
        const sep = modelKey.indexOf("|");
        if (sep > 0) {
          providerId = modelKey.slice(0, sep);
          model = modelKey.slice(sep + 1);
        }
      }
      for await (const ev of streamWrite(
        {
          text: sourceText,
          lang,
          mode,
          style: mode === "style" ? style : undefined,
          formality: mode === "formality" ? formality : undefined,
          stream: true,
          providerId,
          model,
        },
        controller.signal,
      )) {
        if (ev.type === "delta") {
          setRevisedText((prev) => prev + ev.text);
        } else if (ev.type === "done") {
          setRevisedText(ev.revisedText);
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

  function handleCopy() {
    if (!revisedText) return;
    void navigator.clipboard.writeText(revisedText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleReplace() {
    if (!revisedText) return;
    setSourceText(revisedText);
    setRevisedText("");
    setStatus("idle");
    setError(null);
  }

  return (
    <div className="animate-rise">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t("write.title")}</h1>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-rule bg-card shadow-sm">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* 工具栏 */}
        <div className="flex flex-col gap-3 border-b border-rule bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex min-w-0 flex-col gap-2.5">
            <ModeSegment
              value={mode}
              onChange={setMode}
              options={writeModes}
              disabled={streaming}
              ariaLabel={t("write.modeAria")}
            />

            {mode === "style" && (
              <SubSegment
                value={style}
                onChange={setStyle}
                options={writeStyles}
                disabled={streaming}
                label={t("write.styleLabel")}
              />
            )}

            {mode === "formality" && (
              <SubSegment
                value={formality}
                onChange={setFormality}
                options={writeFormalities}
                disabled={streaming}
                label={t("write.toneLabel")}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LangSelect value={lang} onChange={setLang} disabled={streaming} />
            {modelOptions.length > 0 && (
              <ModelSelect
                value={modelKey}
                onChange={setModelKey}
                options={modelOptions}
                disabled={streaming}
              />
            )}
            <div className="ml-auto flex shrink-0">
              {streaming ? (
                <Button type="button" variant="outline" onClick={handleAbort} className="gap-1.5">
                  <Square className="size-3 fill-current" />
                  {t("common.stop")}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleWrite}
                  disabled={!canWrite}
                  title={noModel ? t("translator.noModel") : undefined}
                  className="gap-1.5"
                >
                  {t("write.improve")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 双栏 */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col border-b border-rule md:border-b-0 md:border-r">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={t("write.inputPlaceholder")}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleWrite();
              }}
              disabled={streaming}
              className={cn(
                "min-h-[220px] flex-1 w-full resize-none border-0 bg-transparent px-4 py-4 text-base leading-relaxed shadow-none outline-none placeholder:text-muted-foreground/50 disabled:opacity-60 sm:min-h-[300px] sm:px-6 sm:py-5",
                "focus:ring-0",
              )}
            />
            <div className="flex h-9 items-center justify-between border-t border-rule px-4 text-xs text-muted-foreground sm:px-6">
              {sourceText.length > 0 ? (
                <span className="tabular-nums">{t("common.chars", { count: sourceText.length })}</span>
              ) : (
                <span />
              )}
              <kbd className="hidden rounded border border-rule bg-muted/40 px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground/70 sm:inline">
                ⌘/Ctrl + Enter
              </kbd>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="min-h-[220px] flex-1 overflow-auto whitespace-pre-wrap break-words px-4 py-4 font-serif text-base leading-relaxed sm:min-h-[300px] sm:px-6 sm:py-5">
              {revisedText ? (
                <span className="animate-fade-in">{revisedText}</span>
              ) : streaming ? (
                <span className="font-sans text-sm text-muted-foreground/70">{t("write.improving")}</span>
              ) : (
                <span className="font-sans text-sm text-muted-foreground/40">{t("write.outputPlaceholder")}</span>
              )}
              {streaming && (
                <span className="ml-0.5 inline-block animate-blink text-primary">▍</span>
              )}
            </div>
            <div className="flex h-9 items-center justify-between border-t border-rule px-4 text-xs sm:px-6">
              {error ? (
                <span className="text-destructive">{error}</span>
              ) : revisedText.length > 0 ? (
                <span className="tabular-nums text-muted-foreground">
                  {t("common.chars", { count: revisedText.length })}
                </span>
              ) : (
                <span />
              )}
              {revisedText && (
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-xs"
                        onClick={handleReplace}
                      >
                        <Replace className="size-3" />
                        <span className="hidden sm:inline">{t("write.replaceSource")}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("write.replaceSourceTip")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-xs"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <>
                            <Check className="size-3 text-success" />
                            <span className="hidden sm:inline">{t("common.copied")}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span className="hidden sm:inline">{t("common.copy")}</span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("write.copyResult")}</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeSegment<T extends string>({
  value,
  onChange,
  options,
  disabled,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  ariaLabel: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const layoutKey = options.map((opt) => `${opt.value}:${opt.label}`).join("|") + `|${value}`;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const currentOptions = optionsRef.current;
    itemRefs.current.length = currentOptions.length;

    const measure = () => {
      const activeIndex = currentOptions.findIndex((opt) => opt.value === value);
      const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
      if (!el) {
        setIndicator((prev) => ({ ...prev, ready: false }));
        return;
      }
      setIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      });
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(list);
    for (const el of itemRefs.current) {
      if (el) ro.observe(el);
    }

    return () => ro.disconnect();
  }, [layoutKey, value]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className="liquid-glass relative inline-flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-0.5"
    >
      <span
        aria-hidden
        className={cn(
          "liquid-glass-chip pointer-events-none absolute top-1/2 h-8 -translate-y-1/2 rounded-full",
          "transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "motion-reduce:transition-none",
          indicator.ready ? "opacity-100" : "opacity-0",
        )}
        style={{ left: indicator.left, width: indicator.width }}
      />
      {options.map((opt, index) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 h-8 shrink-0 rounded-full px-3.5 text-xs font-medium sm:px-4 sm:text-sm",
              "transition-colors duration-200 motion-reduce:transition-none",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SubSegment<T extends string>({
  value,
  onChange,
  options,
  disabled,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  label: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const layoutKey = options.map((opt) => `${opt.value}:${opt.label}`).join("|") + `|${value}`;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const currentOptions = optionsRef.current;
    itemRefs.current.length = currentOptions.length;

    const measure = () => {
      const activeIndex = currentOptions.findIndex((opt) => opt.value === value);
      const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
      if (!el) {
        setIndicator((prev) => ({ ...prev, ready: false }));
        return;
      }
      setIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      });
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(list);
    for (const el of itemRefs.current) {
      if (el) ro.observe(el);
    }

    return () => ro.disconnect();
  }, [layoutKey, value]);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 pl-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
      <div
        ref={listRef}
        role="group"
        aria-label={label}
        className="liquid-glass relative inline-flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-0.5"
      >
        <span
          aria-hidden
          className={cn(
            "liquid-glass-chip pointer-events-none absolute top-1/2 h-7 -translate-y-1/2 rounded-full",
            "transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "motion-reduce:transition-none",
            indicator.ready ? "opacity-100" : "opacity-0",
          )}
          style={{ left: indicator.left, width: indicator.width }}
        />
        {options.map((opt, index) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative z-10 h-7 shrink-0 rounded-full px-3 text-xs font-medium",
                "transition-colors duration-200 motion-reduce:transition-none",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LangSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 min-w-0 flex-1 sm:w-[160px] sm:flex-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
          <SelectItem key={l.code} value={l.code}>
            {languageName(l.code, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ModelSelect({
  options,
  value,
  onChange,
  disabled,
}: {
  options: TranslateModelOption[];
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const selected = value
    ? options.find((o) => `${o.providerId}|${o.model}` === value)
    : undefined;
  const label = selected?.modelLabel ?? t("common.default");
  return (
    <Select
      value={value ?? "default"}
      onValueChange={(v) => onChange(v === "default" ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 min-w-[7.5rem] flex-1 sm:w-[180px] sm:flex-none">
        <span className="truncate">{label}</span>
      </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">{t("common.default")}</SelectItem>
          {options.map((o) => {
            const key = `${o.providerId}|${o.model}`;
            return (
              <SelectItem key={key} value={key}>
                {o.providerName} · {o.modelLabel}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
  );
}
