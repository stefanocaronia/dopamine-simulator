'use strict';
/* render.js — disegno su canvas. Legge lo stato di model.js, non lo modifica
   (eccetto il buffer delle scie, che è solo grafica). */

const canvas=$('c'),ctx=canvas.getContext('2d'),wrap=$('canvas-wrap');
const trail=document.createElement('canvas'),tctx=trail.getContext('2d');   // buffer a persistenza per le scie
let dpr=1,ready=false;

function resizeCanvas(){
  const r=wrap.getBoundingClientRect();
  if(r.width<50||r.height<50){ready=false;return;}   // layout non pronto: riprova al frame successivo
  dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  trail.width=canvas.width;trail.height=canvas.height;tctx.setTransform(dpr,0,0,dpr,0,0);
  spriteCache.clear();
  setGeometry(r.width,r.height);
  tctx.clearRect(0,0,W,H);
  ready=true;
}
function clearTrails(){tctx.clearRect(0,0,W,H);}

// ───────────────────────── Sprite cache (alone morbide senza shadowBlur per particella) ─────────────────────────
const spriteCache=new Map();
function sprite(color,coreR,glowR){
  const key=color+'|'+coreR+'|'+glowR;
  let s=spriteCache.get(key);if(s)return s;
  const size=Math.ceil(glowR*2+2),c=document.createElement('canvas');
  c.width=c.height=Math.ceil(size*dpr);
  const g=c.getContext('2d');g.scale(dpr,dpr);
  const cx=size/2,k=Math.min(.9,coreR/glowR);
  const grad=g.createRadialGradient(cx,cx,0,cx,cx,glowR);
  grad.addColorStop(0,color);grad.addColorStop(k,color);grad.addColorStop(Math.min(.95,k+.05),hexA(color,.45));grad.addColorStop(1,hexA(color,0));
  g.fillStyle=grad;g.beginPath();g.arc(cx,cx,glowR,0,Math.PI*2);g.fill();
  s={c,size};spriteCache.set(key,s);return s;
}
function blit(s,x,y,alpha){
  if(alpha!==undefined)ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
  ctx.drawImage(s.c,x-s.size/2,y-s.size/2,s.size,s.size);
  if(alpha!==undefined)ctx.globalAlpha=1;
}
function label(txt,x,y,font,color,glow,maxW){
  ctx.save();ctx.font=font+' "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  if(glow){ctx.shadowColor=glow;ctx.shadowBlur=8;}
  ctx.fillStyle=color;if(maxW)ctx.fillText(txt,x,y,maxW);else ctx.fillText(txt,x,y);ctx.restore();
}
function roundRect(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

// ───────────────────────── Frame ─────────────────────────
function render(){
  ctx.clearRect(0,0,W,H);
  const bg=ctx.createRadialGradient(W*.32,H*.5,0,W*.32,H*.5,W*.75);
  bg.addColorStop(0,'#0c1219');bg.addColorStop(1,'#05070e');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  drawCleft();drawTerminal();drawPostCells();drawDAT1();drawTrails();drawParticles();drawCOMT();drawFX();drawHover();drawLabels();
}

function drawCleft(){
  ctx.fillStyle='#070b12';ctx.fillRect(CLEFT.x,0,CLEFT.w,H);
  const g=ctx.createLinearGradient(CLEFT.x,0,CLEFT.x+CLEFT.w,0);
  g.addColorStop(0,'rgba(170,85,255,.07)');g.addColorStop(.22,'rgba(8,12,20,0)');g.addColorStop(.82,'rgba(8,12,20,0)');g.addColorStop(1,'rgba(255,204,0,.06)');
  ctx.fillStyle=g;ctx.fillRect(CLEFT.x,0,CLEFT.w,H);
  ctx.fillStyle='#8fb0d6';
  for(const m of motes){ctx.globalAlpha=m.a;ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,6.283);ctx.fill();}
  ctx.globalAlpha=1;
}

