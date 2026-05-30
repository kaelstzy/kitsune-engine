/**
 * kitsune-engine
 * Lightweight JS execution engine
 * Load pages, run JS, get DOM. No browser needed.
 *
 * Usage:
 *   import { Kitsune } from 'kitsune-engine'
 *   const engine = new Kitsune()
 *   const result = await engine.load('https://example.com')
 *   console.log(result.html)
 */

import { loadPage } from './engine.js'

export class Kitsune {
  constructor(globalOptions = {}) {
    this.globalOptions = globalOptions
  }

  /**
   * Load URL dan eksekusi JS-nya
   *
   * @param {string} url - URL yang mau di-load
   * @param {object} options - Options per-request
   * @param {string}  options.userAgent           - Custom user agent
   * @param {object}  options.headers             - Custom request headers
   * @param {string}  options.cookies             - Cookies string (key=val; key2=val2)
   * @param {number}  options.timeout             - Request timeout in ms (default: 30000)
   * @param {number}  options.wait                - Extra wait after JS execution in ms
   * @param {number}  options.scriptTimeout       - Max time per script execution in ms (default: 5000)
   * @param {boolean} options.executeExternalScripts - Fetch & run external scripts (default: true)
   * @param {boolean} options.verbose             - Log debug info to console
   *
   * @returns {Promise<KitsuneResult>}
   */
  async load(url, options = {}) {
    const mergedOptions = {
      ...this.globalOptions,
      ...options,
    }
    return loadPage(url, mergedOptions)
  }
}

/**
 * Quick load — tanpa bikin instance dulu
 * Buat yang mau one-liner
 *
 * @example
 * const result = await load('https://example.com')
 */
export async function load(url, options = {}) {
  return loadPage(url, options)
}

export default Kitsune
