const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { startScenario } = require('./browser-demo-helpers.cjs')

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 960, height: 900 }, hasTouch: true, acceptDownloads: true })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    fs.mkdirSync('playwright-results', { recursive: true })
    const button = name => page.getByRole('button', { name, exact: true })
    const clock = () => page.locator('.clock strong').innerText()
    await page.goto('http://127.0.0.1:4173')
    await startScenario(page)
    await page.getByRole('heading', { name: 'Crew status' }).waitFor()
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    })
    await context.setOffline(true)
    await button('Open crew break').click()
    const before = await clock()
    const tiles = page.getByRole('group', { name: 'Matching tiles' }).getByRole('button')
    await button('Start round').click()
    const pairs = new Map()
    for (let i = 0; i < 6; i++) {
      const tile = tiles.nth(i)
      if (i === 0) { await tile.focus(); await page.keyboard.press('Enter') }
      else await tile.tap()
      const symbol = (await tile.getAttribute('aria-label')).split(': ')[1].split(',')[0]
      assert.notEqual(symbol, 'face down')
      pairs.set(symbol, [...(pairs.get(symbol) ?? []), i])
    }
    for (const indices of pairs.values()) {
      assert.equal(indices.length, 2)
      if (await tiles.nth(indices[0]).getAttribute('aria-disabled') === 'true') continue
      for (const i of indices) await tiles.nth(i).click()
    }
    await button('Play again').waitFor()
    assert.equal(await clock(), before)
    await page.getByText('No mood saved for this replay.', { exact: true }).waitFor()
    await button('Play again').click()
    assert.equal(await page.getByRole('button', { name: /: face down$/ }).count(), 6)
    await tiles.first().click()
    await page.locator('.break-workspace').screenshot({ path: 'playwright-results/crew-break-tablet.png' })
    await button('End round').click()
    await page.getByRole('radio', { name: 'Mixed', exact: true }).check()
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'runs' && args[0]?.moodCheckIns?.length) {
          IDBObjectStore.prototype.put = put
          throw new DOMException('Simulated local write failure', 'QuotaExceededError')
        }
        return put.apply(this, args)
      }
    })
    await button('Save my mood').click()
    await page.getByRole('alert').filter({ hasText: 'Your mood wasn’t saved' }).waitFor()
    assert.equal(await button('Retry last action').count(), 0)
    await button('Save my mood').click()
    await page.getByText(/^Last saved for CM-2: Mixed/).waitFor()
    assert.equal(await clock(), before)
    await page.reload()
    await button('Crew break').click()
    await page.getByText(/^Last saved for CM-2: Mixed/).waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    await button('Start round').tap()
    await tiles.first().tap()
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: 'playwright-results/crew-break-phone.png', fullPage: true })
    await button('Request assistance').tap()
    await page.getByRole('heading', { name: 'Onboard handoff' }).waitFor()
    await button('History').tap()
    await page.getByText(/Mood check-ins · This tablet only/).click()
    await page.locator('.mood-history li').filter({ hasText: 'Mixed' }).waitFor()
    assert.equal(await page.locator('.mood-history li').count(), 1)
    const download = page.waitForEvent('download')
    await button('Export ground-review packet (JSON)').click()
    const packet = fs.readFileSync(await (await download).path(), 'utf8')
    assert(!packet.includes('Mixed') && !packet.includes('moodCheckIns'))
    await page.getByText('Demo controls', { exact: false }).first().click()
    await page.getByLabel('Load a separate scenario').selectOption('A')
    await page.getByRole('heading', { name: 'Crew status' }).waitFor()
    await button('Crew break').click()
    await page.getByText('No mood saved for this replay.', { exact: true }).waitFor()
    await button('Simulate multi-indicator changes').click()
    await button('Today').click()
    await page.getByRole('button', { name: /readings to review/ }).click()
    await page.getByRole('heading', { name: 'Blood oxygen', exact: true }).waitFor()
    assert.deepEqual(errors, [])
    console.log('PASS: offline play, matching, replay, keyboard/touch, independent mood save, offline reload, scenario isolation, urgent exit, ground export exclusion and flagged-reading navigation.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exit(1) })
