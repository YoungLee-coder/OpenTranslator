import { useEffect, useMemo, useState } from "react";
import { Activity, FileText, AlertCircle } from "lucide-react";
import type { ProviderRecord, UsageSummary } from "@opentranslator/shared-types";
import { apiGet, ApiError } from "@/lib/api-client";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function OverviewSection() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const rise = useOnceAnimation(true, 650);
  // 覆盖最晚一行 stagger（约 160+ n*70）+ settle 时长
  const tableEnter = useOnceAnimation(!!usage && usage.byProvider.length > 0, 900);

  const providerNames = useMemo(
    () => new Map(providers.map((p) => [p.id, p.displayName])),
    [providers],
  );

  async function load() {
    try {
      const [usageRes, providersRes] = await Promise.all([
        apiGet<{ usage: UsageSummary }>("/api/admin/usage"),
        apiGet<{ providers: ProviderRecord[] }>("/api/admin/providers"),
      ]);
      setUsage(usageRes.usage);
      setProviders(providersRes.providers);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
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

        {usage ? (
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

            {usage.byProvider.length > 0 && (
              <div className="rounded-md border border-rule">
                <Table className="min-w-[360px]">
                  <TableHeader>
                    <TableRow
                      className={cn(
                        tableEnter &&
                          "animate-settle motion-reduce:animate-none [animation-delay:80ms]",
                      )}
                    >
                      <TableHead>{t("overview.provider")}</TableHead>
                      <TableHead className="text-right">{t("overview.requests")}</TableHead>
                      <TableHead className="text-right">{t("overview.chars")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.byProvider.map((p, i) => (
                      <TableRow
                        key={p.providerId}
                        className={cn(
                          tableEnter &&
                            "animate-settle motion-reduce:animate-none",
                        )}
                        style={
                          tableEnter
                            ? { animationDelay: `${140 + i * 70}ms` }
                            : undefined
                        }
                      >
                        <TableCell>
                          {providerNames.get(p.providerId) ?? p.providerId}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.requests}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.chars.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : (
          !error && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule">
                <Skeleton className="h-24 rounded-none" />
                <Skeleton className="h-24 rounded-none" />
              </div>
              <Skeleton className="h-40 rounded-md" />
            </div>
          )
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
  // 指标块不做 opacity 进场，避免 skeleton→内容时闪白；签名动效只保留 count-up
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
