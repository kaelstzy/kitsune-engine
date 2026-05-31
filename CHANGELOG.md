# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-05-31

### Added
- **Response caching** — `{ cache: true }` or `{ cache: 60000 }` for custom TTL in ms
- **`clearCache(url?)`** — invalidate cache for a specific URL or clear all
- **`retryOn: [500, 503, 429]`** — retry on specific HTTP status codes
- **TypeScript types** — full `index.d.ts` with all options, overloads, and return types
- **`executeInlineScripts: false`** — granular control over inline script execution
- **`scriptFilter: (src) => boolean`** — whitelist which external scripts to run

---

## [0.2.0] - 2026-05-31

### Added
- **`result.text(selector?, all?)`** — shortcut for textContent extraction
- **`result.attr(selector, attribute)`** — shortcut for getAttribute
- **`result.meta()`** — extract all meta tags as a flat object (title, og:*, twitter:*, canonical)
- **POST / custom method support** — `{ method: 'POST', body: { ... } }`, body auto JSON-stringified
- **Retry on network failure** — `{ retry: 3, retryDelay: 1000 }`
- **Timeout error messages** — now distinguishes between timeout and network errors

### Fixed
- `test:new` script in `package.json` pointed to wrong filename (`new-apis.test.js` → `new-api.test.js`)

---

## [0.1.0] - 2026-05-30

### Added
- Initial release
- Fetch HTML and execute inline + external scripts via Node.js `vm`
- DOM API via `htmlparser2` + `css-select`
- Browser environment spoofing (`navigator`, `window`, `localStorage`, `fetch`, `XHR`, observers, etc.)
- `result.html`, `result.status`, `result.url`, `result.headers`, `result.cookies`
- `result.select()`, `result.selectAll()` — DOM querying
- `result.json()` — extract embedded JSON (`__NEXT_DATA__`, `__NUXT__`, `__DEFAULT_SCOPE__`, etc.)
- `result.console`, `result.errors`, `result.scripts`, `result.timing`
- Options: `userAgent`, `headers`, `cookies`, `timeout`, `wait`, `scriptTimeout`, `executeExternalScripts`, `verbose`
- `Kitsune` class for reusable config
- Named export `load()` and default export `kitsune()`