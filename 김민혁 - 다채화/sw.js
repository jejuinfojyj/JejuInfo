'use strict';
const VERSION="c9c8d897c16ec5d8a273fcaca2db32ebf593ff1503ae5191a9cae0ca5367ee5f";
const PREFIX="cursor-game:9e18ba76-3eb1-5d6d-a4c7-44bc85d618ed:"+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const FILES=["./","./festival-options.js","./festival-platform.css","./festival-platform.js","./game-install.js","./game.config.js","./game.config.json","./icon-192.png","./icon-512.png","./index.html","./levels.js","./main.js","./manifest.webmanifest","./puzzle.js","./pwa.js","./styles.css"];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();if(event.data==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(FILES.map(file=>cache.match(new URL(file,self.registration.scope).href)))).every(Boolean);event.ports[0]?.postMessage({ready,version:VERSION});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const request=event.request.mode==='navigate'?new URL('./',self.registration.scope).href:event.request;return(await cache.match(request,{ignoreSearch:true}))||fetch(event.request);})());});
