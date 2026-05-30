/**
 * new-apis.test.js
 * Test buat semua API baru yang ditambahin ke Kitsune Engine
 */

import { createDOM } from '../src/dom.js'
import { createBrowserEnv } from '../src/spoofer.js'
import { load } from '../src/index.js'
import vm from 'vm'

// ─── Test Runner ─────────────────────────────────────────
let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}`)
    console.log(`     → ${err.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

async function loadFromHTML(html, scripts = []) {
  const document = createDOM(html)
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  env.document = document
  document.defaultView = env
  const logs = []
  env.console = {
    log: (...a) => logs.push(a.map(String).join(' ')),
    warn: () => {}, error: () => {}, info: () => {}, debug: () => {}
  }

  const context = vm.createContext(env)
  const errors = []
  for (const code of scripts) {
    try {
      vm.runInContext(code, context, { timeout: 5000 })
    } catch (err) {
      errors.push(err.message)
    }
  }

  return {
    html: document._render(),
    select: (sel) => document.querySelector(sel),
    selectAll: (sel) => document.querySelectorAll(sel),
    logs,
    errors,
  }
}

// ─────────────────────────────────────────────────────────
console.log('\n🦊 Kitsune Engine — New API Tests\n')

// ═══════════════════════════════════════════════════════
// SECTION 1: SPOOFER — New Browser APIs
// ═══════════════════════════════════════════════════════
console.log('── spoofer.js ──────────────────────────────────────')

await test('MutationObserver — construct, observe, disconnect', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  const obs = new env.MutationObserver((mutations) => {})
  obs.observe({}, { childList: true, subtree: true })
  const records = obs.takeRecords()
  assert(Array.isArray(records), 'takeRecords should return array')
  obs.disconnect()
})

await test('MutationObserver — JS in page gak crash', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="app"></div></body></html>`,
    [`
      var observer = new MutationObserver(function(mutations) {})
      observer.observe(document.getElementById('app'), { childList: true })
      observer.disconnect()
      document.getElementById('app').setAttribute('data-ran', 'true')
    `]
  )
  assert(result.errors.length === 0, `Errors: ${result.errors.join(', ')}`)
  assert(result.select('#app').getAttribute('data-ran') === 'true', 'Script did not run')
})

await test('IntersectionObserver — construct, observe, callback triggered', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  let callbackFired = false
  const obs = new env.IntersectionObserver((entries) => {
    callbackFired = entries.length > 0 && entries[0].isIntersecting
  })
  obs.observe({})
  assert(callbackFired, 'IntersectionObserver callback should fire on observe')
  obs.disconnect()
})

await test('IntersectionObserver — lazy load pattern gak crash', async () => {
  const result = await loadFromHTML(
    `<html><body><img id="lazy" data-src="image.jpg"></body></html>`,
    [`
      var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.src = entry.target.getAttribute('data-src')
            io.unobserve(entry.target)
          }
        })
      })
      io.observe(document.getElementById('lazy'))
    `]
  )
  assert(result.errors.length === 0, `Errors: ${result.errors.join(', ')}`)
})

await test('ResizeObserver — construct, observe, callback triggered', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  let callbackFired = false
  const obs = new env.ResizeObserver((entries) => { callbackFired = entries.length > 0 })
  obs.observe({})
  assert(callbackFired, 'ResizeObserver callback should fire on observe')
  obs.disconnect()
})

await test('Event constructor', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  const evt = new env.Event('click', { bubbles: true, cancelable: true })
  assert(evt.type === 'click', 'type should be click')
  assert(evt.bubbles === true, 'bubbles should be true')
  evt.preventDefault()
  assert(evt.defaultPrevented === true, 'defaultPrevented should be true')
})

await test('CustomEvent constructor + detail', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  const evt = new env.CustomEvent('myevent', { detail: { foo: 'bar' }, bubbles: true })
  assert(evt.type === 'myevent', 'type should be myevent')
  assert(evt.detail?.foo === 'bar', 'detail.foo should be bar')
})

await test('CustomEvent dispatch via JS in page', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="box"></div></body></html>`,
    [`
      var evt = new CustomEvent('dataReady', { detail: { value: 42 } })
      document.getElementById('box').setAttribute('data-value', evt.detail.value)
      document.getElementById('box').dispatchEvent(evt)
    `]
  )
  assert(result.errors.length === 0, `Errors: ${result.errors.join(', ')}`)
  assert(result.select('#box').getAttribute('data-value') === '42', 'data-value should be 42')
})

