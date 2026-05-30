# 🦊 Kitsune Engine

> Lightweight JS execution engine. Load pages, run JS, get DOM. No browser needed.

Puppeteer brings the entire Chrome stack just to run JavaScript. Kitsune doesn't. It fakes just enough of a browser environment to execute page scripts — then hands you the resulting DOM.

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

### Simple (one-liner)

```javascript
import { load } from 'kitsune-engine'

const result = await load('https://example.com')
console.log(result.html)
```

### Instance (reusable config)

```javascript
import { Kitsune } from 'kitsune-engine'

const engine = new Kitsune({
  userAgent: 'MyBot/1.0',
  timeout: 10000,
})

const result = await engine.load('https://example.com')
```

---

## Result Object

```javascript
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

// Helpers
result.select('h1')          // querySelector — returns element
result.selectAll('a')        // querySelectorAll — returns array
```

---

## Options

```javascript
await engine.load(url, {
  userAgent: 'string',              // Custom User-Agent
  headers: {},                      // Extra request headers
  cookies: 'key=val; key2=val2',   // Send cookies with request
  timeout: 30000,                   // Request timeout (ms)
  wait: 2000,                       // Extra wait after JS runs (ms)
  scriptTimeout: 5000,              // Max time per script (ms)
  executeExternalScripts: true,     // Fetch & run external scripts
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
Spoof browser environment (navigator, window, document, etc)
    ↓
Execute inline + external scripts via Node.js vm
    ↓
Return final DOM state
```

Kitsune skips everything visual — CSS engine, paint, GPU, layout. It only keeps what's needed to run JavaScript.

---

## When to use Kitsune

✅ Sites that inject content via JS after load  
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
```

---

## License

MIT
