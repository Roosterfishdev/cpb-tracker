import sharp from 'sharp'

async function createIcon(size: number, filename: string) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#F4F7F0"/>
      <rect x="${Math.round(size * 0.08)}" y="${Math.round(size * 0.08)}"
            width="${Math.round(size * 0.84)}" height="${Math.round(size * 0.84)}"
            rx="${Math.round(size * 0.18)}" fill="url(#grad)"/>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#A3E635"/>
          <stop offset="100%" style="stop-color:#84CC16"/>
        </linearGradient>
      </defs>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
            font-family="system-ui, sans-serif" font-weight="800"
            font-size="${Math.round(size * 0.26)}" fill="#1A1D1A">CPB</text>
    </svg>`

  await sharp(Buffer.from(svg)).png().toFile(`public/${filename}`)
}

await createIcon(192, 'pwa-192x192.png')
await createIcon(512, 'pwa-512x512.png')
await createIcon(180, 'apple-touch-icon.png')

console.log('Icons generated')
