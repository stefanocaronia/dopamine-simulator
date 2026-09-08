'use strict';
/* ui.js — toast di stato, tooltip, hit-test sul canvas, controlli e HUD.
   Tutti i testi passano da T() (js/i18n.js). */

// ───────────────────────── Toast di stato (titolo colorato + spiegazione) ─────────────────────────
function trendText(){
  const tr=trendShown;
  if(trendState==='full')return T('t.trend.full');
  if(trendState==='down'){
    const v=Math.min(tr,-0.1),secs=Math.round(vesCount/-v/5)*5;   // "vuoto tra" arrotondato a 5 s
    return T('t.trend.down',{tr:fmt1(v),empty:(v<-0.3&&secs>0)?T('t.trend.empty',{s:secs}):''});
  }
  if(trendState==='up')return T('t.trend.up',{tr:fmt1(Math.max(tr,0.1))});
  return T('t.trend.hold',{tr:(tr>=0?'+':'')+fmt1(tr)});
}
function stimToast(){
  const v=Math.round(stimulus*100);
  const P={rel:displayRelRate,act:T('u.receptive',{a:activeShown,n:postNeurons.length}),trend:trendText()};   // activeShown: media, aggiornata ogni secondo
  const lvl=stimulus<0.05?['none',C.cleft]:stimulus<0.35?['low',C.stimLow]:stimulus<0.7?['mid',C.dopa]:['high',C.stimHigh];
  return {key:'stim',c:lvl[1],t:T('t.stim.'+lvl[0]+'.t'),s:v+'%',b:T('t.stim.'+lvl[0]+'.b',P)};
}
function buildToasts(){
  const list=[],pct=Math.round(vesCount/MAX_VES*100),depleted=vesCount/MAX_VES<0.05,low=vesCount/MAX_VES<0.15;
  list.push(mode==='adhd'?{key:'mode',c:C.adhd,t:T('t.mode.adhd.t'),b:T('t.mode.adhd.b')}:{key:'mode',c:C.active,t:T('t.mode.normal.t'),b:T('t.mode.normal.b')});
  // Età: fuori dalla fascia adulta di riferimento (20–49) un toast spiega cosa cambia. Sotto i 20 il modello cambia molto
  // (+1% per anno) e c'è l'adolescenza da raccontare; a 40 cambia del 6% e non ci sarebbe nulla da spiegare, dai 50 sì
  if(age<20||age>=50){const f=ageFactor(),rel=(f>=1?'+':'−')+Math.round(Math.abs(f-1)*100)+'%',k=age<20?'young':'old';
    list.push({key:'age',c:C.age,t:T('t.age.'+k+'.t'),s:T('u.years',{n:age}),b:T('t.age.'+k+'.b',{age,full:baseD2(),rel})});}
  list.push(stimToast());
  if(sleepToastTimer>0)list.push({key:'on',c:C.dopa,t:T('t.on.t'),b:T('t.on.b')});
  const real=Math.round(sleepDebt*100),perc=Math.round(perceivedDebt()*100);
  if(caffeineActive)list.push({key:'caff',c:C.caff,t:T('t.caff.t'),s:T('u.sec',{n:Math.ceil(caffeineTimer)}),
    b:depleted?T('t.caff.depleted'):T('t.caff.b')+(sleepDebt>0.3?T('t.caff.sleep',{real,perc}):'')});
  else if(caffEndTimer>0)list.push({key:'caffend',c:C.caff,t:T('t.caffend.t'),b:T('t.caffend.b',{real,perc:Math.round(sleepDebt*CAFF_DEBT_MASK*100)})});
  if(mphActive)list.push({key:'mph',c:C.mph,t:T('t.mph.t'),s:T('u.sec',{n:Math.ceil(mphTimer)}),b:depleted?T('t.mph.depleted'):T('t.mph.b',{trend:trendText()})});
  else if(mphRebound>0)list.push({key:'mphre',c:C.tol,t:T('t.mphre.t'),s:T('u.sec',{n:Math.ceil(mphRebound)}),b:T('t.mphre.b')});
  // Sostanze: mentre l'effetto dura, accanto al tempo si vedono i D2 che scendono
  for(const k of ['nic','can','alc','coc']){const s=subst[k];
    if(s.t>0)list.push({key:k,c:C[k],t:T('t.'+k+'.t'),s:T('u.sec',{n:Math.ceil(s.t)})+' · '+T('u.d2',{rec:effectiveD2(),full:baseD2()}),b:T('t.'+k+'.b')});
    else if(s.after>0)list.push({key:k+'-after',c:C.tol,t:T('t.'+k+'.after.t'),s:T('u.sec',{n:Math.ceil(s.after)}),b:T('t.'+k+'.after.b')});}
  if(exerciseActive)list.push({key:'exer',c:C.exer,t:T('t.exer.t'),s:T('u.sec',{n:Math.ceil(exerciseTimer)}),
    b:depleted?T('t.exer.depleted'):T('t.exer.b')+(sleepDebt>0.3?T('t.exer.sleep'):'')});
  const sens=Math.round(d2Sens*100),D2={sens,rec:effectiveD2(),full:baseD2()},d2s=T('u.d2',{rec:D2.rec,full:D2.full});
  if(scrollActive)list.push({key:'scroll',c:C.scroll,t:T('t.scroll.t'),s:d2s,b:T('t.scroll.b',D2)});
  else if(d2Sens<0.92)list.push({key:'tol',c:C.tol,t:T('t.tol.t'),s:d2s,b:T('t.tol.b',Object.assign({secs:Math.max(5,Math.round((0.92-d2Sens)/SCROLL_RECOVER/5)*5)},D2))});
  if(sleepDebt>0.3)list.push({key:'sleep',c:C.sleep,t:T('t.sleep.t'),s:caffeineActive?real+'% → '+perc+'%':real+'%',
    b:T('t.sleep.b',{thr:Math.round(perceivedDebt()*150)})+(caffeineActive?T('t.sleep.masked',{perc}):T('t.sleep.hint'))});
  if(low)list.push({key:'depl',c:C.dead,t:T('t.depl.t'),s:pct+'%',b:T('t.depl.b')});
  if(paused)list.push({key:'pause',c:C.cleft,t:T('t.pause.t'),b:T('t.pause.b')});
  return list;
}
const toastNodes=new Map();
function themeNode(node,c){node.style.setProperty('--tc',c);node.style.setProperty('--tc-glow',hexA(c,.35));node.style.borderColor=hexA(c,.45);node.style.background=hexA(c,.10);}
// Riconcilia i nodi per chiave: i testi cambiano senza rianimare, i toast nuovi entrano, quelli spariti escono
function renderToasts(){
  const list=buildToasts(),deck=$('toasts'),keys=new Set(list.map(t=>t.key));
  for(const [k,node] of toastNodes){if(!keys.has(k)){toastNodes.delete(k);node.classList.add('out');setTimeout(()=>node.remove(),220);}}
  let prev=null;
  for(const t of list){
    let node=toastNodes.get(t.key);
    if(!node){
      node=document.createElement('div');node.className='toast';node.dataset.key=t.key;
      node.innerHTML='<div class="tt"><span class="tt-t"></span><small></small></div><div class="tb"></div>';
      node._c='';node._t='';node._s='';node._b='';
      toastNodes.set(t.key,node);
    }
    if(node._c!==t.c){node._c=t.c;themeNode(node,t.c);}
    if(node._t!==t.t){node._t=t.t;node.querySelector('.tt-t').textContent=t.t;}
    const s=t.s||'';if(node._s!==s){node._s=s;node.querySelector('.tt small').textContent=s;}
    if(node._b!==t.b){node._b=t.b;node.querySelector('.tb').innerHTML=t.b;}
    let want=prev?prev.nextSibling:deck.firstChild;
    while(want&&want.classList.contains('out'))want=want.nextSibling;   // i nodi in uscita non contano: evita di rianimare i vicini
    if(node!==want)deck.insertBefore(node,want);
    prev=node;
  }
}

