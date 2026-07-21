import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('@playwright/test')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' })
const info = await page.evaluate(async () => {
  const codecs = [
    'avc1.42001f','avc1.42001e','avc1.420028','avc1.42002a',
    'avc1.4D001f','avc1.4D0028','avc1.4D002a',
    'avc1.64001f','avc1.640028','avc1.64002a','avc1.640032',
  ]
  const sizes = [[1080,1080],[1920,1080],[960,540]]
  const out = []
  for (const codec of codecs) {
    for (const [width, height] of sizes) {
      const r = await VideoEncoder.isConfigSupported({
        codec, width, height, bitrate: 8e6, framerate: 30,
      })
      if (r.supported) out.push({ codec, width, height, supported: true })
    }
  }
  return out
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
