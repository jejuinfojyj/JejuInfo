'use strict';
const TARGET="/%EC%A0%95%EB%B3%B4%EC%B6%95%EC%A0%9C6/";
const PREFIX="cursor-game:e1d0631e-ba03-59af-b06c-5dabf07f756d:"+self.registration.scope+':';
function destination(source){const old=new URL(source),next=new URL(TARGET,self.location.origin);next.search=old.search;next.hash=old.hash;return next.href;}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX))await caches.delete(key);await self.clients.claim();const pages=await self.clients.matchAll({type:'window',includeUncontrolled:true});await Promise.all(pages.filter(client=>client.url.startsWith(self.registration.scope)).map(client=>client.navigate(destination(client.url))));await self.registration.unregister();})()));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(Response.redirect(destination(event.request.url),302));});
