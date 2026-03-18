import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const AES_256_GCM_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

type EncodedCipherPayload = {
  iv: string;
  tag: string;
  ciphertext: string;
};

function normalizeKey(rawKey: Buffer | string) {
  if (Buffer.isBuffer(rawKey)) {
    if (rawKey.length !== 32) {
      throw new Error("Encryption key must be 32 bytes for AES-256-GCM.");
    }

    return rawKey;
  }

  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  try {
    const asBase64 = Buffer.from(rawKey, "base64");
    if (asBase64.length === 32) {
      return asBase64;
    }
  } catch {
    // Fall through to deterministic hashing.
  }

  return createHash("sha256").update(rawKey, "utf8").digest();
}

function encodePayload(payload: EncodedCipherPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function decodePayload(encodedPayload: string): EncodedCipherPayload {
  const decoded = Buffer.from(encodedPayload, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as Partial<EncodedCipherPayload>;

  if (!parsed.iv || !parsed.tag || !parsed.ciphertext) {
    throw new Error("Encrypted payload is malformed.");
  }

  return {
    iv: parsed.iv,
    tag: parsed.tag,
    ciphertext: parsed.ciphertext,
  };
}

export function createTaskKey() {
  return randomBytes(32);
}

export function encodeTaskKey(taskKey: Buffer) {
  return taskKey.toString("base64");
}

export function decodeTaskKey(encodedTaskKey: string) {
  const decoded = Buffer.from(encodedTaskKey, "base64");

  if (decoded.length !== 32) {
    throw new Error("Task encryption key must decode to 32 bytes.");
  }

  return decoded;
}

export function getMasterEncryptionKey() {
  const masterKey = process.env.DATA_ENCRYPTION_MASTER_KEY;

  if (!masterKey) {
    throw new Error("Missing DATA_ENCRYPTION_MASTER_KEY.");
  }

  return normalizeKey(masterKey);
}

export function encrypt(plaintext: string, encryptionKey: Buffer | string) {
  const key = normalizeKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(AES_256_GCM_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return encodePayload({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  });
}

export function decrypt(encodedCiphertext: string, encryptionKey: Buffer | string) {
  const key = normalizeKey(encryptionKey);
  const payload = decodePayload(encodedCiphertext);
  const decipher = createDecipheriv(
    AES_256_GCM_ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function encryptTaskKey(taskKey: Buffer) {
  return encrypt(encodeTaskKey(taskKey), getMasterEncryptionKey());
}

export function decryptTaskKey(encryptedTaskKey: string) {
  return decodeTaskKey(decrypt(encryptedTaskKey, getMasterEncryptionKey()));
}