function terminalPath(t){
  const {cx,cy,rx,ry,thJ,axonR}=TERM;
  const wob=th=>Math.sin(th*4+t*.5)*ry*.02+Math.sin(th*7-t*.3)*ry*.012;
  const N=40;
  ctx.beginPath();
  for(let i=0;i<=N;i++){const th=-Math.PI/2+(Math.PI/2-thJ)*(i/N),w=wob(th);
    const x=cx-(rx+w)*Math.cos(th),y=cy+(ry+w)*Math.sin(th);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.lineTo(-20,cy-axonR);ctx.lineTo(-20,cy+axonR);
  ctx.lineTo(cx-rx*Math.cos(thJ),cy+axonR);
  for(let i=0;i<=N;i++){const th=thJ+(Math.PI/2-thJ)*(i/N),w=wob(th);
    ctx.lineTo(cx-(rx+w)*Math.cos(th),cy+(ry+w)*Math.sin(th));}
  ctx.closePath();
}

function drawTerminal(){
  const {cy,xJ}=TERM,t=now;
  terminalPath(t);
  const fg=ctx.createRadialGradient(PRE.w*.78,cy,10,PRE.w*.6,cy,PRE.w*.95);
  fg.addColorStop(0,'#13253d');fg.addColorStop(.6,'#0e1b2d');fg.addColorStop(1,'#0a1422');
  ctx.fillStyle=fg;ctx.fill();
  ctx.lineJoin='round';ctx.lineCap='round';
  ctx.strokeStyle='#2c5079';ctx.lineWidth=6;ctx.stroke();      // membrana (doppio strato)
  ctx.strokeStyle='#0c1a2a';ctx.lineWidth=2.4;ctx.stroke();
  // Assone: linea interna + potenziali d'azione
  ctx.strokeStyle='rgba(60,110,170,.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-10,cy);ctx.lineTo(xJ+10,cy);ctx.stroke();
  const sAP=sprite(C.ap,2.5,11);
  for(const a of apPulses){const fade=a.x>xJ?Math.max(0,1-(a.x-xJ)/(PRE.w*.18)):1;
    ctx.strokeStyle=`rgba(255,226,122,${.55*fade})`;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x-22,a.y);ctx.lineTo(a.x,a.y);ctx.stroke();
    blit(sAP,a.x,a.y,fade);}
  // Zona attiva (SNAP25) lungo la membrana
  ctx.fillStyle='rgba(70,110,200,.5)';ctx.fillRect(PRE.w-4,SNAP.y,4,SNAP.h);
  if(stimulus>.15){ctx.save();ctx.shadowColor=C.dopa;ctx.shadowBlur=10+stimulus*14;ctx.fillStyle=`rgba(0,255,136,${.15+stimulus*.35})`;ctx.fillRect(PRE.w-3,SNAP.y,2,SNAP.h);ctx.restore();}
  if(H>=300){ctx.save();ctx.translate(PRE.w-15,cy);ctx.rotate(-Math.PI/2);ctx.font='700 9.5px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(130,170,235,.85)';ctx.fillText(T('cv.snap'),0,0);ctx.restore();}
  // VMAT2 (riciclo nelle vescicole)
  const V=VMAT_Z;
  ctx.save();ctx.setLineDash([5,4]);ctx.lineDashOffset=-t*12;
  ctx.fillStyle='rgba(51,136,221,.10)';roundRect(V.x,V.y,V.w,V.h,12);ctx.fill();
  ctx.strokeStyle='rgba(51,136,221,.6)';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
  // MAO-B su un mitocondrio (distrugge)
  const M=MAO_Z,mr=M.h/2;
  ctx.fillStyle='rgba(255,51,85,.10)';roundRect(M.x,M.y,M.w,M.h,mr);ctx.fill();
  ctx.strokeStyle='rgba(255,51,85,.6)';ctx.lineWidth=1.5;ctx.stroke();
  ctx.save();roundRect(M.x+3,M.y+3,M.w-6,M.h-6,mr-3);ctx.clip();
  ctx.strokeStyle='rgba(255,51,85,.22)';ctx.lineWidth=1.2;
  for(let i=1;i<=4;i++){const x=M.x+M.w*i/5;ctx.beginPath();
    for(let j=0;j<=6;j++){const yy=M.y+M.h*j/6,xx=x+Math.sin(j*1.7+i+t*.6)*4;j===0?ctx.moveTo(xx,yy):ctx.lineTo(xx,yy);}
    ctx.stroke();}
  ctx.restore();
  // Esercizio: il terminale si tinge leggermente di verde (sintesi accelerata)
  if(exerciseActive){terminalPath(t);ctx.fillStyle='rgba(60,179,113,'+(0.06+0.04*Math.sin(t*3))+')';ctx.fill();}
  // Vescicole
  const N=vesicles.length,filled=Math.floor(vesCount/MAX_VES*N+1e-6);
  const sv=sprite(C.dopa,2.4,7);
  for(let i=0;i<N;i++){const v=vesicles[i],pulse=Math.sin(t*2+v.ph)*.5+.5;
    if(i<filled){blit(sv,v.x,v.y,.55+pulse*.45);
      ctx.beginPath();ctx.arc(v.x,v.y,3.6,0,6.283);ctx.strokeStyle='rgba(140,255,200,.35)';ctx.lineWidth=1;ctx.stroke();}
    else{ctx.beginPath();ctx.arc(v.x,v.y,2.4,0,6.283);ctx.strokeStyle='rgba(70,100,135,.35)';ctx.lineWidth=1;ctx.stroke();}
  }
  // Etichette delle zone: sopra le vescicole, così restano leggibili anche su schermi piccoli.
  // Con abbastanza spazio, icona grande (♻ / ✕) sopra il nome e il verbo sotto.
  const verb=s=>s.replace(/^\S+\s+/,'');
  if(V.h>=64){
    label('♻',V.x+V.w/2,V.y+V.h/2-16,'800 20px','#7ab8ff',C.vmat);
    label(T('cv.vmat2'),V.x+V.w/2,V.y+V.h/2+4,'800 11px','#7ab8ff',C.vmat,V.w+14);
    label(verb(T('cv.vmat2sub')),V.x+V.w/2,V.y+V.h/2+17,'600 9.5px','rgba(122,184,255,.8)',null,V.w+14);
    label('✕',M.x+M.w/2,M.y+M.h/2-16,'800 20px','#ff6b85',C.dead);
    label(T('cv.maob'),M.x+M.w/2,M.y+M.h/2+4,'800 11px','#ff6b85',C.dead,M.w+14);
    label(verb(T('cv.maobsub')),M.x+M.w/2,M.y+M.h/2+17,'600 9.5px','rgba(255,107,133,.85)',null,M.w+14);
  }else{
    label(T('cv.vmat2'),V.x+V.w/2,V.y+V.h/2-7,'800 11px','#7ab8ff',C.vmat,V.w+14);
    label(T('cv.vmat2sub'),V.x+V.w/2,V.y+V.h/2+8,'600 9.5px','rgba(122,184,255,.8)',null,V.w+14);
    label(T('cv.maob'),M.x+M.w/2,M.y+M.h/2-7,'800 11px','#ff6b85',C.dead,M.w+14);
    label(T('cv.maobsub'),M.x+M.w/2,M.y+M.h/2+8,'600 9.5px','rgba(255,107,133,.85)',null,M.w+14);
  }
}

