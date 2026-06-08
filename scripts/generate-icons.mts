import sharp from 'sharp'

async function createIcon(size: number, filename: string) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0a0a"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
            font-family="system-ui, sans-serif" font-weight="bold"
            font-size="${Math.round(size * 0.28)}" fill="#FACC15">CPB</text>
    </svg>`

  await sharp(Buffer.from(svg)).png().toFile(`public/${filename}`)
}

await createIcon(192, 'pwa-192x192.png')
await createIcon(512, 'pwa-512x512.png')
await createIcon(180, 'apple-touch-icon.png')

console.log('Icons generated')
