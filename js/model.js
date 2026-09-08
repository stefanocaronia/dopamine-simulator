'use strict';
/* model.js — parametri, stato e logica della simulazione. Nessun accesso al DOM.
   Le variabili top-level sono condivise con gli altri script (scope globale degli script classici).
   Ogni modifica alla biologia va annotata in docs/fedelta-biologica.md. */

// ───────────────────────── Parametri del modello ─────────────────────────
// comtRate: nello striato la COMT pesa poco (è per lo più intracellulare); qui resta come metafora a peso ridotto.
// comtCount: enzimi sullo schermo (5 nell'ADHD, 3 nel neurotipico); il tasso è per enzima, tarato perché l'attività
// totale dell'ADHD resti ×2,4 (5 × 0,029 ≈ 2,4 × 3 × 0,020). Tasso a contatto: ~1,2 catture/s per enzima nel neurotipico;
// prima (0,005) i Pac-Man mangiavano 2 molecole in 30 s e le "distrutte dalla COMT" erano quasi tutte molecole scadute
const MODES={
  adhd:  {d2Count:5, dat1Speed:2.0,dat1Count:5,comtCount:5,comtRate:0.029,vmat2Ratio:0.55,snap25Eff:1.0},
  normal:{d2Count:12,dat1Speed:0.7,dat1Count:3,comtCount:3,comtRate:0.020,vmat2Ratio:0.75,snap25Eff:1.0}
};
const MAX_VES=100,MAX_P=500,BIND_DIST=22;
const ACT_THRESHOLD=0.8,SIGNAL_PER_BIND=0.5,SIGNAL_HALF_LIFE=0.6;
const CAFF_DUR=25,MPH_DUR=30,EXER_DUR=12;
// Caffeina = antagonista A2A: soglia dei D2 più bassa, rilascio un po' più alto, dimezza la penalità del debito di sonno
const CAFF_THRESH=0.8,CAFF_RELEASE=1.10,CAFF_DEBT_MASK=0.5;
// Metilfenidato = blocco dei DAT1: quota di ricaptazioni che fallisce, rallentamento dei trasportatori
const MPH_BLOCK=0.85,MPH_SLOW=0.3;
// Effetti collaterali del metilfenidato (semplificati): insonnia (debito di sonno più veloce) e rebound di fine dose (DAT1 più veloci)
const MPH_SLEEP_MULT=1.5,MPH_REBOUND_DUR=15,MPH_REBOUND_SPEED=1.3;
// Fine della caffeina: la stanchezza mascherata torna tutta insieme (toast di avviso)
const CAFF_END_TOAST=5;
// Debito di sonno: cresce con il tempo di veglia (adenosina), non con lo stimolo. Pieno in ~3 minuti simulati
const SLEEP_DEBT_RATE=0.0055;
// Scarica del neurone dopaminergico (Grace 1991): un pacemaker tonico sempre acceso (~3–4 Hz, impulsi singoli) e raffiche
// fasiche di 4–6 impulsi a 20 Hz per novità e ricompense. Il rilascio è agganciato agli impulsi: ogni impulso che arriva
// al terminale fonde poche vescicole, in raffica di più per impulso (facilitazione). Le medie sono quelle della v3.5:
// 3 vescicole/s di fondo e stimolo × 30/s in raffiche (stimolo × 3 raffiche/s × 5 impulsi × 2 vescicole).
// Il tonico dà a caffeina e farmaco qualcosa su cui agire anche a stimolo basso
const TONIC_HZ=3,TONIC_VES=1,TONIC_COST=0.03;
const BURST_HZ=20,BURST_MIN=4,BURST_MAX=6,BURST_VES=2,BURST_COST=0.05,BURST_PER_STIM=3;
// Rilascio extra di esercizio e sostanze (molecole/s) convertito in raffiche/s: una raffica vale ~10 molecole
const BURST_MOLS=10;
// Velocità dei potenziali d'azione lungo l'assone (larghezze del terminale al secondo simulato): ~0,35 s di latenza
const AP_SPEED=1.4;
// Ingresso dalla corteccia sui neuroni riceventi: impulsi glutammatergici di fondo più una parte che cresce con lo stimolo
// (la corteccia dice "cosa", la dopamina "quanto conta"). L'impulso fa scaricare il neurone solo se è ricettivo.
// CTX_TRAVEL: secondi simulati che l'impulso impiega dal bordo destro alla cellula
const CTX_BASE_HZ=1,CTX_STIM_HZ=3,CTX_TRAVEL=0.3;
// Esaurimento: sotto il 20% di riserva il rilascio non si spegne di colpo, cala in proporzione alle vescicole rimaste
const DEPLETE_FROM=0.20;
// Scrolling compulsivo: raffiche di rilascio a basso costo scatenate da "segnali"; i D2 si riducono (tolleranza) e recuperano lentamente
const SCROLL_BURST_RATE=1.0,SCROLL_BURST_N=12,SCROLL_COST=0.03,SCROLL_DESENS=0.02,SCROLL_RECOVER=0.004,D2_SENS_MIN=0.3,SLEEP_TOL_RECOVER=0.1;
// Età: i D2 sono più numerosi nell'infanzia e calano di ~6% per decennio dopo i 30 anni (30 = riferimento); D2_REF = adulto neurotipico
// D2_MAX = massimo raggiungibile (neurotipico a 5 anni): è il fondo scala della barra dei recettori
const AGE_REF=30,D2_REF=12,AGE_MIN=5,AGE_MAX=100;
const D2_MAX=Math.round(D2_REF*(1+0.01*(AGE_REF-AGE_MIN)));
// Sostanze (semplificazioni didattiche): durata dell'effetto in secondi reali, effetto successivo, costo in D2.
// boost = rilascio aggiunto in molecole/s indipendente dallo stimolo (le droghe agiscono anche a riposo);
// release = moltiplicatore del rilascio guidato dallo stimolo (le ricompense facili aggiungono ~12 rilasci/s).
// des = desensibilizzazione dei D2 al secondo mentre l'effetto dura: la riduzione dei recettori è graduale,
// non un salto per dose. Totale per dose = des × dur (nic 20%, can 16%, alc 24%, coc 50%).
const SUBST={
  nic:{dur:20,after:15,boost:10,release:1.30,afterRelease:0.85,des:0.010,sleep:1.2},
  can:{dur:40,after:60,boost:6,release:1.15,afterSynth:0.7,des:0.004,sleep:1.0},
  alc:{dur:30,after:30,boost:9,release:1.25,afterThresh:1.2,des:0.008,sleep:1.3},
  coc:{dur:20,after:20,boost:14,release:1.0,datBlock:0.95,datSlow:0.3,afterDat:1.5,afterThresh:1.3,des:0.025,sleep:2.0}
};
const C={dopa:'#00ff88',dead:'#ff3355',dat:'#aa55ff',comt:'#ff8833',vmat:'#3388dd',d2:'#ffcc00',active:'#00e5ff',recept:'#ffe27a',ap:'#ffe27a',snap:'#7aa8ff',cleft:'#8fa3bb',adhd:'#ff8833',caff:'#e07a2f',mph:'#ff5fa8',exer:'#3cb371',sleep:'#8e6fd1',scroll:'#9ecbff',tol:'#8a9bb5',age:'#e6c07b',stimLow:'#7fb8ff',stimHigh:'#ffb347',nic:'#d4b46a',can:'#9be36f',alc:'#c96f8f',coc:'#dfe9ff'};