await test('matchMedia — query returns valid object', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  const mq = env.matchMedia('(max-width: 768px)')
  assert(typeof mq.matches === 'boolean', 'matches should be boolean')
  assert(mq.media === '(max-width: 768px)', 'media should match query')
})

await test('matchMedia — JS in page gak crash', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="out"></div></body></html>`,
    [`
      var isMobile = matchMedia('(max-width: 768px)').matches
      document.getElementById('out').textContent = isMobile ? 'mobile' : 'desktop'
    `]
  )
  assert(result.errors.length === 0, `Errors: ${result.errors.join(', ')}`)
  assert(result.select('#out').textContent === 'desktop', 'Should be desktop')
})

await test('getComputedStyle — returns proxy, gak throw', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  const style = env.getComputedStyle({})
  assert(typeof style.getPropertyValue === 'function', 'getPropertyValue should be function')
})

await test('getComputedStyle — JS in page pakai ini gak crash', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="el"></div></body></html>`,
    [`
      var el = document.getElementById('el')
      var style = getComputedStyle(el)
      var color = style.getPropertyValue('color')
      el.setAttribute('data-color', color || 'none')
    `]
  )
  assert(result.errors.length === 0, `Errors: ${result.errors.join(', ')}`)
})

await test('WebSocket stub — konstruktor gak throw', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  const ws = new env.WebSocket('wss://example.com')
  assert(ws.readyState === 3, 'WebSocket should be CLOSED (3)')
  ws.send('test'); ws.close()
})

await test('Worker stub — konstruktor gak throw', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  const w = new env.Worker('worker.js')
  w.postMessage({ type: 'start' }); w.terminate()
})

await test('indexedDB stub — open gak throw', async () => {
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  const req = env.indexedDB.open('testdb', 1)
  assert(typeof req === 'object', 'open should return request object')
})

// ═══════════════════════════════════════════════════════
// SECTION 2: DOM — New Methods
// ═══════════════════════════════════════════════════════
console.log('\n── dom.js ──────────────────────────────────────────')

await test('insertAdjacentHTML beforeend', async () => {
  const result = await loadFromHTML(
    `<html><body><ul id="list"><li>Item 1</li></ul></body></html>`,
    [`document.getElementById('list').insertAdjacentHTML('beforeend', '<li>Item 2</li><li>Item 3</li>')`]
  )
  const items = result.selectAll('li')
  assert(items.length === 3, `Expected 3 li, got ${items.length}`)
  assert(items[2].textContent === 'Item 3', `Last item: "${items[2].textContent}"`)
})

await test('insertAdjacentHTML afterbegin', async () => {
  const result = await loadFromHTML(
    `<html><body><ul id="list"><li>Item 2</li></ul></body></html>`,
    [`document.getElementById('list').insertAdjacentHTML('afterbegin', '<li>Item 1</li>')`]
  )
  const items = result.selectAll('li')
  assert(items[0].textContent === 'Item 1', `First: "${items[0].textContent}"`)
})

await test('insertAdjacentHTML beforebegin', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="wrapper"><p id="target">Hello</p></div></body></html>`,
    [`document.getElementById('target').insertAdjacentHTML('beforebegin', '<p id="before">Before</p>')`]
  )
  const before = result.select('#before')
  assert(before !== null, '#before should exist')
  assert(before.textContent === 'Before', `Text: "${before.textContent}"`)
})

await test('insertAdjacentHTML afterend', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="wrapper"><p id="target">Hello</p></div></body></html>`,
    [`document.getElementById('target').insertAdjacentHTML('afterend', '<p id="after">After</p>')`]
  )
  assert(result.select('#after') !== null, '#after should exist')
})

