import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Check, Copy, Square } from "lucide-react";
import type { ProviderRecord, TranslateStreamEvent } from "@opentranslator/shared-types";
import { ApiError, apiGet, streamTranslate } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/languages";
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
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("zh");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);

  // 登录后拉取启用的供应商列表（每条记录即一个模型配置），供「选择模型」使用
  useEffect(() => {
    if (!user) {
      setProviders([]);
      setProviderId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGet<{ providers: ProviderRecord[] }>(
          "/api/admin/providers",
        );
        if (!cancelled) setProviders(res.providers.filter((p) => p.enabled));
      } catch {
        // 静默：拉取失败则不显示模型选择，回落到站点默认
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
        {
          text: sourceText,
          sourceLang,
          targetLang,
          stream: true,
          providerId: providerId ?? undefined,
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
              <TooltipContent>交换语言</TooltipContent>
            </Tooltip>
            <LangSelect
              value={targetLang}
              onChange={setTargetLang}
              disabled={streaming}
            />
          </div>

          <div className="flex items-center gap-2">
            {user && providers.length > 0 && (
              <ModelSelect
                value={providerId}
                onChange={setProviderId}
                providers={providers}
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
                停止
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleTranslate}
                disabled={!canTranslate}
                className="gap-1.5"
              >
                翻译
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
              placeholder="输入要翻译的文本…"
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
                <span className="tabular-nums">{sourceText.length} 字符</span>
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
                  翻译中…
                </span>
              ) : (
                <span className="font-sans text-sm text-muted-foreground/40">
                  译文
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
                  {targetText.length} 字符
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
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          复制
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>复制译文</TooltipContent>
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
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 w-[130px] sm:w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.filter((l) => includeAuto || l.code !== "auto").map((l) => (
          <SelectItem key={l.code} value={l.code}>
            {l.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ModelSelect({
  providers,
  value,
  onChange,
  disabled,
}: {
  providers: ProviderRecord[];
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="hidden sm:block">
      <Select
        value={value ?? "default"}
        onValueChange={(v) => onChange(v === "default" ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">默认</SelectItem>
          {providers.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.displayName}
              {p.defaultModel ? ` · ${p.defaultModel}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
