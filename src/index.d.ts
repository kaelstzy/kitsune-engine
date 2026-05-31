// kitsune-engine type definitions

export interface KitsuneOptions {
  /** HTTP method (default: 'GET') */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | string
  /** Request body — object auto-stringified to JSON */
  body?: Record<string, unknown> | string
  /** Custom User-Agent string */
  userAgent?: string
  /** Extra request headers */
  headers?: Record<string, string>
  /** Cookies to send with request */
  cookies?: string
  /** Request timeout in ms (default: 30000) */
  timeout?: number
  /** Follow redirects (default: true) */
  followRedirects?: boolean

  /** Number of retries on network failure (default: 0) */
  retry?: number
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number
  /** HTTP status codes to retry on, e.g. [500, 503, 429] */
  retryOn?: number[]

  /**
   * Cache responses.
   * - `true` → cache with default maxAge (60000ms)
   * - `number` → cache with custom maxAge in ms
   */
  cache?: boolean | number
  /** Cache max age in ms when cache is true (default: 60000) */
  maxAge?: number

  /** Extra wait after JS runs in ms */
  wait?: number
  /** Max time per script in ms (default: 5000) */
  scriptTimeout?: number
  /** Fetch & run external scripts (default: true) */
  executeExternalScripts?: boolean
  /** Run inline scripts (default: true) */
  executeInlineScripts?: boolean
  /** Filter which external scripts to run by URL */
  scriptFilter?: (src: string) => boolean

  /** Log debug info */
  verbose?: boolean
}

export interface KitsuneTiming {
  /** Total time in ms */
  total: number
  /** Fetch time in ms */
  fetch: number
  /** JS execution time in ms */
  js: number
}

export interface KitsuneConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info'
  args: string[]
}

export interface KitsuneError {
  type: 'fetch' | 'xhr' | 'script-fetch' | 'script-error'
  message: string
  src?: string
}

export interface KitsuneResult {
  /** Full DOM string after JS executed */
  html: string
  /** HTTP status code */
  status: number
  /** Final URL after redirects */
  url: string
  /** Response headers */
  headers: Record<string, string>
  /** Cookies from the page */
  cookies: string
  /** console.log output from page scripts */
  console: KitsuneConsoleEntry[]
  /** JS errors that occurred */
  errors: KitsuneError[]
  /** Number of scripts executed */
  scripts: number
  /** Timing breakdown */
  timing: KitsuneTiming

  /** querySelector — returns first matching element */
  select(selector: string): Element | null

  /** querySelectorAll — returns array of matching elements */
  selectAll(selector: string): Element[]

  /**
   * Get text content.
   * - `text()` → all visible text from body
   * - `text('h1')` → textContent of first matching element
   * - `text('p', true)` → array of textContent for all matching elements
   */
  text(selector?: string, all?: false): string | null
  text(selector: string, all: true): string[]
  text(): string

  /** getAttribute on first matching element */
  attr(selector: string, attribute: string): string | null

  /**
   * Extract all meta tags as a flat object.
   * Includes: title, description, og:*, twitter:*, canonical, etc.
   */
  meta(): Record<string, string>

  /**
   * Extract embedded JSON from page scripts.
   * - `json()` → array of all JSON objects found
   * - `json('__NEXT_DATA__')` → find by top-level key
   * - `json(/regex/)` → find by regex match on raw script text
   */
  json(): unknown[]
  json(key: string): unknown | null
  json(pattern: RegExp): unknown | null
}

export interface KitsuneOptions {}

/** Clear the response cache. Pass a URL to clear a specific entry, or nothing to clear all. */
export declare function clearCache(url?: string): void

/** Load a URL and return a KitsuneResult */
export declare function load(url: string, options?: KitsuneOptions): Promise<KitsuneResult>

/** Reusable Kitsune instance with default options */
export declare class Kitsune {
  constructor(globalOptions?: KitsuneOptions)
  load(url: string, options?: KitsuneOptions): Promise<KitsuneResult>
}

/** Default export — shorthand for load() */
declare function kitsune(url: string, options?: KitsuneOptions): Promise<KitsuneResult>
export default kitsune