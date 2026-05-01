import path from 'node:path';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';

type ConversionMode = 'mask-lossless' | 'art-q90';

function modeForFilename(filename: string): ConversionMode {
  const lower = filename.toLowerCase();
  if (lower.includes('mask')) return 'mask-lossless';
  return 'art-q90';
}

async function fileSizeBytes(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  return stat.size;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const dir = path.join(root, 'public', 'app-logo');

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const pngFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.png'))
    .map((e) => e.name);

  if (pngFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No PNG files found in public/app-logo');
    return;
  }

  for (const pngName of pngFiles) {
    const srcPath = path.join(dir, pngName);
    const webpName = pngName.replace(/\.png$/i, '.webp');
    const outPath = path.join(dir, webpName);

    const mode = modeForFilename(pngName);
    const pipeline = sharp(srcPath);

    if (mode === 'mask-lossless') {
      await pipeline.webp({ lossless: true, effort: 6 }).toFile(outPath);
    } else {
      await pipeline.webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(outPath);
    }

    const [srcBytes, outBytes] = await Promise.all([fileSizeBytes(srcPath), fileSizeBytes(outPath)]);
    const pct = ((outBytes / srcBytes) * 100).toFixed(1);

    // eslint-disable-next-line no-console
    console.log(`${pngName} -> ${webpName} (${srcBytes} B -> ${outBytes} B, ${pct}%) [${mode}]`);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});

