(function () {
  'use strict';
  const button = document.getElementById('install-app'), status = document.getElementById('offline-status');
  const help = document.getElementById('install-help'), close = document.getElementById('close-install-help');
  const text = document.getElementById('install-instructions'), update = document.getElementById('update-game');
  if (!button || !status) return;
  let prompt, registration;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) button.hidden = true;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); prompt = event; if (!standalone) button.hidden = false; });
  window.addEventListener('appinstalled', () => { button.hidden = true; prompt = null; });
  close.addEventListener('click', () => help.close());
  button.addEventListener('click', async () => {
    if (prompt) { const saved = prompt; prompt = null; await saved.prompt(); await saved.userChoice; return; }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    text.textContent = location.protocol === 'file:' ? '공개된 게임 주소를 연 뒤 앱을 추가해 주세요.'
      : ios ? '브라우저의 공유 버튼을 누르고 ‘홈 화면에 추가’를 선택해 주세요. 추가한 아이콘으로 게임을 한 번 열고 오프라인 준비 완료를 확인하세요.'
      : '브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요. 지원하지 않는 브라우저에서는 게임 주소를 북마크할 수 있어요.';
    help.showModal();
  });
  if (!('serviceWorker' in navigator) || !window.isSecureContext || location.protocol === 'file:') { status.textContent = '공개 사이트에서 오프라인 저장 가능'; return; }
  function showStatus(worker) {
    if (!worker) return;
    const channel = new MessageChannel();
    channel.port1.onmessage = event => { status.textContent = event.data.ready ? '오프라인 준비 완료' : '오프라인 저장 중…'; channel.port1.close(); };
    worker.postMessage('OFFLINE_STATUS', [channel.port2]);
  }
  function offerUpdate() { if (registration.waiting && navigator.serviceWorker.controller) update.hidden = false; }
  update.addEventListener('click', () => { if (registration.waiting) { navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true }); registration.waiting.postMessage('SKIP_WAITING'); } });
  navigator.serviceWorker.addEventListener('controllerchange', () => showStatus(navigator.serviceWorker.controller));
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(async value => {
    registration = value; offerUpdate();
    registration.addEventListener('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offerUpdate(); }); });
    const ready = await navigator.serviceWorker.ready; showStatus(ready.active);
  }).catch(() => { status.textContent = '오프라인 저장 실패 · 인터넷 연결 후 다시 열어 주세요'; });
}());
