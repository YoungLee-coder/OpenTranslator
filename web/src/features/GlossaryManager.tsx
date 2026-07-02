import { useEffect, useState } from "react";
import type { GlossaryTerm } from "@opentranslator/shared-types";
import { apiDelete, apiGet, apiPost, ApiError } from "@/lib/api-client";
import { LANGUAGES, languageName } from "@/lib/languages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

/** Glossary feature admin page: CRUD site-wide term pairs. */
export function GlossaryManager() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [targetLang, setTargetLang] = useState("zh");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GlossaryTerm | null>(null);

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
      toast.success("术语已添加");
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      await apiDelete(`/api/admin/glossary/${target.id}`);
      toast.success(`已删除「${target.source}」`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>术语库</CardTitle>
        <CardDescription>
          按目标语言维护术语对。翻译时，匹配目标语言的术语会自动注入到提示词中强制替换。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form
          className="flex flex-wrap items-center gap-2 rounded-md border border-rule bg-muted/20 p-2.5"
          onSubmit={add}
        >
          <Input
            className="min-w-[140px] flex-1"
            type="text"
            placeholder="原文术语"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <Input
            className="min-w-[140px] flex-1"
            type="text"
            placeholder="目标译法"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <Select value={targetLang} onValueChange={setTargetLang}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={adding} className="gap-1.5">
            <Plus className="size-4" />
            {adding ? "添加中…" : "添加"}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-md border border-rule">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>原文术语</TableHead>
                <TableHead>目标译法</TableHead>
                <TableHead>目标语言</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    暂无术语。
                  </TableCell>
                </TableRow>
              )}
              {terms.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.source}</TableCell>
                  <TableCell>{t.target}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {languageName(t.targetLang)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      type="button"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="size-3" />
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除术语</DialogTitle>
            <DialogDescription>
              确认删除术语对「{deleteTarget?.source} → {deleteTarget?.target}」？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
