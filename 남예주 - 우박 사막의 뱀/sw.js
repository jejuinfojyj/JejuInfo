'use strict';
const VERSION="a82fd90657490d22ab5bb95149bd03dfc0a777a806709d90d789bfdadaae79d3";
const PREFIX="cursor-game:91b84156-1409-56cb-9f59-2108002e165a:"+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const FILES=["./","./festival-options.js","./festival-platform.css","./festival-platform.js","./game-install.js","./game.config.js","./game.config.json","./icon-192.png","./icon-512.png","./index.html","./inline-script-1.js","./inline-style-1.css","./manifest.webmanifest","./pwa.js"];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();if(event.data==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(FILES.map(file=>cache.match(new URL(file,self.registration.scope).href)))).every(Boolean);event.ports[0]?.postMessage({ready,version:VERSION});})());});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const request=event.request.mode==='navigate'?new URL('./',self.registration.scope).href:event.request;return(await cache.match(request,{ignoreSearch:true}))||fetch(event.request);})());});
