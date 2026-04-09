// Generates PWA icons + app icons (favicon, apple-touch) from the source logo.
// Run: `node scripts/gen-pwa-icons.mjs`
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')
const appDir = join(root, 'app')
const iconsDir = join(publicDir, 'icons')
mkdirSync(iconsDir, { recursive: true })

const SOURCE = join(publicDir, 'IMG_3498.png')

async function pad(size, _padding = 0) {
  // New logo already includes its own background — fill the full square.
  return sharp(SOURCE)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer()
}

async function write(path, buf) {
  const fs = await import('node:fs/promises')
  await fs.writeFile(path, buf)
  console.log('wrote', path.replace(root + '\\', '').replace(root + '/', ''))
}

// PWA manifest icons
await write(join(iconsDir, 'icon-192.png'), await pad(192))
await write(join(iconsDir, 'icon-512.png'), await pad(512))
await write(join(iconsDir, 'icon-512-maskable.png'), await pad(512, 0.2))

// Next.js app/ icon convention (auto-served as /icon and /apple-icon)
await write(join(appDir, 'icon.png'), await pad(180, 0.08))
await write(join(appDir, 'apple-icon.png'), await pad(180, 0.1))
