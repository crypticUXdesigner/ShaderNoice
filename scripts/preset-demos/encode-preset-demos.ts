/**
 * Convert square preset demo masters (MP4) into hub assets (WebP poster + WebM loop).
 *
 * Input:  scripts/preset-demos/in/<preset-slug>.mp4  — 1080×1080, 30 fps
 * Output: public/preset-demos/<preset-slug>.webp     — 300×300 poster
 *         public/preset-demos/<preset-slug>.webm     — 300×300, 10 fps, no audio
 *
 * Run: npm run preset-demos:encode
 *      npm run preset-demos:encode -- rorschach watercolor-waves
 *      npm run preset-demos:encode -- --dry-run
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'scripts/preset-demos/in');
const OUTPUT_DIR = path.join(ROOT, 'public/preset-demos');

const EXPECTED_WIDTH = 1080;
const EXPECTED_HEIGHT = 1080;
const EXPECTED_FPS = 30;

const OUTPUT_SIZE = 300;
const OUTPUT_FPS = 10;
const DEFAULT_POSTER_OFFSET_SECONDS = 1.0;
/** Per-slug poster seek (seconds into master). Default is mid-loop; override when t=1s lands on a bad frame. */
const POSTER_OFFSET_SECONDS_BY_SLUG: Partial<Record<string, number>> = {};
const VP9_CRF = 32;

function resolvePosterOffsetSeconds(slug: string): number {
  return POSTER_OFFSET_SECONDS_BY_SLUG[slug] ?? DEFAULT_POSTER_OFFSET_SECONDS;
}

interface StreamInfo {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
}

interface EncodeResult {
  slug: string;
  webpBytes: number;
  webmBytes: number;
}

function parseArgs(argv: string[]): { slugs: string[]; dryRun: boolean } {
  const slugs: string[] = [];
  let dryRun = false;
  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    slugs.push(arg);
  }
  return { slugs, dryRun };
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function fileSizeBytes(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  return stat.size;
}

function parseFps(rate: string): number {
  const [num, den] = rate.split('/').map((part) => Number(part));
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return NaN;
  return num / den;
}

async function probeVideo(inputPath: string): Promise<StreamInfo> {
  const args = [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,r_frame_rate,duration',
    '-of',
    'csv=p=0',
    inputPath,
  ];
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let stdout = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`ffprobe exited with code ${code ?? 'unknown'}`));
    });
  });

  const [widthRaw, heightRaw, fpsRaw, durationRaw] = output.split(',');
  const width = Number(widthRaw);
  const height = Number(heightRaw);
  const fps = parseFps(fpsRaw);
  const durationSeconds = Number(durationRaw);

  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(fps) || !Number.isFinite(durationSeconds)) {
    throw new Error(`Could not parse ffprobe output for ${inputPath}: ${output}`);
  }

  return { width, height, fps, durationSeconds };
}

function validateMaster(slug: string, info: StreamInfo): void {
  const problems: string[] = [];
  if (info.width !== EXPECTED_WIDTH || info.height !== EXPECTED_HEIGHT) {
    problems.push(`expected ${EXPECTED_WIDTH}×${EXPECTED_HEIGHT}, got ${info.width}×${info.height}`);
  }
  if (Math.abs(info.fps - EXPECTED_FPS) > 0.01) {
    problems.push(`expected ${EXPECTED_FPS} fps, got ${info.fps.toFixed(3)} fps`);
  }
  if (problems.length > 0) {
    console.warn(`[${slug}] master does not match hub demo spec: ${problems.join('; ')}`);
  }
}

async function ensureFfmpegAvailable(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    child.on('error', () => reject(new Error('ffmpeg not found on PATH. Install ffmpeg and retry.')));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('ffmpeg not found on PATH. Install ffmpeg and retry.'));
    });
  });
}

async function listInputSlugs(filterSlugs: string[]): Promise<string[]> {
  const entries = await fs.readdir(INPUT_DIR, { withFileTypes: true });
  const slugs = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mp4'))
    .map((entry) => entry.name.replace(/\.mp4$/i, ''));

  if (filterSlugs.length === 0) {
    return slugs.sort();
  }

  const missing = filterSlugs.filter((slug) => !slugs.includes(slug));
  if (missing.length > 0) {
    throw new Error(`No input MP4 for slug(s): ${missing.join(', ')}`);
  }
  return filterSlugs;
}

async function encodePreset(slug: string, dryRun: boolean): Promise<EncodeResult> {
  const inputPath = path.join(INPUT_DIR, `${slug}.mp4`);
  const webpPath = path.join(OUTPUT_DIR, `${slug}.webp`);
  const webmPath = path.join(OUTPUT_DIR, `${slug}.webm`);

  const info = await probeVideo(inputPath);
  validateMaster(slug, info);

  const scaleFilter = `scale=${OUTPUT_SIZE}:${OUTPUT_SIZE}`;
  const posterOffsetSeconds = resolvePosterOffsetSeconds(slug);
  const posterArgs = [
    '-y',
    '-ss',
    String(posterOffsetSeconds),
    '-i',
    inputPath,
    '-vframes',
    '1',
    '-vf',
    scaleFilter,
    webpPath,
  ];
  const webmArgs = [
    '-y',
    '-i',
    inputPath,
    '-an',
    '-vf',
    `fps=${OUTPUT_FPS},${scaleFilter}`,
    '-c:v',
    'libvpx-vp9',
    '-crf',
    String(VP9_CRF),
    '-b:v',
    '0',
    '-row-mt',
    '1',
    webmPath,
  ];

  console.log(
    `\n[${slug}] ${info.width}×${info.height} @ ${info.fps.toFixed(2)} fps, ${info.durationSeconds.toFixed(2)} s (poster @ ${posterOffsetSeconds}s)`
  );
  if (dryRun) {
    console.log(`  ffmpeg ${posterArgs.join(' ')}`);
    console.log(`  ffmpeg ${webmArgs.join(' ')}`);
    return { slug, webpBytes: 0, webmBytes: 0 };
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await runCommand('ffmpeg', posterArgs);
  await runCommand('ffmpeg', webmArgs);

  const [webpBytes, webmBytes] = await Promise.all([fileSizeBytes(webpPath), fileSizeBytes(webmPath)]);
  console.log(`  -> ${path.relative(ROOT, webpPath)} (${webpBytes} B)`);
  console.log(`  -> ${path.relative(ROOT, webmPath)} (${webmBytes} B)`);
  return { slug, webpBytes, webmBytes };
}

async function main(): Promise<void> {
  const { slugs: filterSlugs, dryRun } = parseArgs(process.argv.slice(2));

  await fs.mkdir(INPUT_DIR, { recursive: true });
  if (!dryRun) {
    await ensureFfmpegAvailable();
  }

  const slugs = await listInputSlugs(filterSlugs);
  if (slugs.length === 0) {
    console.log(`No MP4 files in ${path.relative(ROOT, INPUT_DIR)}`);
    return;
  }

  const results: EncodeResult[] = [];
  for (const slug of slugs) {
    results.push(await encodePreset(slug, dryRun));
  }

  if (!dryRun && results.length > 0) {
    const totalWebp = results.reduce((sum, row) => sum + row.webpBytes, 0);
    const totalWebm = results.reduce((sum, row) => sum + row.webmBytes, 0);
    console.log(`\nEncoded ${results.length} preset demo(s). Posters: ${totalWebp} B total; loops: ${totalWebm} B total.`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
