import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Check, Copy, Square } from "lucide-react";
import type { TranslateModelOption, TranslateModelsResponse, TranslateStreamEvent, AiExpertMeta, AiExpertsPublicResponse } from "@opentranslator/shared-types";
import { ApiError, apiGet, streamTranslate } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, languageName } from "@/lib/languages";
import { expertLabel, useTranslation } from "@/lib/i18n";
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

export function TranslatorPage() {
  const { t } = useTranslation();
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { user } = useAuth();
  const [modelOptions, setModelOptions] = useState<TranslateModelOption[]>([]);
  // 编码选中项：「providerId|model」；null 表示走站点默认
  const [modelKey, setModelKey] = useState<string | null>(null);
  const [expertOptions, setExpertOptions] = useState<AiExpertMeta[]>([]);
  const [expertId, setExpertId] = useState<string>("general");
  const [defaultExpertId, setDefaultExpertId] = useState<string>("general");

  // 拉取当前用户可选的模型列表（登录返全部、匿名返公开白名单）
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGet<TranslateModelsResponse>(
          "/api/translate/models",
        );
        if (!cancelled) setModelOptions(res.models);
      } catch {
        // 静默：拉取失败则不显示模型选择，回落到站点默认
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGet<AiExpertsPublicResponse>("/api/translate/experts");
        if (cancelled) return;
        setExpertOptions(res.experts);
        setDefaultExpertId(res.defaultExpertId ?? "general");
        setExpertId(res.defaultExpertId ?? "general");
      } catch {
        // 静默：无专家模块或未启用
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const showExpertSelect = expertOptions.length > 0;

  const streaming = status === "streaming";
  const noModel = modelOptions.length === 0;
  const canTranslate =
    sourceText.trim().length > 0 &&
    targetLang !== "" &&
    sourceLang !== targetLang &&
    !streaming &&
    !noModel;

  async function handleTranslate() {
    if (!canTranslate) return;
    setStatus("streaming");
    setError(null);
    setTargetText("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      // 解析选中的 providerId 与 model
      let providerId: string | undefined;
      let model: string | undefined;
      if (modelKey) {
        const sep = modelKey.indexOf("|");
        if (sep > 0) {
          providerId = modelKey.slice(0, sep);
          model = modelKey.slice(sep + 1);
        }
      }
      for await (const ev of streamTranslate(
        {
          text: sourceText,
          sourceLang,
          targetLang,
          stream: true,
          providerId,
          model,
          expertId: expertId === "general" ? undefined : expertId,
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
    <div className="animate-rise">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t("translator.title")}</h1>
      </div>

      {/* 主面板：发丝线框，无重影 */}
      <div className="relative overflow-hidden rounded-lg border border-rule bg-card shadow-sm">
        {/* 顶部墨蓝签名线：两端淡出，像一枚印刷记号 */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* 语言栏 */}
        <div className="flex items-center justify-between gap-3 border-b border-rule px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <LangSelect
              value={sourceLang}
              onChange={setSourceLang}
              disabled={streaming}
              includeAuto
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={handleSwap}
                  disabled={streaming || sourceLang === "auto"}
                >
                  <ArrowLeftRight className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("translator.swapLanguages")}</TooltipContent>
            </Tooltip>
            <LangSelect
              value={targetLang}
              onChange={setTargetLang}
              disabled={streaming}
            />
          </div>

          <div className="flex items-center gap-2">
            {showExpertSelect && (
              <ExpertSelect
                value={expertId}
                onChange={setExpertId}
                options={expertOptions}
                defaultExpertId={defaultExpertId}
                disabled={streaming}
              />
            )}
            {modelOptions.length > 0 && (
              <ModelSelect
                value={modelKey}
                onChange={setModelKey}
                options={modelOptions}
                disabled={streaming}
              />
            )}
            {streaming ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleAbort}
                className="gap-1.5"
              >
                <Square className="size-3 fill-current" />
                {t("common.stop")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleTranslate}
                disabled={!canTranslate}
                title={noModel ? t("translator.noModel") : undefined}
                className="gap-1.5"
              >
                {t("translator.translate")}
              </Button>
            )}
          </div>
        </div>

        {/* 双栏 */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col border-b border-rule md:border-b-0 md:border-r">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={t("translator.inputPlaceholder")}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleTranslate();
              }}
              disabled={streaming}
              className={cn(
                "min-h-[300px] flex-1 w-full resize-none border-0 bg-transparent px-5 py-5 text-base leading-relaxed shadow-none outline-none placeholder:text-muted-foreground/50 disabled:opacity-60 sm:px-6",
                "focus:ring-0",
              )}
            />
            <div className="flex h-9 items-center justify-between border-t border-rule px-5 text-xs text-muted-foreground sm:px-6">
              {sourceText.length > 0 ? (
                <span className="tabular-nums">{t("common.chars", { count: sourceText.length })}</span>
              ) : (
                <span />
              )}
              <kbd className="rounded border border-rule bg-muted/40 px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground/70">
                ⌘/Ctrl + Enter
              </kbd>
            </div>
          </div>

          {/* 译文栏：用衬线字，呈现「编辑级」阅读感 */}
          <div className="flex flex-col">
            <div className="min-h-[300px] flex-1 overflow-auto whitespace-pre-wrap break-words px-5 py-5 font-serif text-base leading-relaxed sm:px-6">
              {targetText ? (
                <span className="animate-fade-in">{targetText}</span>
              ) : streaming ? (
                <span className="font-sans text-sm text-muted-foreground/70">
                  {t("translator.translating")}
                </span>
              ) : (
                <span className="font-sans text-sm text-muted-foreground/40">
                  {t("translator.outputPlaceholder")}
                </span>
              )}
              {streaming && (
                <span className="ml-0.5 inline-block animate-blink text-primary">
                  ▍
                </span>
              )}
            </div>
            <div className="flex h-9 items-center justify-between border-t border-rule px-5 text-xs sm:px-6">
              {error ? (
                <span className="text-destructive">{error}</span>
              ) : targetText.length > 0 ? (
                <span className="tabular-nums text-muted-foreground">
                  {t("common.chars", { count: targetText.length })}
                </span>
              ) : (
                <span />
              )}
              {targetText && (
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
                          {t("common.copied")}
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          {t("common.copy")}
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("translator.copyTranslation")}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LangSelect({
  value,
  onChange,
  disabled,
  includeAuto,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  includeAuto?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 w-[130px] sm:w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.filter((l) => includeAuto || l.code !== "auto").map((l) => (
          <SelectItem key={l.code} value={l.code}>
            {languageName(l.code, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ExpertSelect({
  options,
  value,
  onChange,
  defaultExpertId,
  disabled,
}: {
  options: AiExpertMeta[];
  value: string;
  onChange: (v: string) => void;
  defaultExpertId: string;
  disabled?: boolean;
}) {
  const { t, locale } = useTranslation();
  const expert = options.find((o) => o.id === value);
  const label =
    value === "general"
      ? t("translator.general")
      : expertLabel(expert, locale) || t("translator.expert");
  return (
    <div className="hidden md:block">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9 w-[160px]">
          <span className="truncate">{label}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="general">{t("translator.general")}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {expertLabel(o, locale)}
              {o.id === defaultExpertId ? t("common.defaultSuffix") : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
  // trigger 选中态只显示模型名；下拉项展示「供应商 · 模型」
  const selected = value
    ? options.find((o) => `${o.providerId}|${o.model}` === value)
    : undefined;
  const label = selected?.modelLabel ?? t("common.default");
  return (
    <div className="hidden sm:block">
      <Select
        value={value ?? "default"}
        onValueChange={(v) => onChange(v === "default" ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[180px]">
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
    </div>
  );
}