// ───────────────────────── Stato ─────────────────────────
let mode='normal',stimulus=0.10,speedMul=2,paused=false;
let vesCount=MAX_VES,vesicles=[],particles=[],receptors=[],postNeurons=[],dat1s=[],comts=[];
let stats={recycled:0,maob:0,comt:0,lost:0,total:0,binds:0,fires:0,misses:0};   // fires/misses: impulsi corticali passati o spenti   // lost: molecole scadute (2 s libere nella fessura), disperse senza COMT
let W=0,H=0,PRE={},CLEFT={},POST={},SNAP={},VMAT_Z={},MAO_Z={},TERM={};
let caffeineTimer=0,caffeineActive=false,caffEndTimer=0,mphTimer=0,mphActive=false,mphRebound=0,exerciseTimer=0,exerciseActive=false,sleepDebt=0,sleepToastTimer=0;
let scrollActive=false,scrollAccum=0,scrollOnAt=0,d2Sens=1,effD2=null;   // scrollOnAt: istante (now) dell'accensione; d2Sens: sensibilità/densità dei D2 (1 = normale)
let age=AGE_REF;
let subst={nic:{t:0,after:0},can:{t:0,after:0},alc:{t:0,after:0},coc:{t:0,after:0}};   // t: effetto attivo, after: effetto successivo (secondi reali)
// Tassi mostrati: contati in una finestra di 0,5 s reali e divisi per il tempo simulato trascorso (rateSim), quindi
// per secondo simulato, coerenti con i numeri dei testi (3 Hz, 30/s) a qualunque velocità; impulsi e raffiche con media mobile
let rateWindow=0,rateSim=0,rateRelCount=0,rateReabCount=0,rateDeadCount=0,rateSpikeCount=0,rateBurstCount=0,rateFireCount=0,rateMissCount=0,displayRelRate=0,displayReabRate=0,displayDeadRate=0,displaySpikeRate=0,displayBurstRate=0,displayFireRate=0,relEma=0,reabEma=0,deadEma=0,spikeEma=0,burstEma=0,fireEma=0,missEma=0;
let now=0;
// Scarica: pacemaker (tonicAccum), raffiche in attesa (burstAccum), coda di impulsi da emettere a 20 Hz (spikeQ, spikeTimer)
// e resto frazionario delle vescicole per impulso (vesAccum): le medie restano esatte anche con moltiplicatori non interi
let tonicAccum=0,burstAccum=0,spikeQ=[],spikeTimer=0,vesAccum=0;
// Tendenza del serbatoio: media lenta (vesTrend, %/s), valore mostrato campionato ogni secondo (trendShown)
// e stato con isteresi (trendState: full | down | up | hold) per evitare sfarfallii nei testi
let lastVes=MAX_VES,vesTrend=0,trendShown=0,trendState='full',trendTimer=0;
// Neuroni ricettivi: media lenta (~4 s) della quota di neuroni ricettivi (activeAvg, 0..1) e valore mostrato
// campionato ogni secondo come percentuale di tempo a passi del 5% (activeShown). Un conteggio arrotondato
// nascondeva le accensioni brevi (0,3 neuroni in media diventava "0/3")
let activeAvg=0,activeShown=0;
// Effetti visivi (non influenzano il modello)
let pops=[],pulses=[],apPulses=[],motes=[];
// Luce del terminale: lampo, mantenimento e dissolvenza a ogni impulso che arriva; snapGlow è il bagliore della zona attiva
let preGlow=0,preFlash=0,preHold=0,snapGlow=0;

