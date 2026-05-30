import kitsune from './src/index.js'

const result = await kitsune('https://www.tiktok.com/@sakken.group', {
  timeout: 20000,
  executeExternalScripts: false,
})

// Langsung ambil pake result.json()
const scope  = result.json('__DEFAULT_SCOPE__')
const detail = scope?.['webapp.user-detail']?.userInfo
const user   = detail?.user  || {}
const statsV2  = detail?.statsV2 || {}

console.log('\n── Profile ─────────────────────────')
console.log('username  :', user.uniqueId)
console.log('nickname  :', user.nickname)
console.log('verified  :', user.verified)

console.log('\n── Stats ───────────────────────────')
console.log('followers :', statsV2.followerCount?.toLocaleString())
console.log('following :', statsV2.followingCount?.toLocaleString())
console.log('likes     :', statsV2.heartCount?.toLocaleString())
console.log('videos    :', statsV2.videoCount?.toLocaleString())