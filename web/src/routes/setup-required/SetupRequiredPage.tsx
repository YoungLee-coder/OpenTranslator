import { useEffect, useState } from "react";
import type { PingResponse } from "@opentranslator/shared-types";
import { apiGet } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  Database,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface BindingState {
  db: boolean;
  kv: boolean;
}

export function SetupRequiredPage() {
  const { t } = useTranslation();
  const [bindings, setBindings] = useState<BindingState | null>(null);
  const [checking, setChecking] = useState(true);

  async function check() {
    setChecking(true);
    try {
      const res = await apiGet<PingResponse>("/api/ping");
      if (res.bindings?.db && res.bindings?.kv) {
        // 绑定已恢复，整页刷新回首页以重新走一遍初始化检测
        window.location.href = "/";
        return;
      }
      setBindings({ db: !!res.bindings?.db, kv: !!res.bindings?.kv });
    } catch {
      setBindings({ db: false, kv: false });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void check();
  }, []);

  const dbMissing = bindings ? !bindings.db : false;
  const kvMissing = bindings ? !bindings.kv : false;

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-rise rounded-xl border border-rule bg-card p-7 shadow-md">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-warning/15 text-warning">
            <AlertTriangle className="size-4.5" />
          </span>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {t("setup.title")}
          </h1>
        </div>

        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          {t("setup.description")}
        </p>

        <Alert variant="warning" className="mb-5">
          <AlertTriangle />
          <AlertTitle>{t("setup.missingBindings")}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 flex flex-col gap-1.5">
              <li className="flex items-center gap-2">
                <Database className="size-3.5" />
                <span>{t("setup.dbBinding")}</span>
                <span
                  className={
                    dbMissing
                      ? "font-medium text-warning"
                      : "text-muted-foreground"
                  }
                >
                  {dbMissing ? t("setup.notConnected") : t("setup.connected")}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <KeyRound className="size-3.5" />
                <span>{t("setup.kvBinding")}</span>
                <span
                  className={
                    kvMissing
                      ? "font-medium text-warning"
                      : "text-muted-foreground"
                  }
                >
                  {kvMissing ? t("setup.notConnected") : t("setup.connected")}
                </span>
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="mb-5 rounded-lg border border-rule bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">{t("setup.stepsTitle")}</p>
          <ol className="flex flex-col gap-1.5 [counter-reset:step]">
            <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
              {t("setup.step1")}
            </li>
            <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
              {t("setup.step2")}
            </li>
            <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
              {t("setup.step3")}
            </li>
            <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
              {t("setup.step4")}
            </li>
          </ol>
        </div>

        <Button
          type="button"
          className="h-10 w-full"
          disabled={checking}
          onClick={() => void check()}
        >
          {checking ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-rule border-t-transparent" />
              {t("setup.checking")}
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              {t("setup.recheck")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
