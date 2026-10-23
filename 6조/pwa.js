(function(){
 'use strict';
 const config=window.GAME_CONFIG||{};
 const credit=document.getElementById('game-credit');
 if(credit)credit.textContent='기획·디자인: '+(config.creator||'참가자');
 const button=document.getElementById('install-app'),status=document.getElementById('offline-status'),update=document.getElementById('update-game');
 if(!button||!status||!update)return;
 let prompt,registration;
 const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 if(standalone)button.hidden=true;
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;if(!standalone)button.hidden=false;});
 window.addEventListener('appinstalled',()=>{button.hidden=true;prompt=null;});
 button.addEventListener('click',async()=>{
  if(prompt){const saved=prompt;prompt=null;await saved.prompt();await saved.userChoice;return;}
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const message=location.protocol==='file:'?'공개된 게임 주소에서 앱을 추가해 주세요.':ios?'공유 → 홈 화면에 추가를 선택하고 아이콘으로 한 번 열어 오프라인 준비 완료를 확인하세요.':'브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요.';
  const help=document.getElementById('install-help'),text=document.getElementById('install-instructions');
  if(help&&text&&typeof help.showModal==='function'){text.textContent=message;help.showModal();}else alert(message);
 });
 document.getElementById('close-install-help')?.addEventListener('click',()=>document.getElementById('install-help')?.close());
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
