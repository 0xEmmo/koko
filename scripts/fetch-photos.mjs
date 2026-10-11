// Downloads the original Unsplash files listed in photos/photos.json into
// photos/originals (git-ignored). Run once before `npm run images`.
import { mkdir, writeFile, access } from 'node:fs/promises'
import manifest from '../photos/photos.json' with { type: 'json' }

await mkdir('photos/originals', { recursive: true })

for (const photo of manifest) {
  const dest = `photos/originals/${photo.file}.jpg`
  try {
    await access(dest)
    continue
  } catch {
    // not downloaded yet
  }
  const res = await fetch(`${photo.cdn}?w=2000&q=85&fm=jpg`)
  if (!res.ok) throw new Error(`${photo.file}: HTTP ${res.status}`)
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
  console.log('fetched', photo.file)
}
