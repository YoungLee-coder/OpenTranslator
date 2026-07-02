import type { FeatureManifest } from "@opentranslator/shared-types";
import { apiPut, ApiError } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";

interface Props {
  features: FeatureManifest[];
  onChanged: () => Promise<void>;
}

/** Modules (system) tab: enable/disable feature modules — drives the dynamic nav. */
export function ModulesSection({ features, onChanged }: Props) {
  async function toggle(key: string, enabled: boolean, name: string) {
    try {
      await apiPut(`/api/admin/features/${key}`, { enabled: !enabled });
      toast.success(`已${enabled ? "停用" : "启用"}「${name}」`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "操作失败");
    }
    await onChanged();
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>功能模块</CardTitle>
        <CardDescription>
          启用的模块会出现在控制台导航中。新增模块只需在后端注册 manifest +
          前端注册组件。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-rule">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模块</TableHead>
                <TableHead>说明</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((f) => (
                <TableRow key={f.key}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={f.enabled}
                        onCheckedChange={() =>
                          void toggle(f.key, f.enabled, f.name)
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {f.enabled ? "已启用" : "已停用"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
