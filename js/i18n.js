'use strict';
/* i18n.js — T(key, params) e gestione della lingua.
   I dizionari stanno in i18n/<lingua>.js e si registrano su window.I18N.<lingua>.
   L'italiano è la lingua sorgente; se una chiave manca si usa l'inglese, poi l'italiano.
   Per aggiungere una lingua: dizionario in i18n/, <script> in index.html, voce in LANG_META, simbolo #flag-xx nello sprite SVG. */
const LANG_META=[
  {code:'it',name:'Italiano',locale:'it-IT',dir:'ltr'},
  {code:'en',name:'English',locale:'en-GB',dir:'ltr'},
  {code:'es',name:'Español',locale:'es-ES',dir:'ltr'},
  {code:'fr',name:'Français',locale:'fr-FR',dir:'ltr'},
  {code:'de',name:'Deutsch',locale:'de-DE',dir:'ltr'},
  {code:'pt',name:'Português',locale:'pt-BR',dir:'ltr'},
  {code:'ru',name:'Русский',locale:'ru-RU',dir:'ltr'},
  {code:'zh',name:'中文',locale:'zh-CN',dir:'ltr'},
  {code:'ja',name:'日本語',locale:'ja-JP',dir:'ltr'},
  {code:'ko',name:'한국어',locale:'ko-KR',dir:'ltr'},
  {code:'ar',name:'العربية',locale:'ar-u-nu-latn',dir:'rtl'}
];
const LANGS=LANG_META.map(l=>l.code);
const LOCALE=Object.fromEntries(LANG_META.map(l=>[l.code,l.locale]));
let lang='it';
function langMeta(code){return LANG_META.find(l=>l.code===code)||LANG_META[0];}

function T(key,params){
  const d=I18N[lang]||{},en=I18N.en||{},it=I18N.it||{};
  let s=d[key]!=null?d[key]:en[key]!=null?en[key]:it[key]!=null?it[key]:key;
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
function buildLangMenu(){
  const ul=$('lang-menu');if(!ul)return;
  ul.innerHTML=LANG_META.map(l=>'<li role="option" data-lang="'+l.code+'" lang="'+l.code+'"><svg class="flag" aria-hidden="true"><use href="#flag-'+l.code+'"/></svg><span>'+l.name+'</span></li>').join('');
}
function applyI18n(){
  const m=langMeta(lang);
  document.documentElement.lang=lang;
  document.documentElement.dir=m.dir;
  document.title=T('doc.title');
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.innerHTML=T(el.dataset.i18n);});
  const pb=$('btn-pause');if(pb)pb.title=T('pause.title');
  const btn=$('lang-btn');
  if(btn){btn.querySelector('use').setAttribute('href','#flag-'+lang);btn.querySelector('.lang-code').textContent=lang.toUpperCase();btn.setAttribute('aria-label',m.name);}
  document.querySelectorAll('#lang-menu li').forEach(li=>{const on=li.dataset.lang===lang;li.classList.toggle('is-on',on);li.setAttribute('aria-selected',String(on));});
}
function setLang(l){
  if(!I18N[l])return;lang=l;
  try{localStorage.setItem('dopa.lang',l);}catch(e){}
  applyI18n();
}