// ───────────────────────── Geometria ─────────────────────────
function setGeometry(w,h){
  W=w;H=h;
  PRE={x:0,y:0,w:W*.30,h:H};
  CLEFT={x:PRE.w,y:0,w:W*.40,h:H};
  const dendGap=W*.05;
  POST={x:PRE.w+CLEFT.w+dendGap,y:0,w:W-PRE.w-CLEFT.w-dendGap-2,h:H,ctxW:Math.max(34,Math.round(W*.035))};   // ctxW: corridoio a destra per le fibre dalla corteccia
  SNAP={x:PRE.w-2,y:H*.05,w:10,h:H*.90};
  // Terminale assonico: forma a "D" con la faccia piatta sulla membrana presinaptica (x = PRE.w)
  const cy=H*.5,yTop=H*.06,yBot=H*.94;
  TERM={cx:PRE.w,cy,rx:PRE.w*.72,ry:(yBot-yTop)/2,yTop,yBot,axonR:H*.09};
  TERM.thJ=Math.asin(TERM.axonR/TERM.ry);
  TERM.xJ=PRE.w-TERM.rx*Math.cos(TERM.thJ);
  VMAT_Z={x:PRE.w*.46,y:H*.24,w:PRE.w*.27,h:H*.17};
  MAO_Z={x:PRE.w*.46,y:H*.59,w:PRE.w*.27,h:H*.17};
  rebuildAll();buildMotes();
}

function rebuildAll(){
  const {cy,rx,ry}=TERM;
  const inside=(x,y,m)=>{const u=(PRE.w-x)/rx,v=(y-cy)/ry;return x<PRE.w-3&&u*u+v*v<=m;};
  const inRect=(x,y,R,pad)=>x>R.x-pad&&x<R.x+R.w+pad&&y>R.y-pad&&y<R.y+R.h+pad;
  vesicles=[];
  // Vescicole "docked" sulla zona attiva (si svuotano per ultime)
  const dockY=[.15,.27,.39,.61,.73,.85];
  for(const f of dockY)vesicles.push({x:PRE.w-8,y:H*f,ph:Math.random()*6.28,dock:true});
  let guard=0;
  while(vesicles.length<dockY.length+56&&guard++<5000){
    const x=PRE.w*(.42+Math.random()*.48),y=H*(.12+Math.random()*.76);
    if(!inside(x,y,.80))continue;
    if(inRect(x,y,VMAT_Z,6)||inRect(x,y,MAO_Z,6))continue;
    if(x<PRE.w*.62&&Math.abs(y-cy)>H*.10)continue;
    vesicles.push({x,y,ph:Math.random()*6.28,dock:false});
  }
  postNeurons=[];
  const nC=3,gap=12,top=12,bottom=H-26,nH=(bottom-top-gap*(nC-1))/nC;
  for(let i=0;i<nC;i++)postNeurons.push({x:POST.x,y:top+i*(nH+gap),w:POST.w,h:nH,signal:0,glow:0,active:false,flash:0,hold:0,ctxAccum:Math.random(),inPulses:[],fires:0,misses:0});   // glow/hold: luce della scarica; flash: lampo della ciambella; inPulses: impulsi dalla corteccia in viaggio
  rebuildReceptors();rebuildDat1();
  rebuildComts();
  pops=[];pulses=[];apPulses=[];
}

function rebuildReceptors(){
  const cfg=MODES[mode];receptors=[];
  const recX=CLEFT.x+CLEFT.w+4;
  postNeurons.forEach((n,ni)=>{const c=effectiveD2(),sp=n.h/(c+1),sc=Math.min(1,sp/12);   // sc: scala del glifo su schermi piccoli
    for(let j=0;j<c;j++)receptors.push({x:recX,y:n.y+sp*(j+1),ni,sc,occupied:false,particle:null,timer:0,cooldown:0});
  });
}

// COMT: eat = tempo residuo dell'animazione "inghiotte", eaten = molecole mangiate (numerino sotto l'enzima)
function rebuildComts(){
  const n=MODES[mode].comtCount;comts=[];
  for(let i=0;i<n;i++)comts.push({x:CLEFT.x+30+Math.random()*(CLEFT.w-60),y:30+Math.random()*(H-60),vx:(Math.random()-.5)*.8,vy:(Math.random()-.5)*.8,chomp:Math.random()*6.28,eat:0,eaten:0});
}

function rebuildDat1(){
  const cfg=MODES[mode];dat1s=[];const sp=H/(cfg.dat1Count+1);
  for(let i=0;i<cfg.dat1Count;i++)dat1s.push({x:PRE.w+2,y:sp*(i+1),state:'idle',target:null,arm:0,timer:0});
}

function buildMotes(){
  motes=[];
  for(let i=0;i<34;i++)motes.push({x:CLEFT.x+Math.random()*CLEFT.w,y:Math.random()*H,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,r:.6+Math.random()*1.1,a:.08+Math.random()*.14});
}

// Geometria delle cellule riceventi (condivisa da rendering e hit-test)
function postGeom(i){
  const x0=CLEFT.x+CLEFT.w+2,x1=W-6-POST.ctxW,n=postNeurons[i],ncy=n.y+n.h/2,rx=x1-x0,ry=n.h/2-3;
  return {x0,x1,n,ncy,rx,ry,gx:x0+rx*.52,R:Math.min(ry*.55,36)};
}

// Punto di arrivo della ricaptazione: dentro il terminale, verso l'asse (evita di uscire dalla cellula ai bordi)
function reuptakeTarget(y){return {x:PRE.w*.62,y:TERM.cy+(y-TERM.cy)*.5};}
function fx(x,y,color,r0,r1,dur){if(pops.length<120)pops.push({x,y,age:0,color,r0,r1,dur});}

function spawn(x,y){
  if(particles.length>=MAX_P)return null;
  const cw=CLEFT.w;
  const p={x,y,vx:cw*2.5+Math.random()*cw*1.5,vy:(Math.random()-.5)*cw*1.5,state:'free',alpha:1,target:null,timer:0,immune:0,age:0,hx:x,hy:y};
  particles.push(p);
  fx(x+2,y,C.dopa,2,14,.35);
  return p;
}

