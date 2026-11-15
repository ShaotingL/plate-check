/**
 * Service Worker（車牌名單比對）
 *  1. 安裝時把所有檔案（含辨識模型）存進快取 → 之後沒有網路也能開啟
 *  2. 回應時補上 COOP / COEP 標頭 → 頁面成為「跨來源隔離」，辨識引擎才能用多執行緒
 *  更新程式時請改下面的 CACHE 版本號，使用者下次開啟就會抓新版
 */
const CACHE = "plate-app-v18";
const FILES = [
  "./",
  "fonts/barlow-condensed-latin-600-normal.woff2",
  "fonts/barlow-condensed-latin-700-normal.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "index.html",
  "lib/ort-wasm-simd-threaded.mjs",
  "lib/ort-wasm-simd-threaded.wasm",
  "lib/ort.wasm.min.js",
  "licenses/NOTICE.txt",
  "manifest.webmanifest",
  "models/cct_s_v2_global.onnx",
  "models/cct_xs_v2_global.onnx",
  "models/yolo-v9-t-384-license-plates-end2end.onnx",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))   // 清掉舊版快取
    .then(() => self.clients.claim()));
});

/** 複製回應並加上跨來源隔離標頭 */
function isolate(res){
  if (!res || res.status === 0) return res;
  const h = new Headers(res.headers);
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Embedder-Policy", "require-corp");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  return new Response(res.body, {status: res.status, statusText: res.statusText, headers: h});
}

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // 只處理本站的 GET；其他（例如上傳到 Google 試算表）直接放行
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true})          // 快取優先（忽略 ?v= 之類的參數）
      .then(hit => hit || fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }))
      .then(isolate)
  );
});
