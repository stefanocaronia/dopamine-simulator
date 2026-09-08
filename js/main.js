'use strict';
/* main.js — avvio e loop. Ordine di caricamento: util → i18n/*.js → i18n → model → render → ui → main. */
let lastT=0;
function loop(ts){
  const dt=Math.min(.05,Math.max(0,(ts-lastT)/1000));lastT=ts;
  if(page!=='sim'){requestAnimationFrame(loop);return;}   // nelle pagine di testo la simulazione resta ferma
  if(!ready)resizeCanvas();
  if(ready){
    try{if(!paused)update(dt);updateHover();render();updateHUD();renderToasts();}
    catch(err){console.error(err);}   // un errore in un frame non deve uccidere l'animazione
  }
  requestAnimationFrame(loop);
}
detectLang();detectKid();applyI18n();initUI();resizeCanvas();
// Parametri di URL per demo e screenshot: ?stim=35 imposta lo stimolo (vince sulle impostazioni salvate),
// ?warm=8 fa girare il modello per 8 secondi simulati prima del primo frame, così la sinapsi non parte vuota
try{
  const q=new URLSearchParams(location.search),st=parseFloat(q.get('stim')),warm=parseFloat(q.get('warm'));
  if(!isNaN(st)){setStimulus(st/100);const el=$('stimulus');el.value=Math.round(stimulus*100);$('stim-val').textContent=el.value+'%';syncRange(el,+el.value,0,100);}
  if(warm>0&&ready)for(let i=0;i<Math.min(warm,60)*60;i++)update(1/60);
}catch(e){}
window.addEventListener('resize',resizeCanvas);
lastT=performance.now();requestAnimationFrame(loop);
