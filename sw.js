/* PocketGym service worker (optional).
   Put this file next to pocketgym.html on an HTTPS web host and the app will also START with no connection
   (a gym basement, airplane mode). PocketGym works without it - this only helps the very first screen load.
   It handles same-origin GET requests only: network first (quick give-up on a bad signal), last good copy as the fallback.
   AI requests go to other websites, so this worker never sees, changes or stores them. */
const CACHE = 'pocketgym-v1';
const GIVE_UP_MS = 4000;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.indexOf('pocketgym-') === 0 && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const live = fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  const wait = req.mode === 'navigate' ? Promise.race([live, new Promise((_, no) => setTimeout(no, GIVE_UP_MS))]) : live;
  e.respondWith(wait.catch(() => caches.match(req)
    .then(hit => hit || (req.mode === 'navigate' ? caches.match(self.registration.scope) : undefined))
    .then(hit => hit || Response.error())));
});
