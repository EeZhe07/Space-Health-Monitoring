const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { startScenario } = require('./browser-demo-helpers.cjs')

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1100, height: 1000 }, acceptDownloads: true })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.clock.install({ time: new Date() })
    const button = name => page.getByRole('button', { name, exact: true })
    const area = button('Signal Watch response area')
    async function finishRound(practice, missOne = false) {
      let missed = false
      for (let tick = 0; tick < 900; tick++) {
        if (await page.getByRole('heading', { name: practice ? 'Practice complete' : 'Building your comparison', exact: true }).isVisible()) return
        if (await area.count() && (await area.getAttribute('class')).includes('is-signal')) {
          if (missOne && !missed) { await page.clock.runFor(2100); missed = true }
          else { await page.clock.runFor(250); await area.click() }
        } else await page.clock.runFor(100)
      }
      throw new Error('Round did not finish')
    }
    await page.goto('http://127.0.0.1:4173')
    await startScenario(page)
    await button('Crew break').click()
    await button('Practice · 3 signals').click()
    await finishRound(true)
    await page.getByText('Practice responses are not saved or compared.', { exact: true }).waitFor()
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'runs' && args[0]?.attentionSessions?.length) {
          IDBObjectStore.prototype.put = put
          throw new DOMException('Simulated round save failure', 'QuotaExceededError')
        }
        return put.apply(this, args)
      }
    })
    await button('Start recorded round').click()
    await area.click()
    await finishRound(false, true)
    await button('Retry saving round').click()
    await page.getByText('Round saved on this tablet.', { exact: true }).waitFor()
    await button('New round').click()
    await button('Start recorded round').click()
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden })
    await page.getByText('The page was hidden. This round was not saved.', { exact: true }).waitFor()
    await page.getByRole('radio', { name: 'Mixed', exact: true }).check()
    await button('Save my mood').click()
    await page.getByText(/^Last saved for CM-2: Mixed/).waitFor()
    await button('Start recorded round').click()
    await button('Request assistance').click()
    await page.getByRole('heading', { name: 'Onboard handoff', exact: true }).waitFor()
    await button('History').click()
    await page.getByText('Signal Watch rounds (1)', { exact: true }).click()
    await page.getByText('Building your comparison', { exact: true }).waitFor()
    const download = page.waitForEvent('download')
    await button('Export ground-review packet (JSON)').click()
    const packet = fs.readFileSync(await (await download).path(), 'utf8')
    assert(!packet.includes('signal-watch-12-v1') && !packet.includes('attentionSessions'))
    await button('Crew break').click()
    await page.getByLabel('Response control').selectOption('keyboard')
    await button('Practice · 3 signals').click()
    for (let tick = 0; tick < 400; tick++) {
      if (await page.getByRole('heading', { name: 'Practice complete', exact: true }).isVisible()) break
      if ((await area.getAttribute('class')).includes('is-signal')) { await page.clock.runFor(250); await page.keyboard.press('Space') }
      else await page.clock.runFor(100)
    }
    await page.getByRole('heading', { name: 'Practice complete', exact: true }).waitFor()
    await page.reload()
    await button('History').click()
    await page.getByText('Signal Watch rounds (1)', { exact: true }).waitFor()
    await button('Crew break').click()
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    })
    await context.setOffline(true)
    await page.setViewportSize({ width: 390, height: 1000 })
    await page.reload()
    await button('Crew break').click()
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    fs.mkdirSync('playwright-results', { recursive: true })
    await page.screenshot({ path: 'playwright-results/signal-watch-phone.png', fullPage: true })
    await page.setViewportSize({ width: 1280, height: 1000 })
    await page.locator('.break-workspace').screenshot({ path: 'playwright-results/signal-watch-desktop.png' })
    const touchContext = await browser.newContext({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true })
    const touchPage = await touchContext.newPage()
    await touchPage.clock.install({ time: new Date() })
    await touchPage.goto('http://127.0.0.1:4173')
    await touchPage.getByRole('button', { name: 'Crew break', exact: true }).tap()
    assert.equal(await touchPage.getByLabel('Response control').inputValue(), 'touch')
    await touchPage.getByRole('button', { name: 'Practice · 3 signals', exact: true }).tap()
    const touchArea = touchPage.getByRole('button', { name: 'Signal Watch response area', exact: true })
    for (let i = 0; i < 60; i++) {
      if ((await touchArea.getAttribute('class')).includes('is-signal')) break
      await touchPage.clock.runFor(100)
    }
    await touchPage.clock.runFor(250); await touchArea.tap()
    await touchPage.getByRole('status').filter({ hasText: 'Response recorded.' }).waitFor()
    assert.deepEqual(errors, [])
    console.log('PASS: practice/recorded signals, early and missed input, auto-save retry, interruption cancellation, keyboard, independent mood, reload/offline, history, privacy and responsive task.')
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exit(1) })