// Debito percepito: la caffeina ne maschera una parte (quella reale resta)
function perceivedDebt(){return sleepDebt*(caffeineActive?CAFF_DEBT_MASK:1);}
// Età: lo stesso fattore scala i recettori D2 di partenza e il rilascio (con gli anni calano sia i D2
// sia il numero di neuroni dopaminergici e la capacità di sintesi)
function ageFactor(){return age<AGE_REF?1+0.01*(AGE_REF-age):Math.max(0.5,1-0.06*(age-AGE_REF)/10);}
function baseD2(){return Math.max(2,Math.round(MODES[mode].d2Count*ageFactor()));}
function effectiveD2(){return Math.max(2,Math.round(MODES[mode].d2Count*ageFactor()*d2Sens));}
// Sostanze: composizione degli effetti (attivi e successivi) sui parametri del modello
const sAct=k=>subst[k].t>0,sAft=k=>subst[k].t<=0&&subst[k].after>0;
function substBoost(){let b=0;for(const k in subst)if(sAct(k))b+=SUBST[k].boost;return b;}
function releaseMult(){return (caffeineActive?CAFF_RELEASE:1)*(sAct('nic')?SUBST.nic.release:sAft('nic')?SUBST.nic.afterRelease:1)*(sAct('can')?SUBST.can.release:1)*(sAct('alc')?SUBST.alc.release:1);}
function datBlock(){return Math.max(mphActive?MPH_BLOCK:0,sAct('coc')?SUBST.coc.datBlock:0);}
function datSpeedMult(){let m=1;if(mphActive)m*=MPH_SLOW;if(sAct('coc'))m*=SUBST.coc.datSlow;if(mphRebound>0)m*=MPH_REBOUND_SPEED;if(sAft('coc'))m*=SUBST.coc.afterDat;return m;}
function threshMult(){return (sAft('alc')?SUBST.alc.afterThresh:1)*(sAft('coc')?SUBST.coc.afterThresh:1);}
function sleepMult(){let m=mphActive?MPH_SLEEP_MULT:1;if(sAct('nic'))m*=SUBST.nic.sleep;if(sAct('alc')||sAft('alc'))m*=SUBST.alc.sleep;if(sAct('coc'))m*=SUBST.coc.sleep;return m;}
function synthMult(){return sAft('can')?SUBST.can.afterSynth:1;}
// Quota di rilascio ancora possibile con la riserva che scende (1 sopra il 20%, poi lineare fino a 0)
function supply(){return Math.min(1,(vesCount/MAX_VES)/DEPLETE_FROM);}
// Soglia di attivazione: sale con il debito percepito e con i postumi; la caffeina la abbassa
function thresholdNow(){return ACT_THRESHOLD*(1+1.5*perceivedDebt())*(caffeineActive?CAFF_THRESH:1)*threshMult();}
function halfLifeNow(){return SIGNAL_HALF_LIFE/(1+sleepDebt*1.2);}
// Quota degli impulsi corticali che passano (media mobile): i neuroni "rispondono al q% degli stimoli"
function passPct(){const s=fireEma+missEma;return s>0?Math.round(100*fireEma/s):0;}
function freeCount(){let n=0;for(const p of particles)if(p.state==='free')n++;return n;}

// ───────────────────────── Scarica: impulsi e raffiche ─────────────────────────
// Un impulso parte dall'assone con le vescicole che fonderà all'arrivo (ves) e il loro costo sulla riserva
function emitSpike(ves,cost){if(apPulses.length<60)apPulses.push({x:-10,y:TERM.cy+(Math.random()-.5)*TERM.axonR*.4,ves,cost});}
// Una raffica: 4–6 impulsi messi in coda, emessi a 20 Hz da update()
function queueBurst(ves,cost){
  if(spikeQ.length>60)return;   // raffiche sovrapposte oltre ogni ragionevolezza: le nuove si perdono
  const n=BURST_MIN+Math.floor(Math.random()*(BURST_MAX-BURST_MIN+1));
  for(let i=0;i<n;i++)spikeQ.push({ves,cost});
  rateBurstCount++;
}
// L'impulso arriva al terminale: il terminale si accende e le vescicole si fondono in un punto della zona attiva.
// Vescicole per impulso = base × efficienza SNAP25 × moltiplicatori (caffeina, sostanze) × riserva × età,
// con il resto frazionario che si accumula per l'impulso successivo
function fireSpike(a){
  vesAccum+=a.ves*MODES[mode].snap25Eff*releaseMult()*supply()*ageFactor();
  let n=Math.floor(vesAccum);vesAccum-=n;
  const cost=exerciseActive?Math.min(a.cost,0.02):a.cost;
  const site=SNAP.y+8+Math.random()*(SNAP.h-16);
  while(n-->0&&vesCount>1){vesCount=Math.max(0,vesCount-cost);spawn(CLEFT.x+2,Math.max(12,Math.min(H-12,site+(Math.random()-.5)*14)));stats.total++;rateRelCount++;}
  rateSpikeCount++;
  // Luce: un impulso di raffica accende il terminale del tutto, uno tonico a metà (lampo breve): le raffiche si distinguono
  const burst=a.ves>=BURST_VES;preGlow=Math.max(preGlow,burst?1:0.5);preFlash=Math.max(preFlash,burst?1:0.4);preHold=0.04;snapGlow=1;
}

