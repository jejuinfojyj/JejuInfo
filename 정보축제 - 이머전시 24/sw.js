'use strict';
const VERSION="b0453dbc39b0cda40cad23995ba0746981bcc59fa7aaff508fcc7d857d0c425b";
const PREFIX="cursor-game:f1c1508d-5a98-5913-8e7e-e0b5759f1a34:"+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const FILES=["./","./festival-options.js","./festival-platform.css","./festival-platform.js","./game-install.js","./game.config.js","./game.config.json","./game.js","./icon-192.png","./icon-512.png","./index.html","./manifest.webmanifest","./pwa.js","./style.css"];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();if(event.data==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(FILES.map(file=>cache.match(new URL(file,self.registration.scope).href)))).every(Boolean);event.ports[0]?.postMessage({ready,version:VERSION});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const request=event.request.mode==='navigate'?new URL('./',self.registration.scope).href:event.request;return(await cache.match(request,{ignoreSearch:true}))||fetch(event.request);})());});
