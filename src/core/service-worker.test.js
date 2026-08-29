import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SW_SOURCE = fs.readFileSync(path.resolve(__dirname, "../../public/sw.js"), "utf8");
const CURRENT_CACHE = "emberpix-v2";

class FakeCache {
  constructor(origin, options = {}) {
    this.origin = origin;
    this.options = options;
    this.entries = new Map();
  }

  async addAll(requests) {
    for (const request of requests) {
      this.entries.set(normalizeKey(this.origin, request), new Response("precache", { status: 200 }));
    }
  }

  async match(request) {
    return this.entries.get(normalizeKey(this.origin, request));
  }

  async put(request, response) {
    if (this.options.rejectPut) {
      throw new Error("cache put rejected");
    }

    this.entries.set(normalizeKey(this.origin, request), response);
  }
}

class FakeCaches {
  constructor(origin, cacheOptions = {}) {
    this.origin = origin;
    this.cacheOptions = cacheOptions;
    this.deleted = [];
    this.namedCaches = new Map();
  }

  seed(name, key, response) {
    const cache = this.ensure(name);
    cache.entries.set(normalizeKey(this.origin, key), response);
  }

  ensure(name) {
    if (!this.namedCaches.has(name)) {
      this.namedCaches.set(name, new FakeCache(this.origin, this.cacheOptions[name]));
    }

    return this.namedCaches.get(name);
  }

  async open(name) {
    return this.ensure(name);
  }

  async match(request) {
    const key = normalizeKey(this.origin, request);
    for (const cache of this.namedCaches.values()) {
      if (cache.entries.has(key)) {
        return cache.entries.get(key);
      }
    }

    return undefined;
  }

  async keys() {
    return [...this.namedCaches.keys()];
  }

  async delete(name) {
    this.deleted.push(name);
    return this.namedCaches.delete(name);
  }
}

function normalizeKey(origin, request) {
  if (typeof request === "string") {
    return new URL(request, origin).href;
  }

  return request.url;
}

function createWorkerHarness({
  origin = "https://emberpix.test",
  fetchImpl = async () => new Response("ok", { status: 200 }),
  caches = new FakeCaches(origin),
} = {}) {
  const listeners = new Map();
  const self = {
    location: { origin },
    registration: { scope: `${origin}/` },
    caches,
    skipWaitingCalls: 0,
    clients: {
      claimCalls: 0,
      async claim() {
        self.clients.claimCalls += 1;
      },
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    skipWaiting() {
      self.skipWaitingCalls += 1;
    },
  };

  const context = vm.createContext({
    URL,
    Response,
    Request,
    Headers,
    caches,
    fetch: fetchImpl,
    self,
    console,
    Promise,
  });

  new vm.Script(SW_SOURCE, { filename: "public/sw.js" }).runInContext(context);

  return {
    caches,
    self,
    async dispatchExtendable(type) {
      const waitUntilPromises = [];
      listeners.get(type)?.({
        waitUntil(promise) {
          waitUntilPromises.push(Promise.resolve(promise));
        },
      });
      return Promise.allSettled(waitUntilPromises);
    },
    async dispatchFetch(request) {
      const waitUntilPromises = [];
      let responsePromise = Promise.resolve(undefined);
      listeners.get("fetch")?.({
        request,
        waitUntil(promise) {
          waitUntilPromises.push(Promise.resolve(promise));
        },
        respondWith(value) {
          responsePromise = Promise.resolve(value).then((response) => {
            if (!(response instanceof Response)) {
              throw new TypeError("fetch handler must resolve to Response");
            }
            return response;
          });
        },
      });

      const response = await responsePromise;
      const waitUntilResults = await Promise.allSettled(waitUntilPromises);
      return { response, waitUntilResults };
    },
  };
}

test("activate는 emberpix 캐시만 정리하고 다른 앱 캐시는 보존한다", async () => {
  const harness = createWorkerHarness();
  harness.caches.seed("emberpix-v0", "./index.html", new Response("old", { status: 200 }));
  harness.caches.seed("external-app", "https://emberpix.test/foreign", new Response("keep", { status: 200 }));

  await harness.dispatchExtendable("activate");

  assert.deepEqual(harness.caches.deleted, ["emberpix-v0"]);
  assert.ok(harness.caches.namedCaches.has("external-app"));
  assert.equal(harness.self.clients.claimCalls, 1);
});

test("install은 첫 방문의 해시 JS와 CSS까지 앱 셸로 캐시한다", async () => {
  const harness = createWorkerHarness({
    fetchImpl: async (request) => {
      const url = typeof request === "string" ? request : request.url;
      if (url.endsWith("index.html")) {
        return new Response('<script type="module" src="/assets/app-123.js"></script><link rel="stylesheet" href="/assets/app-123.css"><link rel="icon" href="/favicon-32.png">', { status: 200 });
      }
      if (url.endsWith("manifest.webmanifest")) return new Response('{"icons":[{"src":"./icon-192.png"}]}', { status: 200 });
      return new Response("asset", { status: 200 });
    },
  });
  const results = await harness.dispatchExtendable("install");
  assert.ok(results.every((entry) => entry.status === "fulfilled"));
  const keys = [...harness.caches.ensure(CURRENT_CACHE).entries.keys()];
  assert.ok(keys.includes("https://emberpix.test/assets/app-123.js"));
  assert.ok(keys.includes("https://emberpix.test/assets/app-123.css"));
  assert.ok(keys.includes("https://emberpix.test/favicon-32.png"));
  assert.ok(keys.includes("https://emberpix.test/icon-192.png"));
});

test("navigate 요청이 HTTP 오류를 받으면 캐시된 index.html로 복구한다", async () => {
  const harness = createWorkerHarness({
    fetchImpl: async () => new Response("server error", { status: 503, headers: { "content-type": "text/plain" } }),
  });
  harness.caches.seed(CURRENT_CACHE, "./index.html", new Response("<html>cached shell</html>", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  }));

  const { response } = await harness.dispatchFetch({
    url: "https://emberpix.test/gallery",
    method: "GET",
    mode: "navigate",
  });

  assert.equal(response.status, 200);
  assert.match(await response.text(), /cached shell/);
});

test("navigate 요청이 오프라인이고 캐시도 없으면 유효한 HTML 응답을 돌려준다", async () => {
  const harness = createWorkerHarness({
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });

  const { response } = await harness.dispatchFetch({
    url: "https://emberpix.test/editor",
    method: "GET",
    mode: "navigate",
  });

  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/i);
  assert.match(await response.text(), /Emberpix/i);
});

test("same-origin GET 캐시 갱신은 waitUntil에 묶고 put 실패를 삼킨다", async () => {
  const harness = createWorkerHarness({
    caches: new FakeCaches("https://emberpix.test", { [CURRENT_CACHE]: { rejectPut: true } }),
    fetchImpl: async () => new Response("asset", { status: 200 }),
  });

  const { response, waitUntilResults } = await harness.dispatchFetch({
    url: "https://emberpix.test/assets/app.js",
    method: "GET",
    mode: "same-origin",
  });

  assert.equal(response.status, 200);
  assert.equal(waitUntilResults.length, 1);
  assert.equal(waitUntilResults[0].status, "fulfilled");
});
