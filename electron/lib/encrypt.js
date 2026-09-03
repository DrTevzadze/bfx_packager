const fs = require("node:fs/promises");
const path = require("node:path");
const {
  BadEditsCryptoError,
  decryptBytes,
  encryptBytes,
  generateKey,
  keyFromText,
  MAGIC_ENC,
} = require("./crypto");

const AAD = Buffer.from("badedits-encryption-cli:json:v1", "ascii");
// Hardcoded key (base64url). Same as badedits_encryption — anyone with this key can decrypt.
const EMBEDDED_KEY_TEXT = "vc5D5GwANzwSWoqNNSryi9-K6snJe6WYe8iV6H1nrVM";
const EMBEDDED_KEY = keyFromText(EMBEDDED_KEY_TEXT);
const ENCRYPTABLE_EXT = new Set([".json", ".jsx"]);

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    const out = {};
    for (const k of keys) out[k] = canonicalizeJson(value[k]);
    return out;
  }
  return value;
}

async function readJsonBytes(inPath) {
  let raw = await fs.readFile(inPath);
  if (
    raw.length >= 3 &&
    raw[0] === 0xef &&
    raw[1] === 0xbb &&
    raw[2] === 0xbf
  ) {
    raw = raw.subarray(3);
  }

  let obj;
  try {
    const text = raw.toString("utf8").replace(/^\uFEFF/, "");
    obj = JSON.parse(text);
  } catch (e) {
    throw new BadEditsCryptoError(
      `Input is not valid JSON: ${inPath} (${e.message})`
    );
  }

  const canon = canonicalizeJson(obj);
  return Buffer.from(JSON.stringify(canon), "utf8");
}

async function readPlaintextBytes(inPath) {
  const ext = path.extname(inPath).toLowerCase();
  if (ext === ".json") return readJsonBytes(inPath);
  return fs.readFile(inPath);
}

async function atomicWriteFile(outPath, bytes) {
  const dir = path.dirname(outPath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(outPath)}.${Date.now()}.${Math.random()
      .toString(16)
      .slice(2)}.tmp`
  );
  await fs.writeFile(tmp, bytes);
  await fs.rename(tmp, outPath);
}

async function isAlreadyEncrypted(filePath) {
  try {
    const fh = await fs.open(filePath, "r");
    try {
      const buf = Buffer.alloc(MAGIC_ENC.length);
      await fh.read(buf, 0, MAGIC_ENC.length, 0);
      return buf.equals(MAGIC_ENC);
    } finally {
      await fh.close();
    }
  } catch {
    return false;
  }
}

async function runSelfTests(outPath, plaintext, key) {
  const encOnDisk = await fs.readFile(outPath);

  const hasMagic = encOnDisk.subarray(0, MAGIC_ENC.length).equals(MAGIC_ENC);
  if (!hasMagic) {
    throw new BadEditsCryptoError("Self-test failed: missing BENC1 header");
  }

  const roundtrip = decryptBytes(encOnDisk, key, { aad: AAD });
  if (!Buffer.isBuffer(roundtrip) || !roundtrip.equals(plaintext)) {
    throw new BadEditsCryptoError("Self-test failed: decrypt roundtrip mismatch");
  }

  let wrongKeyFailed = false;
  try {
    decryptBytes(encOnDisk, generateKey(), { aad: AAD });
  } catch {
    wrongKeyFailed = true;
  }
  if (!wrongKeyFailed) {
    throw new BadEditsCryptoError(
      "Self-test failed: decryption succeeded with wrong key"
    );
  }

  return { header: true, roundtrip: true, wrongKey: true };
}

async function findEncryptableFiles(rootDir) {
  const results = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (typeof entry.isSymbolicLink === "function" && entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (entry.isFile() && ENCRYPTABLE_EXT.has(ext)) {
        results.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return results;
}

async function encryptFile(inPath, key) {
  const outPath = `${inPath}.enc`;

  if (await isAlreadyEncrypted(outPath)) {
    return {
      sourcePath: inPath,
      outPath,
      skipped: true,
      reason: "output already encrypted",
    };
  }

  const plaintext = await readPlaintextBytes(inPath);
  const encrypted = encryptBytes(plaintext, key, { aad: AAD });
  await atomicWriteFile(outPath, encrypted);

  const selfTests = await runSelfTests(outPath, plaintext, key);
  await fs.unlink(inPath);

  return {
    sourcePath: inPath,
    outPath,
    skipped: false,
    selfTests,
  };
}

async function encryptFolder(folderPath) {
  const root = path.resolve(folderPath);
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) {
    throw new Error("Not a folder");
  }

  const key = EMBEDDED_KEY;
  const sourceFiles = await findEncryptableFiles(root);
  const encrypted = [];
  const skipped = [];
  const errors = [];

  for (const sourcePath of sourceFiles) {
    try {
      const result = await encryptFile(sourcePath, key);
      if (result.skipped) skipped.push(result);
      else encrypted.push(result);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ path: sourcePath, error });
    }
  }

  return {
    folderPath: root,
    encryptedCount: encrypted.length,
    encrypted,
    skipped,
    errors,
  };
}

module.exports = { encryptFolder };
