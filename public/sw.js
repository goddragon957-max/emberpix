// 오프라인 지원 서비스워커 — 빌드 도구/의존성 없이 런타임 캐시만 쓴다.
// Vite가 에셋 이름에 해시를 붙이므로 정적 목록을 미리 넣지 않아도 안전하다.
//
//  · 문서(navigate): 네트워크 우선 → 실패하면 캐시 (배포 직후 새 버전이 바로 뜬다)
//  · 그 외 same-origin GET: 캐시 우선 + 백그라운드 갱신 (빠르고, 다음 방문에 최신)
//
// CACHE 이름의 버전을 올리면 옛 캐시가 activate에서 정리된다.

const CACHE = "emberpix-v1";

self.addEventListener("install", (e) => {
  // 새 워커를 기다리지 않고 바로 대기 해제 — 홈 화면 앱이 옛 버전에 머물지 않게.
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest"]).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
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
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          // 부분 응답(206)은 캐시에 넣을 수 없다.
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
