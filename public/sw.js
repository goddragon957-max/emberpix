// 오프라인 지원 서비스워커 — 빌드 도구/의존성 없이 런타임 캐시만 쓴다.
// Vite가 에셋 이름에 해시를 붙이므로 정적 목록을 미리 넣지 않아도 안전하다.
//
//  · 문서(navigate): 네트워크 우선 → 실패하면 캐시 (배포 직후 새 버전이 바로 뜬다)
//  · 그 외 same-origin GET: 캐시 우선 + 백그라운드 갱신 (빠르고, 다음 방문에 최신)
//
// CACHE 이름의 버전을 올리면 옛 캐시가 activate에서 정리된다.

const CACHE = "emberpix-v2";
const CACHE_PREFIX = "emberpix-";
const OFFLINE_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Emberpix</title>
  </head>
  <body>
    <main>
      <h1>Emberpix</h1>
      <p>오프라인 상태라 최근에 저장된 화면만 보여줄 수 있습니다.</p>
    </main>
  </body>
</html>`;

function cacheResponse(request, response) {
  return caches
    .open(CACHE)
    .then((cache) => cache.put(request, response))
    .catch(() => {});
}

function offlineDocumentResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

async function installAppShell() {
  const scope = self.registration.scope;
  const rootUrl = new URL("./", scope).href;
  const indexUrl = new URL("./index.html", scope).href;
  const manifestUrl = new URL("./manifest.webmanifest", scope).href;
  const indexResponse = await fetch(indexUrl, { cache: "no-store" });
  if (!indexResponse.ok) throw new Error(`앱 셸을 가져오지 못했습니다: ${indexResponse.status}`);
  const html = await indexResponse.clone().text();
  const assets = new Set();
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const url = new URL(match[1], scope);
    if (url.origin === self.location.origin && /\.(?:js|css|png)$/i.test(url.pathname)) assets.add(url.href);
  }
  const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });
  if (!manifestResponse.ok) throw new Error(`manifest를 가져오지 못했습니다: ${manifestResponse.status}`);
  const manifest = await manifestResponse.clone().json();
  for (const icon of manifest.icons ?? []) {
    const url = new URL(icon.src, scope);
    if (url.origin === self.location.origin) assets.add(url.href);
  }
  const cache = await caches.open(CACHE);
  await Promise.all([
    cache.put(rootUrl, indexResponse.clone()),
    cache.put(indexUrl, indexResponse.clone()),
    cache.put(manifestUrl, manifestResponse.clone()),
  ]);
  await cache.addAll([...assets]);
}

async function matchDocumentFallback(request) {
  const cache = await caches.open(CACHE);
  const hit = (await cache.match(request, { ignoreVary: true })) || (await cache.match("./index.html", { ignoreVary: true }));
  return hit || offlineDocumentResponse();
}

self.addEventListener("install", (e) => {
  // 새 워커를 기다리지 않고 바로 대기 해제 — 홈 화면 앱이 옛 버전에 머물지 않게.
  self.skipWaiting();
  // 셸의 JS/CSS까지 모두 저장돼야 새 worker가 설치된다. 실패하면 기존 worker를 유지한다.
  e.waitUntil(installAppShell());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 외부 요청은 건드리지 않는다

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            e.waitUntil(cacheResponse(req, res.clone()));
            return res;
          }

          return matchDocumentFallback(req);
        })
        .catch(() => matchDocumentFallback(req))
    );
    return;
  }

  const network = fetch(req)
    .then(async (res) => {
      // 부분 응답(206)은 캐시에 넣을 수 없다.
      if (res && res.status === 200) await cacheResponse(req, res.clone());
      return res;
    })
    .catch(() => null);
  // 캐시 hit를 즉시 돌려줘도 갱신 promise가 worker 수명을 유지하게 한다.
  e.waitUntil(network);
  e.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(req, { ignoreVary: true }))
      .then((hit) => hit || network.then((response) => response || Response.error()))
  );
});
