'use strict';
const VERSION="68b53490e6c607e5caf93f0ec9c02a2efc6affd6cf6b75d599afaefb1dc97844";
const PREFIX="cursor-game:49e17885-1424-46a0-862b-ba5cdd9c04da:"+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const FILES=["./","./assets/night.svg","./game.config.js","./game.config.json","./game.js","./icon-192.png","./icon-512.png","./index.html","./manifest.webmanifest","./pwa.js","./styles.css"];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();if(event.data==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(FILES.map(file=>cache.match(new URL(file,self.registration.scope).href)))).every(Boolean);event.ports[0]?.postMessage({ready,version:VERSION});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const request=event.request.mode==='navigate'?new URL('./',self.registration.scope).href:event.request;return(await cache.match(request,{ignoreSearch:true}))||fetch(event.request);})());});
