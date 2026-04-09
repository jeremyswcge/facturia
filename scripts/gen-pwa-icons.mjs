// Generates PWA icons from the source logo using sharp.
// Run: `node scripts/gen-pwa-icons.mjs`
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const outDir = join(publicDir, 'icons')
mkdirSync(outDir, { recursive: true })

const SOURCE = join(publicDir, '4652F789-43D5-4841-B491-533AA408B528.jpeg')
const BG = { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a

async function generate(size, name, { padding = 0.12 } = {}) {
  const inner = Math.round(size * (1 - padding * 2))
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(join(outDir, name))
  console.log(`wrote icons/${name}`)
}

await generate(192, 'icon-192.png')
await generate(512, 'icon-512.png')
// Maskable variant with safer padding (~20%) for Android adaptive icons
await generate(512, 'icon-512-maskable.png', { padding: 0.2 })
