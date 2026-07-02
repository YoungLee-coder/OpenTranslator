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

interface BindingState {
  db: boolean;
  kv: boolean;
}

export function SetupRequiredPage() {
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
            服务未就绪
          </h1>
        </div>

        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          Worker 尚未绑定运行所需的存储资源，翻译与控制台均无法使用。请在
          Cloudflare Dashboard 完成绑定后重新检测。
        </p>

        <Alert variant="warning" className="mb-5">
          <AlertTriangle />
          <AlertTitle>缺失的绑定</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 flex flex-col gap-1.5">
              <li className="flex items-center gap-2">
                <Database className="size-3.5" />
                <span>D1 数据库（binding 名 <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">DB</code>）</span>
                <span
                  className={
                    dbMissing
                      ? "font-medium text-warning"
                      : "text-muted-foreground"
                  }
                >
                  {dbMissing ? "未连接" : "已连接"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <KeyRound className="size-3.5" />
                <span>KV 命名空间（binding 名 <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">SETTINGS_KV</code>）</span>
                <span
                  className={
                    kvMissing
                      ? "font-medium text-warning"
                      : "text-muted-foreground"
                  }
                >
                  {kvMissing ? "未连接" : "已连接"}
                </span>
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="mb-5 rounded-lg border border-rule bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">配置步骤</p>
          <ol className="flex flex-col gap-1.5 [counter-reset:step]">
            <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
              Cloudflare Dashboard → Workers &amp; Pages → 选择本 Worker → Settings → Bindings
            </li>
            <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
              添加 D1 数据库，binding 名填 <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">DB</code>
            </li>
            <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
              添加 KV 命名空间，binding 名填 <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">SETTINGS_KV</code>
            </li>
            <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
              重新部署后访问 <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">/api/init/&lt;JWT_SECRET&gt;</code> 幂等建表
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
              检测中…
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              重新检测
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
