import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 430, height: 1200, deviceScaleFactor: 1 } })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 60000 })
await page.click('.menu-dot-button')
await page.screenshot({ path: '../temp/cake-app-all-collapsed-v1.png', fullPage: true })
await browser.close()
