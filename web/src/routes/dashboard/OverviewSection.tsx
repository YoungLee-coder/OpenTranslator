import { useEffect, useState } from "react";
import { Activity, FileText, AlertCircle } from "lucide-react";
import type { UsageSummary } from "@opentranslator/shared-types";
import { apiGet, ApiError } from "@/lib/api-client";
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
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiGet<{ usage: UsageSummary }>("/api/admin/usage");
      setUsage(res.usage);
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
        <CardTitle>用量概览</CardTitle>
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
                label="总请求数"
              />
              <StatTile
                icon={<FileText className="size-4" />}
                value={usage.totalChars.toLocaleString()}
                label="总字符数"
              />
            </div>

            {usage.byProvider.length > 0 && (
              <div className="overflow-hidden rounded-md border border-rule">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>供应商</TableHead>
                      <TableHead className="text-right">请求数</TableHead>
                      <TableHead className="text-right">字符数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.byProvider.map((p) => (
                      <TableRow key={p.providerId}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.providerId.slice(0, 8)}
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
