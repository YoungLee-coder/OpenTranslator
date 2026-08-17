import type {
  TranslateRequest,
  TranslateStreamEvent,
  WriteRequest,
  WriteStreamEvent,
} from "@opentranslator/shared-types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type ApiErrorBody = { error?: string; detail?: string };

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
    this.detail = detail;
    if (detail) console.warn("[provider]", detail);
  }
}

function logProviderEvent(ev: { type: string; error?: string; detail?: string }) {
  if (ev.type === "error" && ev.detail) {
    console.warn("[provider]", ev.detail);
  }
}

async function readErrorBody(res: Response): Promise<ApiErrorBody> {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return {};
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    //  readiness / 设置类 GET 不能吃浏览器启发式缓存，否则「重新检测」会打到旧结果
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await readErrorBody(res);
    throw new ApiError(
      res.status,
      data.error || `${method} ${path} -> ${res.status}`,
      data.detail,
    );
  }
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>("PUT", path, body);
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>("DELETE", path);
}

export async function apiUploadAvatar<T>(file: File): Promise<T> {
  const form = new FormData();
  form.append("avatar", file);
  const res = await fetch(`${API_BASE}/api/admin/profile/avatar`, {
    method: "PUT",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const data = await readErrorBody(res);
    throw new ApiError(
      res.status,
      data.error || `PUT /api/admin/profile/avatar -> ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

/**
 * POST /api/translate with stream=true and yield parsed SSE events.
 * The browser's fetch ReadableStream is parsed incrementally so deltas render
 * as they arrive.
 */
export async function* streamTranslate(
  req: TranslateRequest,
  signal?: AbortSignal,
): AsyncGenerator<TranslateStreamEvent> {
  const res = await fetch(`${API_BASE}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...req, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await readErrorBody(res);
    throw new ApiError(
      res.status,
      data.error || `translate stream -> ${res.status}`,
      data.detail,
    );
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataParts: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("data:")) {
          dataParts.push(line.slice(5).replace(/^ /, ""));
        }
      }
      if (dataParts.length === 0) continue;
      const json = dataParts.join("\n");
      try {
        const ev = JSON.parse(json) as TranslateStreamEvent;
        logProviderEvent(ev);
        yield ev;
      } catch {
        // skip malformed keepalives
      }
    }
  }
}

/**
 * POST /api/write with stream=true and yield parsed SSE events.
 */
export async function* streamWrite(
  req: WriteRequest,
  signal?: AbortSignal,
): AsyncGenerator<WriteStreamEvent> {
  const res = await fetch(`${API_BASE}/api/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...req, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await readErrorBody(res);
    throw new ApiError(
      res.status,
      data.error || `write stream -> ${res.status}`,
      data.detail,
    );
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataParts: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("data:")) {
          dataParts.push(line.slice(5).replace(/^ /, ""));
        }
      }
      if (dataParts.length === 0) continue;
      const json = dataParts.join("\n");
      try {
        const ev = JSON.parse(json) as WriteStreamEvent;
        logProviderEvent(ev);
        yield ev;
      } catch {
        // skip malformed keepalives
      }
    }
  }
}
