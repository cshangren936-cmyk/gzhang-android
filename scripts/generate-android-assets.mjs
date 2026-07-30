import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const iconSvg = await readFile(path.join(root, "public/icon.svg"));
const foregroundSvg = await readFile(
  path.join(root, "assets/android-foreground.svg"),
);
const res = path.join(root, "android/app/src/main/res");
const densities = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

for (const [density, size] of Object.entries(densities)) {
  const target = path.join(res, `mipmap-${density}`);
  await sharp(iconSvg).resize(size, size).png().toFile(path.join(target, "ic_launcher.png"));
  await sharp(iconSvg).resize(size, size).png().toFile(path.join(target, "ic_launcher_round.png"));
  await sharp(foregroundSvg)
    .resize(size, size)
    .png()
    .toFile(path.join(target, "ic_launcher_foreground.png"));
}

for (const directory of await readdir(res, { withFileTypes: true })) {
  if (!directory.isDirectory() || !directory.name.startsWith("drawable")) continue;
  const splashPath = path.join(res, directory.name, "splash.png");
  let metadata;
  try {
    metadata = await sharp(splashPath).metadata();
  } catch {
    continue;
  }
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height) continue;
  const iconSize = Math.round(Math.min(width, height) * 0.28);
  const renderedIcon = await sharp(iconSvg)
    .resize(iconSize, iconSize)
    .png()
    .toBuffer();
  const splash = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: "#F7F1E7",
    },
  })
    .composite([{ input: renderedIcon, gravity: "center" }])
    .png()
    .toBuffer();
  await writeFile(splashPath, splash);
}

console.log("Android launcher and splash assets generated.");
