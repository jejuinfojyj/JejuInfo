const GAME_TITLE="브레인롯 대모험";const UI={screen:"lobby",shopTab:"gift",questTab:"daily",heroFilter:"all",battle:null,form:null,grow:{id:null,tab:"lv",qty:1,slot:"weapon"},modalOk:null};const $=sel=>document.querySelector(sel);function toast(msg){const t=$("#toast");const d=document.createElement("div");d.className="toast-item";d.textContent=msg;t.appendChild(d);setTimeout(()=>d.remove(),2200)}function openModal(html,cls=""){const m=$("#modal");m.className=cls;m.innerHTML=`<div class="modal-box">${html}</div>`}function closeModal(){const m=$("#modal");m.className="hidden";m.innerHTML=""}function confirmModal(title,body,onOk,okText="좋아요"){UI.modalOk=onOk;openModal(`<h3>${title}</h3><p>${body}</p>
    <div class="row gap end"><button class="btn ghost" data-act="closeModal">아니요</button>
    <button class="btn" data-act="modalOk">${okText}</button></div>`)}function stars(n){return'<span class="stars">'+"★".repeat(n)+"</span>"}function elemTag(el){return`<span class="etag" style="--ec:${ELEMENTS[el].color}">${ELEMENTS[el].icon}${ELEMENTS[el].name}</span>`}function gradeTag(g){return`<span class="gtag" style="--gc:${GRADES[g].color}">${GRADES[g].name}</span>`}function heroCard(id,{sync,extra="",act="heroDetail",small=false}={}){const tpl=HERO_MAP[id];const h=S.heroes[id];if(!h){return`<div class="hcard locked ${small?"small":""}" style="--gc:${GRADES[tpl.grade].color}">
      <div class="hemoji">❔</div><div class="hname">???</div></div>`}sync=sync||getSync();const lv=effLevel(id,sync);const synced=isSynced(id,sync);const core=sync.core.includes(id);return`<div class="hcard ${small?"small":""} g-${tpl.grade}" style="--gc:${GRADES[tpl.grade].color};--ec:${ELEMENTS[tpl.element].color}" data-act="${act}" data-arg="${id}">
    <div class="hgrade">${GRADES[tpl.grade].name}</div>
    <div class="helem">${ELEMENTS[tpl.element].icon}</div>
    <div class="hemoji">${heroImg(tpl)}</div>
    <div class="hname">${tpl.name}</div>
    <div class="hlv ${synced?"synced":""}">${synced?"🔗":""}Lv.${lv}${core?" 👑":""}</div>
    ${stars(h.star)}
    ${extra}
  </div>`}function resBar(){regen();const r=S.res;const item=(k,v)=>`<div class="res"><span>${RES_INFO[k].icon}</span>${v}</div>`;return item("gold",fmt(r.gold))+item("diamond",fmt(r.diamond))+(UI.screen==="dungeon"?item("torch",`${r.torch}/${TORCH_MAX}`):item("candy",fmt(r.candy||0)))+item("stamina",`${r.stamina}/${STAMINA_MAX}`)}function updateTopbar(){$("#topbar").innerHTML=resBar()+`<button class="res sound-btn" data-act="toggleSound">${Sound.on?"🔊":"🔇"}</button>`}function render(){updateTopbar();const screens={lobby:renderLobby,heroes:renderHeroes,adventure:renderAdventure,summon:renderSummon,shop:renderShop,quests:renderQuests,pass:renderPass,dungeon:renderDungeon,grow:renderGrow};$("#screen").innerHTML=`<div class="screen-inner">${screens[UI.screen]()}</div>`;const stage3d=$("#lobby3d.is3d");if(stage3d){try{Showcase3D.mount(stage3d,S.formation.filter(Boolean))}catch(e){console.warn(e)}}document.querySelectorAll("#bottomnav button").forEach(b=>{b.classList.toggle("active",b.dataset.arg===UI.screen);b.classList.toggle("dot",b.dataset.arg==="lobby"&&questClaimable()+passClaimable()>0)})}function showHelp(){S.seenHelp=true;save();openModal(`<h3 class="center">🎮 하는 법</h3>
    <div class="help">
      <div><b>1. 친구 뽑기 🔮</b><br>보석으로 브레인롯 친구들을 뽑아요!</div>
      <div><b>2. 줄 세우기 🧩</b><br>🛡️방패·⚔️돌격 친구는 <b>앞줄</b>, 🎯슈터·💚힐러 친구는 <b>뒷줄</b>!<br>헷갈리면 <b>[자동 배치]</b> 버튼을 눌러요.</div>
      <div><b>3. 가위바위보 속성 ✊✌️🖐️</b><br>💧물 → 🔥불 → 🌿풀 → 💧물<br>이기는 속성이면 더 세게 때려요!</div>
      <div><b>4. 싸움은 자동 ⚔️</b><br>친구들이 알아서 싸우고, 파란 게이지가 차면 필살기를 써요.</div>
      <div><b>5. 레벨업 ⬆️</b><br>코인으로 레벨업! 같은 친구를 또 뽑으면 별이 올라가요 ⭐</div>
    </div>
    <button class="btn big" data-act="closeModal">시작하기!</button>`)}function currentStageLabel(){const next=S.maxCleared+1;return`${Math.floor(next/STAGES_PER_CHAPTER)+1}-${next%STAGES_PER_CHAPTER+1}`}function idleBoxHtml(){const p=idlePending();const h=Math.floor(p.minutes/60),m=Math.floor(p.minutes%60);return`<div class="idle-l"><b>💤 쉬는 동안 보상</b> <span class="small muted">${h}시간 ${m}분</span>
    <div class="idle-reward small">${rewardText(p.reward)||"모으는 중..."}</div></div>
    <button class="btn small" data-act="claimIdle" ${p.minutes<1?"disabled":""}>받기</button>`}function homeTile(act,arg,icon,name,dot){return`<button class="home-tile ${dot?"dot":""}" data-act="${act}" ${arg?`data-arg="${arg}"`:""}><span>${icon}</span>${name}</button>`}function renderLobby(){const leaderIds=S.formation.filter(Boolean);const today=dayKey();const qDot=questClaimable(),pDot=passClaimable();const monthly=S.monthly.daysLeft>0&&S.monthly.lastDay!==today?`<div class="idle-row"><div class="idle-l"><b>📅 출석 카드</b> <span class="small muted">${S.monthly.daysLeft}일 남음</span></div>
       <button class="btn small" data-act="claimMonthly">💎${MONTHLY.daily}</button></div>`:"";return`
    <div class="lobby-hero">
      <button class="gear-btn" data-act="settings" aria-label="설정">⚙️</button>
      <div class="lobby-title">${GAME_TITLE}</div>
      <div class="lobby-team ${typeof THREE!=="undefined"?"is3d":""}" id="lobby3d">${typeof THREE!=="undefined"?"":leaderIds.map((id,i)=>`<span style="animation-delay:${i*.2}s">${heroImg(HERO_MAP[id])}</span>`).join("")}</div>
      <div class="lobby-info">
        <span>💪 <b>${fmt(teamPower(S.formation))}</b></span>
        <span>🗺️ <b>${currentStageLabel()}</b></span>
        <span>🧸 <b>${Object.keys(S.heroes).length}/${HEROES.length}</b></span>
      </div>
    </div>
    <button class="btn big play" data-act="quickStage">▶ 모험 출발! (${currentStageLabel()})</button>
    <div class="home-group">
      <div class="hg-title">🗺️ 모험하기</div>
      <div class="hg-row">${homeTile("nav","adventure","🗺️","스테이지")}${homeTile("nav","dungeon","🔦","깜깜 동굴")}</div>
    </div>
    <div class="home-group">
      <div class="hg-title">🧸 친구 키우기</div>
      <div class="hg-row">${homeTile("nav","heroes","🧸","친구들")}${homeTile("nav","grow","💪","레벨업·장비")}${homeTile("nav","summon","🔮","뽑기")}</div>
    </div>
    <div class="home-group">
      <div class="hg-title">🎁 보상 받기</div>
      <div class="idle-row" id="idleBox">${idleBoxHtml()}</div>
      ${monthly}
      <div class="hg-row">${homeTile("nav","quests","📜","미션",qDot)}${homeTile("nav","pass","⭐","스티커",pDot)}${homeTile("nav","shop","🛍️","상점")}</div>
    </div>`}function openSettings(){openModal(`<button class="xbtn" data-act="closeModal">✕</button>
    <h3 class="center">⚙️ 설정</h3>
    <div class="set-row"><b>🔊 소리</b><button class="btn small ${Sound.on?"":"ghost"}" data-act="setSound">${Sound.on?"켜짐":"꺼짐"}</button></div>
    <div class="set-block">
      <b>🎟️ 쿠폰 코드</b>
      <div class="code-row"><input id="codeInput" type="text" maxlength="20" placeholder="코드를 입력하세요" autocomplete="off" autocapitalize="characters">
      <button class="btn small" data-act="redeemCode">입력</button></div>
    </div>
    <div class="set-row"><b>❓ 하는 법</b><button class="btn small ghost" data-act="help">보기</button></div>
    <div class="set-row"><b>🔄 처음부터 다시하기</b><button class="btn small danger" data-act="resetGame">다시하기</button></div>`)}function redeemCode(){const input=$("#codeInput");if(!input)return;const code=input.value.trim().toUpperCase();if(!code){toast("코드를 입력해 주세요");return}const reward=COUPONS[code];if(!reward){toast("❌ 없는 코드예요");input.select();return}if(S.codes[code]){toast("이미 사용한 코드예요");return}S.codes[code]=Date.now();grant(reward);save();updateTopbar();render();Sound.play("coin");openModal(`<div class="result win"><div class="rbig">🎟️</div><h2>쿠폰 성공!</h2>
    <div class="reward-box">${rewardText(reward)}</div>
    <button class="btn" data-act="closeModal">좋아!</button></div>`)}function renderHeroes(){const sync=getSync();const owned=Object.keys(S.heroes);let list=HEROES.map(h=>h.id);if(UI.heroFilter!=="all")list=list.filter(id=>HERO_MAP[id].element===UI.heroFilter);list.sort((a,b)=>!!S.heroes[b]-!!S.heroes[a]||(S.heroes[a]&&S.heroes[b]?heroPower(b,sync)-heroPower(a,sync):0));const syncPanel=sync.active?`<div class="panel sync">
        <div class="row between"><b>🔗 레벨 나눠주기 켜짐!</b><span class="chip">Lv.${sync.level}</span></div>
        <p class="small">👑 왕관 친구 5명만 키우면, 다른 친구들도 같은 레벨이 돼요!</p>
      </div>`:`<div class="panel sync"><b>🔒 레벨 나눠주기</b><p class="small">친구가 6명이 되면 켜져요! (지금 ${owned.length}/6)</p></div>`;return`
    <div class="row between"><h2>🧸 친구들 (${owned.length}/${HEROES.length})</h2><button class="btn small" data-act="nav" data-arg="grow">💪 레벨업·장비</button></div>
    ${syncPanel}
    <div class="row gap wrap filters">
      <button class="chip ${UI.heroFilter==="all"?"on":""}" data-act="heroFilter" data-arg="all">전체</button>
      ${ELEMENT_KEYS.map(k=>`<button class="chip ${UI.heroFilter===k?"on":""}" data-act="heroFilter" data-arg="${k}">${ELEMENTS[k].icon}${ELEMENTS[k].name}</button>`).join("")}
    </div>
    <div class="hero-grid">${list.map(id=>heroCard(id,{sync})).join("")}</div>
    <div class="panel small center">✊✌️🖐️ 💧물 → 🔥불 → 🌿풀 → 💧물</div>`}function heroDetailHtml(id){const tpl=HERO_MAP[id],h=S.heroes[id],sync=getSync();const role=ROLES[tpl.role];const lv=effLevel(id,sync);const st=heroStats(id,sync);const cap=levelCap(h.star);const eq=h.eq||{};return`
    <div class="detail" style="--gc:${GRADES[tpl.grade].color}">
      <button class="xbtn" data-act="closeModal">✕</button>
      <div class="demoji">${heroImg(tpl)}</div>
      <h3>${tpl.name}</h3>
      <div class="row gap center">${gradeTag(tpl.grade)}${elemTag(tpl.element)}<span class="etag">${role.icon}${role.name}</span></div>
      <div class="center">${stars(h.star)} <b>Lv.${lv}</b> <span class="muted">/ ${cap}</span></div>
      <div class="stat-grid">
        <div>❤️ 체력<b>${fmt(st.hp)}</b></div><div>⚔️ 공격<b>${fmt(st.atk)}</b></div>
        <div>💪 파워<b>${fmt(powerOf(st))}</b></div><div>📍 자리<b>${role.melee?"앞줄":"뒷줄"}</b></div>
      </div>
      <div class="skillbox"><b>✨ ${tpl.skill.name}</b><p>${SKILLS[tpl.skill.type](tpl.skill)}</p></div>
      <div class="eq-mini">${GEAR_SLOT_KEYS.map(s=>{const g=eq[s]&&gearById(eq[s]);return g?gearChip(g):`<span class="gchip empty">${GEAR_SLOTS[s].icon} 비어있음</span>`}).join("")}</div>
      <button class="btn big" data-act="goGrow" data-arg="${id}">💪 레벨업 · 장비 창 열기</button>
    </div>`}function openHeroDetail(id){openModal(heroDetailHtml(id))}function heroLevelUp(id,qty){const plan=levelPlan(id,qty);if(plan.to<=plan.from){toast("🍬 사탕이나 🪙 코인이 부족해요");return}if(!spend(plan.cost)){toast("🍬 사탕이나 🪙 코인이 부족해요");return}S.heroes[id].lv=plan.to;track("levelup",plan.to-plan.from);Sound.play("heal");toast(`🎉 ${HERO_MAP[id].name} Lv.${plan.to}!`);save();render()}function heroPromote(id){const h=S.heroes[id];const pc=promoteCost(h.star);if(h.star>=MAX_STAR||h.shards<pc.shards||!spend({gold:pc.gold})){toast("재료가 부족해요");return}h.shards-=pc.shards;h.star++;track("promote");Sound.play("summonSSR");toast(`⭐ ${HERO_MAP[id].name} 별 ${h.star}개!`);save();render()}function gearStatText(g){const s=gearStat(g);const parts=[];if(s.atk)parts.push(`⚔️+${Math.round(s.atk*100)}%`);if(s.hp)parts.push(`❤️+${Math.round(s.hp*100)}%`);if(s.def)parts.push(`🛡️+${Math.round(s.def*100)}%`);return parts.join(" ")}function gearTag(tier){return`<span class="gtag gt-${tier}" style="--gc:${GEAR_TIERS[tier].color}">${GEAR_TIERS[tier].name}</span>`}function gearChip(g){return`<span class="gchip gt-${g.tier}" style="--gc:${GEAR_TIERS[g.tier].color}">${GEAR_SLOTS[g.slot].icon} ${gearName(g)}</span>`}function gearCard(g,extra=""){return`<div class="gcard gt-${g.tier}" style="--gc:${GEAR_TIERS[g.tier].color}">
    <div class="gicon">${GEAR_SLOTS[g.slot].icon}</div>
    <div class="ginfo"><div>${gearTag(g.tier)} <b>${gearName(g)}</b></div><div class="small">${gearStatText(g)}</div></div>
    ${extra}</div>`}function goGrow(id){closeModal();UI.grow.id=id;UI.screen="grow";render();$("#screen").scrollTop=0}function renderGrow(){const sync=getSync();const owned=Object.keys(S.heroes).sort((a,b)=>heroPower(b,sync)-heroPower(a,sync));const g=UI.grow;if(!g.id||!S.heroes[g.id])g.id=owned[0];const id=g.id,tpl=HERO_MAP[id],h=S.heroes[id];const st=heroStats(id,sync);const cap=levelCap(h.star);const strip=owned.map(hid=>`<button class="gs-item ${hid===id?"on":""}" style="--gc:${GRADES[HERO_MAP[hid].grade].color}" data-act="growPick" data-arg="${hid}">
      ${heroImg(HERO_MAP[hid])}<span>Lv.${effLevel(hid,sync)}</span></button>`).join("");const head=`<div class="grow-head" style="--gc:${GRADES[tpl.grade].color}">
      <div class="gh-img">${heroImg(tpl)}</div>
      <div class="gh-info"><b>${tpl.name}</b>
        <div class="row gap wrap">${gradeTag(tpl.grade)}${elemTag(tpl.element)}</div>
        <div>${stars(h.star)} <b>Lv.${effLevel(id,sync)}</b> <span class="muted">/ ${cap}</span></div>
        <div class="small">💪 파워 <b>${fmt(powerOf(st))}</b></div></div>
    </div>`;const tabs=[["lv","⬆️ 레벨업"],["eq","🎒 장비"]];return`<div class="row between"><h2>💪 성장</h2><button class="chip" data-act="nav" data-arg="heroes">← 친구들</button></div>
    <div class="grow-strip">${strip}</div>
    ${head}
    <div class="tabs">${tabs.map(([k,n])=>`<button class="tab ${g.tab===k?"on":""}" data-act="growTab" data-arg="${k}">${n}</button>`).join("")}</div>
    ${g.tab==="lv"?growLevelHtml(id,sync):growGearHtml(id)}`}function growLevelHtml(id,sync){const h=S.heroes[id],tpl=HERO_MAP[id];const cap=levelCap(h.star);const qty=UI.grow.qty;const plan=levelPlan(id,qty);const bonus=gearBonus(id);const now=calcStats(tpl,h.lv,h.star,bonus);const next=calcStats(tpl,plan.to,h.star,bonus);const pc=promoteCost(h.star);const maxStar=h.star>=MAX_STAR;const canPromote=!maxStar&&h.shards>=pc.shards&&S.res.gold>=pc.gold;const afford=plan.to>plan.from&&canAfford(plan.cost);let main;if(isSynced(id,sync)){main=`<div class="note">🔗 지금은 레벨 나눠받는 중이에요 (Lv.${effLevel(id,sync)}). 직접 키우면 Lv.${sync.level}보다 높아질 때부터 효과가 있어요.</div>`}else main="";const row=(icon,name,a,b)=>`<div class="cmp-row"><span>${icon} ${name}</span><b>${fmt(a)}</b><span class="arrow">▶</span><b class="${b>a?"up":""}">${fmt(b)}</b></div>`;return`<div class="panel">
      ${main}
      <div class="cmp-head"><span></span><b>Lv.${plan.from}</b><span></span><b class="up">Lv.${plan.to}</b></div>
      ${row("❤️","체력",now.hp,next.hp)}
      ${row("⚔️","공격",now.atk,next.atk)}
      ${row("🛡️","방어",now.def,next.def)}
      ${row("💪","파워",powerOf(now),powerOf(next))}
      ${h.lv>=cap?`<div class="note">⛔ Lv.${cap}이 최고예요! 아래에서 ⭐별을 올리면 더 올라가요.</div>`:`
      <div class="qty-row">${[1,5,10,"max"].map(q=>`<button class="chip ${qty===q?"on":""}" data-act="growQty" data-arg="${q}">${q==="max"?"MAX":"+"+q}</button>`).join("")}</div>
      <div class="cost-row"><span class="${S.res.candy>=plan.cost.candy?"":"bad"}">🍬 ${fmt(plan.cost.candy)}</span>
        <span class="${S.res.gold>=plan.cost.gold?"":"bad"}">🪙 ${fmt(plan.cost.gold)}</span></div>
      <button class="btn big" data-act="growLevel" ${afford?"":"disabled"}>⬆️ 레벨업!</button>
      <p class="small muted center">🍬 레벨업 사탕은 모험, 쉬는 동안 보상, 미션, 상점, 장비 분해로 모아요</p>`}
    </div>
    <div class="promo">
      <div class="row between"><b>⭐ 별 올리기</b><span class="small">조각 ${h.shards}/${maxStar?"-":pc.shards}</span></div>
      ${maxStar?'<div class="note">별이 가득 찼어요!</div>':`
      <button class="btn gold" data-act="heroPromote" data-arg="${id}" ${canPromote?"":"disabled"}>⭐ 별 올리기 · 조각${pc.shards} 🪙${fmt(pc.gold)}</button>
      <p class="small muted">같은 친구를 또 뽑으면 조각 ${SHARDS_PER_DUP}개! 별이 오르면 최고 레벨이 +20 올라가요.</p>`}
    </div>`}function growGearHtml(id){const h=S.heroes[id];const eq=h.eq||{};const sel=UI.grow.slot;const b=gearBonus(id);const slots=GEAR_SLOT_KEYS.map(s=>{const g=eq[s]&&gearById(eq[s]);return`<div class="eq-slot ${s===sel?"on":""} ${g?"gt-"+g.tier:""}" style="--gc:${g?GEAR_TIERS[g.tier].color:"#ddd"}" data-act="growSlot" data-arg="${s}">
      <div class="es-icon">${GEAR_SLOTS[s].icon}</div>
      <div class="es-name">${g?gearName(g):GEAR_SLOTS[s].name}</div>
      <div class="small">${g?GEAR_TIERS[g.tier].name:"비어있음"}</div></div>`}).join("");const list=S.gear.filter(g=>g.slot===sel).sort((a,c)=>GEAR_TIER_KEYS.indexOf(c.tier)-GEAR_TIER_KEYS.indexOf(a.tier)||a.id-c.id);const items=list.map(g=>{const owner=gearOwner(g.id);const mine=owner===id;const btns=mine?`<button class="btn small ghost" data-act="gearOff" data-arg="${g.slot}">빼기</button>`:`<button class="btn small" data-act="gearOn" data-arg="${g.id}">장착</button>
         ${owner?`<span class="owner">${heroImg(HERO_MAP[owner])}</span>`:`<button class="btn small ghost" data-act="gearSalvage" data-arg="${g.id}">분해</button>`}`;return gearCard(g,`<div class="gbtns">${btns}</div>`)}).join("");return`<div class="eq-slots">${slots}</div>
    <div class="panel small center">장비 보너스: ⚔️+${Math.round(b.atk*100)}% · ❤️+${Math.round(b.hp*100)}% · 🛡️+${Math.round(b.def*100)}%</div>
    <div class="row between"><b>${GEAR_SLOTS[sel].icon} ${GEAR_SLOTS[sel].name} 가방 (${list.length})</b>
      <button class="chip" data-act="gearSalvageLow">일반·희귀 모두 분해</button></div>
    ${items||`<div class="panel center muted">${GEAR_SLOTS[sel].name}이(가) 없어요. 🔮 뽑기에서 장비 상자를 열거나 모험에서 얻어요!</div>`}`}function renderAdventure(){const maxCh=Math.floor((S.maxCleared+1)/STAGES_PER_CHAPTER)+1;const ch=Math.max(1,Math.min(S.viewChapter,maxCh));S.viewChapter=ch;const info=chapterInfo(ch);const counter=counterOf(info.element);const nodes=[];for(let st=1;st<=STAGES_PER_CHAPTER;st++){const idx=stageIdx(ch,st);const cleared=idx<=S.maxCleared;const current=idx===S.maxCleared+1;const boss=st===STAGES_PER_CHAPTER;const cls=cleared?"cleared":current?"current":"locked";nodes.push(`<div class="snode ${cls} ${boss?"boss":""}" ${cleared||current?`data-act="stage" data-arg="${ch}:${st}"`:""}>
      <div class="sicon">${boss?"👹":cleared?"⭐":current?"▶":"🔒"}</div>
      <div class="slabel">${ch}-${st}</div></div>`)}return`
    <div class="chapter-head" style="--ec:${ELEMENTS[info.element].color}">
      <button class="chip" data-act="chapter" data-arg="-1" ${ch<=1?"disabled":""}>◀</button>
      <div>
        <div class="chname">${ch}장 ${info.name}</div>
        <div class="small">${elemTag(info.element)} 적이 많아요 → ${elemTag(counter)} 친구 추천!</div>
      </div>
      <button class="chip" data-act="chapter" data-arg="1" ${ch>=maxCh?"disabled":""}>▶</button>
    </div>
    <div class="stage-path">${nodes.join("")}</div>
    <div class="panel small center">⚡ 이기면 에너지 ${STAGE_STAMINA} 사용 · 10번째는 👹 대장전!</div>
    <div class="panel dungeon-entry row between">
      <div><b>🔦 깜깜 동굴</b><div class="small">손전등으로 보물을 찾아요! (${S.dungeon?S.dungeon.floor:1}층)</div></div>
      <button class="btn" data-act="nav" data-arg="dungeon">들어가기</button>
    </div>`}function startStage(ch,st){const idx=stageIdx(ch,st);if(idx>S.maxCleared+1)return;const first=idx===S.maxCleared+1;openFormation({title:`${ch}-${st}${st===STAGES_PER_CHAPTER?" 👹 대장전":""}`,enemies:stageEnemies(ch,st),cost:{stamina:STAGE_STAMINA},onWin:()=>{spend({stamina:STAGE_STAMINA});const r=stageReward(idx,first);grant(r);track("stageClear");if(first)S.maxCleared=idx;const nextSt=st===STAGES_PER_CHAPTER?1:st+1;const nextCh=st===STAGES_PER_CHAPTER?ch+1:ch;if(first&&st===STAGES_PER_CHAPTER)S.viewChapter=nextCh;let drop=null;if(st===STAGES_PER_CHAPTER&&first)drop=makeGear(rollGearTier("R"));else if(Math.random()<.2)drop=makeGear(rollGearTier());const dropMsg=drop?`<div class="drop">🎒 장비 획득! ${gearTag(drop.tier)} ${GEAR_SLOTS[drop.slot].icon} ${gearName(drop)}</div>`:"";return{reward:r,msg:(first?"처음 이겼다! 보너스 보석!":"")+dropMsg,next:{ch:nextCh,st:nextSt}}},back:"adventure"})}function openFormation(opts){UI.form={...opts,sel:S.formation.findIndex(x=>!x)};if(UI.form.sel<0)UI.form.sel=0;$("#overlay").className="";renderFormation()}function closeOverlay(){if(UI.battle){UI.battle.destroy();UI.battle=null}$("#overlay").className="hidden";$("#overlay").innerHTML="";UI.form=null;render()}function enemyPower(specs){return specs.reduce((s,e)=>{const st=calcStats(e.tpl,e.level,e.star);const m=e.mult||1;st.hp*=m*(e.boss?BOSS_HP_MULT:1);st.atk*=m*(e.boss?BOSS_ATK_MULT:1);return s+powerOf(st)},0)}function gridHtml(getCell,enemy){const front=`<div class="frow"><span class="rlabel">앞줄</span>${[0,1].map(getCell).join("")}</div>`;const back=`<div class="frow"><span class="rlabel">뒷줄</span>${[2,3,4].map(getCell).join("")}</div>`;return`<div class="fgrid">${enemy?back+front:front+back}</div>`}function renderFormation(){const f=UI.form;const sync=getSync();const enemyCell=p=>{const e=f.enemies.find(x=>x.pos===p);if(!e)return'<div class="fslot empty"></div>';return`<div class="fslot enemy ${e.boss?"boss":""}" style="--ec:${ELEMENTS[e.tpl.element].color}">
      <span class="fe">${heroImg(e.tpl)}</span><span class="fel">${ELEMENTS[e.tpl.element].icon}</span><span class="flv">Lv.${e.level}</span></div>`};const myCell=p=>{const id=S.formation[p];const sel=f.sel===p?"sel":"";if(!id)return`<div class="fslot empty ${sel}" data-act="fSlot" data-arg="${p}">＋</div>`;const tpl=HERO_MAP[id];const melee=ROLES[tpl.role].melee;const warn=melee&&p>=2||!melee&&p<2?'<span class="fwarn">자리 바꿔!</span>':"";return`<div class="fslot mine ${sel}" style="--ec:${ELEMENTS[tpl.element].color}" data-act="fSlot" data-arg="${p}">
      <span class="fe">${heroImg(tpl)}</span><span class="fel">${ELEMENTS[tpl.element].icon}</span><span class="flv">Lv.${effLevel(id,sync)}</span>${warn}</div>`};const ids=S.formation.filter(Boolean);const syn=synergyOf(ids.map(id=>HERO_MAP[id].element));const myP=teamPower(S.formation),enP=enemyPower(f.enemies);const enemyEls=[...new Set(f.enemies.map(e=>e.tpl.element))];const owned=Object.keys(S.heroes).sort((a,b)=>heroPower(b,sync)-heroPower(a,sync));const verdict=myP>=enP*1.1?'<span class="good">이길 수 있을 것 같아요! 😄</span>':myP>=enP*.9?'<span class="warnc">비슷해요! 속성을 잘 골라봐요 🤔</span>':'<span class="bad">적이 더 세요! 레벨업을 해봐요 😰</span>';$("#overlay").innerHTML=`
    <div class="formation">
      <div class="row between"><h3>${f.title}</h3><button class="xbtn static" data-act="closeOverlay">✕</button></div>
      <div class="panel enemy-panel">
        <div class="row between small"><b>👿 상대 팀</b><span>💪 ${fmt(enP)}</span></div>
        ${gridHtml(enemyCell,true)}
        <div class="small center">상대 속성 ${enemyEls.map(e=>ELEMENTS[e].icon).join(" ")} → 이기는 속성 ${enemyEls.map(e=>ELEMENTS[counterOf(e)].icon).join(" ")}</div>
      </div>
      <div class="panel">
        <div class="row between small"><b>😎 우리 팀 (${ids.length}/5)</b><span>💪 ${fmt(myP)}</span></div>
        ${gridHtml(myCell,false)}
        <div class="small center">${verdict}</div>
        ${syn?`<div class="small center">✨ ${ELEMENTS[syn.element].icon} 같은 속성 ${syn.count}명! 파워 +${Math.round(syn.bonus*100)}%</div>`:""}
      </div>
      <div class="small center muted">친구를 눌러서 넣거나 빼요 · 🛡️⚔️ 앞줄 / 🎯💚 뒷줄</div>
      <div class="fhero-list">${owned.map(id=>{const inForm=S.formation.includes(id);return heroCard(id,{sync,act:"fHero",small:true,extra:inForm?'<div class="inform">✔</div>':""})}).join("")}</div>
      <div class="row gap fbtns">
        <button class="btn ghost" data-act="fAuto">🪄 자동 배치</button>
        <button class="btn big" data-act="fStart">⚔️ 싸우기!${f.cost?` ⚡${f.cost.stamina}`:""}</button>
      </div>
    </div>`}function autoFormation(){const sync=getSync();const owned=Object.keys(S.heroes).sort((a,b)=>heroPower(b,sync)-heroPower(a,sync));const melee=owned.filter(id=>ROLES[HERO_MAP[id].role].melee);const ranged=owned.filter(id=>!ROLES[HERO_MAP[id].role].melee);const front=melee.slice(0,2),back=ranged.slice(0,3);const rest=owned.filter(id=>!front.includes(id)&&!back.includes(id));while(front.length<2&&rest.length)front.push(rest.shift());while(back.length<3&&rest.length)back.push(rest.shift());S.formation=[front[0]||null,front[1]||null,back[0]||null,back[1]||null,back[2]||null]}function startBattleFromForm(){const f=UI.form;if(!S.formation.some(Boolean)){toast("친구를 1명 이상 넣어요!");return}if(f.cost&&!canAfford(f.cost)){toast("⚡ 에너지가 부족해요 (조금 기다리면 차요)");return}save();const battle=new Battle(f.enemies,{title:f.title,onEnd:(win,reason)=>showResult(win,reason)});UI.battle=battle;battle.start($("#overlay"))}function showResult(win){const f=UI.form;if(win){const res=f.onWin()||{};save();const nextBtn=res.next&&stageIdx(res.next.ch,res.next.st)<=S.maxCleared+1?`<button class="btn" data-act="nextStage" data-arg="${res.next.ch}:${res.next.st}">다음 ▶</button>`:"";openModal(`<div class="result win"><div class="rbig">🏆</div><h2>이겼다!</h2>
      ${res.msg?`<p>${res.msg}</p>`:""}
      <div class="reward-box">${res.reward?rewardText(res.reward):""}</div>
      <div class="row gap center"><button class="btn ghost" data-act="resultClose">확인</button>${nextBtn}</div></div>`)}else{openModal(`<div class="result lose"><div class="rbig">😵</div><h2>아쉬워요!</h2>
      <p>이렇게 해봐요:</p>
      <div class="tips">⬆️ 친구 레벨업 하기<br>✊✌️🖐️ 이기는 속성 친구 넣기<br>🪄 자동 배치 눌러보기</div>
      <div class="row gap center"><button class="btn ghost" data-act="resultClose">확인</button>
      <button class="btn" data-act="resultRetry">다시 줄 세우기</button></div></div>`)}}function renderSummon(){const freeAvail=S.freeSummonDay!==dayKey();return`
    <div class="summon-banner">
      <div class="sb-title">🔮 친구 뽑기</div>
      <div class="sb-emojis">${GACHA_HEROES.filter(h=>h.grade==="SSR").map(h=>heroImg(h)).join("")}</div>
      <div class="sb-rare">
        <div class="sb-rare-row myth"><b>${GRADES.MYTH.name} ${rateText(GRADES.MYTH.rate)}</b>${GACHA_HEROES.filter(h=>h.grade==="MYTH").map(h=>heroImg(h)).join("")}</div>
        <div class="sb-rare-row secret"><b>${GRADES.SECRET.name} ${rateText(GRADES.SECRET.rate)}</b>${HEROES.filter(h=>h.grade==="SECRET").map(h=>S.heroes[h.id]?heroImg(h):'<span class="secret-q">？</span>').join("")}</div>
      </div>
      <div class="small">전설 친구 ${PITY_SSR}번 안에 꼭 나와요!</div>
    </div>
    <div class="panel">
      <div class="row between"><span>⭐ 전설 친구까지</span><b>${PITY_SSR-S.pity}번</b></div>
      <div class="bar pity"><i style="width:${S.pity/PITY_SSR*100}%"></i></div>
    </div>
    <div class="summon-btns">
      <button class="btn free" data-act="summon" data-arg="free" ${freeAvail?"":"disabled"}>🎁 공짜!<br><small>${freeAvail?"하루 1번":"내일 또!"}</small></button>
      <button class="btn" data-act="summon" data-arg="1">1번<br><small>💎${SUMMON_COST_1}</small></button>
      <button class="btn gold" data-act="summon" data-arg="10">10번<br><small>💎${SUMMON_COST_10}</small></button>
    </div>
    <div class="panel small">
      <div class="rates">${Object.entries(GRADES).map(([g,v])=>`<span>${gradeTag(g)} ${rateText(v.rate)}</span>`).join("")}</div>
      <p class="muted">이미 있는 친구가 나오면 ⭐별 올리기 조각 ${SHARDS_PER_DUP}개를 받아요.</p>
    </div>
    <div class="summon-banner gear-banner">
      <div class="sb-title">🎒 장비 상자</div>
      <div class="small">무기 🏏 · 갑옷 🛡️ · 운동화 👟 를 뽑아서 친구에게 입혀요!</div>
    </div>
    <div class="summon-btns two">
      <button class="btn" data-act="gearSummon" data-arg="1">1번<br><small>💎${GEAR_BOX_COST_1}</small></button>
      <button class="btn gold" data-act="gearSummon" data-arg="10">10번<br><small>💎${GEAR_BOX_COST_10}</small></button>
    </div>
    <div class="panel small"><div class="rates">${GEAR_TIER_KEYS.map(k=>`<span>${gearTag(k)} ${rateText(GEAR_TIERS[k].rate)}</span>`).join("")}</div></div>`}function gearResultModal(title,gears){const best=gears.reduce((b,g)=>Math.max(b,GEAR_TIER_KEYS.indexOf(g.tier)),0);Sound.play(best>=6?"summonSECRET":best>=5?"summonMYTH":best>=4?"summonSSR":"summon");openModal(`<h3 class="center">${title}</h3>
    <div class="gear-result">${gears.map((g,i)=>`<div class="gr-card gt-${g.tier}" style="--gc:${GEAR_TIERS[g.tier].color};animation-delay:${i*.08}s">
      <div class="hgrade">${GEAR_TIERS[g.tier].name}</div><div class="gicon">${GEAR_SLOTS[g.slot].icon}</div>
      <div class="hname">${gearName(g)}</div><div class="small">${gearStatText(g)}</div></div>`).join("")}</div>
    <div class="row gap center"><button class="btn ghost" data-act="closeModal">좋아!</button><button class="btn" data-act="goGrowEq">🎒 장착하러 가기</button></div>`,"wide")}function gearSummon(arg){const n=Number(arg);const cost=n===10?GEAR_BOX_COST_10:GEAR_BOX_COST_1;if(!spend({diamond:cost})){toast("💎 보석이 부족해요");return}const gears=[];for(let i=0;i<n;i++)gears.push(makeGear(rollGearTier()));track("gearSummon",n);save();render();gearResultModal("장비 상자 결과!",gears)}function rollGrade(){S.pity++;const r=Math.random();let acc=0;for(const g of GRADE_ORDER){acc+=GRADES[g].rate;if(r<acc){if(GRADE_RANK[g]<GRADE_RANK.SSR&&S.pity>=PITY_SSR)return"SSR";return g}}return S.pity>=PITY_SSR?"SSR":"R"}function rateText(rate){const p=rate*100;return(p>=1?p.toFixed(0):p>=.1?p.toFixed(1):p.toFixed(2))+"%"}function doSummon(arg){let n=1;if(arg==="free"){if(S.freeSummonDay===dayKey())return;S.freeSummonDay=dayKey()}else{n=Number(arg);const cost=n===10?SUMMON_COST_10:SUMMON_COST_1;if(!spend({diamond:cost})){toast("💎 보석이 부족해요");return}}const results=[];for(let i=0;i<n;i++){const g=rollGrade();if(GRADE_RANK[g]>=GRADE_RANK.SSR)S.pity=0;const pool=GACHA_HEROES.filter(h=>h.grade===g);const tpl=pool[Math.floor(Math.random()*pool.length)];const isNew=!S.heroes[tpl.id];if(isNew)S.heroes[tpl.id]={lv:1,star:GRADES[g].star,shards:0};else S.heroes[tpl.id].shards+=SHARDS_PER_DUP;results.push({tpl,isNew})}track("summon",n);save();render();const best=results.reduce((b,r)=>GRADE_RANK[r.tpl.grade]>GRADE_RANK[b]?r.tpl.grade:b,"R");Sound.play(best==="SECRET"?"summonSECRET":best==="MYTH"?"summonMYTH":best==="SSR"?"summonSSR":"summon");if(best==="MYTH"||best==="SECRET"){const fl=document.createElement("div");fl.className="summon-flash "+best;document.body.appendChild(fl);setTimeout(()=>fl.remove(),1300);toast(best==="SECRET"?"🌈 시크릿 친구가 나왔어요!!!":"💖 신화 친구가 나왔어요!")}openModal(`<h3 class="center">뽑기 결과!</h3>
    <div class="summon-result ${n===1?"single":""}">${results.map((r,i)=>`
      <div class="sr-card g-${r.tpl.grade}" style="--gc:${GRADES[r.tpl.grade].color};animation-delay:${i*.12}s">
        <div class="hgrade">${GRADES[r.tpl.grade].name}</div>
        <div class="hemoji">${heroImg(r.tpl)}</div>
        <div class="hname">${r.tpl.name}</div>
        <div class="small">${r.isNew?'<b class="new">NEW!</b>':`조각+${SHARDS_PER_DUP}`}</div>
      </div>`).join("")}</div>
    <div class="row center"><button class="btn big" data-act="closeModal">좋아!</button></div>`,"wide")}function wonText(n){return"₩"+n.toLocaleString()}function cashShopHtml(){const heroes=CASH_SHOP.filter(p=>p.type==="hero").map(p=>{const tpl=HERO_MAP[p.hero];const owned=!!S.heroes[p.hero];return`<div class="cash-hero g-${tpl.grade}" style="--gc:${GRADES[tpl.grade].color}">
      <div class="ch-img">${heroImg(tpl)}<span class="ch-only">상점 전용</span></div>
      <div class="ch-info"><div class="row gap wrap">${gradeTag(tpl.grade)}${elemTag(tpl.element)}<span class="etag">${ROLES[tpl.role].icon}${ROLES[tpl.role].name}</span></div>
        <b>${tpl.name}</b><div class="small">${p.desc}</div><div class="small">✨ ${tpl.skill.name}</div>
        <button class="btn cash" data-act="buyCash" data-arg="${p.id}" ${owned?"disabled":""}>${owned?"가지고 있어요 ✔":wonText(p.price)}</button></div>
    </div>`}).join("");const items=CASH_SHOP.filter(p=>p.type!=="hero").map(p=>{const desc=p.reward?rewardText(p.reward):p.desc;return`<div class="shop-card cash-item">
      <div class="si">${p.icon}</div>
      <div class="sinfo"><b>${p.name}</b><div class="small">${desc}</div></div>
      <button class="btn small cash" data-act="buyCash" data-arg="${p.id}">${wonText(p.price)}</button></div>`}).join("");return`<div class="hg-title">🌟 상점 전용 친구</div>${heroes}
    <div class="hg-title">💳 아이템</div>${items}
    <p class="small muted center">※ 연습용 상점이에요. 진짜 돈은 나가지 않아요!</p>`}function buyCash(id){const p=CASH_SHOP.find(x=>x.id===id);if(!p)return;if(p.type==="hero"&&S.heroes[p.hero])return;confirmModal("💳 결제할까요?",`<b>${p.name}</b><br>${wonText(p.price)}<br><span class="small muted">연습용 상점이라 진짜 돈은 나가지 않아요</span>`,()=>{openModal(`<div class="center"><h3>💳 결제하는 중...</h3><div class="gift-open">💳</div></div>`);setTimeout(()=>{S.cash[id]=(S.cash[id]||0)+1;if(p.type==="hero"){const tpl=HERO_MAP[p.hero];S.heroes[p.hero]={lv:1,star:GRADES[tpl.grade].star,shards:0};save();render();Sound.play("summonMYTH");openModal(`<div class="result win"><div class="rbig">🎉</div><h2>새 친구!</h2>
          <div class="demoji">${heroImg(tpl)}</div><h3>${tpl.name}</h3>
          <button class="btn" data-act="closeModal">좋아!</button></div>`)}else if(p.type==="res"){grant(p.reward);save();render();Sound.play("coin");openModal(`<div class="result win"><div class="rbig">🎉</div><h2>구매 완료!</h2>
          <div class="reward-box">${rewardText(p.reward)}</div><button class="btn" data-act="closeModal">좋아!</button></div>`)}else{const gears=p.type==="gearset"?GEAR_SLOT_KEYS.map(s=>makeGear(p.tier,s)):Array.from({length:p.count},()=>makeGear(rollGearTier(p.minTier)));save();render();gearResultModal("구매 완료!",gears)}},1e3)},"결제하기")}function renderShop(){const tabs=[["gift","🎁 선물"],["dia","💎 보석"],["pack","📦 꾸러미"],["cash","💳 프리미엄"]];let body="";if(UI.shopTab==="cash"){body=cashShopHtml()}else if(UI.shopTab==="gift"){const left=AD_DAILY_LIMIT-S.adsToday;body=`<div class="shop-card big-gift">
      <div class="si">🎁</div>
      <div class="sinfo"><b>오늘의 선물 상자</b><div class="small">${rewardText(AD_REWARD)} · 오늘 ${left}번 남았어요</div></div>
      <button class="btn" data-act="watchAd" ${left>0?"":"disabled"}>열기</button></div>`}else if(UI.shopTab==="dia"){body=DIA_SHOP.map(p=>`<div class="shop-card">
      <div class="si">${p.icon}</div>
      <div class="sinfo"><b>${p.name}</b></div>
      <button class="btn small" data-act="buyDia" data-arg="${p.id}">💎${p.cost}</button></div>`).join("")}else{const today=dayKey();body=`
      <div class="shop-card special">
        <div class="si">📅</div>
        <div class="sinfo"><b>출석 카드</b><div class="small">30일 동안 매일 💎${MONTHLY.daily}!</div>
        ${S.monthly.daysLeft>0?`<div class="small good">사용 중 (${S.monthly.daysLeft}일 남음)${S.monthly.lastDay===today?"":" · 로비에서 받기"}</div>`:""}</div>
        <button class="btn small" data-act="buyPack" data-arg="monthly">💎${MONTHLY.cost}</button>
      </div>
      <div class="shop-card special">
        <div class="si">⭐</div>
        <div class="sinfo"><b>스티커 패스 골드</b><div class="small">스티커 패스 황금 보상 열기</div></div>
        <button class="btn small" data-act="buyPack" data-arg="pass" ${S.pass.premium?"disabled":""}>${S.pass.premium?"가지고 있어요":`💎${PASS_COST}`}</button>
      </div>
      ${PACKAGES.map(p=>{const soldOut=p.limit&&(S.bought[p.id]||0)>=p.limit;return`<div class="shop-card">
          <div class="si">${p.icon}</div>
          <div class="sinfo"><b>${p.name}</b> <span class="tag">${p.tag}</span><div class="small">${rewardText(p.reward)}</div></div>
          <button class="btn small" data-act="buyPack" data-arg="${p.id}" ${soldOut?"disabled":""}>${soldOut?"다 샀어요":p.cost?`💎${p.cost}`:"공짜!"}</button>
        </div>`}).join("")}`}return`<h2>🛍️ 상점</h2>
    <div class="tabs">${tabs.map(([k,n])=>`<button class="tab ${UI.shopTab===k?"on":""}" data-act="shopTab" data-arg="${k}">${n}</button>`).join("")}</div>
    ${body}`}function buyPack(id){let cost,name,fn;if(id==="monthly"){cost=MONTHLY.cost;name="출석 카드";fn=()=>{S.monthly.daysLeft+=MONTHLY.days}}else if(id==="pass"){if(S.pass.premium)return;cost=PASS_COST;name="스티커 패스 골드";fn=()=>{S.pass.premium=true}}else{const p=PACKAGES.find(x=>x.id===id);if(p.limit&&(S.bought[p.id]||0)>=p.limit)return;cost=p.cost;name=p.name;fn=()=>{grant(p.reward);S.bought[p.id]=(S.bought[p.id]||0)+1}}confirmModal("살까요?",`<b>${name}</b>${cost?` (💎${cost})`:" (공짜!)"}`,()=>{if(!spend({diamond:cost})){closeModal();toast("💎 보석이 부족해요");return}fn();save();closeModal();render();toast("🎉 받았어요!")})}function buyDia(id){const p=DIA_SHOP.find(x=>x.id===id);if(!spend({diamond:p.cost})){toast("💎 보석이 부족해요");return}grant(p.reward);save();render();toast(`🎉 ${p.name} 받았어요!`)}function watchAd(){if(S.adsToday>=AD_DAILY_LIMIT)return;openModal(`<div class="center"><h3>🎁 선물 상자를 여는 중...</h3><div class="gift-open">🎁</div></div>`);setTimeout(()=>{S.adsToday++;grant(AD_REWARD);track("ad");save();render();openModal(`<div class="result win"><div class="rbig">🎉</div><h2>선물!</h2>
      <div class="reward-box">${rewardText(AD_REWARD)}</div>
      <button class="btn" data-act="closeModal">좋아!</button></div>`)},1500)}function questState(q,bucket){const prog=Math.min(q.goal,bucket.prog[q.key]||0);return{prog,done:prog>=q.goal,claimed:!!bucket.claimed[q.id]}}function achState(a){const prog=Math.min(a.goal,a.prog(S));return{prog,done:prog>=a.goal,claimed:!!S.quests.ach[a.id]}}function questClaimable(){let n=0;DAILY_QUESTS.forEach(q=>{const s=questState(q,S.quests.daily);if(s.done&&!s.claimed)n++});WEEKLY_QUESTS.forEach(q=>{const s=questState(q,S.quests.weekly);if(s.done&&!s.claimed)n++});ACHIEVEMENTS.forEach(a=>{const s=achState(a);if(s.done&&!s.claimed)n++});return n}function renderQuests(){const tabs=[["daily","오늘"],["weekly","이번 주"],["ach","도전"]];let rows;if(UI.questTab==="ach"){rows=ACHIEVEMENTS.map(a=>questRow(a,achState(a),0))}else{const list=UI.questTab==="daily"?DAILY_QUESTS:WEEKLY_QUESTS;rows=list.map(q=>questRow(q,questState(q,S.quests[UI.questTab]),q.pxp))}return`<div class="row between"><h2>📜 미션</h2><button class="chip" data-act="nav" data-arg="lobby">← 로비</button></div>
    <div class="tabs">${tabs.map(([k,n])=>`<button class="tab ${UI.questTab===k?"on":""}" data-act="questTab" data-arg="${k}">${n}</button>`).join("")}</div>
    ${rows.join("")}`}function questRow(q,s,pxp){const btn=s.claimed?'<button class="btn small" disabled>✔</button>':s.done?`<button class="btn small gold" data-act="claimQuest" data-arg="${UI.questTab}:${q.id}">받기</button>`:'<button class="btn small ghost" disabled>하는 중</button>';return`<div class="quest ${s.claimed?"claimed":""}">
    <div class="qinfo"><b>${q.text}</b>
      <div class="bar q"><i style="width:${s.prog/q.goal*100}%"></i></div>
      <div class="small">${s.prog}/${q.goal} · ${rewardText(q.reward)}${pxp?` · ⭐+${pxp}`:""}</div></div>
    ${btn}</div>`}function claimQuest(arg){const[tab,id]=arg.split(":");if(tab==="ach"){const a=ACHIEVEMENTS.find(x=>x.id===id);const s=achState(a);if(!s.done||s.claimed)return;S.quests.ach[id]=true;grant(a.reward);toast(`🎉 ${rewardText(a.reward)}`)}else{const list=tab==="daily"?DAILY_QUESTS:WEEKLY_QUESTS;const bucket=S.quests[tab];const q=list.find(x=>x.id===id);const s=questState(q,bucket);if(!s.done||s.claimed)return;bucket.claimed[id]=true;grant(q.reward);S.pass.xp+=q.pxp;toast(`🎉 ${rewardText(q.reward)} ⭐+${q.pxp}`)}save();render()}function passLevel(){return Math.min(PASS_LEVELS.length,Math.floor(S.pass.xp/PASS_XP_PER_LEVEL))}function passClaimable(){const lv=passLevel();let n=0;PASS_LEVELS.forEach(p=>{if(p.lv<=lv){if(!S.pass.free[p.lv])n++;if(S.pass.premium&&!S.pass.prem[p.lv])n++}});return n}function renderPass(){const lv=passLevel();const into=S.pass.xp%PASS_XP_PER_LEVEL;return`<div class="row between"><h2>⭐ 스티커 패스</h2><button class="chip" data-act="nav" data-arg="lobby">← 로비</button></div>
    <div class="panel">
      <div class="row between"><b>스티커 ${lv} / ${PASS_LEVELS.length}</b><span class="small">${lv>=PASS_LEVELS.length?"MAX":`${into}/${PASS_XP_PER_LEVEL}`}</span></div>
      <div class="bar pity"><i style="width:${lv>=PASS_LEVELS.length?100:into}%"></i></div>
      <p class="small muted">미션을 깨면 ⭐ 스티커 점수가 쌓여요!</p>
      ${S.pass.premium?'<div class="good small">✨ 골드 패스 사용 중</div>':`<button class="btn gold" data-act="buyPack" data-arg="pass">골드 패스 열기 💎${PASS_COST}</button>`}
      ${passClaimable()?'<button class="btn" data-act="claimPassAll">모두 받기</button>':""}
    </div>
    <div class="pass-head"><span>기본</span><span></span><span>골드</span></div>
    ${PASS_LEVELS.map(p=>{const reached=p.lv<=lv;const cell=type=>{const claimed=S.pass[type][p.lv];const locked=type==="prem"&&!S.pass.premium;const can=reached&&!claimed&&!locked;return`<div class="pcell ${claimed?"claimed":""} ${can?"can":""} ${locked?"locked":""}" ${can?`data-act="claimPass" data-arg="${type}:${p.lv}"`:""}>
          ${locked?"🔒 ":""}${rewardText(p[type])}${claimed?" ✔":""}</div>`};return`<div class="prow ${reached?"reached":""}">${cell("free")}<div class="plv">${p.lv}</div>${cell("prem")}</div>`}).join("")}`}function claimPass(arg,silent){const[type,lvS]=arg.split(":");const lv=Number(lvS);if(lv>passLevel()||S.pass[type][lv]||type==="prem"&&!S.pass.premium)return null;const p=PASS_LEVELS[lv-1];S.pass[type][lv]=true;grant(p[type]);if(!silent){toast(`🎉 ${rewardText(p[type])}`);save();render()}return p[type]}function claimPassAll(){const total={};PASS_LEVELS.forEach(p=>["free","prem"].forEach(t=>{const r=claimPass(`${t}:${p.lv}`,true);if(r)for(const k in r)total[k]=(total[k]||0)+r[k]}));toast(`🎉 ${rewardText(total)}`);save();render()}const ACTIONS={nav:a=>{UI.screen=a;render();$("#screen").scrollTop=0},help:showHelp,closeModal,modalOk:()=>{const f=UI.modalOk;UI.modalOk=null;f&&f()},heroFilter:a=>{UI.heroFilter=a;render()},heroDetail:a=>openHeroDetail(a),heroLv:a=>{const[id,n]=a.split(":");heroLevelUp(id,Number(n))},heroPromote:a=>heroPromote(a),chapter:a=>{S.viewChapter+=Number(a);render()},stage:a=>{const[c,s]=a.split(":").map(Number);startStage(c,s)},quickStage:()=>{const n=S.maxCleared+1;startStage(Math.floor(n/STAGES_PER_CHAPTER)+1,n%STAGES_PER_CHAPTER+1)},fSlot:a=>{const p=Number(a);if(UI.form.sel===p&&S.formation[p])S.formation[p]=null;UI.form.sel=p;renderFormation()},fHero:id=>{const f=UI.form;const cur=S.formation.indexOf(id);if(cur>=0){S.formation[cur]=null;f.sel=cur}else{let p=f.sel;if(S.formation[p]){const empty=S.formation.indexOf(null);if(empty>=0)p=empty}S.formation[p]=id;const next=S.formation.indexOf(null);f.sel=next>=0?next:p}renderFormation()},fAuto:()=>{autoFormation();renderFormation()},goGrow:a=>goGrow(a),goGrowEq:()=>{UI.grow.tab="eq";goGrow(UI.grow.id)},growPick:a=>{UI.grow.id=a;render()},growTab:a=>{UI.grow.tab=a;render()},growQty:a=>{UI.grow.qty=a==="max"?"max":Number(a);render()},growLevel:()=>heroLevelUp(UI.grow.id,UI.grow.qty),growSlot:a=>{UI.grow.slot=a;render()},gearOn:a=>{equipGear(UI.grow.id,Number(a));Sound.play("shield");save();render()},gearOff:a=>{unequipGear(UI.grow.id,a);save();render()},gearSalvage:a=>{const c=salvageGear(Number(a));if(c){toast(`🍬 사탕 +${fmt(c)}`);Sound.play("coin");save();render()}},gearSalvageLow:()=>{const ids=S.gear.filter(g=>(g.tier==="N"||g.tier==="U")&&!gearOwner(g.id)).map(g=>g.id);if(!ids.length){toast("분해할 일반·희귀 장비가 없어요");return}confirmModal("일반·희귀 장비 분해",`장착하지 않은 일반·희귀 장비 ${ids.length}개를 🍬 사탕으로 바꿀까요?`,()=>{const total=ids.reduce((s,gid)=>s+salvageGear(gid),0);closeModal();save();render();Sound.play("coin");toast(`🍬 사탕 +${fmt(total)}`)},"분해하기")},gearSummon,buyCash,redeemCode,setSound:()=>{Sound.toggle();updateTopbar();openSettings()},toggleSound:()=>{const on=Sound.toggle();updateTopbar();toast(on?"🔊 소리 켜짐":"🔇 소리 꺼짐")},fStart:startBattleFromForm,closeOverlay:()=>{save();closeOverlay()},bSpeed:(a,el)=>{const b=UI.battle;if(!b)return;b.speed=b.speed>=3?1:b.speed+1;Battle.lastSpeed=b.speed;el.textContent="x"+b.speed},bSkip:()=>{if(UI.battle&&!UI.battle.over)UI.battle.finish(false,"그만")},resultClose:()=>{closeModal();const back=UI.form&&UI.form.back;closeOverlay();if(back){UI.screen=back;render()}},resultRetry:()=>{closeModal();if(UI.battle){UI.battle.destroy();UI.battle=null}renderFormation()},nextStage:a=>{closeModal();if(UI.battle){UI.battle.destroy();UI.battle=null}const[c,s]=a.split(":").map(Number);UI.screen="adventure";render();startStage(c,s)},summon:doSummon,shopTab:a=>{UI.screen="shop";UI.shopTab=a;render()},buyPack,buyDia,watchAd,questTab:a=>{UI.questTab=a;render()},claimQuest,claimPass:a=>claimPass(a),claimPassAll,claimIdle:()=>{const p=idlePending();if(p.minutes<1)return;grant(p.reward);S.idleTs=Date.now();track("idleClaim");save();render();toast(`💤 ${rewardText(p.reward)}`)},claimMonthly:()=>{const d=dayKey();if(S.monthly.daysLeft<=0||S.monthly.lastDay===d)return;S.monthly.lastDay=d;S.monthly.daysLeft--;grant({diamond:MONTHLY.daily});save();render();toast(`📅 💎${MONTHLY.daily}`)},dg:a=>dungeonClick(Number(a)),settings:openSettings,resetGame:()=>confirmModal("처음부터 다시 할까요?","모은 친구와 보석이 모두 사라져요!",()=>{resetSave();closeModal();UI.screen="lobby";render();showHelp()},"다시하기")};document.addEventListener("click",e=>{const el=e.target.closest("[data-act]");if(!el||el.disabled)return;const fn=ACTIONS[el.dataset.act];if(!fn)return;if(el.dataset.act!=="summon")Sound.play("click");fn(el.dataset.arg,el)});document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="codeInput")redeemCode()});document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal"&&!UI.battle)closeModal()});loadState();save();render();if(!S.seenHelp)showHelp();let saveCounter=0;setInterval(()=>{const before=S.quests.dayKey;checkResets();if(before!==S.quests.dayKey)render();updateTopbar();if(UI.screen==="lobby"){const box=$("#idleBox");if(box)box.innerHTML=idleBoxHtml()}if(++saveCounter%10===0)save()},1e3);
