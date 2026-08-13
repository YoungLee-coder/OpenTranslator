import { useRef, useState, type ChangeEvent } from "react";
import {
  parseSiteBackup,
  type SiteBackup,
  type SiteBackupImportResult,
} from "@opentranslator/shared-types";
import { apiGet, apiPost, ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const MAX_FILE_BYTES = 1_000_000;

function backupFilename(exportedAt: string): string {
  const day = exportedAt.slice(0, 10);
  return day
    ? `opentranslator-backup-${day}.json`
    : "opentranslator-backup.json";
}

function downloadJson(backup: SiteBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename(backup.exportedAt);
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  onImported: () => Promise<void>;
}

export function DataBackupSection({ onImported }: Props) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<SiteBackup | null>(null);

  async function exportBackup() {
    setExporting(true);
    try {
      const backup = await apiGet<SiteBackup>("/api/admin/backup");
      downloadJson(backup);
      toast.success(t("backup.exported"));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("common.operationFailed"));
    } finally {
      setExporting(false);
    }
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t("backup.fileTooLarge"));
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error(t("backup.invalidFile"));
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      toast.error(t("backup.invalidFile"));
      return;
    }
    const backup = parseSiteBackup(raw);
    if (!backup) {
      toast.error(t("backup.invalidFile"));
      return;
    }
    setPending(backup);
  }

  async function confirmImport() {
    if (!pending) return;
    setImporting(true);
    try {
      const res = await apiPost<SiteBackupImportResult>(
        "/api/admin/backup",
        pending,
      );
      setPending(null);
      await onImported();
      const skip = res.skippedProviders + res.skippedModules;
      toast.success(
        skip > 0
          ? t("backup.importedWithSkip", {
              providers: res.providers,
              settings: res.settings,
              modules: res.featureModules,
              skipped: skip,
            })
          : t("backup.imported", {
              providers: res.providers,
              settings: res.settings,
              modules: res.featureModules,
            }),
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("common.operationFailed"));
    } finally {
      setImporting(false);
    }
  }

  const busy = exporting || importing;

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>{t("backup.title")}</CardTitle>
        <CardDescription>{t("backup.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void onFileChange(e)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={() => void exportBackup()}
        >
          <Download className="size-4" />
          {exporting ? t("backup.exporting") : t("backup.export")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" />
          {t("backup.import")}
        </Button>
      </CardContent>

      <Dialog open={!!pending} onOpenChange={(o) => !o && !importing && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("backup.importTitle")}</DialogTitle>
            <DialogDescription>
              {pending
                ? t("backup.importDesc", {
                    providers: pending.providers.length,
                    settings: Object.keys(pending.siteSettings).length,
                    modules: pending.featureModules.length,
                  })
                : t("backup.importTitle")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPending(null)}
              disabled={importing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmImport()}
              disabled={importing}
            >
              {importing ? t("backup.importing") : t("backup.confirmImport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
