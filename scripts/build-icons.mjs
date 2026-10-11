// Renders public/icon.svg into the PNG sizes the web app manifest and iOS need.
import sharp from 'sharp'

const svg = 'public/icon.svg'
const out = [
  ['public/icons/icon-192.png', 192, 0],
  ['public/icons/icon-512.png', 512, 0],
  ['public/icons/apple-touch-icon.png', 180, 0],
  // maskable icons need the artwork inside the centre 80% safe zone
  ['public/icons/maskable-512.png', 512, 64],
]

for (const [file, size, pad] of out) {
  const inner = size - pad * 2
  const art = await sharp(svg, { density: 300 }).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: pad ? '#1c1a17' : { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: art, left: pad, top: pad }])
    .png()
    .toFile(file)
  console.log(file)
}
