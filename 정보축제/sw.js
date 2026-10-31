'use strict';
const VERSION="16f8f86a7e396449cf96f076c97da3bd16157d3d40e5c9052d6c60de2081853e";
const PREFIX="cursor-game:71ba573d-6c96-44c8-ba4c-d14da514f633:"+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const FILES=["./","./assets/fonts/Galmuri11.woff2","./assets/fonts/Galmuri14.woff2","./assets/fonts/Galmuri9.woff2","./assets/fonts/galmuri.css","./game-install.js","./game.config.js","./game.config.json","./game.js","./icon-192.png","./icon-512.png","./index.html","./main.css","./manifest.webmanifest","./pwa.js"];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();if(event.data==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(FILES.map(file=>cache.match(new URL(file,self.registration.scope).href)))).every(Boolean);event.ports[0]?.postMessage({ready,version:VERSION});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const request=event.request.mode==='navigate'?new URL('./',self.registration.scope).href:event.request;return(await cache.match(request,{ignoreSearch:true}))||fetch(event.request);})());});
