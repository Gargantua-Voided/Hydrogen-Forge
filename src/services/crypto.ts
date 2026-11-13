/**
 * Web Crypto API utilities for local database encryption at rest
 * and BLE Challenge-Response HMAC authentication with ESP32-S3.
 */

// Generate random hex string of given byte length
export function getRandomHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert string to Uint8Array
function strToBuf(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert ArrayBuffer to Hex string
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Derive AES-GCM or HMAC key using PBKDF2
export async function deriveKeyFromPassword(
  password: string,
  saltHex: string,
  usage: 'encrypt' | 'hmac'
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = hexToBuf(saltHex) as unknown as BufferSource;

  if (usage === 'encrypt') {
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } else {
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['sign']
    );
  }
}

// Encrypt plaintext with AES-GCM (returns iv:ciphertext as base64)
export async function encryptData(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = strToBuf(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    encoded as any
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Decrypt base64 ciphertext with AES-GCM
export async function decryptData(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const binary = atob(encryptedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    ciphertext as any
  );

  return new TextDecoder().decode(decrypted);
}

// Compute SHA-256 hash (returns hex)
export async function sha256Hex(data: string): Promise<string> {
  const hash = await window.crypto.subtle.digest('SHA-256', strToBuf(data) as any);
  return bufToHex(hash);
}

// Compute Password Verifier for ESP32-S3 NVS: SHA-256(salt + password)
export async function computePasswordVerifier(password: string, saltHex: string): Promise<string> {
  return sha256Hex(`${saltHex}:${password}`);
}

// Compute HMAC-SHA256 for BLE Challenge-Response Authentication
// Payload: challenge + ":" + timestamp + ":" + nonce
// Key: password verifier
export async function computeChallengeHmac(
  verifierHex: string,
  challengeHex: string,
  timestamp: number,
  nonceHex: string
): Promise<string> {
  const payload = `${challengeHex}:${timestamp}:${nonceHex}`;
  const keyBuf = strToBuf(verifierHex);

  const hmacKey = await window.crypto.subtle.importKey(
    'raw',
    keyBuf as any,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', hmacKey, strToBuf(payload) as any);
  return bufToHex(signature);
}

export interface PasswordStrength {
  score: number; // 0 - 100
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  hasMinLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (hasLower) score += 15;
  if (hasUpper) score += 15;
  if (hasNumber) score += 15;
  if (hasSymbol) score += 15;

  score = Math.min(100, score);

  let label: PasswordStrength['label'] = 'Weak';
  if (score >= 80) label = 'Strong';
  else if (score >= 60) label = 'Good';
  else if (score >= 40) label = 'Fair';

  return {
    score,
    label,
    hasMinLength,
    hasLower,
    hasUpper,
    hasNumber,
    hasSymbol,
  };
}
