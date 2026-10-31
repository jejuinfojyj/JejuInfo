'use strict';
const VERSION="9d742d1134cb44f99e6612a11701739636eaff7486878693feaf356879da372d";
const PREFIX="cursor-game:c24b4af4-529f-431a-b4a5-99d0947f2bcb:"+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const FILES=["./","./LICENSE.txt","./app.js","./cam3d.mjs","./camera2d.mjs","./config.mjs","./game-install.js","./game-shell.css","./game-shell.js","./game-tools.js","./game.config.js","./game.config.json","./game.mjs","./icon-192.png","./icon-512.png","./index.html","./main.css","./main.js","./manifest.webmanifest","./pwa.js"];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();if(event.data==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(FILES.map(file=>cache.match(new URL(file,self.registration.scope).href)))).every(Boolean);event.ports[0]?.postMessage({ready,version:VERSION});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const request=event.request.mode==='navigate'?new URL('./',self.registration.scope).href:event.request;return(await cache.match(request,{ignoreSearch:true}))||fetch(event.request);})());});
