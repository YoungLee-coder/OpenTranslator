import { useEffect, useState } from "react";
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
    <Card>
      <CardHeader>
        <CardTitle>用量概览</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {usage ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-2xl font-semibold tabular-nums">
                  {usage.totalRequests}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  总请求数
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-2xl font-semibold tabular-nums">
                  {usage.totalChars.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  总字符数
                </div>
              </div>
            </div>

            {usage.byProvider.length > 0 && (
              <div className="rounded-lg border">
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
                        <TableCell className="font-mono text-xs">
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
            <p className="text-sm text-muted-foreground">加载中…</p>
          )
        )}
      </CardContent>
    </Card>
  );
}