// ───────────────────────── Tooltip ─────────────────────────
const TIP_COLOR={dat1:C.dat,comt:C.comt,d2:C.d2,vmat2:C.vmat,maob:C.dead,snap:C.snap,vesicles:C.dopa,axon:C.ap,terminal:C.snap,cleft:C.cleft,post:C.active,gauge:C.active,particle:C.dopa,dead:C.dead,rates:C.dopa};
const TIPS={
  dat1:()=>{const cfg=MODES[mode];return {t:T('tip.dat1.t'),c:C.dat,b:T('tip.dat1.b',{n:cfg.dat1Count,speed:cfg.dat1Speed,reab:displayReabRate,blocked:mphActive?T('tip.dat1.blocked'):''})};},
  comt:()=>({t:T('tip.comt.t'),c:C.comt,b:T('tip.comt.b',{comt:stats.comt})}),
  d2:()=>({t:T('tip.d2.t'),c:C.d2,b:T('tip.d2.b',{binds:stats.binds,tol:d2Sens<0.99?T('tip.d2.tol',{rec:effectiveD2(),full:baseD2(),sens:Math.round(d2Sens*100)}):''})}),
  d2bar:()=>({t:T('tip.d2bar.t'),c:C.d2,b:T('tip.d2bar.b',{rec:effectiveD2(),full:baseD2(),ref:D2_REF,max:D2_MAX})}),
  age:()=>({t:T('tip.age.t'),c:C.active,b:T('tip.age.b',{age,full:baseD2()})}),
  nic:()=>({t:T('tip.nic.t'),c:C.nic,b:T('tip.nic.b')}),
  can:()=>({t:T('tip.can.t'),c:C.can,b:T('tip.can.b')}),
  alc:()=>({t:T('tip.alc.t'),c:C.alc,b:T('tip.alc.b')}),
  coc:()=>({t:T('tip.coc.t'),c:C.coc,b:T('tip.coc.b')}),
  vmat2:()=>({t:T('tip.vmat2.t'),c:C.vmat,b:T('tip.vmat2.b',{ratio:Math.round(MODES[mode].vmat2Ratio*100),rec:stats.recycled})}),
  maob:()=>({t:T('tip.maob.t'),c:C.dead,b:T('tip.maob.b',{maob:stats.maob,comt:stats.comt})}),
  snap:()=>({t:T('tip.snap.t'),c:C.snap,b:T('tip.snap.b',{rel:displayRelRate})}),
  vesicles:()=>({t:T('tip.vesicles.t'),c:C.dopa,b:T('tip.vesicles.b',{pct:Math.round(vesCount/MAX_VES*100),trend:trendText()})}),
  axon:()=>({t:T('tip.axon.t'),c:C.ap,b:T('tip.axon.b',{stim:Math.round(stimulus*100)})}),
  terminal:()=>({t:T('tip.terminal.t'),c:C.snap,b:T('tip.terminal.b')}),
  cleft:()=>({t:T('tip.cleft.t'),c:C.cleft,b:T('tip.cleft.b',{free:freeCount()})}),
  post:h=>{const n=postNeurons[h.ni||0];return {t:T('tip.post.t'),c:C.active,
    b:T('tip.post.b')+(n?T('tip.post.state',{state:n.active?T('u.state.receptive'):T('u.state.silent'),sig:Math.round(n.signal/thresholdNow()*100)}):'')};},
  gauge:h=>{const n=postNeurons[h.ni||0];return {t:T('tip.gauge.t'),c:C.active,
    b:T('tip.gauge.b',{hl:fmtN(halfLifeNow(),2),now:n?T('tip.gauge.now',{sig:Math.round(n.signal/thresholdNow()*100)}):''})};},
  particle:h=>{const p=h.p,st=p?p.state:'free',dead=st==='degrade'||st==='comt_destroy';
    const k=dead?'dead':st==='bound'?'bound':st==='reuptake'?'reuptake':st==='recycle'?'recycle':'free';
    return {t:T('tip.particle.'+k),c:dead?C.dead:C.dopa,b:T('tip.particle.b',{age:p&&!dead?T('tip.particle.age',{age:fmt1(p.age)}):''})};},
  dead:()=>({t:T('tip.dead.t'),c:C.dead,b:T('tip.dead.b',{dead:stats.maob+stats.comt})}),
  rates:()=>({t:T('tip.rates.t'),c:C.dopa,b:T('tip.rates.b',{rel:displayRelRate,reab:displayReabRate,dead:displayDeadRate,free:freeCount(),binds:stats.binds,rec:stats.recycled,deadTot:stats.maob+stats.comt})}),
  'mode-adhd':()=>({t:T('tip.mode-adhd.t'),c:C.adhd,b:T('tip.mode-adhd.b')}),
  'mode-normal':()=>({t:T('tip.mode-normal.t'),c:C.active,b:T('tip.mode-normal.b')}),
  stimulus:()=>({t:T('tip.stimulus.t'),c:C.dopa,b:T('tip.stimulus.b')}),
  speed:()=>({t:T('tip.speed.t'),c:C.active,b:T('tip.speed.b')}),
  caffeine:()=>({t:T('tip.caffeine.t'),c:C.caff,b:T('tip.caffeine.b')}),
  mph:()=>({t:T('tip.mph.t'),c:C.mph,b:T('tip.mph.b')}),
  scroll:()=>({t:T('tip.scroll.t'),c:C.scroll,b:T('tip.scroll.b',{sens:Math.round(d2Sens*100)})}),
  exercise:()=>({t:T('tip.exercise.t'),c:C.exer,b:T('tip.exercise.b')}),
  sleep:()=>({t:T('tip.sleep.t'),c:C.sleep,b:T('tip.sleep.b')}),
  serbatoio:()=>({t:T('tip.serbatoio.t'),c:C.dopa,b:T('tip.serbatoio.b',{trend:trendText()})}),
  pause:()=>({t:T('tip.pause.t'),c:C.cleft,b:T('tip.pause.b')}),
};

