/**
 * One-off image pipeline. Run `npm run images` after changing a source image
 * in src/assets/source/. Outputs are committed, so the build itself does no
 * image processing.
 *
 *   src/assets/images/<name>-<width>.{avif,webp,jpg}   responsive variants
 *   public/og-image.jpg                                  1200x630 social card
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src/assets/source');
const OUT = path.join(ROOT, 'src/assets/images');

/** Matches the hero JPEG's flat background, so padding blends invisibly. */
const HERO_BG = { r: 1, g: 25, b: 85 };

const JOBS = [
  {
    name: 'hero-bridge',
    source: 'hero-bridge.jpg',
    widths: [640, 960, 1280, 1758],
  },
  {
    // The two figures meeting mid-bridge: one blue, one pink. Used on
    // Community, where the two audiences carry the same blue/pink accents.
    name: 'bridge-figures',
    source: 'hero-bridge.jpg',
    extract: { left: 479, top: 100, width: 800, height: 400 },
    widths: [400, 800],
  },
];

async function run() {
  await fs.mkdir(OUT, { recursive: true });

  for (const job of JOBS) {
    const input = path.join(SRC, job.source);
    for (const width of job.widths) {
      let base = sharp(input);
      if (job.extract) base = base.extract(job.extract);
      base = base.resize({ width, withoutEnlargement: true });

      const file = (ext) => path.join(OUT, `${job.name}-${width}.${ext}`);
      await Promise.all([
        base.clone().avif({ quality: 55, effort: 6 }).toFile(file('avif')),
        base.clone().webp({ quality: 78 }).toFile(file('webp')),
        base.clone().jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(file('jpg')),
      ]);
    }
  }

  // Open Graph / Twitter card: 1200x630, hero letterboxed on its own navy.
  await sharp(path.join(SRC, 'hero-bridge.jpg'))
    .resize({ width: 1200, height: 630, fit: 'contain', background: HERO_BG })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(ROOT, 'public/og-image.jpg'));

  const files = await fs.readdir(OUT);
  for (const f of files.sort()) {
    const { size } = await fs.stat(path.join(OUT, f));
    console.log(`${f.padEnd(28)} ${(size / 1024).toFixed(1).padStart(6)} KB`);
  }
}

await run();
