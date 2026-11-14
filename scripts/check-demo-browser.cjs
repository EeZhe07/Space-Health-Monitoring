const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const button = name => page.getByRole('button', { name, exact: true })
    async function saved() {
      return page.evaluate(async () => {
        const db = await new Promise(resolve => { const r = indexedDB.open('crew-health'); r.onsuccess = () => resolve(r.result) })
        const tx = db.transaction(['runs', 'settings'])
        const get = req => new Promise(resolve => { req.onsuccess = () => resolve(req.result) })
        const [active, preferences, runs] = await Promise.all([
          get(tx.objectStore('settings').get('activeRun')), get(tx.objectStore('settings').get('demoPreferences')),
          get(tx.objectStore('runs').getAll())])
        db.close()
        return { active, preferences, runs }
      })
    }
    async function setup(scenario, resume = 'resume') {
      await button('Demo setup').click()
      await page.getByLabel('Choose a setup', { exact: true }).selectOption(scenario)
      await page.getByLabel('When the app reloads').selectOption(resume)
      await button('Start selected setup').click()
      await page.getByRole('heading', { name: 'Demo setup', exact: true }).waitFor({ state: 'hidden' })
    }
    await page.goto('http://127.0.0.1:4173')
    await page.getByRole('heading', { name: 'No crew concerns reported' }).waitFor()
    const initial = await saved()
    assert.equal(initial.runs.find(r => r.id === initial.active).scenario, 'default')
    await setup('C')
    await button('Crew break').click()
    await page.getByRole('radio', { name: 'Calm', exact: true }).check()
    await button('Save my mood').click()
    await page.getByText(/^Last saved for CM-2: Calm/).waitFor()
    const withMood = await saved()
    await page.reload()
    await page.getByRole('heading', { name: 'A teammate is needed' }).waitFor()
    assert.equal((await saved()).active, withMood.active)
    await setup('E', 'fresh')
    await page.getByRole('heading', { name: 'CM-3 has taken over' }).waitFor()
    const e = await saved()
    await page.reload()
    await page.getByRole('heading', { name: 'CM-3 has taken over' }).waitFor()
    assert.notEqual((await saved()).active, e.active)
    // A failed preferences write must not partially switch the active replay.
    const beforeFailure = await saved()
    await button('Demo setup').click()
    await page.getByLabel('Choose a setup', { exact: true }).selectOption('D')
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'settings' && args[1] === 'demoPreferences') {
          IDBObjectStore.prototype.put = put
          throw new DOMException('Simulated preferences failure', 'QuotaExceededError')
        }
        return put.apply(this, args)
      }
    })
    await button('Start selected setup').click()
    await button('Retry last action').waitFor()
    const failed = await saved()
    assert.equal(failed.active, beforeFailure.active)
    assert.deepEqual(failed.preferences, beforeFailure.preferences)
    assert.equal(failed.runs.length, beforeFailure.runs.length)
    await button('Retry last action').click()
    await page.getByRole('heading', { name: 'Demo setup', exact: true }).waitFor({ state: 'hidden' })
    assert.equal((await saved()).preferences.startupScenario, 'D')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    })
    await context.setOffline(true)
    await setup('F', 'fresh')
    const f = await saved()
    await page.reload()
    await page.getByRole('heading', { name: 'CM-3 has taken over' }).waitFor()
    const fReload = await saved()
    assert.notEqual(fReload.active, f.active)
    assert.equal(fReload.runs.find(r => r.id === fReload.active).observations.length, 0)
    await button('Demo setup').click()
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      fs.mkdirSync('playwright-results', { recursive: true })
      await page.locator('#demo-setup').screenshot({ path: 'playwright-results/demo-setup-' + width + '.png' })
    }
    await button('Restore app defaults').click()
    await page.getByRole('heading', { name: 'No crew concerns reported' }).waitFor()
    const defaults = await saved()
    assert.deepEqual(defaults.preferences, { startupScenario: 'default', resumeLastRun: true })
    assert(defaults.runs.some(r => r.id === withMood.active && r.moodCheckIns[0].mood === 'Calm'))
    assert(defaults.runs.some(r => r.id === initial.active))
    await page.reload()
    await page.getByRole('heading', { name: 'No crew concerns reported' }).waitFor()
    assert.equal((await saved()).active, defaults.active)
    assert.deepEqual(errors, [])
    console.log('PASS: routine default, scenario switching, resume/fresh startup, offline launches, restore defaults, history preservation, atomic write recovery and responsive setup.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exit(1) })
