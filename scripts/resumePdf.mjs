// Prints /resume to public/resume.pdf with headless Chrome, so the download
// always matches the page. Needs a running server: `pnpm dev` (or preview).
// usage: pnpm resume:pdf [base-url]   (CHROME_PATH overrides the browser)
import { existsSync } from "node:fs"
import { chromium } from "playwright-core"

const base = process.argv[2] ?? "http://localhost:4321"
const candidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
].filter(Boolean)
const executablePath = candidates.find((p) => existsSync(p))
if (!executablePath) throw new Error("no Chrome found; set CHROME_PATH")

const browser = await chromium.launch({ executablePath })
const page = await browser.newPage()
await page.goto(`${base}/resume/`, { waitUntil: "networkidle" })
await page.emulateMedia({ media: "print" })
await page.pdf({ path: "public/resume.pdf", format: "A4", printBackground: true, preferCSSPageSize: true })
await browser.close()
console.log("wrote public/resume.pdf")
