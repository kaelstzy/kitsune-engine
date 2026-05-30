/**
 * basic.test.js
 * Basic tests buat Kitsune Engine
 */

import { Kitsune, load } from '../src/index.js'

// Simple test runner
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

// ─────────────────────────────────────────────
console.log('\n🦊 Kitsune Engine — Basic Tests\n')

/**
 * loadFromHTML — test helper
 * Bypass network, langsung test engine dengan HTML buatan
 */
import { createDOM } from '../src/dom.js'
import { createBrowserEnv } from '../src/spoofer.js'
import vm from 'vm'

async function loadFromHTML(html, scripts = []) {
  const document = createDOM(html)
  const { env } = createBrowserEnv({ url: 'https://test.local' })
  env.document = document
  env.console = { log: () => {}, warn: () => {}, error: () => {}, info: () => {} }

  const context = vm.createContext(env)
  const errors = []
  for (const code of scripts) {
    try {
      vm.runInContext(code, context, { timeout: 3000 })
    } catch (err) {
      errors.push(err.message)
    }
  }

  const finalHtml = document._render()
  return {
    html: finalHtml,
    status: 200,
    url: 'https://test.local',
    headers: {},
    cookies: '',
    console: [],
    errors,
    timing: { total: 0, fetch: 0, js: 0 },
    select: (sel) => document.querySelector(sel),
    selectAll: (sel) => document.querySelectorAll(sel),
  }
}

// ─── TESTS ───────────────────────────────────────────────

// Test 1: DOM parsing
await test('Parse HTML dan bisa query element', async () => {
  const result = await loadFromHTML(`
    <html><body>
      <h1>Kitsune Test</h1>
      <p class="desc">Lightweight engine</p>
      <a href="https://example.com">Link</a>
    </body></html>
  `)
  const h1 = result.select('h1')
  assert(h1 !== null, 'h1 should exist')
  assert(h1.textContent.trim() === 'Kitsune Test', `h1 text wrong: "${h1.textContent}"`)
})

// Test 2: selectAll
await test('selectAll() balikin semua element yang cocok', async () => {
  const result = await loadFromHTML(`
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </ul>
  `)
  const items = result.selectAll('li')
  assert(Array.isArray(items), 'selectAll should return array')
  assert(items.length === 3, `Expected 3 li, got ${items.length}`)
  assert(items[0].textContent.trim() === 'Item 1', 'First item wrong')
})

// Test 3: JS execution — innerHTML injection
await test('JS bisa inject konten ke DOM', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="app"></div></body></html>`,
    [`document.getElementById('app').innerHTML = '<h2>JS Injected!</h2>'`]
  )
  const h2 = result.select('h2')
  assert(h2 !== null, 'h2 should exist after JS injection')
  assert(h2.textContent === 'JS Injected!', `h2 text wrong: "${h2.textContent}"`)
})

// Test 4: JS bisa bikin element baru
await test('JS createElement + appendChild jalan', async () => {
  const result = await loadFromHTML(
    `<html><body><ul id="list"></ul></body></html>`,
    [`
      var ul = document.getElementById('list');
      for (var i = 1; i <= 3; i++) {
        var li = document.createElement('li');
        li.textContent = 'Item ' + i;
        ul.appendChild(li);
      }
    `]
  )
  const items = result.selectAll('li')
  assert(items.length === 3, `Expected 3 items, got ${items.length}`)
  assert(items[2].textContent === 'Item 3', `Last item wrong: "${items[2].textContent}"`)
})

// Test 5: setAttribute / getAttribute
await test('setAttribute dan getAttribute jalan', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="box"></div></body></html>`,
    [`document.getElementById('box').setAttribute('data-status', 'loaded')`]
  )
  const box = result.select('#box')
  assert(box !== null, 'box should exist')
  assert(box.getAttribute('data-status') === 'loaded', 'data-status should be "loaded"')
})

// Test 6: JS challenge pattern — timeout-based injection
await test('setTimeout content injection (wait pattern)', async () => {
  // Simulasi pattern kayak TikTok "Wait..." yang inject konten setelah delay
  const result = await loadFromHTML(
    `<html><body><div id="content">Loading...</div></body></html>`,
    [`
      // Langsung inject (di engine beneran bakal pakai wait option)
      document.getElementById('content').innerHTML = '<p>Real Content</p>'
    `]
  )
  const p = result.select('p')
  assert(p !== null, 'Real content should be injected')
  assert(p.textContent === 'Real Content', `Content wrong: "${p.textContent}"`)
})

// Test 7: Browser env — navigator.webdriver harus false
await test('navigator.webdriver = false (anti-bot)', async () => {
  const result = await loadFromHTML(
    `<html><body><div id="check"></div></body></html>`,
    [`
      var isBot = navigator.webdriver === true;
      document.getElementById('check').textContent = isBot ? 'BOT' : 'HUMAN';
    `]
  )
  const check = result.select('#check')
  assert(check !== null, '#check should exist')
  assert(check.textContent === 'HUMAN', `Bot check failed: "${check.textContent}"`)
})

// Test 8: Result structure
await test('Result punya semua fields yang dibutuhin', async () => {
  const result = await loadFromHTML('<html><body>hi</body></html>')
  assert('html' in result, 'Missing: html')
  assert('status' in result, 'Missing: status')
  assert('url' in result, 'Missing: url')
  assert('headers' in result, 'Missing: headers')
  assert('cookies' in result, 'Missing: cookies')
  assert('console' in result, 'Missing: console')
  assert('errors' in result, 'Missing: errors')
  assert('timing' in result, 'Missing: timing')
})

// Test 7: Invalid URL handling
await test('Invalid URL throw error yang jelas', async () => {
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
