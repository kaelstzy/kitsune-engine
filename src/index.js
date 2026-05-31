/**
 * kitsune-engine
 * Lightweight JS execution engine
 * Load pages, run JS, get DOM. No browser needed.
 */

import { loadPage, clearCache } from './engine.js'

export class Kitsune {
  constructor(globalOptions = {}) {
    this.globalOptions = globalOptions
  }

  async load(url, options = {}) {
    return loadPage(url, { ...this.globalOptions, ...options })
  }
}

export async function load(url, options = {}) {
  return loadPage(url, options)
}

export { clearCache }

export default async function kitsune(url, options = {}) {
  return loadPage(url, options)
}