const tip=$('tip');
let hover=null,canvasMouse={over:false,mx:0,my:0,cx:0,cy:0},uiTip=null,lastHit=null,lastHitT=0,touchTimer=0;
function showTip(key,cx,cy,h){
  const f=TIPS[key];if(!f){hideTip();return;}
  const d=f(h||{}),html='<div class="tt">'+d.t+'</div><div class="tb">'+d.b+'</div>';
  if(tip._html!==html){tip._html=html;tip.innerHTML=html;}
  if(tip._c!==d.c){tip._c=d.c;tip.style.setProperty('--tc',d.c);tip.style.setProperty('--tc-glow',hexA(d.c,.35));tip.style.borderColor=hexA(d.c,.55);}
  tip.classList.add('show');
  const w=tip.offsetWidth,hh=tip.offsetHeight,vw=window.innerWidth,vh=window.innerHeight;
  let x=cx+16,y=cy+18;
  if(x+w>vw-8)x=cx-16-w;if(x<8)x=8;
  if(y+hh>vh-8)y=cy-18-hh;if(y<8)y=8;
  tip.style.left=x+'px';tip.style.top=y+'px';
}
function hideTip(){tip.classList.remove('show');}

function hitTest(mx,my){
  for(const d of dat1s)if(Math.hypot(mx-d.x,my-d.y)<14)return {key:'dat1',x:d.x,y:d.y,r:12};
  for(const c of comts)if(Math.hypot(mx-c.x,my-c.y)<14)return {key:'comt',x:c.x,y:c.y,r:11};
  for(const r of receptors)if(Math.hypot(mx-r.x-2,my-r.y)<9)return {key:'d2',x:r.x+2,y:r.y,r:8};
  for(let i=0;i<postNeurons.length;i++){const g=postGeom(i);if(Math.hypot(mx-g.gx,my-g.ncy)<g.R+8)return {key:'gauge',x:g.gx,y:g.ncy,r:g.R+4,ni:i};}
  const inR=R=>mx>R.x&&mx<R.x+R.w&&my>R.y&&my<R.y+R.h;
  if(inR(VMAT_Z))return {key:'vmat2',rect:VMAT_Z};
  if(inR(MAO_Z))return {key:'maob',rect:MAO_Z};
  if(mx>PRE.w-9&&mx<PRE.w+3&&my>SNAP.y&&my<SNAP.y+SNAP.h)return {key:'snap',rect:{x:PRE.w-6,y:SNAP.y,w:6,h:SNAP.h}};
  if(my>H-44&&mx>CLEFT.x+CLEFT.w*.1&&mx<CLEFT.x+CLEFT.w*.9)return {key:'rates',rect:{x:CLEFT.x+CLEFT.w*.1,y:H-42,w:CLEFT.w*.8,h:24}};
  for(const v of vesicles)if(Math.hypot(mx-v.x,my-v.y)<7)return {key:'vesicles',x:v.x,y:v.y,r:6};
  for(const p of particles)if(Math.hypot(mx-p.x,my-p.y)<8)return {key:'particle',x:p.x,y:p.y,r:7,p};
  if(mx<TERM.xJ+6&&Math.abs(my-TERM.cy)<TERM.axonR)return {key:'axon'};
  const u=(PRE.w-mx)/TERM.rx,v=(my-TERM.cy)/TERM.ry;
  if(mx<PRE.w&&u*u+v*v<=1)return {key:'terminal'};
  for(let i=0;i<postNeurons.length;i++){const g=postGeom(i),uu=(mx-g.x0)/g.rx,vv=(my-g.ncy)/g.ry;if(mx>=g.x0&&uu*uu+vv*vv<=1)return {key:'post',ni:i};}
  if(mx>=CLEFT.x&&mx<=CLEFT.x+CLEFT.w)return {key:'cleft'};
  return null;
}
function updateHover(){
  if(canvasMouse.over&&ready){
    let hit=hitTest(canvasMouse.mx,canvasMouse.my);
    // Le particelle si muovono: il tooltip resta agganciato per un attimo, così non sfarfalla
    if(hit&&hit.key==='particle'){lastHit=hit;lastHitT=wall();}
    else if(lastHit&&wall()-lastHitT<0.6&&(!hit||hit.key==='cleft'||hit.key==='terminal')){hit=lastHit;if(hit.p){hit.x=hit.p.x;hit.y=hit.p.y;}}
    hover=hit;
    canvas.style.cursor=hit?'help':'default';
    if(hit)showTip(hit.key,canvasMouse.cx,canvasMouse.cy,hit);else hideTip();
  }else{
    hover=null;
    if(uiTip)showTip(uiTip.key,uiTip.cx,uiTip.cy);
  }
}

