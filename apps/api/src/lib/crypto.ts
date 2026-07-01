import { base64, base64Decode, utf8Decode, utf8Encode } from "./bytes";

/**
 * AES-GCM symmetric encryption for provider API keys.
 * The master key is derived (PBKDF2) from the ENCRYPTION_KEY secret so the
 * stored D1 rows are useless without it. Format: base64(iv || ciphertext).
 */

const KEY_CACHE = new Map<string, Promise<CryptoKey>>();
const PBKDF2_SALT = utf8Encode("opentranslator/aes-key/v1");
const ITERATIONS = 100_000;

function getKey(secret: string): Promise<CryptoKey> {
  let key = KEY_CACHE.get(secret);
  if (!key) {
    const baseKeyP = crypto.subtle.importKey(
      "raw",
      utf8Encode(secret),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    key = baseKeyP.then((baseKey) =>
      crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: PBKDF2_SALT, iterations: ITERATIONS, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      ),
    );
    KEY_CACHE.set(secret, key);
  }
  return key;
}

export async function encryptSecret(plaintext: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, utf8Encode(plaintext)),
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0);
  packed.set(ct, iv.length);
  return base64(packed);
}

export async function decryptSecret(packedB64: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const packed = base64Decode(packedB64);
  const iv = packed.slice(0, 12);
  const ct = packed.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return utf8Decode(new Uint8Array(pt));
}
