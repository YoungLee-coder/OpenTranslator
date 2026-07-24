import type { FeatureManifest } from "@opentranslator/shared-types";
import { apiPut, ApiError } from "@/lib/api-client";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";

interface Props {
  features: FeatureManifest[];
  onChanged: () => Promise<void>;
}

/** Modules (system) tab: enable/disable feature modules — drives the dynamic nav. */
export function ModulesSection({ features, onChanged }: Props) {
  const { t } = useTranslation();

  async function toggle(key: string, enabled: boolean, name: string) {
    try {
      await apiPut(`/api/admin/features/${key}`, { enabled: !enabled });
      toast.success(
        enabled
          ? t("modules.disabledToast", { name })
          : t("modules.enabledToast", { name }),
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("common.operationFailed"));
    }
    await onChanged();
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>{t("modules.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-rule">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("modules.module")}</TableHead>
                <TableHead>{t("modules.descriptionCol")}</TableHead>
                <TableHead>{t("modules.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((f) => (
                <TableRow key={f.key}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="max-w-0 text-muted-foreground">
                    <span className="block truncate" title={f.description ?? undefined}>
                      {f.description ?? "—"}
                    </span>
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
                        {f.enabled ? t("common.enabled") : t("common.disabled")}
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
