const crypto = require("node:crypto");

const MAGIC_ENC = Buffer.from("BENC1", "ascii");
const MAGIC_KEY = Buffer.from("BKEY1", "ascii");
const NONCE_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

class BadEditsCryptoError extends Error {}

function generateKey() {
  return crypto.randomBytes(KEY_LEN);
}

function keyToText(key) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_LEN) {
    throw new BadEditsCryptoError("Key must be 32 bytes (AES-256).");
  }
  return key.toString("base64url");
}

function keyFromText(text) {
  let key;
  try {
    key = Buffer.from(String(text).trim(), "base64url");
  } catch {
    throw new BadEditsCryptoError("Key file is not valid base64url.");
  }
  if (key.length !== KEY_LEN) {
    throw new BadEditsCryptoError("Key must decode to 32 bytes (AES-256).");
  }
  return key;
}

function saveKeyFileBytes(key) {
  const txt = keyToText(key);
  return Buffer.concat([
    MAGIC_KEY,
    Buffer.from("\n"),
    Buffer.from(txt, "ascii"),
    Buffer.from("\n"),
  ]);
}

function loadKeyFileBytes(fileBytes) {
  const lines = fileBytes
    .toString("utf8")
    .split(/\r?\n/)
    .filter((l) => l.length > 0);
  if (lines.length < 2 || lines[0] !== MAGIC_KEY.toString("ascii")) {
    throw new BadEditsCryptoError("Not a BadEdits key file (bad header).");
  }
  return keyFromText(lines[1]);
}

function encryptBytes(plaintext, key, { aad } = {}) {
  if (!Buffer.isBuffer(plaintext)) plaintext = Buffer.from(plaintext);
  if (!Buffer.isBuffer(key) || key.length !== KEY_LEN) {
    throw new BadEditsCryptoError("Key must be 32 bytes (AES-256).");
  }

  const nonce = crypto.randomBytes(NONCE_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  if (aad) cipher.setAAD(Buffer.isBuffer(aad) ? aad : Buffer.from(aad));

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC_ENC, nonce, tag, ciphertext]);
}

function decryptBytes(encrypted, key, { aad } = {}) {
  if (!Buffer.isBuffer(encrypted)) encrypted = Buffer.from(encrypted);
  if (!Buffer.isBuffer(key) || key.length !== KEY_LEN) {
    throw new BadEditsCryptoError("Key must be 32 bytes (AES-256).");
  }
  if (encrypted.length < MAGIC_ENC.length + NONCE_LEN + TAG_LEN + 1) {
    throw new BadEditsCryptoError("Encrypted data is too short or corrupted.");
  }
  if (!encrypted.subarray(0, MAGIC_ENC.length).equals(MAGIC_ENC)) {
    throw new BadEditsCryptoError(
      "Not a BadEdits encrypted file (bad magic header)."
    );
  }

  const nonceStart = MAGIC_ENC.length;
  const tagStart = nonceStart + NONCE_LEN;
  const ctStart = tagStart + TAG_LEN;

  const nonce = encrypted.subarray(nonceStart, tagStart);
  const tag = encrypted.subarray(tagStart, ctStart);
  const ciphertext = encrypted.subarray(ctStart);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  if (aad) decipher.setAAD(Buffer.isBuffer(aad) ? aad : Buffer.from(aad));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new BadEditsCryptoError(
      "Decryption failed (wrong key or file was modified)."
    );
  }
}

module.exports = {
  BadEditsCryptoError,
  generateKey,
  keyToText,
  keyFromText,
  saveKeyFileBytes,
  loadKeyFileBytes,
  encryptBytes,
  decryptBytes,
  MAGIC_ENC,
};
