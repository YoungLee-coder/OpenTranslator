import type {
  TranslateRequest,
  TranslateStreamEvent,
  WriteRequest,
  WriteStreamEvent,
} from "@opentranslator/shared-types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
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
  });
  if (!res.ok) {
    let msg = `${method} ${path} -> ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) msg = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, msg);
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
    let msg = `PUT /api/admin/profile/avatar -> ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) msg = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, msg);
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
    throw new ApiError(res.status, `translate stream -> ${res.status}`);
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
        yield JSON.parse(json) as TranslateStreamEvent;
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
    throw new ApiError(res.status, `write stream -> ${res.status}`);
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
        yield JSON.parse(json) as WriteStreamEvent;
      } catch {
        // skip malformed keepalives
      }
    }
  }
}