await test('before() — insert element sebelum node', async () => {
  const result = await loadFromHTML(
    `<html><body><ul id="list"><li id="second">Second</li></ul></body></html>`,
    [`
      var first = document.createElement('li')
      first.id = 'first'; first.textContent = 'First'
      document.getElementById('second').before(first)
    `]
  )
  const items = result.selectAll('li')
  assert(items.length === 2, `Expected 2 li, got ${items.length}`)
  assert(items[0].id === 'first', `First should be #first, got #${items[0].id}`)
})

await test('after() — insert element setelah node', async () => {
  const result = await loadFromHTML(
    `<html><body><ul id="list"><li id="first">First</li></ul></body></html>`,
    [`
      var second = document.createElement('li')
      second.id = 'second'; second.textContent = 'Second'
      document.getElementById('first').after(second)
    `]
  )
  const items = result.selectAll('li')
  assert(items.length === 2, `Expected 2 li, got ${items.length}`)
  assert(items[1].id === 'second', `Second should be #second, got #${items[1].id}`)
})

await test('replaceWith() — replace element', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="old">Old</div></body></html>`,
    [`
      var newEl = document.createElement('section')
      newEl.id = 'new'; newEl.textContent = 'New'
      document.getElementById('old').replaceWith(newEl)
    `]
  )
  assert(result.select('#old') === null, '#old should be gone')
  assert(result.select('#new') !== null, '#new should exist')
})

await test('replaceWith() — replace dengan string', async () => {
  const result = await loadFromHTML(
    `<html><body><span id="target">Old</span></body></html>`,
    [`document.getElementById('target').replaceWith('Plain Text')`]
  )
  assert(result.select('#target') === null, '#target should be gone')
  assert(result.html.includes('Plain Text'), 'Plain Text should be in HTML')
})

await test('toggleAttribute — add, remove, force', async () => {
  const result = await loadFromHTML(
    `<html><body><button id="btn">Click</button></body></html>`,
    [`
      var btn = document.getElementById('btn')
      btn.toggleAttribute('disabled')
      var a1 = btn.hasAttribute('disabled')
      btn.toggleAttribute('disabled')
      var a2 = btn.hasAttribute('disabled')
      btn.toggleAttribute('disabled', true)
      var a3 = btn.hasAttribute('disabled')
      btn.toggleAttribute('disabled', false)
      var a4 = btn.hasAttribute('disabled')
      btn.setAttribute('data-results', [a1,a2,a3,a4].join(','))
    `]
  )
  const btn = result.select('#btn')
  assert(btn.getAttribute('data-results') === 'true,false,true,false',
    `toggle sequence wrong: ${btn.getAttribute('data-results')}`)
})

await test('isConnected — node in tree vs orphan', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="main"></div></body></html>`,
    [`
      var inTree = document.getElementById('main').isConnected
      var orphan = document.createElement('div').isConnected
      document.getElementById('main').setAttribute('data-in', inTree)
      document.getElementById('main').setAttribute('data-orphan', orphan)
    `]
  )
  const main = result.select('#main')
  assert(main.getAttribute('data-in') === 'true', 'inTree should be true')
  assert(main.getAttribute('data-orphan') === 'false', 'orphan should be false')
})

await test('ownerDocument — element.ownerDocument exists', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="el"></div></body></html>`,
    [`
      var el = document.getElementById('el')
      el.setAttribute('data-hasowner', el.ownerDocument !== null && el.ownerDocument !== undefined)
    `]
  )
  assert(result.select('#el').getAttribute('data-hasowner') === 'true', 'ownerDocument should exist')
})

await test('animate() stub — gak throw, return animation object', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="box"></div></body></html>`,
    [`
      var el = document.getElementById('box')
      var anim = el.animate([{opacity: 0}, {opacity: 1}], { duration: 300 })
      el.setAttribute('data-ok', typeof anim.play === 'function' && typeof anim.finished === 'object')
    `]
  )
  assert(result.errors.length === 0, `Errors: ${result.errors.join(', ')}`)
  assert(result.select('#box').getAttribute('data-ok') === 'true', 'animate() should return valid object')
})

