const fs = require("node:fs/promises");
const path = require("node:path");

async function removeFolderRecursive(folderPath) {
  const resolved = path.resolve(folderPath);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) {
    throw new Error("Not a folder");
  }

  await fs.rm(resolved, { recursive: true, force: true });
  return { path: resolved };
}

module.exports = { removeFolderRecursive };
