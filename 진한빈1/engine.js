(function () {
  'use strict';
  let W = 960, H = 540;
  async function loadConfig() {
    let cfg;
    if (location.protocol === 'file:') cfg=structuredClone(window.GAME_CONFIG || {});
    else { const response = await fetch('game.config.json', { cache: 'no-store' }); if (!response.ok) throw new Error('설정을 읽지 못했습니다.'); cfg=await response.json(); }
    const demo=new URLSearchParams(location.search).get('variant');
    if(cfg.creator==='참가자'&&window.TEMPLATE_INFO){const item=window.TEMPLATE_INFO.variants.find(item=>item.id===demo);if(item){cfg.variant=item.id;cfg.texts.start=item.description;}}
    return cfg;
  }
  function createInput(canvas, control, onTap) {
    const sources = new Map(), edges = new Set(), repeats = new Map(), gestures = new Map();
    const joy = document.getElementById('joystick'); let joyId = null;
    const alias = { a:'ArrowLeft', d:'ArrowRight', w:'ArrowUp', s:'ArrowDown', j:' ' };
    const normalize = key => alias[key.toLowerCase()] || key;
    const pointer = { x: W/2, y: H/2, active: false };
    const axes = { x:0, y:0 };
    const held = key => [...sources.values()].includes(key);
    function press(source, key) { if (!held(key)) edges.add(key); sources.set(source,key); }
    function pulse(key) { edges.add(key); }
    function clear() { sources.clear(); edges.clear(); repeats.clear(); gestures.clear(); pointer.active = false; axes.x = axes.y = 0; joyId=null; joy.style.setProperty('--jx','0px'); joy.style.setProperty('--jy','0px'); }
    function point(event) { const rect = canvas.getBoundingClientRect(); return { x:(event.clientX-rect.left)*W/rect.width, y:(event.clientY-rect.top)*H/rect.height }; }
    window.addEventListener('keydown', event => {
      if (event.target && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      const key = normalize(event.key); press('key:'+event.code,key);
      if (key.startsWith('Arrow') || key === ' ') event.preventDefault();
    });
    window.addEventListener('keyup', event => sources.delete('key:'+event.code));
    const map = { left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown', action:' ' };
    document.querySelectorAll('#touch button').forEach(button => {
      button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); press('button:'+event.pointerId,map[button.dataset.act]); });
      const release = event => sources.delete('button:'+event.pointerId);
      button.addEventListener('pointerup',release); button.addEventListener('pointercancel',release); button.addEventListener('lostpointercapture',release);
    });
    canvas.addEventListener('pointerdown', event => {
      event.preventDefault(); canvas.setPointerCapture(event.pointerId);
      const p = point(event); gestures.set(event.pointerId,{ x:event.clientX,y:event.clientY });
      if (control === 'drag') { Object.assign(pointer,p,{ active:true }); if (canvas.dataset.dragFire === 'true') press('canvas:'+event.pointerId,' '); }
      if (control === 'tap') press('canvas:'+event.pointerId,' ');
      if (control === 'drag' && canvas.dataset.tapAction === 'true') pulse(' ');
      if (control === 'direct') onTap(p);
    });
    canvas.addEventListener('pointermove', event => {
      const previous = gestures.get(event.pointerId); if (!previous) return;
      if (control === 'drag') Object.assign(pointer,point(event),{ active:true });
      if (control === 'swipe') {
        const dx = event.clientX-previous.x, dy = event.clientY-previous.y;
        if (Math.max(Math.abs(dx),Math.abs(dy)) >= 20) { pulse(Math.abs(dx)>Math.abs(dy) ? dx>0?'ArrowRight':'ArrowLeft' : dy>0?'ArrowDown':'ArrowUp'); gestures.set(event.pointerId,{x:event.clientX,y:event.clientY}); }
      }
    });
    const releaseCanvas = event => { gestures.delete(event.pointerId); sources.delete('canvas:'+event.pointerId); if (!gestures.size) pointer.active = false; };
    canvas.addEventListener('pointerup',releaseCanvas); canvas.addEventListener('pointercancel',releaseCanvas); canvas.addEventListener('lostpointercapture',releaseCanvas);
    function moveJoy(event) {
      if (event.pointerId !== joyId) return;
      const rect = joy.getBoundingClientRect(); const radius = rect.width*0.34;
      let x=(event.clientX-rect.left-rect.width/2)/radius, y=(event.clientY-rect.top-rect.height/2)/radius;
      const length=Math.max(1,Math.hypot(x,y)); x/=length; y/=length; axes.x=x; axes.y=y;
      joy.style.setProperty('--jx',x*radius+'px'); joy.style.setProperty('--jy',y*radius+'px');
    }
    joy.addEventListener('pointerdown',event=>{ if (joyId !== null) return; joyId=event.pointerId; joy.setPointerCapture(joyId); moveJoy(event); event.preventDefault(); });
    joy.addEventListener('pointermove',moveJoy);
    const releaseJoy=event=>{ if(event.pointerId!==joyId)return; joyId=null; axes.x=axes.y=0; joy.style.setProperty('--jx','0px'); joy.style.setProperty('--jy','0px'); };
    joy.addEventListener('pointerup',releaseJoy); joy.addEventListener('pointercancel',releaseJoy); joy.addEventListener('lostpointercapture',releaseJoy);
    return { held, hit:key=>edges.has(key), pulse, pointer, axes, clear,
      repeat(key,delay=0.16) { if(edges.has(key)){repeats.set(key,performance.now()+delay*1000);return true;} if(!held(key)){repeats.delete(key);return false;} const next=repeats.get(key)||0; if(performance.now()>=next){repeats.set(key,performance.now()+delay*1000);return true;}return false; },
      endFrame(){edges.clear();}, point };
  }
  function boot(cfg, setup) {
    for (const key of ['texts','rules','map','player','assets']) cfg[key]=cfg[key]||{};
    cfg.special=Array.isArray(cfg.special)?cfg.special:[];
    if(cfg.layout==='adaptive'&&window.innerHeight>window.innerWidth){W=528;H=816;}
    const canvas=document.getElementById('view');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
    const overlay=document.getElementById('overlay'), action=document.getElementById('action');
    const overlayTitle=document.getElementById('overlay-title'), overlayText=document.getElementById('overlay-text');
    const pause=document.getElementById('pause'), touch=document.getElementById('touch');
    document.title=cfg.title||'게임'; document.getElementById('title').textContent=document.title;
    document.getElementById('credit').textContent='기획·디자인: '+(cfg.creator||'참가자');
    document.body.dataset.control=cfg.controls||'pad';
    const hints={ swipe:'화면을 쓸어 방향 바꾸기 · 방향키', drag:'화면에서 손가락을 끌어 이동 · 방향키', joystick:'왼쪽 원으로 이동 · 오른쪽 버튼으로 행동 · WASD', tap:'화면을 탭해서 행동 · 스페이스', direct:'화면의 대상을 직접 터치 · 숫자키/방향키', pad:'왼쪽 이동 · 오른쪽 행동 · 방향키/스페이스' };
    document.getElementById('hint').textContent=hints[cfg.controls]||hints.pad;
    let mode='start', tapHandler=()=>{}, audio=null;
    const input=createInput(canvas,cfg.controls||'pad',p=>{if(mode==='play')tapHandler(p);});
    const images=new Map();
    function image(src){if(!src)return null;if(!images.has(src)){const img=new Image();img.src=src;images.set(src,img);}return images.get(src);}
    image(cfg.player.sprite);image(cfg.map.backgroundSprite||cfg.assets.background);Object.values(cfg.assets).forEach(image);
    function sprite(src,x,y,w,h){const img=image(src);if(img&&img.complete&&img.naturalWidth){ctx.drawImage(img,x,y,w,h);return true;}return false;}
    function actor(x,y,w,h,color){
      if(sprite(cfg.player.sprite,x,y,w,h))return;
      ctx.fillStyle=color||cfg.player.color||'#7ee0ff';const shape=cfg.player.shape||'round';
      if(shape==='square')ctx.fillRect(x,y,w,h);
      else if(shape==='star'){ctx.beginPath();for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2;const radius=i%2?0.23:0.48;const xx=x+w/2+Math.cos(angle)*w*radius,yy=y+h/2+Math.sin(angle)*h*radius;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.fill();}
      else {ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill();if(shape==='cat'){ctx.beginPath();ctx.moveTo(x,y+h*0.3);ctx.lineTo(x,y);ctx.lineTo(x+w*0.35,y+h*0.2);ctx.moveTo(x+w,y+h*0.3);ctx.lineTo(x+w,y);ctx.lineTo(x+w*0.65,y+h*0.2);ctx.fill();}}
      ctx.fillStyle='#172033';ctx.fillRect(x+w*0.27,y+h*0.32,Math.max(2,w*0.09),Math.max(2,h*0.12));ctx.fillRect(x+w*0.63,y+h*0.32,Math.max(2,w*0.09),Math.max(2,h*0.12));
    }
    function show(title,text,label){overlay.hidden=false;overlayTitle.textContent=title;overlayText.textContent=text;action.textContent=label;}
    function setMode(next){mode=next;document.body.dataset.mode=next;pause.disabled=!['play','pause'].includes(next);}
    const api={ cfg,input,canvas,ctx,W,H,mode:()=>mode,
      setScore:text=>{document.getElementById('score').textContent=text;},setExtra:text=>{document.getElementById('extra').textContent=text;},
      buttons(list){ const ids=(list||[]).map(item=>item.act).join(' ');touch.dataset.buttons=ids;document.querySelectorAll('#touch button').forEach(button=>{const item=(list||[]).find(item=>item.act===button.dataset.act);button.hidden=!item;if(item)button.textContent=item.label;}); },
      onTap:callback=>{tapHandler=callback;},
      choices(items,callback){const area=document.getElementById('choices');area.replaceChildren();document.body.classList.toggle('has-choices',items.length>0);items.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.textContent=(index+1)+'. '+item.label;if(item.color)button.style.background=item.color;button.addEventListener('click',()=>{if(mode==='play')callback(index);});area.appendChild(button);});}, show,hide:()=>{overlay.hidden=true;},
      win(){if(mode!=='play')return;setMode('win');input.clear();show(cfg.texts.win||'성공!','한 번 더 해 볼까?','다시 하기');},
      lose(){if(mode!=='play')return;setMode('lose');input.clear();show(cfg.texts.lose||'다시 도전해 봐!','다른 방법도 찾아보자.','다시 하기');},
      has:key=>cfg.special.includes(key),is:key=>(cfg.variant||'classic')===key,
      color:()=>cfg.player.color||'#7ee0ff',background:()=>cfg.map.background||'#24165a',accent:()=>cfg.map.accent||'#ffe566',
      drawActor:actor,
      drawItem(slot,x,y,w,h,color){if(!sprite(cfg.assets[slot],x,y,w,h)){ctx.fillStyle=color||api.accent();ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(w,h)*0.2);ctx.fill();}if(slot==='enemy'&&cfg.texts.enemy){ctx.save();ctx.fillStyle='#fff7e2';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText(cfg.texts.enemy,x+w/2,y-5);ctx.restore();}},
      pointer:input.point,
      tone(frequency=440,duration=0.08){if(!audio||audio.state!=='running')return;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0.05,audio.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audio.currentTime+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);}
    };
    const game=setup(api)||{};
    function begin(){input.clear();setMode('play');overlay.hidden=true;pause.textContent='일시 정지';if(game.reset)game.reset();try{if(!audio&&window.AudioContext)audio=new AudioContext();if(audio)audio.resume().catch(()=>{});}catch{} }
    function paused(){if(mode!=='play')return;input.clear();setMode('pause');show('잠깐 쉬는 중','준비되면 이어서 해 봐.','계속하기');pause.textContent='계속하기';}
    function resume(){input.clear();setMode('play');overlay.hidden=true;pause.textContent='일시 정지';}
    action.addEventListener('click',()=>mode==='pause'?resume():begin());pause.addEventListener('click',()=>mode==='pause'?resume():paused());
    window.addEventListener('blur',()=>{input.clear();paused();});document.addEventListener('visibilitychange',()=>{if(document.hidden){input.clear();paused();}});
    function fit(){const main=canvas.parentElement;const width=Math.min(main.clientWidth,main.clientHeight*W/H);canvas.style.width=width+'px';canvas.style.height=width*H/W+'px';}
    new ResizeObserver(fit).observe(canvas.parentElement);window.addEventListener('resize',fit);fit();
    if(game.reset)game.reset();setMode('start');show(document.title,cfg.texts.start||'시작하기를 눌러 봐.','시작하기');
    let last=0;
    function frame(now){const dt=Math.min(0.034,last?(now-last)/1000:0.016);last=now;
      if(mode==='play'&&input.hit('Escape'))paused();
      else if(['start','win','lose'].includes(mode)&&(input.hit(' ')||input.hit('Enter')))begin();
      else if(mode==='play'&&game.update)game.update(dt);
      ctx.fillStyle=api.background();ctx.fillRect(0,0,W,H);
      const bg=image(cfg.map.backgroundSprite||cfg.assets.background);if(bg&&bg.complete&&bg.naturalWidth){const scale=Math.max(W/bg.naturalWidth,H/bg.naturalHeight);ctx.drawImage(bg,(W-bg.naturalWidth*scale)/2,(H-bg.naturalHeight*scale)/2,bg.naturalWidth*scale,bg.naturalHeight*scale);}
      if(game.draw)game.draw();input.endFrame();requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  window.TemplateEngine={start:setup=>loadConfig().then(cfg=>boot(cfg,setup)).catch(error=>{document.getElementById('overlay-text').textContent='게임을 열지 못했어. '+error.message;document.getElementById('action').disabled=true;})};
})();

