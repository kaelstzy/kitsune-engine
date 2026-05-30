/**
 * kitsune-engine
 * Lightweight JS execution engine
 * Load pages, run JS, get DOM. No browser needed.
 *
 * Usage:
 *   import kitsune from 'kitsune-engine'
 *   const result = await kitsune('https://example.com')
 *
 *   // atau
 *   import { load, Kitsune } from 'kitsune-engine'
 */

import { loadPage } from './engine.js'

export class Kitsune {
  constructor(globalOptions = {}) {
    this.globalOptions = globalOptions
  }

  async load(url, options = {}) {
    return loadPage(url, { ...this.globalOptions, ...options })
  }
}

// Named export
export async function load(url, options = {}) {
  return loadPage(url, options)
}

// Default export — tinggal kitsune(url)
export default async function kitsune(url, options = {}) {
  return loadPage(url, options)
}