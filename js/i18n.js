'use strict';
/* i18n.js — T(key, params) e gestione della lingua.
   I dizionari stanno in i18n/<lingua>.js e si registrano su window.I18N.<lingua>.
   L'italiano è la lingua sorgente: se una chiave manca in una lingua, si usa l'italiano. */
const LANGS=['it','en'];
const LOCALE={it:'it-IT',en:'en-US'};
let lang='it';

function T(key,params){
  const d=I18N[lang]||{},src=I18N.it||{};
  let s=d[key]!=null?d[key]:(src[key]!=null?src[key]:key);
  if(params)for(const k in params)s=s.split('{'+k+'}').join(params[k]);
  return s;
}
function fmtN(x,d){return Number(x).toLocaleString(LOCALE[lang]||'en-US',{minimumFractionDigits:d,maximumFractionDigits:d});}
function fmt1(x){return fmtN(x,1);}

function detectLang(){
  let q=null,saved=null;
  try{q=new URLSearchParams(location.search).get('lang');}catch(e){}
  try{saved=localStorage.getItem('dopa.lang');}catch(e){}
  const nav=String(navigator.language||'it').slice(0,2).toLowerCase();
  lang=[q,saved,nav].find(l=>l&&I18N[l])||'it';
}
function applyI18n(){
  document.documentElement.lang=lang;
  document.title=T('doc.title');
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.innerHTML=T(el.dataset.i18n);});
  const pb=document.getElementById('btn-pause');if(pb)pb.title=T('pause.title');
  document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('is-on',b.dataset.lang===lang));
}
function setLang(l){
  if(!I18N[l])return;lang=l;
  try{localStorage.setItem('dopa.lang',l);}catch(e){}
  applyI18n();
}