// ───────────────────────── Simulazione ─────────────────────────
// dt = secondi reali (max 0,05); sdt = dt × scala del tempo. Caffeina ed esercizio durano in secondi reali.
function update(dt){
  const cfg=MODES[mode],sdt=dt*speedMul;
  now+=dt;

  if(caffeineTimer>0){caffeineTimer-=dt;if(caffeineTimer<=0){caffeineTimer=0;caffeineActive=false;if(sleepDebt>0.2)caffEndTimer=CAFF_END_TOAST;}}
  if(caffEndTimer>0)caffEndTimer-=dt;
  if(mphTimer>0){mphTimer-=dt;if(mphTimer<=0){mphTimer=0;mphActive=false;mphRebound=MPH_REBOUND_DUR;}}
  if(mphRebound>0)mphRebound-=dt;
  for(const k in subst){const s=subst[k];if(s.t>0){s.t-=dt;if(s.t<=0){s.t=0;s.after=SUBST[k].after;}}else if(s.after>0)s.after-=dt;}
  if(exerciseTimer>0){
    exerciseTimer-=dt;
    vesCount=Math.min(MAX_VES,vesCount+(0.5-sleepDebt*0.3)*sdt);   // l'esercizio accelera la sintesi, meno se c'è debito di sonno
    if(exerciseTimer<=0){exerciseTimer=0;exerciseActive=false;}
  }
  // Debito di sonno: cresce con il tempo di veglia, indipendentemente dallo stimolo (più in fretta sotto stimolante)
  sleepDebt=Math.min(1,sleepDebt+SLEEP_DEBT_RATE*sleepMult()*sdt);
  if(sleepToastTimer>0)sleepToastTimer-=dt;

  // Scarica del neurone dopaminergico. Pacemaker tonico: impulsi singoli, tace mentre una raffica è in corso
  tonicAccum+=TONIC_HZ*sdt;
  while(tonicAccum>=1){tonicAccum-=1;if(!spikeQ.length)emitSpike(TONIC_VES,TONIC_COST);}
  // Raffiche fasiche: la frequenza segue lo stimolo; esercizio (boost dolce, ridotto dal debito di sonno) e sostanze
  // aggiungono raffiche indipendenti dallo stimolo
  const exerciseBoost=exerciseActive?15-sleepDebt*10:0;
  burstAccum+=(stimulus*BURST_PER_STIM+(exerciseBoost+substBoost())/BURST_MOLS)*sdt;
  while(burstAccum>=1){burstAccum-=1;queueBurst(BURST_VES,BURST_COST);}
  // Ricompense facili: raffiche a basso costo scatenate da "segnali" (12 vescicole per raffica)
  if(scrollActive){
    scrollAccum+=SCROLL_BURST_RATE*sdt;
    while(scrollAccum>=1){scrollAccum-=1;queueBurst(SCROLL_BURST_N/((BURST_MIN+BURST_MAX)/2),SCROLL_COST);}
  }
  // Emissione degli impulsi in coda: 20 Hz, 30 Hz se le raffiche si sovrappongono (coda lunga)
  spikeTimer-=sdt;
  while(spikeTimer<=0&&spikeQ.length){const q=spikeQ.shift();emitSpike(q.ves,q.cost);spikeTimer+=1/(spikeQ.length>8?30:BURST_HZ);}
  if(spikeTimer<0)spikeTimer=0;
  if(vesCount<MAX_VES){vesCount+=0.2*synthMult()*sdt;if(vesCount>MAX_VES)vesCount=MAX_VES;}

  // Assuefazione: i D2 si desensibilizzano finché la stimolazione dura (ricompense facili o sostanze attive),
  // poi tornano lentamente. Le sostanze usano secondi reali, così il costo di una dose non dipende dalla scala del tempo
  let desens=scrollActive?SCROLL_DESENS*sdt:0;
  for(const k in subst)if(subst[k].t>0)desens+=SUBST[k].des*dt;
  if(desens>0)d2Sens=Math.max(D2_SENS_MIN,d2Sens-desens);
  else if(d2Sens<1)d2Sens=Math.min(1,d2Sens+SCROLL_RECOVER*sdt);
  const eff=effectiveD2();if(eff!==effD2){effD2=eff;rebuildReceptors();}   // i recettori spariscono/ricompaiono con la tolleranza

  // Potenziali d'azione lungo l'assone: viaggiano in tempo simulato e, arrivati al terminale, fondono le loro vescicole
  const apEnd=TERM.xJ+PRE.w*.18;
  for(const a of apPulses){a.x+=PRE.w*AP_SPEED*sdt;if(a.x>=apEnd)fireSpike(a);}
  apPulses=apPulses.filter(a=>a.x<apEnd);
  // Luce del terminale (tempo reale, come le cellule riceventi ma più rapida: un impulso singolo è un lampo breve,
  // una raffica a 20 Hz tiene la membrana accesa)
  preFlash=Math.max(0,preFlash-dt*5);
  if(preHold>0)preHold-=dt;else preGlow-=preGlow*Math.min(1,dt/0.10);
  snapGlow=Math.max(0,snapGlow-dt*5);

  const cleftLeft=CLEFT.x+3,cleftRight=CLEFT.x+CLEFT.w;
  const receptorLine=cleftRight+10;
  const brownian=CLEFT.w*3,seekForce=CLEFT.w*8;

  for(const p of particles){
    p.hx=p.x;p.hy=p.y;   // posizione del frame precedente (per le scie)
    if(p.state==='free'){
      if(p.immune>0)p.immune-=sdt;
      p.vx+=(Math.random()-.5)*brownian*sdt;
      p.vy+=(Math.random()-.5)*brownian*sdt;
      if(p.x<cleftRight)p.vx+=CLEFT.w*1.0*sdt;
      if(p.immune<=0&&p.x>CLEFT.x+CLEFT.w*0.3){
        let bestR=null,bestD=Infinity;
        for(const r of receptors){if(r.occupied||r.cooldown>0)continue;const d=Math.hypot(r.x-p.x,r.y-p.y);if(d<bestD){bestD=d;bestR=r;}}
        if(bestR&&bestD<CLEFT.w*1.5&&bestD>BIND_DIST*1.5){
          const dx=bestR.x-p.x,dy=bestR.y-p.y,dist=Math.max(1,Math.hypot(dx,dy));
          const force=seekForce*sdt*0.5*(1/(1+dist*.02));
          p.vx+=dx/dist*force;p.vy+=dy/dist*force;
        }
      }
      const damp=Math.pow(0.12,sdt);p.vx*=damp;p.vy*=damp;
      p.x+=p.vx*sdt;p.y+=p.vy*sdt;
      // Zona di ricaptazione DAT1: più ampia e aggressiva in ADHD; le particelle appena rilasciate sono immuni
      const dat1Zone=cleftLeft+3+cfg.dat1Speed*4;
      if(p.x<dat1Zone&&p.age>0.15){
        const baseProb=0.7+cfg.dat1Speed*0.12;   // ADHD ≈0.94, Neurotipico ≈0.78
        const reuptakeProb=baseProb*(1-datBlock());   // metilfenidato e cocaina bloccano i DAT1
        if(Math.random()<reuptakeProb){
          p.state='reuptake';p.target=reuptakeTarget(p.y);rateReabCount++;
        }else{
          p.x=dat1Zone+5;
          p.vx=CLEFT.w*0.5+Math.random()*CLEFT.w*0.3;
          p.vy+=(Math.random()-.5)*CLEFT.w*0.5;
          p.immune=0.3;
        }
        continue;
      }
      if(p.x>receptorLine){p.x=receptorLine-2;p.vx=-Math.abs(p.vx)*0.3;}
      if(p.y<8){p.y=10;p.vy=Math.abs(p.vy)*0.1;}
      if(p.y>H-8){p.y=H-10;p.vy=-Math.abs(p.vy)*0.1;}
      p.age+=sdt;if(p.age>2.0){p.state='expire';p.timer=0;}   // scaduta: si disperde (non è una cattura della COMT)
    }
    if(p.state==='reuptake'&&p.target){
      const lr=1-Math.pow(.001,sdt);p.x+=(p.target.x-p.x)*lr;p.y+=(p.target.y-p.y)*lr;
      if(Math.hypot(p.x-p.target.x,p.y-p.target.y)<4){
        if(Math.random()<cfg.vmat2Ratio){p.state='recycle';p.target={x:VMAT_Z.x+8+Math.random()*(VMAT_Z.w-16),y:VMAT_Z.y+8+Math.random()*(VMAT_Z.h-16)};p.timer=0;}
        else{p.state='degrade';p.target={x:MAO_Z.x+8+Math.random()*(MAO_Z.w-16),y:MAO_Z.y+8+Math.random()*(MAO_Z.h-16)};p.timer=0;}
      }
    }
    if(p.state==='recycle'&&p.target){
      const lr=1-Math.pow(.002,sdt);p.x+=(p.target.x-p.x)*lr;p.y+=(p.target.y-p.y)*lr;
      if(Math.hypot(p.x-p.target.x,p.y-p.target.y)<5){p.state='dead';vesCount=Math.min(MAX_VES,vesCount+0.04);stats.recycled++;fx(p.x,p.y,C.vmat,2,11,.45);}
    }
    if(p.state==='degrade'&&p.target){
      const lr=1-Math.pow(.002,sdt);p.x+=(p.target.x-p.x)*lr;p.y+=(p.target.y-p.y)*lr;
      p.timer+=sdt;p.alpha=Math.max(0,1-p.timer*1.8);if(p.alpha<=0){p.state='dead';stats.maob++;rateDeadCount++;fx(p.x,p.y,C.dead,2,9,.35);}
    }
    if(p.state==='comt_destroy'){p.timer+=sdt;   // inghiottita dalla COMT: finisce nella bocca dell'enzima diventando rossa
      const lr=1-Math.pow(.0005,sdt);p.x+=(p.eater.x-p.x)*lr;p.y+=(p.eater.y-p.y)*lr;p.alpha=Math.max(0,1-p.timer*3.3);
      if(p.alpha<=0){p.state='dead';stats.comt++;rateDeadCount++;fx(p.x,p.y,C.dead,4,15,.4);}}
    if(p.state==='expire'){p.timer+=sdt;p.alpha=Math.max(0,1-p.timer*2);if(p.alpha<=0){p.state='dead';stats.lost++;rateDeadCount++;}}   // sfuma sul posto, verde
    if(p.state==='bound'){p.timer+=sdt;
      if(p.timer>0.08+Math.random()*.08){
        const r=receptors.find(r=>r.particle===p);
        if(r){r.occupied=false;r.particle=null;r.cooldown=0.12;}
        p.state='free';p.timer=0;p.vx=-CLEFT.w*4;p.vy=(Math.random()-.5)*CLEFT.w;p.immune=0.4;
      }
    }
  }
  particles=particles.filter(p=>p.state!=='dead');

  for(const r of receptors){if(r.cooldown>0){r.cooldown-=sdt;continue;}if(r.occupied)continue;
    for(const p of particles){if(p.state!=='free'||p.immune>0)continue;
      if(Math.hypot(p.x-r.x,p.y-r.y)<BIND_DIST){
        r.occupied=true;r.particle=p;p.state='bound';p.x=r.x;p.y=r.y;p.timer=0;
        postNeurons[r.ni].signal+=SIGNAL_PER_BIND;stats.binds++;
        if(pulses.length<60)pulses.push({x:r.x,y:r.y,ni:r.ni,age:0});
        break;
      }
    }
  }

  for(const n of postNeurons){
    // Il debito di sonno alza la soglia e accorcia l'emivita del segnale
    n.signal*=Math.pow(0.5,sdt/halfLifeNow());
    const was=n.active;
    n.active=n.signal>=thresholdNow();
    // Sopra la soglia il neurone è ricettivo (ciambella gialla); la luce azzurra della cellula è la scarica, che arriva
    // solo con un impulso dalla corteccia. Inviluppi in tempo reale (non cambiano con la scala), solo grafica
    if(n.active&&!was)n.flash=1;else n.flash=Math.max(0,n.flash-dt*2.5);   // lampo della ciambella al superamento della soglia
    // Ingresso dalla corteccia: gli impulsi viaggiano da destra; arrivati, fanno scaricare il neurone solo se è ricettivo
    n.ctxAccum+=(CTX_BASE_HZ+CTX_STIM_HZ*stimulus)*sdt;
    while(n.ctxAccum>=1){n.ctxAccum-=1;if(n.inPulses.length<12)n.inPulses.push({s:0});}
    for(const u of n.inPulses){u.s+=sdt/CTX_TRAVEL;
      if(u.s>=1){const g=postGeom(postNeurons.indexOf(n));
        if(n.active){n.glow=1;n.hold=0.06;n.fires++;stats.fires++;rateFireCount++;fx(g.x1-2,g.ncy,C.active,4,20,.45);}   // scarica: luce azzurra a impulso
        else{n.misses++;stats.misses++;rateMissCount++;fx(g.x1-2,g.ncy,'#7d8fa6',3,9,.3);}}}   // impulso perso: piccolo anello grigio
    n.inPulses=n.inPulses.filter(u=>u.s<1);
    // Luce della scarica: tenuta breve e dissolvenza, come il terminale
    if(n.hold>0)n.hold-=dt;else n.glow-=n.glow*Math.min(1,dt/0.15);
  }
  rateWindow+=dt;rateSim+=sdt;
  // Media mobile (fattore 0,3 ogni 0,5 s, costante di tempo ~1,5 s): con il rilascio a raffiche una finestra secca oscillava tra 2/s e 25/s
  if(rateWindow>=0.5){const T=Math.max(1e-6,rateSim),k=0.3;relEma+=(rateRelCount/T-relEma)*k;reabEma+=(rateReabCount/T-reabEma)*k;deadEma+=(rateDeadCount/T-deadEma)*k;
    displayRelRate=Math.round(relEma);displayReabRate=Math.round(reabEma);displayDeadRate=Math.round(deadEma);
    spikeEma+=(rateSpikeCount/T-spikeEma)*k;burstEma+=(rateBurstCount/T-burstEma)*k;displaySpikeRate=Math.round(spikeEma);displayBurstRate=Math.round(burstEma*10)/10;
    fireEma+=(rateFireCount/T-fireEma)*k;missEma+=(rateMissCount/T-missEma)*k;displayFireRate=Math.round(fireEma*10)/10;
    rateRelCount=0;rateReabCount=0;rateDeadCount=0;rateSpikeCount=0;rateBurstCount=0;rateFireCount=0;rateMissCount=0;rateWindow=0;rateSim=0;}

  // Tendenza del serbatoio: media lenta (~2 s), valore mostrato aggiornato una volta al secondo, stato con isteresi
  if(dt>0){const dv=(vesCount-lastVes)/dt;if(Math.abs(dv)<60)vesTrend+=(dv-vesTrend)*Math.min(1,dt*0.5);}
  lastVes=vesCount;
  let nAct=0;for(const n of postNeurons)if(n.active)nAct++;
  if(postNeurons.length)activeAvg+=(nAct/postNeurons.length-activeAvg)*Math.min(1,dt*0.25);
  trendTimer+=dt;
  if(trendTimer>=1){trendTimer=0;trendShown=vesTrend;trendState=classifyTrend();activeShown=Math.round(activeAvg*20)*5;}

  // Trasportatori DAT1: agganciano le particelle e le riportano dentro (il metilfenidato li rallenta e li fa fallire)
  for(const d of dat1s){
    if(d.state==='idle'){let best=null,bestD=Infinity;
      for(const p of particles){if(p.state!=='free'||p.immune>0)continue;const dist=Math.hypot(p.x-d.x,p.y-d.y);if(dist<bestD&&p.x>d.x-10&&dist<CLEFT.w*2){bestD=dist;best=p;}}
      if(best){d.target=best;d.state='reaching';d.timer=0;}
    }
    if(d.state==='reaching'){
      const spd=cfg.dat1Speed*datSpeedMult();
      d.timer+=sdt*spd;d.arm=Math.min(1,d.timer*2);
      if(d.target&&d.target.state!=='free'){d.state='idle';d.arm=0;d.target=null;continue;}
      if(d.arm>=1&&d.target){
        const blk=datBlock(),mphFail=blk>0&&Math.random()<blk;
        if(mphFail){d.state='idle';d.arm=0;d.target=null;}
        else{d.target.state='reuptake';d.target.target=reuptakeTarget(d.y);d.state='pulling';d.timer=0;rateReabCount++;}
      }
    }
    if(d.state==='pulling'){d.timer+=sdt*cfg.dat1Speed*datSpeedMult();d.arm=Math.max(0,1-d.timer*2.5);if(d.arm<=0){d.state='idle';d.target=null;d.timer=0;}}
  }

  // COMT: probabilità di distruzione indipendente dal frame rate (equivale a comtRate × scala a 60 fps)
  const pKill=1-Math.pow(1-cfg.comtRate,sdt*60);
  for(let ci=0;ci<comts.length;ci++){
    const c=comts[ci];
    for(let cj=0;cj<comts.length;cj++){
      if(ci===cj)continue;const o=comts[cj];
      const dx=c.x-o.x,dy=c.y-o.y,d=Math.max(1,Math.hypot(dx,dy));
      if(d<60){c.vx+=dx/d*0.4*(60-d)/60;c.vy+=dy/d*0.4*(60-d)/60;}
    }
    let nearest=null,nearDist=Infinity;
    for(const p of particles){if(p.state!=='free')continue;const d=Math.hypot(p.x-c.x,p.y-c.y);if(d<nearDist){nearDist=d;nearest=p;}}
    if(nearest&&nearDist<150){const dx=nearest.x-c.x,dy=nearest.y-c.y,dist=Math.max(1,Math.hypot(dx,dy));c.vx+=dx/dist*.25;c.vy+=dy/dist*.25;}   // insegue la molecola libera più vicina
    c.vx+=(Math.random()-.5)*.4;c.vy+=(Math.random()-.5)*.4;
    c.vx*=.90;c.vy*=.90;
    c.x+=c.vx*sdt*40;c.y+=c.vy*sdt*40;
    if(c.eat>0)c.eat-=dt;
    c.chomp+=dt*(c.eat>0?32:nearDist<45?18:5);   // mastica in fretta mentre inghiotte, un po' quando ha una preda vicina
    if(c.x<CLEFT.x+10){c.x=CLEFT.x+10;c.vx=Math.abs(c.vx);}
    if(c.x>CLEFT.x+CLEFT.w-10){c.x=CLEFT.x+CLEFT.w-10;c.vx=-Math.abs(c.vx);}
    if(c.y<14){c.y=14;c.vy=Math.abs(c.vy);}
    if(c.y>H-30){c.y=H-30;c.vy=-Math.abs(c.vy);}
    if(Math.random()<pKill){for(const p of particles){if(p.state!=='free')continue;if(Math.hypot(p.x-c.x,p.y-c.y)<18){p.state='comt_destroy';p.timer=0;p.eater=c;c.eat=0.45;c.eaten++;break;}}}
  }

  // Effetti visivi
  for(const f of pops)f.age+=dt;pops=pops.filter(f=>f.age<f.dur);
  for(const u of pulses)u.age+=dt;pulses=pulses.filter(u=>u.age<.45);
  for(const m of motes){m.x+=m.vx*dt;m.y+=m.vy*dt;
    if(m.x<CLEFT.x+4)m.vx=Math.abs(m.vx);if(m.x>CLEFT.x+CLEFT.w-4)m.vx=-Math.abs(m.vx);
    if(m.y<4)m.vy=Math.abs(m.vy);if(m.y>H-4)m.vy=-Math.abs(m.vy);}
}

