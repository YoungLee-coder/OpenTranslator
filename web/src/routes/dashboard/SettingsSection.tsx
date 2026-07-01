import { useEffect, useState } from "react";
import type { SiteSettings } from "@opentranslator/shared-types";
import { ApiError, apiGet, apiPut } from "../../lib/api-client";

export function SettingsSection() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    try {
      const res = await apiGet<{ settings: SiteSettings }>("/api/admin/settings");
      setSettings(res.settings);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(patch: Partial<SiteSettings>) {
    setSaving(true);
    setSaved(false);
    try {
      const res = await apiPut<{ settings: SiteSettings }>("/api/admin/settings", patch);
      setSettings(res.settings);
      setSaved(true);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (settings === null) {
    return (
      <section className="panel">
        <h2>站点设置</h2>
        {error ? <p className="error-text">{error}</p> : <p className="hint">加载中…</p>}
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>站点设置</h2>
      {error && <p className="error-text">{error}</p>}
      {saved && <p className="ok-text">已保存</p>}

      <label className="row">
        <div>
          <div className="row__title">公开访问</div>
          <div className="row__desc">关闭后，访客需登录才能使用翻译器。</div>
        </div>
        <input
          type="checkbox"
          checked={settings.sitePublic}
          onChange={(e) => setSettings({ ...settings, sitePublic: e.target.checked })}
        />
      </label>

      <label className="row">
        <div>
          <div className="row__title">公开模式限流（次/分钟）</div>
          <div className="row__desc">匿名访客每分钟最大请求数。</div>
        </div>
        <input
          type="number"
          min={1}
          value={settings.publicRateLimitPerMinute}
          onChange={(e) =>
            setSettings({ ...settings, publicRateLimitPerMinute: Number(e.target.value) })
          }
        />
      </label>

      <label className="row">
        <div>
          <div className="row__title">登录用户限流（次/分钟）</div>
          <div className="row__desc">登录管理员每分钟最大请求数。</div>
        </div>
        <input
          type="number"
          min={1}
          value={settings.authedRateLimitPerMinute}
          onChange={(e) =>
            setSettings({ ...settings, authedRateLimitPerMinute: Number(e.target.value) })
          }
        />
      </label>

      <label className="row">
        <div>
          <div className="row__title">翻译结果缓存</div>
          <div className="row__desc">相同文本+语言对命中 KV 缓存时直接返回，省时省额度。</div>
        </div>
        <input
          type="checkbox"
          checked={settings.translationCacheEnabled}
          onChange={(e) =>
            setSettings({ ...settings, translationCacheEnabled: e.target.checked })
          }
        />
      </label>

      <button
        className="btn btn-primary"
        type="button"
        disabled={saving}
        onClick={() =>
          save({
            sitePublic: settings.sitePublic,
            publicRateLimitPerMinute: settings.publicRateLimitPerMinute,
            authedRateLimitPerMinute: settings.authedRateLimitPerMinute,
            translationCacheEnabled: settings.translationCacheEnabled,
          })
        }
      >
        {saving ? "保存中…" : "保存设置"}
      </button>
    </section>
  );
}
