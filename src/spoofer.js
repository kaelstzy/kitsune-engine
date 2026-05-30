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
