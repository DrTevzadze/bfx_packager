const fs = require("node:fs/promises");
const path = require("node:path");

async function copyFolderTo(sourcePath, destDir) {
  const source = path.resolve(sourcePath);
  const destRoot = path.resolve(destDir);
  const folderName = path.basename(source);
  const destination = path.join(destRoot, folderName);

  const sourceStat = await fs.stat(source);
  if (!sourceStat.isDirectory()) {
    throw new Error("Source is not a folder");
  }

  const destRootStat = await fs.stat(destRoot).catch(() => null);
  if (!destRootStat?.isDirectory()) {
    await fs.mkdir(destRoot, { recursive: true });
  }

  // Block only when the output path is the source or nested inside it
  // (e.g. copying Folder → Desktop/Folder is fine even if source lives under Desktop).
  const samePath =
    process.platform === "win32"
      ? source.toLowerCase() === destination.toLowerCase()
      : source === destination;
  if (samePath) {
    throw new Error("Destination folder is the same as the source");
  }

  const destInsideSource = path.relative(source, destination);
  if (
    destInsideSource &&
    !destInsideSource.startsWith("..") &&
    !path.isAbsolute(destInsideSource)
  ) {
    throw new Error("Cannot copy a folder into itself");
  }

  await fs.cp(source, destination, { recursive: true, force: true });

  return { destination };
}

module.exports = { copyFolderTo };
