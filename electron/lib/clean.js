const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * Recursively removes macOS AppleDouble files (._*) and .DS_Store.
 * Ported from remove_artifacts/dot-underscore-cleaner.
 */
async function removeArtifacts(rootDir) {
  let removedCount = 0;
  const warnings = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      warnings.push(`Skipping (cannot read): ${dir} -> ${err.message}`);
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

      const shouldDelete =
        entry.isFile() &&
        (entry.name.startsWith("._") || entry.name === ".DS_Store");

      if (shouldDelete) {
        try {
          await fs.unlink(fullPath);
          removedCount += 1;
        } catch (err) {
          warnings.push(`Failed to delete: ${fullPath} -> ${err.message}`);
        }
      }
    }
  }

  await walk(rootDir);
  return { removedCount, warnings };
}

async function cleanFolder(inputPath) {
  const resolved = path.resolve(inputPath);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) {
    throw new Error("Not a folder");
  }

  const { removedCount, warnings } = await removeArtifacts(resolved);
  return {
    path: resolved,
    removedCount,
    warnings,
  };
}

module.exports = { cleanFolder, removeArtifacts };
