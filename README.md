# 🦊 Kitsune Engine

> Lightweight JS execution engine. Load pages, run JS, get DOM. No browser needed.

<img src="https://files.catbox.moe/otk0wi.png" alt="kitsune-engine banner" />

Puppeteer brings the entire Chrome stack just to run JavaScript. Kitsune doesn't. It fakes just enough of a browser environment to execute page scripts — then hands you the data you actually need.

```
Puppeteer  ~300MB RAM  (full Chromium)
Kitsune     ~30MB RAM  (JS engine only)
```

---

## Install

```bash
npm install kitsune-engine
```

---

## Usage

### Default (one-liner)

```js
import kitsune from 'kitsune-engine'

const result = await kitsune('https://example.com')
console.log(result.html)
```

### Named export

```js
import { load } from 'kitsune-engine'

const result = await load('https://example.com')
```

### Instance (reusable config)

```js
import { Kitsune } from 'kitsune-engine'

const engine = new Kitsune({
  userAgent: 'MyBot/1.0',
  timeout: 10000,
})

const result = await engine.load('https://example.com')
```

---

## Result Object

```js
result.html          // Full DOM string after JS executed
result.status        // HTTP status code (200, 404, etc)
result.url           // Final URL after redirects
result.headers       // Response headers
result.cookies       // Cookies from the page
result.console       // console.log output from page scripts
result.errors        // JS errors that occurred
result.scripts       // Number of scripts executed
result.timing.total  // Total time in ms
result.timing.fetch  // Fetch time in ms
result.timing.js     // JS execution time in ms

// DOM helpers
result.select('h1')        // querySelector — returns element
result.selectAll('a')      // querySelectorAll — returns array

// JSON helpers
result.json()              // all embedded JSON found in page
result.json('__NEXT_DATA__')  // find by key
result.json(/userInfo/)    // find by regex
```

---

## Examples

### Scrape elements

```js
import kitsune from 'kitsune-engine'

const result = await kitsune('https://quotes.toscrape.com')

const quotes = result.selectAll('.quote').map(el => ({
  text: el.querySelector('.text')?.textContent,
  author: el.querySelector('.author')?.textContent,
}))

console.log(quotes)
```

### Extract embedded JSON (Next.js, Nuxt, TikTok, etc)

```js
import kitsune from 'kitsune-engine'

// Works on any site that embeds data in <script> tags
const result = await kitsune('https://example.com')

const data = result.json('__NEXT_DATA__')   // Next.js
// or
const data = result.json('__NUXT__')        // Nuxt
// or
const data = result.json('__DEFAULT_SCOPE__') // TikTok
```

### Real world — TikTok profile

```js
import kitsune from 'kitsune-engine'

const result = await kitsune('https://www.tiktok.com/@username', {
  executeExternalScripts: false,
})

const scope  = result.json('__DEFAULT_SCOPE__')
const detail = scope?.['webapp.user-detail']?.userInfo
const user   = detail?.user  || {}
const stats  = detail?.stats || {}

console.log(user.uniqueId)               // username
console.log(stats.followerCount)         // followers
console.log(stats.heartCount)            // total likes
```

<img src="" alt="example output" />

---

## Options

```js
await kitsune(url, {
  userAgent: 'string',              // Custom User-Agent
  headers: {},                      // Extra request headers
  cookies: 'key=val; key2=val2',   // Send cookies with request
  timeout: 30000,                   // Request timeout in ms (default: 30000)
  wait: 2000,                       // Extra wait after JS runs in ms
  scriptTimeout: 5000,              // Max time per script in ms (default: 5000)
  executeExternalScripts: true,     // Fetch & run external scripts (default: true)
  verbose: false,                   // Log debug info
})
```

---

## How It Works

```
Fetch URL
    ↓
Parse HTML → Build DOM
    ↓
Spoof browser environment (navigator, window, document, MutationObserver, etc)
    ↓
Execute inline + external scripts via Node.js vm
    ↓
Return result — HTML, JSON, elements, whatever you need
```

Kitsune skips everything visual — CSS engine, paint, GPU, layout. It only keeps what's needed to run JavaScript.

---

## Browser APIs Supported

Kitsune spoofs a wide range of browser APIs so most page scripts run without errors:

- `navigator`, `window`, `screen`, `location`, `history`
- `localStorage`, `sessionStorage`, `cookie`
- `MutationObserver`, `IntersectionObserver`, `ResizeObserver`
- `Event`, `CustomEvent`
- `fetch`, `XMLHttpRequest`
- `matchMedia`, `getComputedStyle`
- `WebSocket`, `Worker`, `SharedWorker` *(stubs)*
- `indexedDB`, `caches` *(stubs)*
- `crypto`, `TextEncoder`, `TextDecoder`, `URL`, `URLSearchParams`
- `setTimeout`, `setInterval`, `requestAnimationFrame`

---

## When to use Kitsune

✅ Sites that inject content via JS after load  
✅ Pages with embedded JSON data (`__NEXT_DATA__`, `__NUXT__`, etc)  
✅ Pages with basic bot detection (webdriver checks, JS challenges)  
✅ No official API available  
✅ You need something lighter than Puppeteer  

❌ Sites with heavy Cloudflare Enterprise protection  
❌ Pages that need real browser rendering (canvas, WebGL)  
❌ Services with an official API (just use the API)  

---

## Run Tests

```bash
npm test
npm run test:new
```

---

## License

MIT
