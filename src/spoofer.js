/**
 * spoofer.js
 * Bikin environment yang "keliatan" kayak browser beneran
 * biar JS di dalam page gak curiga
 */

export function createBrowserEnv(options = {}) {
  const userAgent =
    options.userAgent ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  // Storage sederhana buat simulasi localStorage / sessionStorage
  function createStorage() {
    const store = {}
    return {
      getItem: (key) => store[key] ?? null,
      setItem: (key, val) => { store[key] = String(val) },
      removeItem: (key) => { delete store[key] },
      clear: () => { Object.keys(store).forEach(k => delete store[k]) },
      key: (i) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length }
    }
  }

  // Cookie jar sederhana
  let cookieStore = options.cookies || ''
  const cookieJar = {
    get() { return cookieStore },
    set(val) { cookieStore = val }
  }

  const env = {
    // Navigator — yang paling sering dicek bot detection
    navigator: {
      userAgent,
      language: 'en-US',
      languages: ['en-US', 'en'],
      platform: 'Win32',
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      webdriver: false,          // ← ini krusial, Puppeteer defaultnya true
      cookieEnabled: true,
      onLine: true,
      vendor: 'Google Inc.',
      appName: 'Netscape',
      appVersion: userAgent.replace('Mozilla/', ''),
    },

    // Window basics
    window: {},
    self: {},
    top: {},

    // Screen info
    screen: {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
    },

    // Location
    location: {
      href: options.url || '',
      origin: options.origin || '',
      protocol: 'https:',
      host: options.host || '',
      hostname: options.hostname || '',
      pathname: options.pathname || '/',
      search: options.search || '',
      hash: '',
      reload: () => {},
      assign: () => {},
      replace: () => {},
    },

    // History API (banyak SPA pakai ini)
    history: {
      length: 1,
      pushState: () => {},
      replaceState: () => {},
      go: () => {},
      back: () => {},
      forward: () => {},
    },

    // Storage
    localStorage: createStorage(),
    sessionStorage: createStorage(),

    // Cookie
    get cookie() { return cookieJar.get() },
    set cookie(val) { cookieJar.set(val) },

    // Performance API (kadang dicek bot detection)
    performance: {
      now: () => Date.now(),
      timing: {},
      memory: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 2000000000,
      }
    },

    // Event handlers kosong
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,

    // Misc yang sering dicek
    devicePixelRatio: 1,
    innerWidth: 1920,
    innerHeight: 1080,
    outerWidth: 1920,
    outerHeight: 1080,
    scrollX: 0,
    scrollY: 0,

    // Timers — penting buat JS challenge yang pakai delay
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: clearTimeout,

    // Console
    console,

    // Web APIs yang TikTok/React butuhin
    URLSearchParams,
    URL,
    Blob: class Blob {},
    FormData: class FormData {
      constructor() { this._data = {} }
      append(k, v) { this._data[k] = v }
      get(k) { return this._data[k] }
    },
    Headers: class Headers {
      constructor(init = {}) { this._h = { ...init } }
      get(k) { return this._h[k.toLowerCase()] ?? null }
      set(k, v) { this._h[k.toLowerCase()] = v }
      has(k) { return k.toLowerCase() in this._h }
      forEach(cb) { Object.entries(this._h).forEach(([k,v]) => cb(v, k)) }
    },
    AbortController,
    AbortSignal,
    TextEncoder,
    TextDecoder,
    crypto: {
      getRandomValues: (arr) => { arr.fill(Math.floor(Math.random() * 256)); return arr },
      randomUUID: () => Math.random().toString(36).slice(2),
      subtle: {}
    },
    queueMicrotask,
    structuredClone: (obj) => JSON.parse(JSON.stringify(obj)),

    // ─── Event System ────────────────────────────────────────
    // Event constructor
    Event: class Event {
      constructor(type, init = {}) {
        this.type = type
        this.bubbles = init.bubbles || false
        this.cancelable = init.cancelable || false
        this.composed = init.composed || false
        this.defaultPrevented = false
        this.target = null
        this.currentTarget = null
        this.timeStamp = Date.now()
        this.isTrusted = false
      }
      preventDefault() { this.defaultPrevented = true }
      stopPropagation() {}
      stopImmediatePropagation() {}
    },

    // CustomEvent constructor
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type
        this.detail = init.detail ?? null
        this.bubbles = init.bubbles || false
        this.cancelable = init.cancelable || false
        this.defaultPrevented = false
        this.target = null
        this.currentTarget = null
        this.timeStamp = Date.now()
        this.isTrusted = false
      }
      preventDefault() { this.defaultPrevented = true }
      stopPropagation() {}
      stopImmediatePropagation() {}
    },

    // ─── MutationObserver ────────────────────────────────────
    // React, Vue, dan hampir semua framework pakai ini
    MutationObserver: class MutationObserver {
      constructor(callback) {
        this._callback = callback
        this._targets = []
      }
      observe(target, options = {}) {
        this._targets.push({ target, options })
      }
      disconnect() {
        this._targets = []
      }
      takeRecords() {
        return []
      }
    },

    // ─── IntersectionObserver ────────────────────────────────
    // Lazy loading, infinite scroll
    IntersectionObserver: class IntersectionObserver {
      constructor(callback, options = {}) {
        this._callback = callback
        this._options = options
        this._targets = []
      }
      observe(target) {
        this._targets.push(target)
        // Langsung trigger callback dengan entry "visible" biar script gak hang nunggu
        try {
          this._callback([{
            target,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 },
            intersectionRect: { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 },
            rootBounds: null,
            time: Date.now(),
          }], this)
        } catch {}
      }
      unobserve(target) {
        this._targets = this._targets.filter(t => t !== target)
      }
      disconnect() {
        this._targets = []
      }
      takeRecords() {
        return []
      }
    },

    // ─── ResizeObserver ──────────────────────────────────────
    ResizeObserver: class ResizeObserver {
      constructor(callback) {
        this._callback = callback
        this._targets = []
      }
      observe(target, options = {}) {
        this._targets.push(target)
        // Trigger sekali dengan ukuran 0 biar gak hang
        try {
          this._callback([{
            target,
            contentRect: { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 },
            borderBoxSize: [{ inlineSize: 0, blockSize: 0 }],
            contentBoxSize: [{ inlineSize: 0, blockSize: 0 }],
            devicePixelContentBoxSize: [{ inlineSize: 0, blockSize: 0 }],
          }], this)
        } catch {}
      }
      unobserve(target) {
        this._targets = this._targets.filter(t => t !== target)
      }
      disconnect() {
        this._targets = []
      }
    },

    // ─── matchMedia ──────────────────────────────────────────
    // Responsive JS, dark mode checks
    matchMedia: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),

    // ─── getComputedStyle ────────────────────────────────────
    // jQuery dan framework lain nge-call ini waktu init
    getComputedStyle: () => new Proxy({}, {
      get: (_, prop) => {
        if (prop === 'getPropertyValue') return () => ''
        if (prop === 'setProperty') return () => {}
        if (prop === 'removeProperty') return () => {}
        if (prop === 'length') return 0
        if (prop === 'cssText') return ''
        return ''
      }
    }),

    // ─── WebSocket (stub) ────────────────────────────────────
    WebSocket: class WebSocket {
      constructor(url, protocols) {
        this.url = url
        this.readyState = 3 // CLOSED — kita gak beneran connect
        this.CONNECTING = 0; this.OPEN = 1; this.CLOSING = 2; this.CLOSED = 3
        this.onopen = null; this.onclose = null; this.onmessage = null; this.onerror = null
        setTimeout(() => this.onclose?.({ code: 1006, reason: 'Kitsune: WebSocket not supported', wasClean: false }), 0)
      }
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    },

    // ─── Worker / SharedWorker (stub) ────────────────────────
    Worker: class Worker {
      constructor(url) { this.url = url; this.onmessage = null; this.onerror = null }
      postMessage() {}
      terminate() {}
      addEventListener() {}
      removeEventListener() {}
    },
    SharedWorker: class SharedWorker {
      constructor(url) { this.url = url; this.port = { postMessage: () => {}, onmessage: null, start: () => {} } }
      addEventListener() {}
      removeEventListener() {}
    },

    // ─── indexedDB (stub) ────────────────────────────────────
    indexedDB: {
      open: () => {
        const req = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null }
        setTimeout(() => req.onerror?.({ target: req }), 0)
        return req
      },
      deleteDatabase: () => ({ onsuccess: null, onerror: null }),
    },

    // ─── caches (Service Worker Cache API stub) ──────────────
    caches: {
      open: async () => ({
        match: async () => undefined,
        put: async () => {},
        delete: async () => false,
        keys: async () => [],
      }),
      match: async () => undefined,
      has: async () => false,
      delete: async () => false,
      keys: async () => [],
    },

  // JSON, Math, dll
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    Error,
    Map,
    Set,
    Symbol,
    Proxy,
    Reflect,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    atob: (str) => Buffer.from(str, 'base64').toString('binary'),
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
  }

  // window ngerujuk ke dirinya sendiri
  env.window = env
  env.self = env
  env.globalThis = env

  return { env, cookieJar }
}