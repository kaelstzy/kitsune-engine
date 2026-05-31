# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | ✅        |
| < 0.3   | ❌        |

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public issue.**

Instead, report it privately via one of these methods:
- **GitHub**: Use [Private Security Advisories](../../security/advisories/new)
- **Email**: Include "kitsune-engine security" in the subject line

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You can expect a response within **72 hours**.

## Security Considerations

Kitsune executes JavaScript from remote pages inside a Node.js `vm` context.
Be aware of the following:

- **`vm` is not a sandbox** — malicious scripts may still escape the context in certain Node.js versions. Do not run Kitsune on untrusted URLs in a security-sensitive environment without additional isolation (e.g. a separate process or container).
- **`executeExternalScripts: false`** is recommended when scraping untrusted sites to limit attack surface.
- **Never expose Kitsune directly to user-supplied URLs** in a public-facing service without input validation and rate limiting.
