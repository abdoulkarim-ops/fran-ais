/* =====================================================================
   Service worker — Le Français avec Abdoul Karim
   Rôle : après la première visite, l'appli s'ouvre et fonctionne sans internet.
   POUR PUBLIER UNE MISE À JOUR : change le numéro de VERSION ci-dessous
   (et APP.version dans index.html), puis republie tous les fichiers.
   ===================================================================== */
const VERSION = '1.4.0';
const SHELL = 'fak-shell-' + VERSION;
const FONTS = 'fak-fonts';

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

/* Polices utilisées par l'appli (mises en cache pour le hors-ligne). */
const FONT_CSS = [
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&display=swap',
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Playwrite+FR+Trad:wght@100..400&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    /* 1) Le cœur de l'appli : obligatoire. Si ça échoue, l'installation échoue. */
    const shell = await caches.open(SHELL);
    await shell.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })));

    /* 2) Les polices : « au mieux ». Un échec (pas de réseau) ne bloque rien :
          elles seront mises en cache à la première visite avec internet. */
    try {
      const fonts = await caches.open(FONTS);
      for (const cssUrl of FONT_CSS) {
        const res = await fetch(cssUrl);
        if (!res.ok) continue;
        const css = await res.clone().text();
        await fonts.put(cssUrl, res);
        const files = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map((m) => m[1]);
        await Promise.all(files.map((f) => fonts.add(f).catch(() => {})));
      }
    } catch (e) { /* hors-ligne pendant l'installation : sans importance */ }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    /* Supprime les caches des anciennes versions. */
    const keep = new Set([SHELL, FONTS]);
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('fak-') && !keep.has(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(fontStrategy(req));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(navigationStrategy(event));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, req));
});

/* Ouverture de l'appli : on sert tout de suite la version en cache
   (rapide, même sans réseau) et on la met à jour en arrière-plan. */
async function navigationStrategy(event) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match('./index.html', { ignoreSearch: true });
  const refresh = fetch(event.request)
    .then((res) => { if (res && res.ok) cache.put('./index.html', res.clone()); return res; })
    .catch(() => null);
  if (cached) { event.waitUntil(refresh); return cached; }
  const res = await refresh;
  return res || new Response('Hors connexion. Ouvre l\'appli une première fois avec internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(req, { ignoreSearch: true });
  const refresh = fetch(req)
    .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => null);
  if (cached) { event.waitUntil(refresh); return cached; }
  return (await refresh) || Response.error();
}

async function fontStrategy(req) {
  const cache = await caches.open(FONTS);
  const cached = await cache.match(req, { ignoreVary: true });
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return Response.error();
  }
}
