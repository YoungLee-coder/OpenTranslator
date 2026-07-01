import { base64, base64Decode, constantTimeEqual, utf8Encode } from "./bytes";

/**
 * PBKDF2-SHA256 password hashing. Stored format: `pbkdf2$iterations$saltB64$hashB64`.
 * Uses Web Crypto so it runs natively in the Worker runtime.
 */

const ITERATIONS = 100_000;
const KEY_BITS = 256;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${base64(salt)}$${base64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = base64Decode(parts[2]!);
  const expected = parts[3]!;
  const hash = await deriveBits(password, salt, iterations);
  return constantTimeEqual(base64(hash), expected);
}

function deriveBits(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer>> {
  return crypto.subtle
    .importKey("raw", utf8Encode(password), "PBKDF2", false, ["deriveBits"])
    .then((baseKey) =>
      crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
        baseKey,
        KEY_BITS,
      ),
    )
    .then((buf) => new Uint8Array(buf));
}
