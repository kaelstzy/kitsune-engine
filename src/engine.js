/**
 * engine.js
 * Core Kitsune Engine
 * Load URL → Fetch HTML → Eksekusi JS → Return DOM
 */

import vm from 'vm'
import { createDOM } from './dom.js'
import { createBrowserEnv } from './spoofer.js'

// ─── Internal fetch dengan retry support ─────────────────
async function fetchWithRetry(url, fetchOptions, options) {
  const maxRetries = options.retry ?? 0
  const retryDelay = options.retryDelay ?? 1000
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        if (options.verbose) console.log(`[kitsune] Retry ${attempt}/${maxRetries} → ${url}`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      const response = await fetch(url, fetchOptions)
      return response
    } catch (err) {
      lastError = err
      if (attempt < maxRetries && options.verbose) {
        console.log(`[kitsune] Attempt ${attempt + 1} failed: ${err.message}`)
      }
    }
  }

  throw lastError
}

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

  const method = (options.method || 'GET').toUpperCase()

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

  // Pasang Content-Type otomatis kalau ada body
  if (options.body && !headers['Content-Type']) {
    if (typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json'
    } else if (typeof options.body === 'string' && options.body.startsWith('{')) {
      headers['Content-Type'] = 'application/json'
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
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
    const fetchOptions = {
      method,
      headers,
      redirect: options.followRedirects === false ? 'manual' : 'follow',
      signal: options.timeout
        ? AbortSignal.timeout(options.timeout)
        : AbortSignal.timeout(30000),
    }

    // Pasang body kalau ada (POST, PUT, PATCH)
    if (options.body) {
      fetchOptions.body = typeof options.body === 'object'
        ? JSON.stringify(options.body)
        : options.body
    }

    response = await fetchWithRetry(url, fetchOptions, options)

    statusCode = response.status
    finalUrl = response.url || url

    // Ambil response headers
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val
    })

    html = await response.text()
  } catch (err) {
    const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout')
    if (isTimeout) {
      throw new Error(`Kitsune: Request timed out after ${options.timeout || 30000}ms → ${url}`)
    }
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
      const absoluteUrl = fetchUrl.startsWith('http')
        ? fetchUrl
        : new URL(fetchUrl, parsedUrl.origin).toString()

      const res = await fetch(absoluteUrl, {
        ...fetchOpts,
        headers: {
          ...headers,
          ...(fetchOpts.headers || {}),
        },
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
        body,
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
        // scriptFilter: (src) => boolean — whitelist tertentu aja
        if (options.scriptFilter && !options.scriptFilter(src)) continue

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
      if (options.executeInlineScripts === false) continue

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

    // ─── DOM Helpers ──────────────────────────────────────

    // querySelector — return satu element
    select(selector) {
      return document.querySelector(selector)
    },

    // querySelectorAll — return array
    selectAll(selector) {
      return document.querySelectorAll(selector)
    },

    // result.text()           → semua visible text dari body
    // result.text('h1')       → textContent dari element pertama yang match
    // result.text('p', true)  → array textContent semua yang match
    text(selector, all = false) {
      if (!selector) {
        const body = document.querySelector('body')
        return body ? body.textContent?.trim() ?? '' : ''
      }
      if (all) {
        return document.querySelectorAll(selector).map(el => el.textContent?.trim() ?? '')
      }
      return document.querySelector(selector)?.textContent?.trim() ?? null
    },

    // result.attr('a.download', 'href')
    // result.attr('meta[name="description"]', 'content')
    attr(selector, attribute) {
      return document.querySelector(selector)?.getAttribute(attribute) ?? null
    },

    // result.meta()  → { title, description, 'og:title', 'og:image', ... }
    meta() {
      const result = {}

      // <title>
      const titleEl = document.querySelector('title')
      if (titleEl) result.title = titleEl.textContent?.trim() ?? ''

      // Semua <meta> tags
      const metas = document.querySelectorAll('meta')
      for (const meta of metas) {
        const name = meta.getAttribute('name') || meta.getAttribute('property') || meta.getAttribute('itemprop')
        const content = meta.getAttribute('content')
        if (name && content !== null) {
          result[name] = content
        }
      }

      // Canonical URL
      const canonical = document.querySelector('link[rel="canonical"]')
      if (canonical) result.canonical = canonical.getAttribute('href') ?? ''

      return result
    },

    // ─── JSON Helper ─────────────────────────────────────

    // result.json()               → array semua JSON yang ketemu
    // result.json('key')          → cari object yang punya key tertentu
    // result.json(/regex/)        → cari pake regex di raw script text
    json(target) {
      const scripts = document.querySelectorAll('script')
      const found = []

      for (const script of scripts) {
        const text = (script.textContent || '').trim()
        if (!text) continue

        const looksLikeJson = text.startsWith('{') || text.startsWith('[')
        const candidates = []

        if (looksLikeJson) {
          candidates.push(text)
        }

        // Pattern: window.X = {...} atau window['X'] = {...}
        const windowAssign = text.matchAll(/window\[?['"]?([\w.]+)['"]?\]?\s*=\s*(\{[\s\S]*?\});?\s*(?:window|var|let|const|$)/g)
        for (const m of windowAssign) candidates.push(m[2])

        // Pattern: var/let/const X = {...} di top level
        const varAssign = text.matchAll(/(?:var|let|const)\s+\w+\s*=\s*(\{[\s\S]*?\});/g)
        for (const m of varAssign) candidates.push(m[1])

        // Pattern: JSON string langsung (kayak TikTok __DEFAULT_SCOPE__)
        if (text.includes('"__DEFAULT_SCOPE__"') ||
            text.includes('"__NEXT_DATA__"') ||
            text.includes('"__NUXT__"') ||
            text.includes('"__INITIAL_STATE__"') ||
            text.includes('"__APP_STATE__')) {
          candidates.push(text)
        }

        for (const candidate of candidates) {
          try {
            const parsed = JSON.parse(candidate)

            if (target === undefined) {
              found.push(parsed)
            } else if (typeof target === 'string') {
              if (target in parsed) {
                found.push(parsed[target])
              } else {
                for (const val of Object.values(parsed)) {
                  if (val && typeof val === 'object' && target in val) {
                    found.push(val[target])
                  }
                }
              }
            } else if (target instanceof RegExp) {
              if (target.test(candidate)) found.push(parsed)
            }
          } catch {}
        }
      }

      if (target !== undefined) return found[0] ?? null
      return found
    },
  }
}
