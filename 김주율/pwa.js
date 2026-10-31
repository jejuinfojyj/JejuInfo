(function(){
 'use strict';
 const config=window.GAME_CONFIG||{};
 const credit=document.getElementById('game-credit');
 if(credit)credit.textContent='기획·디자인: '+(config.creator||'참가자');
 const button=document.getElementById('install-app'),status=document.getElementById('offline-status'),update=document.getElementById('update-game');
 if(!button||!status||!update)return;
 let registration;
 if(window.CURSOR_GAME_PREVIEW){status.textContent='로컬 미리보기 · 수정 내용 바로 반영';update.hidden=true;if(navigator.serviceWorker?.getRegistrations)navigator.serviceWorker.getRegistrations().then(registrations=>Promise.all(registrations.filter(reg=>reg.scope===new URL('./',location.href).href).map(reg=>reg.unregister()))).catch(()=>{});return;}
 if(!('serviceWorker'in navigator)||!window.isSecureContext||location.protocol==='file:'){status.textContent='공개 사이트에서 오프라인 저장 가능';return;}
 function showStatus(worker){
  if(!worker)return;
  const channel=new MessageChannel();
  channel.port1.onmessage=event=>{status.textContent=event.data.ready?'오프라인 준비 완료':'오프라인 저장 중…';channel.port1.close();};
  worker.postMessage('OFFLINE_STATUS',[channel.port2]);
 }
 function offerUpdate(){if(registration.waiting&&navigator.serviceWorker.controller)update.hidden=false;}
 update.addEventListener('click',()=>{if(registration?.waiting){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});registration.waiting.postMessage('SKIP_WAITING');}});
 navigator.serviceWorker.addEventListener('controllerchange',()=>showStatus(navigator.serviceWorker.controller));
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(reg=>{
  registration=reg;offerUpdate();
  reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',()=>{offerUpdate();if(reg.active)showStatus(reg.active);}));
  return navigator.serviceWorker.ready;
 }).then(reg=>showStatus(reg.active)).catch(()=>{status.textContent='오프라인 저장을 완료하지 못했습니다. 온라인에서 다시 열어 주세요.';});
})();
