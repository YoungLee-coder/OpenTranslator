import { useEffect, useMemo, useState } from "react";
import { Activity, FileText, AlertCircle } from "lucide-react";
import type { ProviderRecord, UsageSummary } from "@opentranslator/shared-types";
import { apiGet, ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
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
    <Card className="animate-rise">
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
              />
              <StatTile
                icon={<FileText className="size-4" />}
                value={usage.totalChars.toLocaleString()}
                label={t("overview.totalChars")}
              />
            </div>

            {usage.byProvider.length > 0 && (
              <div className="rounded-md border border-rule">
                <Table className="min-w-[360px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("overview.provider")}</TableHead>
                      <TableHead className="text-right">{t("overview.requests")}</TableHead>
                      <TableHead className="text-right">{t("overview.chars")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.byProvider.map((p) => (
                      <TableRow key={p.providerId}>
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
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2 bg-card p-5">
      <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
