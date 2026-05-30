/**
 * engine.js
 * Core Kitsune Engine
 * Load URL → Fetch HTML → Eksekusi JS → Return DOM
 */

import vm from 'vm'
import { createDOM } from './dom.js'
import { createBrowserEnv } from './spoofer.js'

export async function loadPage(url, options = {}) {
  const startTime = Date.now()
  const logs = []
  const errors = []

  // Parse URL buat spoofer
  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error(`Kitsune: Invalid URL → ${url}`)
  }

  // ─── 1. Fetch HTML ───────────────────────────────────────
  const fetchStart = Date.now()

  const headers = {
    'User-Agent': options.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    ...(options.headers || {})
  }

  // Pasang cookies kalau ada
  if (options.cookies) {
    headers['Cookie'] = options.cookies
  }

  let response
  let html
  let responseHeaders = {}
  let statusCode = 0
  let finalUrl = url

  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: options.timeout
        ? AbortSignal.timeout(options.timeout)
        : AbortSignal.timeout(30000), // default 30s
    })

    statusCode = response.status
    finalUrl = response.url || url

    // Ambil response headers
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val
    })

    html = await response.text()
  } catch (err) {
    throw new Error(`Kitsune: Fetch failed → ${err.message}`)
  }

  const fetchTime = Date.now() - fetchStart

  // ─── 2. Setup DOM ────────────────────────────────────────
  const document = createDOM(html)

  // Pasang cookie dari response ke document
  const setCookieHeader = responseHeaders['set-cookie'] || ''
  document.cookie = setCookieHeader

  // ─── 3. Setup Browser Environment ───────────────────────
  const { env, cookieJar } = createBrowserEnv({
    url: finalUrl,
    origin: parsedUrl.origin,
    host: parsedUrl.host,
    hostname: parsedUrl.hostname,
    pathname: parsedUrl.pathname,
    search: parsedUrl.search,
    userAgent: headers['User-Agent'],
    cookies: setCookieHeader,
  })

  // Sambungin document ke env
  env.document = document
  document.cookie = cookieJar.get()
  document.defaultView = env  // jQuery butuh ini buat akses window dari document

  // Custom console buat capture logs
  env.console = {
    log: (...args) => {
      logs.push({ type: 'log', args: args.map(String) })
      if (options.verbose) console.log('[page]', ...args)
    },
    warn: (...args) => {
      logs.push({ type: 'warn', args: args.map(String) })
    },
    error: (...args) => {
      logs.push({ type: 'error', args: args.map(String) })
    },
    info: (...args) => {
      logs.push({ type: 'info', args: args.map(String) })
    },
    debug: () => {},
  }

  // fetch di dalam page (buat XHR/fetch calls dari script)
  env.fetch = async (fetchUrl, fetchOpts = {}) => {
    try {
      // Resolve relative URLs
      const absoluteUrl = fetchUrl.startsWith('http')
        ? fetchUrl
        : new URL(fetchUrl, parsedUrl.origin).toString()

      const res = await fetch(absoluteUrl, {
        ...fetchOpts,
        headers: {
          ...headers,
          ...(fetchOpts.headers || {})
        }
      })
      return res
    } catch (err) {
      errors.push({ type: 'fetch', message: err.message })
      throw err
    }
  }

  // XMLHttpRequest sederhana
  env.XMLHttpRequest = class {
    constructor() {
      this.readyState = 0
      this.status = 0
      this.responseText = ''
      this.response = ''
      this.onload = null
      this.onerror = null
      this.onreadystatechange = null
      this._headers = {}
    }
    open(method, url) {
      this._method = method
      this._url = url.startsWith('http') ? url : new URL(url, parsedUrl.origin).toString()
    }
    setRequestHeader(key, val) {
      this._headers[key] = val
    }
    send(body) {
      fetch(this._url, {
        method: this._method || 'GET',
        headers: { ...headers, ...this._headers },
        body
      }).then(async res => {
        this.status = res.status
        this.readyState = 4
        this.responseText = await res.text()
        this.response = this.responseText
        this.onreadystatechange?.()
        this.onload?.()
      }).catch(err => {
        errors.push({ type: 'xhr', message: err.message })
        this.onerror?.()
      })
    }
  }

  // ─── 4. Eksekusi JS dari page ────────────────────────────
  const jsStart = Date.now()

  // Ambil semua script tags
  const scripts = document.querySelectorAll('script')
  const scriptContents = []

  for (const script of scripts) {
    const type = script.getAttribute('type') || ''
    const src = script.getAttribute('src') || ''

    // Skip non-JS scripts
    if (type && !type.includes('javascript') && !type.includes('module') && type !== '') {
      continue
    }

    if (src) {
      // External script — fetch dulu
      if (options.executeExternalScripts !== false) {
        try {
          const scriptUrl = src.startsWith('http')
            ? src
            : new URL(src, parsedUrl.origin).toString()

          const scriptRes = await fetch(scriptUrl, { headers })
          if (scriptRes.ok) {
            const scriptCode = await scriptRes.text()
            scriptContents.push({ src: scriptUrl, code: scriptCode })
          }
        } catch (err) {
          errors.push({ type: 'script-fetch', src, message: err.message })
        }
      }
    } else {
      // Inline script
      const code = script.textContent || ''
      if (code.trim()) {
        scriptContents.push({ src: 'inline', code })
      }
    }
  }

  // Jalanin semua scripts
  const context = vm.createContext(env)

  for (const { src, code } of scriptContents) {
    try {
      vm.runInContext(code, context, {
        filename: src,
        timeout: options.scriptTimeout || 5000,
        displayErrors: false,
      })
    } catch (err) {
      errors.push({ type: 'script-error', src, message: err.message })
      if (options.verbose) {
        console.error(`[kitsune] Script error (${src}):`, err.message)
      }
    }
  }

  // Wait kalau diminta (buat JS yang pakai setTimeout buat inject content)
  if (options.wait && options.wait > 0) {
    await new Promise(resolve => setTimeout(resolve, options.wait))
  }

  const jsTime = Date.now() - jsStart
  const totalTime = Date.now() - startTime

  // ─── 5. Return Result ────────────────────────────────────
  const finalHtml = document._render()

  return {
    // Core output
    html: finalHtml,
    status: statusCode,
    url: finalUrl,

    // Headers & cookies
    headers: responseHeaders,
    cookies: cookieJar.get(),

    // Debug info
    console: logs,
    errors,
    scripts: scriptContents.length,

    // Timing
    timing: {
      total: totalTime,
      fetch: fetchTime,
      js: jsTime,
    },

    // Helper: query langsung dari result
    select(selector) {
      return document.querySelector(selector)
    },
    selectAll(selector) {
      return document.querySelectorAll(selector)
    },
  }
}