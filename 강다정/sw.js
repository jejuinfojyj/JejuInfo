'use strict';
const VERSION="1823b0563d2ee307ac2c5d3599719b21b23d79fc351b10651806d7e03e7bca3e";
const PREFIX="cursor-game:cf9e867d-b72b-4bc6-90dc-8ceba12bf48f:"+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const FILES=["./","./LICENSE.txt","./config.mjs","./game-install.js","./game-shell.css","./game-shell.js","./game-tools.js","./game.config.js","./game.config.json","./game.mjs","./icon-192.png","./icon-512.png","./index.html","./main.css","./main.js","./manifest.webmanifest","./pwa.js"];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();if(event.data==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(FILES.map(file=>cache.match(new URL(file,self.registration.scope).href)))).every(Boolean);event.ports[0]?.postMessage({ready,version:VERSION});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const request=event.request.mode==='navigate'?new URL('./',self.registration.scope).href:event.request;return(await cache.match(request,{ignoreSearch:true}))||fetch(event.request);})());});