// ───────────────────────── HUD (barre, pulsanti) ─────────────────────────
const hudCache={};
function setText(id,v){if(hudCache[id]!==v){hudCache[id]=v;$(id).textContent=v;}}
function setWidth(id,v){const k=id+'.w';if(hudCache[k]!==v){hudCache[k]=v;$(id).style.width=v;}}
function updateHUD(){
  const pct=Math.round(vesCount/MAX_VES*100);
  setWidth('serbatoio-fill',pct+'%');setText('serbatoio-pct',pct+'%');
  setWidth('caff-fill',(caffeineActive?Math.max(0,caffeineTimer/CAFF_DUR*100).toFixed(1):0)+'%');
  setWidth('mph-fill',(mphActive?Math.max(0,mphTimer/MPH_DUR*100).toFixed(1):0)+'%');
  setWidth('exer-fill',(exerciseActive?Math.max(0,exerciseTimer/EXER_DUR*100).toFixed(1):0)+'%');
  // Barra del sonno: parte piena = debito percepito, parte tratteggiata = quota mascherata dalla caffeina
  const perc=perceivedDebt()*100,real=sleepDebt*100;
  setWidth('sleep-fill',perc.toFixed(1)+'%');
  const mk=$('sleep-mask'),ml=perc.toFixed(1)+'%',mw=Math.max(0,real-perc).toFixed(1)+'%';
  if(hudCache.ml!==ml){hudCache.ml=ml;mk.style.insetInlineStart=ml;}
  if(hudCache.mw!==mw){hudCache.mw=mw;mk.style.width=mw;}
  setWidth('scroll-fill',scrollActive?'100%':'0%');
  for(const k of ['nic','can','alc','coc'])setWidth(k+'-fill',(subst[k].t>0?(subst[k].t/SUBST[k].dur*100).toFixed(1):0)+'%');
  // Barra dei recettori D2: fondo scala = D2_MAX (neurotipico a 5 anni), tacca = base per cervello ed età, testo = recettori per neurone
  const eff=effectiveD2(),base=baseD2();
  setWidth('d2-fill',Math.min(100,eff/D2_MAX*100).toFixed(1)+'%');
  const mkLeft=Math.min(100,base/D2_MAX*100).toFixed(1)+'%';
  if(hudCache.d2mk!==mkLeft){hudCache.d2mk=mkLeft;$('d2-mark').style.insetInlineStart=mkLeft;}
  setText('d2-count',String(eff));
  if(hudCache.paused!==paused){hudCache.paused=paused;$('btn-pause').classList.toggle('paused',paused);}
  if(hudCache.mode!==mode){hudCache.mode=mode;document.querySelectorAll('#mode-seg button').forEach(b=>b.classList.toggle('is-on',b.dataset.mode===mode));}
}