// Stato della tendenza con isteresi: si entra in "down"/"up" oltre ±0,2 %/s e se ne esce solo sotto ±0,08 %/s
function classifyTrend(){
  const tr=vesTrend;
  if(vesCount>=MAX_VES-0.5&&tr>-0.05)return 'full';
  if(trendState==='down')return tr>-0.08?(tr>0.2?'up':'hold'):'down';
  if(trendState==='up')return tr<0.08?(tr<-0.2?'down':'hold'):'up';
  return tr<-0.2?'down':tr>0.2?'up':'hold';
}

// ───────────────────────── Comandi ─────────────────────────
function setMode(m){if(m===mode||!MODES[m])return;mode=m;effD2=null;rebuildReceptors();rebuildDat1();rebuildComts();}
function setStimulus(v){stimulus=Math.max(0,Math.min(1,v));}
function setSpeed(v){speedMul=Math.max(1,Math.min(8,v));}
// "Sonno": azzera debito, serbatoio e fessura. La tolleranza dei D2 recupera solo un po': serve tempo senza scrolling
function resetSim(){
  sleepDebt=0;vesCount=MAX_VES;lastVes=MAX_VES;vesTrend=0;trendShown=0;trendState='full';trendTimer=0;activeAvg=0;activeShown=0;
  particles=[];stats={recycled:0,maob:0,comt:0,lost:0,total:0,binds:0,fires:0,misses:0};fireEma=0;missEma=0;displayFireRate=0;tonicAccum=0;burstAccum=0;spikeQ=[];spikeTimer=0;vesAccum=0;preGlow=0;preFlash=0;preHold=0;snapGlow=0;relEma=0;reabEma=0;deadEma=0;spikeEma=0;burstEma=0;displayRelRate=0;displayReabRate=0;displayDeadRate=0;displaySpikeRate=0;displayBurstRate=0;sleepToastTimer=3;
  scrollActive=false;scrollAccum=0;mphRebound=0;caffEndTimer=0;
  caffeineTimer=0;caffeineActive=false;mphTimer=0;mphActive=false;exerciseTimer=0;exerciseActive=false;   // dormire chiude anche questi effetti
  for(const k in subst){subst[k].t=0;subst[k].after=0;}
  d2Sens=Math.min(1,d2Sens+SLEEP_TOL_RECOVER);effD2=null;
  rebuildAll();
}
// Ridosaggio: un clic mentre l'effetto è attivo lo riporta alla durata piena (un altro caffè, un'altra sigaretta)
function startCaffeine(){caffeineTimer=CAFF_DUR;caffeineActive=true;caffEndTimer=0;}
function startMph(){mphTimer=MPH_DUR;mphActive=true;mphRebound=0;}
function toggleScroll(){scrollActive=!scrollActive;if(scrollActive)scrollOnAt=now;}
// Una dose di sostanza: parte l'effetto; i D2 si consumano gradualmente mentre dura (vedi SUBST[k].des in update).
// Se l'effetto è già attivo, la dose lo riporta alla durata piena e annulla l'effetto successivo in attesa
function startSubst(k){const s=subst[k];if(!s)return;s.t=SUBST[k].dur;s.after=0;}
function setAge(a){age=Math.max(AGE_MIN,Math.min(AGE_MAX,Math.round(a)));effD2=null;}
function startExercise(){exerciseTimer=EXER_DUR;exerciseActive=true;}
function togglePause(){paused=!paused;}
