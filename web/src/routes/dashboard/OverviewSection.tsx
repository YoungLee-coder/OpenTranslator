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

  const providerNames = useMemo(
    () => new Map(providers.map((p) => [p.id, p.displayName])),
    [providers],
  );

  // 已删除供应商不出现在表格里，但其用量仍计入上方总数
  const visibleByProvider = useMemo(
    () =>
      usage.byProvider.filter((p) => providerNames.has(p.providerId)),
    [usage, providerNames],
  );

  const rise = useOnceAnimation(true, 650);
  // 数据就绪后整块淡入；加载中先露出空表头
  const tableEnter = useOnceAnimation(ready && visibleByProvider.length > 0, 400);
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
              />
              <StatTile
                icon={<FileText className="size-4" />}
                value={usage.totalChars}
                label={t("overview.totalChars")}
                format={(n) => n.toLocaleString()}
                delayMs={60}
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
                    {visibleByProvider.map((p) => (
                      <TableRow key={p.providerId}>
                        <TableCell>
                          {providerNames.get(p.providerId) ?? p.providerId}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <CountCell value={p.requests} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <CountCell
                            value={p.chars}
                            format={(n) => n.toLocaleString()}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
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
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  format?: (n: number) => string;
  delayMs?: number;
}) {
  const display = useCountUp(value, { delayMs });
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
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const display = useCountUp(value, { durationMs: 520 });
  return <>{format ? format(display) : display}</>;
}