// ───────────────────────── Impostazioni salvate (localStorage) ─────────────────────────
// Si ricordano cervello, età, stimolo e scala del tempo (la lingua ha la sua chiave in i18n.js). Lo stato della simulazione no.
const SETTINGS_KEY='dopa.settings';
let saveTimer=0;
function loadSettings(){
  let o=null;try{o=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');}catch(e){}
  if(!o||typeof o!=='object')return;
  if(MODES[o.mode])setMode(o.mode);
  if(typeof o.age==='number')setAge(o.age);
  if(typeof o.stim==='number')setStimulus(o.stim);
  if(typeof o.speed==='number')setSpeed(o.speed);
}
function saveSettings(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({mode,age,stim:stimulus,speed:speedMul}));}catch(e){}},150);
}

// ───────────────────────── Pagine (Simulazione / Come funziona / Per i biologi) ─────────────────────────
let page='sim';
const PAGES=['sim','mech','bio'];
// Le pagine di testo sono sequenze di sezioni nel dizionario: <prefisso>.lead, poi <prefisso>.N.t (titolo) e <prefisso>.N.b (corpo HTML)
function renderDocs(){
  for(const [id,pre] of [['page-mech','mech'],['page-bio','bio']]){
    const el=$(id);if(!el)continue;
    let html='<p class="lead">'+T(pre+'.lead')+'</p>';
    for(let i=1;i<40;i++){const k=pre+'.'+i+'.t';if(I18N.it[k]==null)break;html+='<section><h2>'+T(k)+'</h2>'+T(pre+'.'+i+'.b')+'</section>';}
    el.innerHTML=withFigures(html);
  }
}
function showPage(p,push){
  if(!PAGES.includes(p))p='sim';
  page=p;
  for(const q of PAGES){const el=$('page-'+q);if(el)el.hidden=q!==p;}
  document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.page===p)));
  if(push!==false){try{history.replaceState(null,'',p==='sim'?location.pathname+location.search:'#'+p);}catch(e){}}
  if(p==='sim'){if(!ready)resizeCanvas();}
  else{hideTip();uiTip=null;canvasMouse.over=false;hover=null;}
  window.scrollTo({top:0});
}
function initPages(){
  renderDocs();
  document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
  document.addEventListener('click',e=>{const a=e.target instanceof Element?e.target.closest('[data-page-link]'):null;if(a){e.preventDefault();showPage(a.dataset.pageLink);}});
  window.addEventListener('hashchange',()=>showPage(location.hash.replace('#',''),false));
  showPage(location.hash.replace('#',''),false);
}