function drawPostCells(){
  const t=now,thresh=thresholdNow();
  for(let i=0;i<postNeurons.length;i++){
    const {x0,x1,n,ncy,rx,ry,gx:cx,R}=postGeom(i);
    ctx.beginPath();
    const N=36;
    for(let k=0;k<=N;k++){const th=-Math.PI/2+Math.PI*k/N,w=Math.sin(th*4+t*.6+i)*ry*.03+Math.sin(th*7-t*.4+i*2)*ry*.015;
      const x=x0+(rx+w)*Math.cos(th),y=ncy+(ry+w)*Math.sin(th);k===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.closePath();
    if(n.glow>.01){ctx.save();ctx.shadowColor=C.active;ctx.shadowBlur=34*n.glow;ctx.fillStyle=`rgba(0,229,255,${.06*n.glow})`;ctx.fill();ctx.restore();}
    const g=ctx.createLinearGradient(x0,0,x1,0);
    if(n.active){g.addColorStop(0,'#0e2a3a');g.addColorStop(1,'#0a1c2a');}else{g.addColorStop(0,'#0d1727');g.addColorStop(1,'#0a111d');}
    ctx.fillStyle=g;ctx.fill();
    ctx.lineJoin='round';
    ctx.strokeStyle=n.active?`rgba(0,229,255,${.45+n.glow*.4})`:'#26415f';ctx.lineWidth=5;ctx.stroke();
    ctx.strokeStyle='#0b1522';ctx.lineWidth=2;ctx.stroke();
    // Indicatore a ciambella su scala fissa (0 … 2,5 × soglia base). L'arco sale con il segnale; la tacca è la soglia
    // attuale e si sposta con debito di sonno (sale), caffeina (scende) e postumi (sale). Quando l'arco raggiunge la
    // tacca il neurone diventa ricettivo: lampo giallo nell'istante del superamento, poi ciano finché resta sopra
    const lw=Math.max(7,Math.min(14,R*0.34)),half=lw/2,scale=ACT_THRESHOLD*2.5;
    const pct=Math.min(1,n.signal/scale),ta=-Math.PI/2+6.283*Math.min(0.98,thresh/scale);
    ctx.beginPath();ctx.arc(cx,ncy,R,0,6.283);ctx.strokeStyle='#15243a';ctx.lineWidth=lw;ctx.stroke();
    if(pct>0.003){
      const col=n.active?mixHex(C.active,'#ffe27a',n.flash):'#3d6a8a';
      ctx.save();if(n.active){ctx.shadowColor=col;ctx.shadowBlur=8+18*n.flash;}
      ctx.beginPath();ctx.arc(cx,ncy,R,-Math.PI/2,-Math.PI/2+6.283*pct);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke();ctx.restore();
    }
    // Tacca della soglia: attraversa tutta la ciambella, bordo scuro sotto e bianco con alone sopra
    const ca=Math.cos(ta),sa=Math.sin(ta),t0=R-half-3,t1=R+half+3;
    ctx.save();ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(cx+ca*t0,ncy+sa*t0);ctx.lineTo(cx+ca*t1,ncy+sa*t1);ctx.strokeStyle='rgba(5,9,16,.9)';ctx.lineWidth=5.5;ctx.stroke();
    ctx.shadowColor='rgba(255,255,255,.85)';ctx.shadowBlur=6;ctx.strokeStyle='#ffffff';ctx.lineWidth=2.5;ctx.stroke();
    ctx.restore();
    if(R>=22){
      const inner=2*(R-half)-4;
      if(n.active)label(T('cv.receptive'),cx,ncy,'800 9px',C.active,C.active,inner);else label(T('cv.silent'),cx,ncy,'600 9.5px','#4f6a8c',null,inner);
      ctx.save();ctx.font='700 9.5px "Segoe UI",system-ui,sans-serif';ctx.textBaseline='middle';ctx.textAlign=ca>0.25?'left':ca<-0.25?'right':'center';
      ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=4;ctx.fillStyle='rgba(255,255,255,.88)';
      ctx.fillText(T('cv.threshold'),cx+ca*(R+half+9),ncy+sa*(R+half+9)+(Math.abs(ca)<=0.25?(sa>0?7:-7):0));ctx.restore();
    }
  }
  // Recettori D2: tasche aperte verso la fessura, incastonate nella membrana.
  // Con la caffeina hanno un alone caldo (rispondono di più); con l'assuefazione sono semplicemente di meno.
  const sOcc=sprite(C.dopa,3,12),sCaff=caffeineActive?sprite(C.caff,2,11):null;
  for(const r of receptors){
    ctx.save();ctx.translate(r.x,r.y);if(r.sc<1)ctx.scale(r.sc,r.sc);
    const flash=r.occupied?1:(r.cooldown>0?r.cooldown*8:0);
    if(sCaff)blit(sCaff,2,0,.4);
    if(r.occupied)blit(sOcc,1,0,.9);
    ctx.beginPath();ctx.arc(2,0,5.5,-Math.PI/2,Math.PI/2);
    ctx.moveTo(2,-5.5);ctx.lineTo(-2.5,-5.5);ctx.moveTo(2,5.5);ctx.lineTo(-2.5,5.5);
    ctx.strokeStyle=r.occupied?C.dopa:flash>.1?`rgba(0,255,136,${Math.min(1,flash)})`:C.d2;
    ctx.lineWidth=r.occupied?2.5:1.8;ctx.stroke();
    if(r.occupied){ctx.beginPath();ctx.arc(1.5,0,2.6,0,6.283);ctx.fillStyle=C.dopa;ctx.fill();}
    ctx.restore();
  }
}

function drawDAT1(){
  const t=now,sActive=sprite(C.dat,4,14);
  // Trasportatori bloccati (metilfenidato o cocaina): spenti e con una sbarra del colore della sostanza
  const blk=datBlock(),blkColor=subst.coc.t>0?C.coc:C.mph,sBlk=blk>0?sprite(blkColor,3,13):null;
  for(const d of dat1s){ctx.save();
    const act=d.state!=='idle';
    if(sBlk)blit(sBlk,d.x,d.y,.35);
    if(act)blit(sActive,d.x,d.y,.7);
    roundRect(d.x-7,d.y-9,13,18,4);ctx.fillStyle=act?'#3a1d6e':'#241447';ctx.fill();
    ctx.strokeStyle=act?'#c98cff':C.dat;ctx.lineWidth=1.5;ctx.stroke();
    ctx.beginPath();ctx.moveTo(d.x-1,d.y-5);ctx.lineTo(d.x-1,d.y+5);ctx.strokeStyle=act?'#e9d5ff':'#7a4fc0';ctx.lineWidth=2;ctx.stroke();
    if(blk>0){ctx.beginPath();ctx.moveTo(d.x-9,d.y+10);ctx.lineTo(d.x+8,d.y-10);ctx.strokeStyle=blkColor;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.stroke();ctx.lineCap='butt';}
    if(d.arm>0&&d.target){const dx=d.target.x-d.x,dy=d.target.y-d.y,dist=Math.max(1,Math.hypot(dx,dy));
      const armLen=d.arm*Math.min(CLEFT.w+40,dist),tipX=d.x+dx/dist*armLen,tipY=d.y+dy/dist*armLen;
      ctx.setLineDash([5,4]);ctx.lineDashOffset=d.state==='pulling'?t*50:-t*50;
      ctx.beginPath();ctx.moveTo(d.x+6,d.y);ctx.lineTo(tipX,tipY);ctx.strokeStyle=`rgba(190,120,255,${.35+d.arm*.6})`;ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(tipX,tipY,4,0,6.283);ctx.strokeStyle='rgba(190,120,255,.9)';ctx.lineWidth=1.5;ctx.stroke();}
    ctx.restore();}
}

// Scie: buffer a persistenza che sbiadisce ogni frame; i salti lunghi (alte velocità) lasciano solo un punto,
// così non si formano linee di collegamento tra un frame e l'altro
function drawTrails(){
  if(!paused){
    tctx.globalCompositeOperation='destination-out';tctx.fillStyle='rgba(0,0,0,.2)';tctx.fillRect(0,0,W,H);
    tctx.globalCompositeOperation='source-over';
    tctx.lineWidth=2.4;tctx.lineCap='round';tctx.strokeStyle='rgba(0,255,136,.45)';tctx.fillStyle='rgba(0,255,136,.45)';
    for(const p of particles){
      if(p.state==='bound'||p.state==='degrade'||p.state==='comt_destroy')continue;
      const d=Math.hypot(p.x-p.hx,p.y-p.hy);
      if(d<.8)continue;
      if(d<26){tctx.beginPath();tctx.moveTo(p.hx,p.hy);tctx.lineTo(p.x,p.y);tctx.stroke();}
      else{tctx.beginPath();tctx.arc(p.x,p.y,1.5,0,6.283);tctx.fill();}
    }
  }
  ctx.drawImage(trail,0,0,W,H);
}

function drawParticles(){
  const sFree=sprite(C.dopa,3.2,9),sBound=sprite(C.dopa,4.6,15),sDead=sprite(C.dead,3.2,9);
  for(const p of particles){
    const dead=p.state==='degrade'||p.state==='comt_destroy';
    if(p.state==='bound')blit(sBound,p.x,p.y,.9+.1*Math.sin(now*20));
    else blit(dead?sDead:sFree,p.x,p.y,p.alpha);
  }
}

function drawCOMT(){
  const s=sprite(C.comt,1,13);
  for(const c of comts){blit(s,c.x,c.y,.45);ctx.save();ctx.translate(c.x,c.y);ctx.rotate(Math.atan2(c.vy,c.vx));
    const m=.12+.55*(.5+.5*Math.sin(c.chomp));
    ctx.beginPath();ctx.arc(0,0,7.5,m,6.283-m);ctx.lineTo(0,0);ctx.closePath();ctx.fillStyle=C.comt;ctx.fill();
    ctx.beginPath();ctx.arc(1.5,-3.2,1.5,0,6.283);ctx.fillStyle='#0a0a1a';ctx.fill();ctx.restore();}
}

function drawFX(){
  ctx.lineWidth=1.5;
  for(const f of pops){const k=f.age/f.dur,r=f.r0+(f.r1-f.r0)*k;ctx.beginPath();ctx.arc(f.x,f.y,r,0,6.283);ctx.strokeStyle=hexA(f.color,(1-k)*.8);ctx.stroke();}
  const sp=sprite(C.active,3,10);
  for(const u of pulses){const k=u.age/.45,{ncy,gx}=postGeom(u.ni);
    if(k<.6){const kk=k/.6;ctx.beginPath();ctx.arc(u.x,u.y,4+16*kk,0,6.283);ctx.strokeStyle=`rgba(0,255,136,${(1-kk)*.7})`;ctx.stroke();}
    const e=k*k*(3-2*k);blit(sp,u.x+(gx-u.x)*e,u.y+(ncy-u.y)*e,1-k*.6);}
}

// Evidenzia l'elemento sotto il mouse (anello o riquadro tratteggiato animato); `hover` e TIP_COLOR stanno in ui.js
function drawHover(){
  if(!hover)return;
  const c=TIP_COLOR[hover.key]||'#ffffff';
  ctx.save();ctx.setLineDash([4,3]);ctx.lineDashOffset=-performance.now()/40;ctx.lineWidth=1.5;ctx.strokeStyle=hexA(c,.85);
  if(hover.x!=null){ctx.beginPath();ctx.arc(hover.x,hover.y,(hover.r||10)+3,0,6.283);ctx.stroke();}
  else if(hover.rect){const R=hover.rect;roundRect(R.x-3,R.y-3,R.w+6,R.h+6,10);ctx.stroke();}
  ctx.restore();
}

function drawLabels(){
  ctx.textBaseline='alphabetic';
  ctx.font='700 11px "Segoe UI",system-ui,sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#6b85a3';ctx.fillText(T('cv.terminal'),PRE.w*.5,H-9,PRE.w-16);
  ctx.fillStyle='#55708f';ctx.fillText(T('cv.cleft'),CLEFT.x+CLEFT.w/2,H-9,CLEFT.w-16);
  ctx.fillStyle='#6b85a3';ctx.fillText(T('cv.post'),CLEFT.x+CLEFT.w+(W-CLEFT.x-CLEFT.w)/2,H-9,W-CLEFT.x-CLEFT.w-16);
  ctx.font='700 10px "Segoe UI",system-ui,sans-serif';
  ctx.textAlign='left';ctx.fillStyle='rgba(190,120,255,.85)';ctx.fillText('DAT1',PRE.w+12,16);
  ctx.textAlign='center';ctx.fillStyle='rgba(255,136,51,.85)';ctx.fillText('COMT',CLEFT.x+CLEFT.w/2,16);
  ctx.textAlign='right';ctx.fillStyle='rgba(255,204,0,.85)';ctx.fillText(T('cv.d2',{n:effectiveD2()}),CLEFT.x+CLEFT.w-8,16);
  ctx.textAlign='left';ctx.font='600 9.5px "Segoe UI",system-ui,sans-serif';ctx.fillStyle='rgba(130,170,235,.7)';ctx.fillText(T('cv.axon'),6,TERM.cy-TERM.axonR-6);
  drawRates();
}

// Tassi in tempo reale in fondo alla fessura: verde = rilascio, viola = ricaptura, rosso = distrutte
function drawRates(){
  const cx=CLEFT.x+CLEFT.w/2,y=H-27,wide=CLEFT.w>=300;
  const items=[['▸ '+displayRelRate+'/s',T('cv.rel'),'#4dffa6',C.dopa],['◂ '+displayReabRate+'/s',T('cv.reab'),'#c98cff',C.dat],['✕ '+displayDeadRate+'/s',T('cv.dead'),'#ff7a90',C.dead]];
  const fN='800 12.5px "Segoe UI",system-ui,sans-serif',fL='600 9px "Segoe UI",system-ui,sans-serif',gap=wide?16:12;
  ctx.save();ctx.textBaseline='alphabetic';ctx.textAlign='left';
  let total=gap*(items.length-1);
  const ws=items.map(([n,l])=>{ctx.font=fN;const a=ctx.measureText(n).width;ctx.font=fL;const b=wide?ctx.measureText(l).width:0;total+=a+b;return [a,b];});
  let x=cx-total/2;
  items.forEach(([n,l,col,glow],i)=>{
    ctx.font=fN;ctx.shadowColor=glow;ctx.shadowBlur=10;ctx.fillStyle=col;ctx.fillText(n,x,y);x+=ws[i][0];
    if(wide){ctx.shadowBlur=0;ctx.font=fL;ctx.fillStyle=hexA(col,.7);ctx.fillText(l,x,y);x+=ws[i][1];}
    x+=gap;
  });
  ctx.restore();
}
