/* PocketGym service worker (optional).
   Put this file next to index.html on an HTTPS web host and the app will also START with no connection
   (a gym basement, airplane mode). PocketGym works without it - this only helps the very first screen load.
   It handles same-origin GET requests only: network first, last good copy as the fallback.
   Opening the app asks the web host "has the page changed?". That is a tiny request (nothing is downloaded when it has not),
   so a new version you upload shows up on the next open instead of waiting for the phone's own saved copy to expire.
   If the host does not answer within 2.5 seconds, the saved copy opens instead.
   AI requests go to other websites, so this worker never sees, changes or stores them. */
const CACHE = 'pocketgym-v1';
const GIVE_UP_MS = 2500;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.indexOf('pocketgym-') === 0 && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const nav = req.mode === 'navigate';
  const live = (nav ? fetch(req, { cache: 'no-cache' }) : fetch(req)).then(res => {      // no-cache = check with the host first, reuse the phone's copy only if it has not changed
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  const wait = nav ? Promise.race([live, new Promise((_, no) => setTimeout(no, GIVE_UP_MS))]) : live;
  e.respondWith(wait.catch(() => caches.match(req)
    .then(hit => hit || (nav ? caches.match(self.registration.scope) : undefined))
    .then(hit => hit || Response.error())));
});