// ───────────────────────── Controlli ─────────────────────────
function syncRange(el,v,min,max){el.style.setProperty('--pct',((v-min)/(max-min)*100)+'%');}
function initUI(){
  loadSettings();
  const stimEl=$('stimulus'),speedEl=$('speed');
  stimEl.addEventListener('input',e=>{setStimulus(e.target.value/100);$('stim-val').textContent=e.target.value+'%';syncRange(stimEl,+e.target.value,0,100);saveSettings();});
  speedEl.addEventListener('input',e=>{setSpeed(parseFloat(e.target.value));$('speed-val').textContent=e.target.value+'×';syncRange(speedEl,speedMul,1,8);saveSettings();});
  stimEl.value=Math.round(stimulus*100);speedEl.value=speedMul;
  $('stim-val').textContent=stimEl.value+'%';$('speed-val').textContent=speedEl.value+'×';
  syncRange(stimEl,+stimEl.value,0,100);syncRange(speedEl,+speedEl.value,1,8);
  document.querySelectorAll('#mode-seg button').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);saveSettings();}));
  $('btn-reset').addEventListener('click',()=>{resetSim();clearTrails();});
  $('btn-pause').addEventListener('click',togglePause);
  window.addEventListener('keydown',e=>{
    if(e.code==='Space'&&page==='sim'&&!(e.target instanceof HTMLElement&&e.target.matches('button,input,select,textarea,a'))){e.preventDefault();togglePause();}
  });
  $('btn-caffeine').addEventListener('click',startCaffeine);
  $('btn-mph').addEventListener('click',startMph);
  $('btn-scroll').addEventListener('click',toggleScroll);
  for(const k of ['nic','can','alc','coc'])$('btn-'+k).addEventListener('click',()=>startSubst(k));
  const ageEl=$('age');
  ageEl.value=age;$('age-val').textContent=age;syncRange(ageEl,age,5,100);
  ageEl.addEventListener('input',e=>{setAge(+e.target.value);$('age-val').textContent=e.target.value;syncRange(ageEl,+e.target.value,5,100);saveSettings();});
  $('btn-exercise').addEventListener('click',startExercise);
  initPages();
  // Selettore lingua a tendina
  buildLangMenu();
  const lb=$('lang-btn'),lm=$('lang-menu');
  const closeMenu=()=>{lm.hidden=true;lb.setAttribute('aria-expanded','false');};
  lb.addEventListener('click',e=>{e.stopPropagation();const open=lm.hidden;lm.hidden=!open;lb.setAttribute('aria-expanded',String(open));});
  lm.addEventListener('click',e=>{const li=e.target.closest('li[data-lang]');if(li){setLang(li.dataset.lang);closeMenu();}});
  document.addEventListener('click',e=>{if(!(e.target instanceof Element&&e.target.closest('#lang')))closeMenu();});
  window.addEventListener('keydown',e=>{if(e.code==='Escape')closeMenu();});

  canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();canvasMouse={over:true,mx:e.clientX-r.left,my:e.clientY-r.top,cx:e.clientX,cy:e.clientY};uiTip=null;});
  canvas.addEventListener('mouseleave',()=>{canvasMouse.over=false;hover=null;canvas.style.cursor='default';if(!uiTip)hideTip();});
  canvas.addEventListener('pointerdown',e=>{   // su touch: tocca un elemento per leggere la spiegazione
    if(e.pointerType!=='touch')return;
    const r=canvas.getBoundingClientRect();canvasMouse={over:true,mx:e.clientX-r.left,my:e.clientY-r.top,cx:e.clientX,cy:e.clientY};
    clearTimeout(touchTimer);touchTimer=setTimeout(()=>{canvasMouse.over=false;hover=null;hideTip();},4000);
  });
  document.addEventListener('mousemove',e=>{
    const el=e.target instanceof Element?e.target.closest('[data-tip]'):null;
    if(el){uiTip={key:el.dataset.tip,cx:e.clientX,cy:e.clientY};showTip(uiTip.key,e.clientX,e.clientY);}
    else if(uiTip){uiTip=null;if(!canvasMouse.over)hideTip();}
  });
  window.addEventListener('blur',()=>{uiTip=null;canvasMouse.over=false;hover=null;hideTip();});
}
