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
detectLang();applyI18n();initUI();resizeCanvas();
window.addEventListener('resize',resizeCanvas);
lastT=performance.now();requestAnimationFrame(loop);
