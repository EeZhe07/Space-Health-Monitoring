// Integration checks use a simulated Supabase transport; no hosted data is changed.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { startScenario } = require('./browser-demo-helpers.cjs')

async function main() {
  fs.mkdirSync('playwright-results', { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
    const userA = '11111111-1111-4111-8111-111111111111'
    const userB = '22222222-2222-4222-8222-222222222222'
    function session(id) {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', aud: 'authenticated', exp })).toString('base64url'), 'test-signature'].join('.')
      return { access_token: token, refresh_token: 'fake-refresh-' + id, token_type: 'bearer', expires_in: 3600, expires_at: exp,
        user: { id, aud: 'authenticated', role: 'authenticated', email: 'fictional@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } }
    }
    const stored = new Map()
    const postedIds = []
    let fail = false
    let holdNextInsert = false
    let releaseInsert
    let insertStarted
    await context.route('https://*.supabase.co/**', async route => {
      const request = route.request()
      const url = new URL(request.url())
      const reply = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      if (url.pathname.startsWith('/auth/v1/')) return reply(200, session(userA))
      if (!url.pathname.endsWith('/crew_health_packets')) return reply(404, {})
      if (request.method() === 'POST') {
        const packet = request.postDataJSON()
        postedIds.push(packet.id)
        if (holdNextInsert) {
          holdNextInsert = false
          insertStarted()
          await new Promise(resolve => { releaseInsert = resolve })
        }
        if (fail) return reply(503, { message: 'Simulated link interruption' })
        if (stored.has(packet.id)) return reply(409, { code: '23505', message: 'duplicate' })
        const row = { ...packet, created_at: new Date().toISOString() }
        stored.set(packet.id, row)
        return reply(201, row)
      }
      const id = url.searchParams.get('id')?.replace(/^eq\./, '')
      if (id) return reply(200, stored.get(id) ?? null)
      const token = request.headers().authorization?.replace('Bearer ', '')
      const owner = token ? JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub : null
      return reply(200, [...stored.values()].filter(row => row.owner_id === owner &&
        (!url.searchParams.has('or') || row.report.kind !== 'ground_response')))
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:4173')
    await startScenario(page)
    await page.getByRole('button', { name: 'Handoff · Pending', exact: true }).click()
    await page.getByText('Ground connection and queued packets', { exact: true }).click()
    await page.getByLabel('Supabase demo account email').fill('fictional@example.test')
    await page.getByLabel('Password', { exact: true }).fill('synthetic-test-only')
    await page.getByRole('button', { name: 'Sign in to ground archive', exact: true }).click()
    await page.getByRole('button', { name: 'Save and send snapshot', exact: true }).waitFor()
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    })
    await context.setOffline(true)
    await page.getByRole('button', { name: 'Save and send snapshot', exact: true }).click()
    await page.getByText(/UTC snapshot · Pending upload/).waitFor()
    assert.equal(postedIds.length, 0)
    await page.reload()
    await page.getByRole('button', { name: 'Handoff · Pending', exact: true }).click()
    await page.getByText('Ground connection and queued packets', { exact: true }).click()
    await page.getByText(/UTC snapshot · Pending upload/).waitFor()
    assert(await page.getByRole('button', { name: 'Retry pending packets', exact: true }).isEnabled())
    fail = true
    await context.setOffline(false)
    await page.getByRole('status').filter({ hasText: 'Simulated link interruption' }).waitFor()
    fail = false
    await page.getByRole('button', { name: 'Retry pending packets', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Stored on server.' }).waitFor()
    assert.equal(stored.size, 1)
    assert.equal(postedIds.length, 2)
    assert.equal(postedIds[0], postedIds[1])
    await page.locator('.archived-packet>summary').click()
    await page.getByRole('heading', { name: 'Measurements in this snapshot', exact: true }).waitFor()
    await page.screenshot({ path: 'playwright-results/cloud-archive.png', fullPage: true })

    // Simulate lost local acknowledgement: the server already has this same ID.
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => { const r = indexedDB.open('crew-health'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
      const tx = db.transaction('groundPackets', 'readwrite')
      const store = tx.objectStore('groundPackets')
      const rows = await new Promise(resolve => { const r = store.getAll(); r.onsuccess = () => resolve(r.result) })
      store.put({ ...rows[0], state: 'pending' })
      await new Promise(resolve => { tx.oncomplete = resolve }); db.close()
    })
    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await page.getByRole('button', { name: 'Handoff · Pending', exact: true }).click()
    await page.getByText('Ground connection and queued packets', { exact: true }).click()
    await page.getByText(/UTC snapshot · Stored on server/).waitFor()
    assert.equal(postedIds.length, 2, 'Existing server packet must not be inserted twice')

    // Switch account in another tab while A has a request in flight.
    const bPacket = await page.evaluate(async ({ userB }) => {
      const db = await new Promise(resolve => { const r = indexedDB.open('crew-health'); r.onsuccess = () => resolve(r.result) })
      const tx = db.transaction('groundPackets', 'readwrite'), store = tx.objectStore('groundPackets')
      const rows = await new Promise(resolve => { const r = store.getAll(); r.onsuccess = () => resolve(r.result) })
      const row = { ...rows[0], id: crypto.randomUUID(), userId: userB, state: 'pending', serverStoredAt: undefined }
      store.put(row); await new Promise(resolve => { tx.oncomplete = resolve }); db.close(); return row.id
    }, { userB })
    const started = new Promise(resolve => { insertStarted = resolve })
    holdNextInsert = true
    await page.getByRole('button', { name: 'Save and send snapshot', exact: true }).click()
    await started
    const relay = await context.newPage()
    await relay.goto('http://127.0.0.1:4173')
    await relay.evaluate(newSession => {
      const key = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'))
      if (!key) throw new Error('Mock auth session not found')
      localStorage.setItem(key, JSON.stringify(newSession))
      const channel = new BroadcastChannel(key)
      channel.postMessage({ event: 'SIGNED_IN', session: newSession }); channel.close()
    }, session(userB))
    await page.getByText(/UTC snapshot · Pending upload/).waitFor()
    releaseInsert()
    await page.getByRole('status').filter({ hasText: 'Stored on server.' }).waitFor()
    await page.getByRole('button', { name: 'Refresh server archive', exact: true }).click()
    assert(stored.has(bPacket), 'New active account must retry after old operation releases its lock')
    assert.equal(stored.get(bPacket).owner_id, userB)
    await page.locator('.archived-packet').first().waitFor()
    assert.equal(await page.locator('.archived-packet').count(), 1, 'Only account B archive should be displayed')
    await page.getByRole('button', { name: 'Open Ground Review', exact: true }).click()
    await page.getByLabel('Inbox source', { exact: true }).selectOption('cloud')
    await page.getByRole('button', { name: 'Confirm snapshot viewed', exact: true }).waitFor()
    await page.getByLabel('Follow-up message').fill('Cloud request: please share a fresh resting measurement.')
    await page.getByRole('button', { name: 'Request crew update', exact: true }).click()
    await page.getByText('Response stored in the cloud inbox.', { exact: true }).waitFor()
    const cloudReply = [...stored.values()].find(row => row.report.kind === 'ground_response')
    assert.equal(cloudReply.owner_id, userB)
    assert.equal(cloudReply.report.response.packetId, bPacket)
    // More than ten reply envelopes must not displace the crew snapshot.
    for (let i = 0; i < 12; i++) stored.set('extra-reply-' + i, { ...cloudReply, id: 'extra-reply-' + i })
    await page.getByRole('button', { name: 'Crew tablet', exact: true }).click()
    await page.getByText('Ground connection and queued packets', { exact: true }).click()
    await page.getByRole('button', { name: 'Refresh server archive', exact: true }).click()
    await page.locator('.archived-packet').waitFor()
    assert.equal(await page.locator('.archived-packet').count(), 1)
    await page.getByLabel('Ground responses from', { exact: true }).selectOption('cloud')
    await page.locator('.ground-response').first().getByText('Cloud request: please share a fresh resting measurement.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Open Ground Review', exact: true }).click()
    await page.getByLabel('Inbox source', { exact: true }).selectOption('cloud')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await page.getByRole('button', { name: 'Sign in to ground inbox', exact: true }).waitFor()
    assert.equal(await page.getByText('Cloud request: please share a fresh resting measurement.', { exact: true }).count(), 0)
    assert.deepEqual(errors, [])
    console.log('PASS: mocked cloud transport; offline queue/reopen, reconnect retry, stable IDs, lost-receipt recovery, readable archive and account-switch retry.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exit(1) })
