import { useEffect, useState } from "react";
import type { GlossaryTerm } from "@opentranslator/shared-types";
import { ApiError, apiDelete, apiGet, apiPost } from "../lib/api-client";
import { LANGUAGES, languageName } from "../lib/languages";

/** Glossary feature admin page: CRUD site-wide term pairs. */
export function GlossaryManager() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [targetLang, setTargetLang] = useState("zh");
  const [adding, setAdding] = useState(false);

  async function load() {
    try {
      const res = await apiGet<{ terms: GlossaryTerm[] }>("/api/admin/glossary");
      setTerms(res.terms);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!source.trim() || !target.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await apiPost("/api/admin/glossary", {
        source: source.trim(),
        target: target.trim(),
        targetLang,
      });
      setSource("");
      setTarget("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiDelete(`/api/admin/glossary/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  return (
    <section className="panel">
      <h2>术语库</h2>
      <p className="row__desc" style={{ marginTop: 0 }}>
        按目标语言维护术语对。翻译时，匹配目标语言的术语会自动注入到提示词中强制替换。
      </p>

      <form className="glossary-form" onSubmit={add}>
        <input
          type="text"
          placeholder="原文术语"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <input
          type="text"
          placeholder="目标译法"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
          {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit" disabled={adding}>
          添加
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>原文术语</th>
            <th>目标译法</th>
            <th>目标语言</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {terms.length === 0 && (
            <tr>
              <td colSpan={4} className="hint">
                暂无术语。
              </td>
            </tr>
          )}
          {terms.map((t) => (
            <tr key={t.id}>
              <td>{t.source}</td>
              <td>{t.target}</td>
              <td className="mono">{languageName(t.targetLang)}</td>
              <td>
                <button className="link-btn danger" type="button" onClick={() => remove(t.id)}>
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
