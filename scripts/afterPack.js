const fs = require("node:fs");
const path = require("node:path");

function pngToIco(png) {
  if (png[0] !== 0x89 || png.toString("ascii", 1, 4) !== "PNG") {
    throw new Error("build/icon.png is not a PNG");
  }

  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(width >= 256 ? 0 : width, 6);
  header.writeUInt8(height >= 256 ? 0 : height, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const reseditMod = await import("resedit");
  const ResEdit = reseditMod.default ?? reseditMod;

  const exePath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.exe`
  );
  const pngPath = path.join(context.packager.projectDir, "build", "icon.png");
  if (!fs.existsSync(exePath) || !fs.existsSync(pngPath)) return;

  const iconFile = ResEdit.Data.IconFile.from(pngToIco(fs.readFileSync(pngPath)));
  const icons = iconFile.icons.map((item) => item.data);
  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);

  if (groups.length === 0) {
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, icons);
  } else {
    for (const group of groups) {
      ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        group.id,
        group.lang,
        icons
      );
    }
  }

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
};
