// Turns photos/originals/*.jpg into responsive AVIF + WebP files in
// public/photos and writes src/data/photo-meta.json (size, tint, tiny blur).
import { mkdir, readdir, writeFile, rm } from 'node:fs/promises'
import sharp from 'sharp'
import manifest from '../photos/photos.json' with { type: 'json' }

const SRC = 'photos/originals'
const OUT = 'public/photos'
const AVATAR_SIZE = [160, 320]
const WIDTHS = [480, 960, 1600]

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const files = (await readdir(SRC)).filter((f) => f.endsWith('.jpg')).sort()
const meta = {}

for (const file of files) {
  const name = file.replace(/\.jpg$/, '')
  const input = sharp(`${SRC}/${file}`).rotate()
  const isAvatar = name.endsWith('-avatar')
  const { width, height } = await input.metadata()

  let widths
  let pipeline = (w) => input.clone().resize({ width: w, withoutEnlargement: true })
  let ratio = width / height

  if (isAvatar) {
    widths = AVATAR_SIZE
    ratio = 1
    pipeline = (w) => input.clone().resize(w, w, { fit: 'cover', position: sharp.strategy.attention })
  } else {
    widths = WIDTHS.filter((w) => w <= width)
  }

  for (const w of widths) {
    await pipeline(w).avif({ quality: 52, effort: 5 }).toFile(`${OUT}/${name}-${w}.avif`)
    await pipeline(w).webp({ quality: 74 }).toFile(`${OUT}/${name}-${w}.webp`)
  }

  const tiny = await pipeline(16).webp({ quality: 40 }).toBuffer()
  const { dominant } = await input.clone().resize(64).stats()
  const hex = '#' + [dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, '0')).join('')

  meta[name] = {
    ratio: Number(ratio.toFixed(4)),
    widths,
    tint: hex,
    blur: `data:image/webp;base64,${tiny.toString('base64')}`,
  }
  process.stdout.write('.')
}

await writeFile('src/data/photo-meta.json', JSON.stringify(meta, null, 1) + '\n')

const credits = Object.fromEntries(
  manifest.map((p) => [p.file, { author: p.author, authorUrl: p.authorUrl, page: p.page }]),
)
await writeFile('src/data/photo-credits.json', JSON.stringify(credits, null, 1) + '\n')
console.log(`\n${files.length} photos processed`)
