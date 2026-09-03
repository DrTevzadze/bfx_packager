const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

async function zipFolderToBfx(folderPath) {
  const { ZipArchive } = await import("archiver");

  const folder = path.resolve(folderPath);
  const folderName = path.basename(folder);
  const parentDir = path.dirname(folder);
  const zipPath = path.join(parentDir, `${folderName}.zip`);
  const bfxPath = path.join(parentDir, `${folderName}.bfx`);

  await fsp.rm(zipPath, { force: true });
  await fsp.rm(bfxPath, { force: true });

  const bytesWritten = await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", () => resolve(archive.pointer()));
    archive.on("error", reject);
    output.on("error", reject);

    archive.pipe(output);
    archive.directory(folder, folderName);
    archive.finalize();
  });

  await fsp.rename(zipPath, bfxPath);

  return { bfxPath, bytesWritten };
}

module.exports = { zipFolderToBfx };
