'use strict';
/* model.js — parametri, stato e logica della simulazione. Nessun accesso al DOM.
   Le variabili top-level sono condivise con gli altri script (scope globale degli script classici).
   Ogni modifica alla biologia va annotata in docs/fedelta-biologica.md. */

// ───────────────────────── Parametri del modello ─────────────────────────
// comtRate: nello striato la COMT pesa poco (è per lo più intracellulare); qui resta come metafora a peso ridotto
const MODES={
  adhd:  {d2Count:5, dat1Speed:2.0,dat1Count:5,comtRate:0.012,vmat2Ratio:0.55,snap25Eff:1.0},
  normal:{d2Count:12,dat1Speed:0.7,dat1Count:3,comtRate:0.005,vmat2Ratio:0.75,snap25Eff:1.0}
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
// Attività tonica: i neuroni dopaminergici scaricano sempre un po' (~4 Hz). Qui 3 rilasci/s di fondo a basso costo,
// indipendenti dallo stimolo: danno a caffeina e farmaco qualcosa su cui agire anche a stimolo basso
const TONIC_RATE=3,TONIC_COST=0.03;
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
const C={dopa:'#00ff88',dead:'#ff3355',dat:'#aa55ff',comt:'#ff8833',vmat:'#3388dd',d2:'#ffcc00',active:'#00e5ff',ap:'#ffe27a',snap:'#7aa8ff',cleft:'#8fa3bb',adhd:'#ff8833',caff:'#e07a2f',mph:'#ff5fa8',exer:'#3cb371',sleep:'#8e6fd1',scroll:'#9ecbff',tol:'#8a9bb5',age:'#e6c07b',stimLow:'#7fb8ff',stimHigh:'#ffb347',nic:'#d4b46a',can:'#9be36f',alc:'#c96f8f',coc:'#dfe9ff'};

// ───────────────────────── Stato ─────────────────────────
let mode='normal',stimulus=0.10,speedMul=2,paused=false;
let vesCount=MAX_VES,vesicles=[],particles=[],receptors=[],postNeurons=[],dat1s=[],comts=[];
let stats={recycled:0,maob:0,comt:0,total:0,binds:0};
let W=0,H=0,PRE={},CLEFT={},POST={},SNAP={},VMAT_Z={},MAO_Z={},TERM={};
let caffeineTimer=0,caffeineActive=false,caffEndTimer=0,mphTimer=0,mphActive=false,mphRebound=0,exerciseTimer=0,exerciseActive=false,sleepDebt=0,sleepToastTimer=0;
let scrollActive=false,scrollAccum=0,burstLeft=0,scrollOnAt=0,d2Sens=1,effD2=null;   // scrollOnAt: istante (now) dell'accensione; d2Sens: sensibilità/densità dei D2 (1 = normale)
let age=AGE_REF;
let subst={nic:{t:0,after:0},can:{t:0,after:0},alc:{t:0,after:0},coc:{t:0,after:0}};   // t: effetto attivo, after: effetto successivo (secondi reali)
let rateWindow=0,rateRelCount=0,rateReabCount=0,rateDeadCount=0,displayRelRate=0,displayReabRate=0,displayDeadRate=0;
let relAccum=0,tonicAccum=0,now=0;
// Tendenza del serbatoio: media lenta (vesTrend, %/s), valore mostrato campionato ogni secondo (trendShown)
// e stato con isteresi (trendState: full | down | up | hold) per evitare sfarfallii nei testi
let lastVes=MAX_VES,vesTrend=0,trendShown=0,trendState='full',trendTimer=0;
// Neuroni ricettivi: media lenta (~4 s) della quota di neuroni ricettivi (activeAvg, 0..1) e valore mostrato
// campionato ogni secondo come percentuale di tempo a passi del 5% (activeShown). Un conteggio arrotondato
// nascondeva le accensioni brevi (0,3 neuroni in media diventava "0/3")
let activeAvg=0,activeShown=0;
// Effetti visivi (non influenzano il modello)
let pops=[],pulses=[],apPulses=[],motes=[],apAccum=0;

// ───────────────────────── Geometria ─────────────────────────
function setGeometry(w,h){
  W=w;H=h;
  PRE={x:0,y:0,w:W*.30,h:H};
  CLEFT={x:PRE.w,y:0,w:W*.40,h:H};
  const dendGap=W*.05;
  POST={x:PRE.w+CLEFT.w+dendGap,y:0,w:W-PRE.w-CLEFT.w-dendGap-2,h:H};
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
  for(let i=0;i<nC;i++)postNeurons.push({x:POST.x,y:top+i*(nH+gap),w:POST.w,h:nH,signal:0,glow:0,active:false,flash:0,hold:0});   // glow/flash/hold: inviluppo luminoso e lampo (solo grafica)
  rebuildReceptors();rebuildDat1();
  comts=[];for(let i=0;i<3;i++)comts.push({x:CLEFT.x+30+Math.random()*(CLEFT.w-60),y:30+Math.random()*(H-60),vx:(Math.random()-.5)*.8,vy:(Math.random()-.5)*.8,chomp:Math.random()*6.28});
  pops=[];pulses=[];apPulses=[];
}

function rebuildReceptors(){
  const cfg=MODES[mode];receptors=[];
  const recX=CLEFT.x+CLEFT.w+4;
  postNeurons.forEach((n,ni)=>{const c=effectiveD2(),sp=n.h/(c+1),sc=Math.min(1,sp/12);   // sc: scala del glifo su schermi piccoli
    for(let j=0;j<c;j++)receptors.push({x:recX,y:n.y+sp*(j+1),ni,sc,occupied:false,particle:null,timer:0,cooldown:0});
  });
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
  const x0=CLEFT.x+CLEFT.w+2,x1=W-6,n=postNeurons[i],ncy=n.y+n.h/2,rx=x1-x0,ry=n.h/2-3;
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
function freeCount(){let n=0;for(const p of particles)if(p.state==='free')n++;return n;}

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

  // Rilascio: l'esercizio aggiunge un boost dolce (ridotto dal debito di sonno), la caffeina lo alza un po'
  const exerciseBoost=exerciseActive?15-sleepDebt*10:0;
  const rate=(stimulus*30+exerciseBoost+substBoost())*cfg.snap25Eff*releaseMult()*supply()*ageFactor();
  relAccum+=rate*sdt;
  while(relAccum>=1){
    relAccum-=1;
    if(vesCount>1){
      const cost=exerciseActive?0.02:0.05;
      vesCount=Math.max(0,vesCount-cost);
      spawn(CLEFT.x+2,15+Math.random()*(H-30));stats.total++;rateRelCount++;
    }
  }
  // Rilascio tonico di fondo (segue i moltiplicatori delle sostanze, non lo stimolo)
  tonicAccum+=TONIC_RATE*releaseMult()*supply()*ageFactor()*sdt;
  while(tonicAccum>=1){tonicAccum-=1;if(vesCount>1){vesCount=Math.max(0,vesCount-TONIC_COST);spawn(CLEFT.x+2,15+Math.random()*(H-30));stats.total++;rateRelCount++;}}
  if(vesCount<MAX_VES){vesCount+=0.2*synthMult()*sdt;if(vesCount>MAX_VES)vesCount=MAX_VES;}

  // Ricompense facili: raffiche a basso costo scatenate da "segnali"
  if(scrollActive){
    scrollAccum+=SCROLL_BURST_RATE*sdt;
    while(scrollAccum>=1){scrollAccum-=1;burstLeft+=Math.round(SCROLL_BURST_N*supply());for(let k=0;k<3;k++)if(apPulses.length<40)apPulses.push({x:-10-k*14,y:TERM.cy+(Math.random()-.5)*TERM.axonR*.6});}
  }
  // Assuefazione: i D2 si desensibilizzano finché la stimolazione dura (ricompense facili o sostanze attive),
  // poi tornano lentamente. Le sostanze usano secondi reali, così il costo di una dose non dipende dalla scala del tempo
  let desens=scrollActive?SCROLL_DESENS*sdt:0;
  for(const k in subst)if(subst[k].t>0)desens+=SUBST[k].des*dt;
  if(desens>0)d2Sens=Math.max(D2_SENS_MIN,d2Sens-desens);
  else if(d2Sens<1)d2Sens=Math.min(1,d2Sens+SCROLL_RECOVER*sdt);
  if(burstLeft>0){let n=Math.min(burstLeft,Math.ceil(2*speedMul));burstLeft-=n;
    while(n-->0&&vesCount>1){vesCount=Math.max(0,vesCount-SCROLL_COST);spawn(CLEFT.x+2,15+Math.random()*(H-30));stats.total++;rateRelCount++;}}
  const eff=effectiveD2();if(eff!==effD2){effD2=eff;rebuildReceptors();}   // i recettori spariscono/ricompaiono con la tolleranza

  // Potenziali d'azione lungo l'assone (solo visivi): la frequenza segue lo stimolo
  apAccum+=(1.2+stimulus*10+(exerciseActive?2:0))*dt;   // 1,2/s = attività tonica
  while(apAccum>=1){apAccum-=1;if(apPulses.length<40)apPulses.push({x:-10,y:TERM.cy+(Math.random()-.5)*TERM.axonR*.6});}
  const apEnd=TERM.xJ+PRE.w*.18;
  for(const a of apPulses)a.x+=PRE.w*0.9*dt;
  apPulses=apPulses.filter(a=>a.x<apEnd);

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
      p.age+=sdt;if(p.age>2.0){p.state='comt_destroy';p.timer=0;}
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
    if(p.state==='comt_destroy'){p.timer+=sdt;p.alpha=Math.max(0,1-p.timer*2.5);if(p.alpha<=0){p.state='dead';stats.comt++;rateDeadCount++;fx(p.x,p.y,C.dead,2,9,.35);}}
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
    // Luce della cellula come un impulso (tempi reali, non cambiano con la scala): attacco istantaneo al superamento
    // della soglia, tenuta ~0,15 s a piena luce, poi discesa a un livello di mantenimento finché resta ricettivo,
    // e dissolvenza in ~0,35 s quando si spegne. flash: lampo giallo dell'arco, solo grafica
    if(n.active&&!was){n.flash=1;n.glow=1;n.hold=0.15;}else n.flash=Math.max(0,n.flash-dt*2.5);
    if(n.hold>0)n.hold-=dt;
    else{const target=n.active?0.55:0,tau=n.active?0.30:0.35;n.glow+=(target-n.glow)*Math.min(1,dt/tau);}
  }
  rateWindow+=dt;
  if(rateWindow>=0.5){displayRelRate=Math.round(rateRelCount/rateWindow);displayReabRate=Math.round(rateReabCount/rateWindow);displayDeadRate=Math.round(rateDeadCount/rateWindow);rateRelCount=0;rateReabCount=0;rateDeadCount=0;rateWindow=0;}

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
    if(nearest&&nearDist<120){const dx=nearest.x-c.x,dy=nearest.y-c.y,dist=Math.max(1,Math.hypot(dx,dy));c.vx+=dx/dist*.15;c.vy+=dy/dist*.15;}
    c.vx+=(Math.random()-.5)*.4;c.vy+=(Math.random()-.5)*.4;
    c.vx*=.90;c.vy*=.90;
    c.x+=c.vx*sdt*40;c.y+=c.vy*sdt*40;
    c.chomp+=dt*(nearDist<45?18:5);
    if(c.x<CLEFT.x+10){c.x=CLEFT.x+10;c.vx=Math.abs(c.vx);}
    if(c.x>CLEFT.x+CLEFT.w-10){c.x=CLEFT.x+CLEFT.w-10;c.vx=-Math.abs(c.vx);}
    if(c.y<14){c.y=14;c.vy=Math.abs(c.vy);}
    if(c.y>H-30){c.y=H-30;c.vy=-Math.abs(c.vy);}
    if(Math.random()<pKill){for(const p of particles){if(p.state!=='free')continue;if(Math.hypot(p.x-c.x,p.y-c.y)<16){p.state='comt_destroy';p.timer=0;break;}}}
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
function setMode(m){if(m===mode||!MODES[m])return;mode=m;effD2=null;rebuildReceptors();rebuildDat1();}
function setStimulus(v){stimulus=Math.max(0,Math.min(1,v));}
function setSpeed(v){speedMul=Math.max(1,Math.min(8,v));}
// "Sonno": azzera debito, serbatoio e fessura. La tolleranza dei D2 recupera solo un po': serve tempo senza scrolling
function resetSim(){
  sleepDebt=0;vesCount=MAX_VES;lastVes=MAX_VES;vesTrend=0;trendShown=0;trendState='full';trendTimer=0;activeAvg=0;activeShown=0;
  particles=[];stats={recycled:0,maob:0,comt:0,total:0,binds:0};relAccum=0;tonicAccum=0;sleepToastTimer=3;
  scrollActive=false;scrollAccum=0;burstLeft=0;mphRebound=0;caffEndTimer=0;
  caffeineTimer=0;caffeineActive=false;mphTimer=0;mphActive=false;exerciseTimer=0;exerciseActive=false;   // dormire chiude anche questi effetti
  for(const k in subst){subst[k].t=0;subst[k].after=0;}
  d2Sens=Math.min(1,d2Sens+SLEEP_TOL_RECOVER);effD2=null;
  rebuildAll();
}
// Ridosaggio: un clic mentre l'effetto è attivo lo riporta alla durata piena (un altro caffè, un'altra sigaretta)
function startCaffeine(){caffeineTimer=CAFF_DUR;caffeineActive=true;caffEndTimer=0;}
function startMph(){mphTimer=MPH_DUR;mphActive=true;mphRebound=0;}
function toggleScroll(){scrollActive=!scrollActive;if(scrollActive)scrollOnAt=now;else burstLeft=0;}
// Una dose di sostanza: parte l'effetto; i D2 si consumano gradualmente mentre dura (vedi SUBST[k].des in update).
// Se l'effetto è già attivo, la dose lo riporta alla durata piena e annulla l'effetto successivo in attesa
function startSubst(k){const s=subst[k];if(!s)return;s.t=SUBST[k].dur;s.after=0;}
function setAge(a){age=Math.max(AGE_MIN,Math.min(AGE_MAX,Math.round(a)));effD2=null;}
function startExercise(){exerciseTimer=EXER_DUR;exerciseActive=true;}
function togglePause(){paused=!paused;}
