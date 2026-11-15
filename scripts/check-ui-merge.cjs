const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:4174/', { waitUntil: 'domcontentloaded' })
    await page.locator('h1').waitFor()
    for (const [route, title] of [['body', 'Body map'], ['trends', 'Trends'], ['live', 'Live check'], ['routine', "Today's plan"], ['guide', 'Guide'], ['', null]]) {
      await page.evaluate(route => { location.hash = '#/' + route }, route)
      if (title) await page.getByRole('heading', { name: title, exact: true }).waitFor()
      else await page.waitForFunction(() => !['Body map','Trends','Live check',"Today's plan",'Guide'].includes(document.querySelector('h1')?.textContent.trim()))
      assert(await page.locator('main').innerText(), 'Missing route content: ' + route)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Desktop overflow: ' + route)
    }
    await page.getByRole('list', { name: 'Indicators', exact: true }).locator('li').first().getByText('74', { exact: true }).waitFor()
    await page.waitForFunction(() => [...document.querySelectorAll('ul[aria-label="Indicators"] > li')].length === 9 &&
      [...document.querySelectorAll('ul[aria-label="Indicators"] > li')].every(el => Number(getComputedStyle(el).opacity) > .99))
    fs.mkdirSync('playwright-results', { recursive: true })
    await page.screenshot({ path: 'playwright-results/merged-ui-desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 900 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Phone overflow')
    await page.screenshot({ path: 'playwright-results/merged-ui-phone.png', fullPage: true })
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    })
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('h1').waitFor()
    assert.deepEqual(errors, [])
    console.log('PASS: merged UI six routes, desktop/phone layout, offline reload and no browser runtime errors.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exit(1) })
