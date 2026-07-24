/**
 * Validate a provider base URL for outbound latency probes.
 * Blocks localhost / private / link-local targets to reduce SSRF risk.
 * Returns a normalized absolute URL string, or an error message.
 */
export function assertPublicHttpUrl(raw: string): { url: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "baseUrl is required" };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { error: "invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "URL must use http:// or https://" };
  }
  if (parsed.username || parsed.password) {
    return { error: "URL must not include credentials" };
  }
  const host = parsed.hostname.toLowerCase();
  if (isBlockedHost(host)) {
    return { error: "private or link-local targets are not allowed" };
  }
  return { url: parsed.href };
}

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function isBlockedHost(host: string): boolean {
  const bare = stripBrackets(host);

  if (
    bare === "localhost" ||
    bare.endsWith(".localhost") ||
    bare === "0.0.0.0" ||
    bare === "::" ||
    bare === "::1"
  ) {
    return true;
  }

  // IPv6 link-local fe80::/10
  if (bare.startsWith("fe80:")) return true;

  // IPv6 unique local fc00::/7
  if (/^f[cd][0-9a-f]{0,2}:/i.test(bare)) return true;

  // IPv4-mapped IPv6: ::ffff:127.0.0.1 or ::ffff:7f00:1
  const mapped = extractIpv4Mapped(bare);
  if (mapped && isPrivateIpv4(mapped)) return true;

  // Plain IPv4
  const v4 = parseIpv4(bare);
  if (v4 && isPrivateIpv4(v4)) return true;

  return false;
}

/** Parse ::ffff:a.b.c.d or ::ffff:xxxx:yyyy into [a,b,c,d]. */
function extractIpv4Mapped(bare: string): [number, number, number, number] | null {
  // Compact or expanded forms ending in ::ffff:...
  const dotted = /(?::ffff:|0:0:0:0:0:ffff:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i.exec(
    bare,
  );
  if (dotted) {
    const parts = dotted.slice(1).map((s) => Number(s));
    if (parts.some((n) => n > 255)) return null;
    return parts as [number, number, number, number];
  }
  const hex = /(?::ffff:|0:0:0:0:0:ffff:)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(bare);
  if (!hex || hex[1] === undefined || hex[2] === undefined) return null;
  const hi = Number.parseInt(hex[1], 16);
  const lo = Number.parseInt(hex[2], 16);
  if (Number.isNaN(hi) || Number.isNaN(lo)) return null;
  return [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff];
}

function parseIpv4(host: string): [number, number, number, number] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const parts = m.slice(1).map((s) => Number(s));
  if (parts.some((n) => n > 255)) return null;
  return parts as [number, number, number, number];
}

function isPrivateIpv4([a, b]: [number, number, number, number]): boolean {
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}
