/* Session 513X service worker.
   Network-first for the page so updates always arrive when there's signal,
   cache fallback so a gym with no bars still opens the app. */
const CACHE = "session513x-v1";
const PAGE  = "./";

self.addEventListener("install", e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll([PAGE, "./index.html"])).catch(()=>{}));
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // The page itself: fresh when online, cached when not.
  if(req.mode === "navigate" || (sameOrigin && url.pathname.endsWith("index.html"))){
    e.respondWith(
      fetch(req)
        .then(res=>{
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(PAGE, copy)).catch(()=>{});
          return res;
        })
        .catch(()=> caches.match(PAGE).then(r=> r || caches.match("./index.html")))
    );
    return;
  }

  // Fonts and anything else: use the cache if we have it, otherwise fetch.
  e.respondWith(
    caches.match(req).then(hit=>
      hit || fetch(req).then(res=>{
        if(res && res.status === 200 && (sameOrigin || res.type === "cors")){
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        }
        return res;
      }).catch(()=> hit)
    )
  );
});
