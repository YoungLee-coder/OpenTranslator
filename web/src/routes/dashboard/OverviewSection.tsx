import { useEffect, useMemo, useState } from "react";
import { Activity, FileText, AlertCircle } from "lucide-react";
import type { ProviderRecord, UsageSummary } from "@opentranslator/shared-types";
import { ApiError } from "@/lib/api-client";
import {
  getOverviewSnapshot,
  loadOverviewSnapshot,
} from "@/lib/dashboard-overview-cache";
import { useCountUp } from "@/lib/useCountUp";
import { useOnceAnimation } from "@/lib/useOnceAnimation";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProviderIcon } from "@/components/ProviderIcon";

const EMPTY_USAGE: UsageSummary = {
  totalRequests: 0,
  totalChars: 0,
  byProvider: [],
};

export function OverviewSection() {
  const { t } = useTranslation();
  // 会话内 / sessionStorage 快照：有旧数先画；无快照时用 0 占位，不再出 skeleton
  const initial = getOverviewSnapshot();
  const [usage, setUsage] = useState<UsageSummary>(
    () => initial?.usage ?? EMPTY_USAGE,
  );
  const [providers, setProviders] = useState<ProviderRecord[]>(
    () => initial?.providers ?? [],
  );
  const [ready, setReady] = useState(() => !!initial);
  const [error, setError] = useState<string | null>(null);

  const providerById = useMemo(
    () => new Map(providers.map((p) => [p.id, p])),
    [providers],
  );

  // 已删除供应商不出现在表格里，但其用量仍计入上方总数
  const visibleByProvider = useMemo(
    () =>
      usage.byProvider.filter((p) => providerById.has(p.providerId)),
    [usage, providerById],
  );

  const rise = useOnceAnimation(true, 650);
  // 仅冷启动（无快照）才 soft-in；预加载命中则静默展示
  const fromCache = !!initial;
  const tableEnter = useOnceAnimation(
    ready && !fromCache && visibleByProvider.length > 0,
    400,
  );
  const showTable = !ready || visibleByProvider.length > 0;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snap = await loadOverviewSnapshot();
        if (cancelled) return;
        setUsage(snap.usage);
        setProviders(snap.providers);
        setReady(true);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setReady(true);
        // 有快照时静默保留旧数；仅冷启动失败才展示错误
        if (!getOverviewSnapshot()) {
          setError(e instanceof ApiError ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className={cn(rise && "animate-rise motion-reduce:animate-none")}>
      <CardHeader>
        <CardTitle>{t("overview.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && (
          <>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule">
              <StatTile
                icon={<Activity className="size-4" />}
                value={usage.totalRequests}
                label={t("overview.totalRequests")}
                delayMs={0}
                animate={!fromCache}
              />
              <StatTile
                icon={<FileText className="size-4" />}
                value={usage.totalChars}
                label={t("overview.totalChars")}
                format={(n) => n.toLocaleString()}
                delayMs={60}
                animate={!fromCache}
              />
            </div>

            {showTable && (
              <div
                className={cn(
                  "overflow-hidden rounded-md border border-rule transition-opacity duration-300 motion-reduce:transition-none",
                  ready ? "opacity-100" : "opacity-70",
                  tableEnter && "animate-soft-in motion-reduce:animate-none",
                )}
              >
                <Table className="min-w-[360px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("overview.provider")}</TableHead>
                      <TableHead className="text-right">{t("overview.requests")}</TableHead>
                      <TableHead className="text-right">{t("overview.chars")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleByProvider.map((p) => {
                      const provider = providerById.get(p.providerId);
                      return (
                        <TableRow key={p.providerId}>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5">
                              {provider ? (
                                <ProviderIcon type={provider.type} size={16} />
                              ) : null}
                              {provider?.displayName ?? p.providerId}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <CountCell value={p.requests} animate={!fromCache} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <CountCell
                              value={p.chars}
                              format={(n) => n.toLocaleString()}
                              animate={!fromCache}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({
  icon,
  value,
  label,
  format,
  delayMs = 0,
  animate = true,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  format?: (n: number) => string;
  delayMs?: number;
  animate?: boolean;
}) {
  const display = useCountUp(value, { delayMs, enabled: animate });
  const text = format ? format(display) : String(display);

  return (
    <div className="flex flex-col gap-2 bg-card p-5">
      <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums tracking-tight">
        {text}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function CountCell({
  value,
  format,
  animate = true,
}: {
  value: number;
  format?: (n: number) => string;
  animate?: boolean;
}) {
  const display = useCountUp(value, { durationMs: 520, enabled: animate });
  return <>{format ? format(display) : display}</>;
}
