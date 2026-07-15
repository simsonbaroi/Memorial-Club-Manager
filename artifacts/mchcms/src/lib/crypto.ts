// Password hashing using Web Crypto API (PBKDF2) — no external library needed

const ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const HASH_ALGO = 'SHA-256';

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(hex.length / 2) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

export async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufToHex(salt.buffer);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBuf(salt), iterations: ITERATIONS, hash: HASH_ALGO },
    keyMaterial, KEY_LENGTH
  );
  return bufToHex(bits);
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed === hash;
}

export function generateToken(): string {
  const arr = crypto.getRandomValues(new Uint8Array(32));
  return bufToHex(arr.buffer);
}

export function generateId(): string {
  return crypto.randomUUID();
}
