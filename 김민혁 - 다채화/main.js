(function(){"use strict";const SAVE_KEY="dachehwa-progress-v1";const CHAPTERS=[["경계","맞닿은 색을 가른다"],["목표","표식의 색을 맞춘다"],["혼색","섞고, 흐르게 한다"]];const GLYPH={R:'<circle cx="12" cy="12" r="5.5" fill="currentColor"/>',Y:'<path fill="currentColor" d="M12 4.2 19.6 18.8H4.4z"/>',B:'<rect x="6.2" y="6.2" width="11.6" height="11.6" rx="2.2" fill="currentColor"/>',O:'<path fill="currentColor" d="M12 3.2 20.8 12 12 20.8 3.2 12z"/>',G:'<path fill="currentColor" d="M12 3 17.4 6.2v7.1L12 21 6.6 13.3V6.2z"/>',P:'<path fill="currentColor" d="M12 2.6 14.6 9h6.6l-5.3 3.9 2 6.5L12 15.6 6.1 19.4l2-6.5L2.8 9h6.6z"/>',K:'<path fill="currentColor" d="M4 13.4c3.4-2.6 6.4-2.2 8.4-.2 2-1.8 4.8-1.8 8 .2-2.6 2.2-5.2 2.4-8.2.6-2.8 1.6-5.4 1.2-8.2-.6z"/>'};const state={screen:"select",cleared:loadProgress(),levelId:null,manager:null,selected:null,cursor:{x:0,y:0},modal:false,freshId:null,wipeArmed:false,winTimer:0,toastTimer:0,wipeTimer:0};function loadProgress(){try{const data=JSON.parse(localStorage.getItem(SAVE_KEY)||'{"cleared":[]}');const cleared=new Set;(data.cleared||[]).forEach(value=>{const id=Number(value);if(Number.isInteger(id)&&id>=1&&id<=LEVELS.length)cleared.add(id)});return cleared}catch(error){return new Set}}function saveProgress(){localStorage.setItem(SAVE_KEY,JSON.stringify({cleared:Array.from(state.cleared).sort((a,b)=>a-b)}))}function isUnlocked(id){return id===1||state.cleared.has(id-1)}function glyph(id){return`<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">${GLYPH[id]||""}</svg>`}function toast(message){const el=document.getElementById("toast");el.textContent=message;el.classList.add("is-on");clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove("is-on"),2200)}function openModal(html){const modal=document.getElementById("modal");modal.innerHTML=html;modal.hidden=false;state.modal=true;const focus=modal.querySelector("[data-autofocus]");if(focus)focus.focus()}function closeModal(){const modal=document.getElementById("modal");modal.hidden=true;modal.innerHTML="";state.modal=false}function checkBadge(){return'<span class="clear-badge" title="클리어"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.2 16.8 19 7.2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sr">클리어</span></span>'}function lockBadge(){return'<span class="lock-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6" y="11" width="12" height="9" rx="2" fill="currentColor"/><path d="M8.5 11V8.2a3.5 3.5 0 0 1 7 0V11" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>'}function renderSelect(){document.title="다채화";const nextId=LEVELS.find(level=>isUnlocked(level.id)&&!state.cleared.has(level.id));const cards=CHAPTERS.map(([name,desc])=>{const levels=LEVELS.filter(level=>level.chapter===name);const buttons=levels.map(level=>{const locked=!isUnlocked(level.id);const cleared=state.cleared.has(level.id);const classes=["stage-card"];if(locked)classes.push("is-locked");if(cleared)classes.push("is-cleared");if(nextId&&nextId.id===level.id)classes.push("is-next");if(state.freshId===level.id)classes.push("is-fresh");const status=locked?"잠김":cleared?"클리어":"플레이 가능";return`<button type="button" class="${classes.join(" ")}" data-action="select-stage" data-id="${level.id}" aria-label="스테이지 ${level.id} ${level.name}, ${status}">
          <span class="stage-no">${String(level.id).padStart(2,"0")}</span>
          <span class="stage-name">${level.name}</span>
          <span class="stage-tag">${level.tag}</span>
          ${locked?lockBadge():""}
          ${cleared?checkBadge():""}
        </button>`}).join("");return`<section class="chapter"><h2>${name}<em>${desc}</em></h2><div class="stage-grid">${buttons}</div></section>`}).join("");const done=state.cleared.size===LEVELS.length?'<p class="done-banner">열여덟 스테이지를 모두 클리어했습니다.</p>':"";document.getElementById("screen").innerHTML=`
      <header class="hero">
        <div class="seal" aria-hidden="true">彩</div>
        <div>
          <p class="eyebrow">색을 칠하고 규칙을 맞추는 퍼즐</p>
          <h1>다채화</h1>
          <p class="progress-line">${state.cleared.size} / ${LEVELS.length} 클리어 · 이전 스테이지를 깨면 다음이 열립니다</p>
        </div>
        <div class="hero-side">
          <button type="button" class="btn" data-action="rules">놀이 방법</button>
        </div>
      </header>
      ${done}
      ${cards}
      <div class="footer-actions">
        <button type="button" class="btn quiet" data-action="wipe">기록 지우기</button>
      </div>
    `}function arrowsFor(node){return node.from.map(dir=>`<i class="flow-arrow ${dir}" aria-hidden="true"></i>`).join("")}function renderPlay(){const level=state.manager.level;document.title=`다채화 · ${level.id} ${level.name}`;const cells=state.manager.nodes.map(node=>{const pip=node.targetColor?`<i class="pip" style="--c:${Dachehwa.PIGMENTS[node.targetColor].hex}"></i>`:"";return`<button type="button" class="cell" data-action="paint" data-x="${node.x}" data-y="${node.y}">
        ${arrowsFor(node)}
        <span class="glyph-slot"></span>
        ${pip}
      </button>`}).join("");const quota=level.quota;const swatches=level.palette.map(color=>{const pigment=Dachehwa.PIGMENTS[color];const count=quota?`<em>0/${quota[color]}</em>`:"";return`<button type="button" class="swatch" data-action="pick" data-color="${color}" role="option">
        <b style="background:${pigment.hex}"></b>
        <span>${pigment.name}</span>
        ${count}
      </button>`}).join("");const flat=level.grid.flat();const key=[];if(flat.some(cell=>cell.kind==="source"))key.push('<li><i class="sample source"></i>고정된 색</li>');if(flat.some(cell=>cell.target))key.push('<li><i class="sample pip"></i>목표 색</li>');if(flat.some(cell=>cell.kind==="flow"))key.push('<li><i class="sample flow"></i>흘러드는 색</li>');if(flat.some(cell=>cell.kind==="mix"))key.push('<li><i class="sample mix"></i>섞여 정해짐</li>');const hasMix=flat.some(cell=>cell.kind==="mix");const formula=hasMix?`<div class="formula" aria-label="혼색 공식"><span>같은 기본색은 그대로</span><span><i class="dot" style="background:#e23b2f"></i>+<i class="dot" style="background:#f2c14d"></i>=<i class="dot" style="background:#ef7a1a"></i> 주</span><span><i class="dot" style="background:#f2c14d"></i>+<i class="dot" style="background:#2f6fe0"></i>=<i class="dot" style="background:#2f9d55"></i> 녹</span><span><i class="dot" style="background:#2f6fe0"></i>+<i class="dot" style="background:#e23b2f"></i>=<i class="dot" style="background:#8d4ad4"></i> 자</span></div>`:"";document.getElementById("screen").innerHTML=`
      <header class="play-bar">
        <button type="button" class="btn" data-action="back">목록</button>
        <div class="play-title">
          <p class="eyebrow">스테이지 ${level.id} · ${level.chapter}</p>
          <h1>${level.name}</h1>
        </div>
        <button type="button" class="btn" data-action="rules">규칙</button>
      </header>
      <section class="sheet">
        <p class="blurb">${level.blurb}</p>
        <div class="status-row">
          <ul class="chips" id="chips"></ul>
          <p class="moves" id="moves"></p>
        </div>
        <div class="board" style="--cols:${state.manager.cols}">${cells}</div>
        ${key.length?`<ul class="key">${key.join("")}</ul>`:""}
        ${formula}
        <div class="palette" role="listbox" aria-label="안료">${swatches}</div>
        <div class="toolbar">
          <button type="button" class="btn" data-action="undo">되돌리기</button>
          <button type="button" class="btn" data-action="reset">처음 상태</button>
        </div>
      </section>
    `;updateBoard()}function chip(name,label){if(!name||name==="off")return"";return`<li class="chip ${name}">${label}</li>`}function updateBoard(){const manager=state.manager;const status=manager.evaluate();document.querySelectorAll(".cell").forEach(btn=>{const node=manager.cellAt(Number(btn.dataset.x),Number(btn.dataset.y));const pigment=node.currentColor?Dachehwa.PIGMENTS[node.currentColor]:null;btn.style.backgroundColor=pigment?pigment.hex:"";btn.style.backgroundImage=pigment?"linear-gradient(180deg, rgba(255,255,255,.32), transparent 48%)":"";btn.style.color=pigment?pigment.ink:"";const classes=["cell",`kind-${node.kind}`];classes.push(node.currentColor?"is-filled":"is-empty");if(node.targetColor){classes.push(node.currentColor===node.targetColor?"target-met":"target-open")}if(state.cursor.x===node.x&&state.cursor.y===node.y)classes.push("is-cursor");btn.className=classes.join(" ");const slot=btn.querySelector(".glyph-slot");if(node.currentColor)slot.innerHTML=glyph(node.currentColor);else if(node.kind==="mix")slot.innerHTML='<span class="watermark">혼</span>';else if(node.kind==="flow")slot.innerHTML='<span class="watermark">흐</span>';else slot.innerHTML="";const pip=btn.querySelector(".pip");if(pip)pip.classList.toggle("is-met",node.currentColor===node.targetColor);const bits=[`${node.y+1}행 ${node.x+1}열`];if(node.kind==="source")bits.push(`고정 ${Dachehwa.PIGMENTS[node.baseColor].name}`);else if(pigment)bits.push(pigment.name);else bits.push("비어 있음");if(node.targetColor)bits.push(`목표 ${Dachehwa.PIGMENTS[node.targetColor].name}`);if(node.from.length){bits.push(`${node.from.map(dir=>Dachehwa.DIR_NAME[dir]).join("·")}에서 들어옴`)}btn.setAttribute("aria-label",bits.join(", "))});const moves=document.getElementById("moves");moves.textContent=status.maxMoves==null?`붓질 ${status.moveCount}`:`붓질 ${status.moveCount} / ${status.maxMoves}`;moves.classList.toggle("is-bad",status.moves==="bad");document.querySelector("[data-action='undo']").disabled=manager.history.length===0;const adjLabel=manager.level.adjacent===8?"대각 포함":"이웃 색";document.getElementById("chips").innerHTML=[chip(status.chips.fill,"채움"),chip(status.adjacent,adjLabel),chip(status.lines,"줄 규칙"),chip(status.targets,"목표"),chip(status.quota,"색 개수"),chip(status.moves,"붓질")].join("");document.querySelectorAll(".swatch").forEach(btn=>{const color=btn.dataset.color;const on=color===state.selected;btn.classList.toggle("is-selected",on);btn.setAttribute("aria-selected",on?"true":"false");const em=btn.querySelector("em");if(em&&manager.level.quota){const used=status.counts[color]||0;em.textContent=`${used}/${manager.level.quota[color]}`;em.classList.toggle("is-bad",used>manager.level.quota[color])}})}function showRules(){openModal(`
      <div class="modal-card" role="dialog" aria-labelledby="rules-title">
        <p class="eyebrow">놀이 방법</p>
        <h2 id="rules-title">다채화</h2>
        <div class="rules-body">
          <ul>
            <li>아래 안료를 고른 다음 칸을 누릅니다. 같은 안료를 다시 누르면 지워집니다.</li>
            <li>두꺼운 테두리는 고정된 색입니다. 바꿀 수 없습니다.</li>
            <li>마름모 표식이 있는 칸은 그 색으로 칠해야 합니다.</li>
            <li>이웃 색: 맞닿은 칸은 서로 달라야 합니다. 대각 포함 스테이지는 모서리로 닿아도 같습니다. 화살표로 이어진 칸만 같은 색이 허용됩니다.</li>
            <li>줄 규칙: 같은 가로줄과 세로줄에는 같은 색을 한 번만 씁니다.</li>
            <li>전파: 화살표 칸은 그 방향의 색이 그대로 흘러옵니다.</li>
            <li>혼색: 들어온 두 기본색이 섞입니다. 홍+황=주, 황+청=녹, 청+홍=자.</li>
            <li>붓질 제한이 있으면 그 횟수 안에 완성합니다. 되돌리기는 횟수도 되돌립니다.</li>
            <li>이전 스테이지를 클리어하면 다음이 열리고, 클리어한 스테이지 오른쪽 아래에 연두색 체크가 남습니다.</li>
          </ul>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn primary" data-action="close-modal" data-autofocus>알겠습니다</button>
        </div>
      </div>
    `)}function objectParticle(name){const code=name.charCodeAt(name.length-1);if(code<44032||code>55203)return"을";return(code-44032)%28===0?"를":"을"}function showClear(){const level=state.manager.level;const hasNext=level.id<LEVELS.length;const lead=hasNext?`${level.name}${objectParticle(level.name)} 완성했습니다.`:"열여덟 스테이지를 모두 마쳤습니다.";const bursts=["#e23b2f","#f2c14d","#2f6fe0","#ef7a1a","#2f9d55","#8d4ad4","#c6ef6a","#e23b2f","#f2c14d","#2f6fe0"];const bits=bursts.map((color,index)=>{const rise=-30-index%5*16;return`<i style="--c:${color};--i:${index};--rise:${rise}"></i>`}).join("");openModal(`
      <div class="modal-card" role="dialog" aria-labelledby="clear-title">
        <div class="burst" aria-hidden="true">${bits}</div>
        <p class="eyebrow">스테이지 ${level.id}</p>
        <h2 id="clear-title">클리어</h2>
        <p>${lead}</p>
        <div class="modal-actions">
          ${hasNext?'<button type="button" class="btn primary" data-action="next" data-autofocus>다음 스테이지</button>':""}
          <button type="button" class="btn" data-action="replay">다시 풀기</button>
          <button type="button" class="btn" data-action="to-select" ${hasNext?"":"data-autofocus"}>스테이지 선택</button>
        </div>
      </div>
    `)}function markCleared(id){const firstTime=!state.cleared.has(id);state.cleared.add(id);saveProgress();if(firstTime&&id<LEVELS.length)state.freshId=id+1}function startLevel(id){const level=LEVELS.find(item=>item.id===id);clearTimeout(state.winTimer);closeModal();state.screen="play";state.levelId=id;state.manager=new Dachehwa.PuzzleManager(level);state.selected=level.palette[0];const first=state.manager.nodes.find(node=>node.kind==="paint");state.cursor=first?{x:first.x,y:first.y}:{x:0,y:0};renderPlay()}function showSelect(){clearTimeout(state.winTimer);closeModal();state.screen="select";state.manager=null;renderSelect()}function selectStage(id){if(!isUnlocked(id)){toast("이전 스테이지를 클리어하면 열립니다.");const card=document.querySelector(`.stage-card[data-id="${id}"]`);if(card){card.classList.add("is-shaking");setTimeout(()=>card.classList.remove("is-shaking"),280)}return}startLevel(id)}function paintAt(x,y){if(!state.manager||state.modal||state.manager.celebrated)return;state.cursor={x,y};const result=state.manager.paint(x,y,state.selected);updateBoard();if(!result.ok){toast(result.message);const btn=document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);if(btn){btn.classList.add("is-shaking");setTimeout(()=>btn.classList.remove("is-shaking"),280)}return}if(result.justWon){markCleared(state.levelId);clearTimeout(state.winTimer);state.winTimer=setTimeout(showClear,280)}}function doUndo(){if(!state.manager||state.modal)return;const result=state.manager.undo();if(!result.ok){toast(result.message);return}clearTimeout(state.winTimer);updateBoard()}function doReset(){if(!state.manager||state.modal)return;clearTimeout(state.winTimer);state.manager.reset();updateBoard()}function wipe(){if(!state.wipeArmed){state.wipeArmed=true;toast("한 번 더 누르면 클리어 기록이 지워집니다.");clearTimeout(state.wipeTimer);state.wipeTimer=setTimeout(()=>{state.wipeArmed=false},2500);return}state.wipeArmed=false;state.cleared=new Set;state.freshId=null;saveProgress();toast("기록을 지웠습니다.");renderSelect()}function onClick(event){const el=event.target.closest("[data-action]");if(!el||!document.getElementById("app").contains(el))return;const action=el.dataset.action;if(action==="select-stage")selectStage(Number(el.dataset.id));else if(action==="pick"){state.selected=el.dataset.color;updateBoard()}else if(action==="paint")paintAt(Number(el.dataset.x),Number(el.dataset.y));else if(action==="undo")doUndo();else if(action==="reset")doReset();else if(action==="back"||action==="to-select")showSelect();else if(action==="next")startLevel(state.levelId+1);else if(action==="replay"){closeModal();clearTimeout(state.winTimer);state.manager.reset();updateBoard()}else if(action==="rules")showRules();else if(action==="close-modal")closeModal();else if(action==="wipe")wipe()}function onKey(event){if(event.key==="Escape"){if(state.modal&&!(state.screen==="play"&&state.manager&&state.manager.celebrated))closeModal();else if(state.screen==="play")showSelect();return}if(state.modal||state.screen!=="play"||!state.manager)return;if(event.key==="z"||event.key==="Z"){event.preventDefault();doUndo();return}const index="1234567".indexOf(event.key);if(index>=0&&state.manager.level.palette[index]){state.selected=state.manager.level.palette[index];updateBoard();return}const step={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];if(step){event.preventDefault();state.cursor={x:Math.max(0,Math.min(state.manager.cols-1,state.cursor.x+step[0])),y:Math.max(0,Math.min(state.manager.rows-1,state.cursor.y+step[1]))};updateBoard();return}if(event.key==="Enter"||event.key===" "){event.preventDefault();paintAt(state.cursor.x,state.cursor.y)}}function mount(){const app=document.getElementById("app");app.innerHTML='<div id="toast" role="status"></div><div id="screen"></div><div id="modal" hidden></div>';app.addEventListener("click",onClick);document.addEventListener("keydown",onKey);showSelect()}mount()})();