await test('contentEditable — get/set', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="editor"></div></body></html>`,
    [`
      var el = document.getElementById('editor')
      el.contentEditable = 'true'
      el.setAttribute('data-ce', el.contentEditable)
      el.setAttribute('data-ice', el.isContentEditable)
    `]
  )
  const el = result.select('#editor')
  assert(el.getAttribute('data-ce') === 'true', 'contentEditable should be true')
  assert(el.getAttribute('data-ice') === 'true', 'isContentEditable should be true')
})

// ═══════════════════════════════════════════════════════
// SECTION 3: LIVE WEB TESTS
// ═══════════════════════════════════════════════════════
console.log('\n── live web tests ──────────────────────────────────')

await test('example.com — load + ambil h1', async () => {
  const result = await load('https://example.com', { timeout: 15000 })
  assert(result.status === 200, `Status: ${result.status}`)
  const h1 = result.select('h1')
  assert(h1 !== null, 'h1 should exist')
  assert(h1.textContent.trim().length > 0, 'h1 should have text')
  console.log(`       h1: "${h1.textContent.trim()}"`)
})

await test('quotes.toscrape.com — scrape quotes + authors', async () => {
  const result = await load('https://quotes.toscrape.com', { timeout: 15000 })
  assert(result.status === 200, `Status: ${result.status}`)
  const quotes = result.selectAll('.quote')
  assert(quotes.length > 0, `Expected quotes, got ${quotes.length}`)
  console.log(`       ${quotes.length} quotes found`)
})

await test('books.toscrape.com — scrape book list', async () => {
  const result = await load('https://books.toscrape.com', { timeout: 15000 })
  assert(result.status === 200, `Status: ${result.status}`)
  const books = result.selectAll('article.product_pod')
  assert(books.length > 0, `Expected books, got ${books.length}`)
  console.log(`       ${books.length} books found`)
})

await test('wikipedia.org — parse article + heading', async () => {
  const result = await load('https://en.wikipedia.org/wiki/JavaScript', { timeout: 15000 })
  assert(result.status === 200, `Status: ${result.status}`)
  const h1 = result.select('h1')
  assert(h1 !== null, 'h1 should exist')
  assert(h1.textContent.trim().length > 0, 'h1 should have text')
  console.log(`       h1: "${h1.textContent.trim()}"`)
})

await test('custom user-agent kekirim — ifconfig.me/ua', async () => {
  const customUA = 'Kitsune/1.0 TestSuite'
  const result = await load('https://ifconfig.me/ua', {
    userAgent: customUA,
    timeout: 15000,
  })
  assert(result.status === 200, `Status: ${result.status}`)
  assert(result.html.includes('Kitsune'), `UA not found in response. Got: ${result.html.slice(0, 100)}`)
  console.log(`       UA verified: "${customUA}"`)
})

await test('result.timing — semua timing fields ada & valid', async () => {
  const result = await load('https://example.com', { timeout: 15000 })
  assert(typeof result.timing.total === 'number', 'timing.total should be number')
  assert(typeof result.timing.fetch === 'number', 'timing.fetch should be number')
  assert(typeof result.timing.js === 'number', 'timing.js should be number')
  assert(result.timing.total > 0, 'timing.total should be > 0')
  console.log(`       total: ${result.timing.total}ms, fetch: ${result.timing.fetch}ms, js: ${result.timing.js}ms`)
})

await test('invalid URL — throw error yang jelas', async () => {
  let caught = false
  try {
    await load('bukan-url-valid')
  } catch (err) {
    caught = true
    assert(err.message.includes('Kitsune'), 'Error should mention Kitsune')
  }
  assert(caught, 'Should throw on invalid URL')
})

// ─────────────────────────────────────────────
console.log(`\n─────────────────────────────────`)
console.log(`  ${passed} passed · ${failed} failed`)
console.log(`─────────────────────────────────\n`)

if (failed > 0) process.exit(1)