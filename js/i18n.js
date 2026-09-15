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
// Modalità ragazzi: i testi possono avere una variante <chiave>@kid (niente sostanze, esempi adatti); la attiva ui.js
let kidMode=false;
// Vista semplificata: stesso modello, per chi non sa di chimica. Sullo schermo spariscono COMT, VMAT2, MAO e le scie;
// i pezzi avanzati dei testi (class="adv" o tag <adv>) vengono spenti via CSS da body.simple; e le sigle che restano
// diventano parole semplici (plainify), con le etichette che devono cambiare del tutto nella variante @simple
let simpleView=false;
// Sigle -> parole semplici. Regola generica guidata dalle chiavi w.* di ogni dizionario: se accanto alla sigla c'è già
// il nome comune (prima, o dopo nelle lingue CJK) la sigla si toglie e basta, altrimenti diventa la parola semplice
const ACRONYMS=['SNAP25','VMAT2','DAT1','COMT','MAO','A2A','CB1','DAT','D2'];   // THC e REM restano: sono parole di uso comune
// Particella coreana accordata alla sillaba che la precede: 이/을/은/과/으로 dopo una consonante finale, 가/를/는/와/로 senza
function koParticle(c,part){
  const code=c.charCodeAt(0);if(code<0xAC00||code>0xD7A3)return part;
  const jong=(code-0xAC00)%28;
  if(part==='으로'||part==='로')return jong&&jong!==8?'으로':'로';
  const pair={이:'가',가:'이',을:'를',를:'을',은:'는',는:'은',과:'와',와:'과'};
  return (['이','을','은','과'].includes(part)===(jong!==0))?part:pair[part];
}
function plainify(s){
  const cjk=lang==='zh'||lang==='ja'||lang==='ko';
  const glue=lang==='zh'||lang==='ja';   // lingue senza spazi tra le parole: quelli attorno a una sigla latina se ne vanno con lei
  const art=w=>w.replace(/^ال/,'').replace(/^\p{L}{1,4}['’]/u,'');   // via l'articolo arabo o quello eliso (l', dell') prima di confrontare
  const bare=w=>w.replace(/^[وفبكل]?(?:ال)?/,'');   // …e anche una proclitica araba (و ف ب ك ل): "وناقلات" -> "ناقلات\"
  for(const A of ACRONYMS){
    const word=lookKey('w.'+A.toLowerCase());if(word==null)continue;
    // radici con cui riconoscere il nome comune già scritto accanto: ogni parola del nome (>= 4 lettere) troncata a 5;
    // nelle lingue CJK la parola intera
    let stems=cjk?[word]:word.split(/[\s-]+/).map(art).filter(w=>w.length>=4).map(w=>w.slice(0,5).toLowerCase());
    if(!stems.length)stems=[art(word).slice(0,5).toLowerCase()];
    const has=w=>stems.some(st=>art(w).startsWith(st)||bare(w).startsWith(st));
    s=s.replace(new RegExp('(?<![A-Za-z0-9])'+A+'(?:-[AB])?(?![A-Za-z0-9])','g'),(m,off,str)=>{
      const rawBefore=str.slice(Math.max(0,off-40),off).replace(/<[^>]+>/g,' ').toLowerCase();   // i tag diventano spazi: "</p><p>Riciclo" non deve incollarsi alla parola prima
      const before=rawBefore.replace(/[\s(（,，:：;·–-]+$/,'');
      const after=str.slice(off+m.length,off+m.length+24).replace(/<[^>]+>/g,' ').replace(/^[\s)·–-]+/,'').toLowerCase();
      let named;
      const paren=/[(（·–]\s*$/.test(rawBefore);                       // sigla tra parentesi o dopo un punto mediano: nome poco prima
      if(cjk)named=stems.some(st=>after.slice(0,8).includes(st)||before.slice(-(paren?12:8)).includes(st));   // il nome può stare prima o dopo, con una particella in mezzo
      else{
        const prev=before.split(/[\s'’.,;:!?()（）]+/).filter(Boolean).slice(-2);   // le due parole prima: "zona attiva SNAP25", "recettori D2\"
        named=prev.some(has)||(paren&&before.slice(-25).split(/[\s'’(]+/).some(has))||after.split(/[\s-]+/).slice(0,2).some(has);   // …o nelle due parole dopo: "D2 receptors", "SNAP25 active zone\"
      }
      // Sigla da togliere in testa a una frase ("D2 receptors: 5"): la parola che segue prende la maiuscola
      const atStart=rawBefore.trim()===''||/[.!?。]\s*$/.test(rawBefore);
      // Marcatori: \u0000 sigla da togliere, \u0001 idem in testa alla frase, \u0003 e \u0004 attorno alla parola messa al
      // posto della sigla in cinese e giapponese, \u0002 dopo la sigla in coreano (la particella che segue va accordata)
      const out=named?(atStart?'\u0001':'\u0000'):(glue?'\u0003'+word+'\u0004':word);
      return lang==='ko'?out+'\u0002':out;
    });
  }
  if(lang==='ja')s=s.replace(/([\u0000\u0001])(<\/(?:b|i)>)?\s*の/g,'$1$2');   // "VMAT2 の再利用": con la sigla se ne va anche la particella
  // Pulizia: sigla incollata col trattino al nome che segue ("DAT1-Transporter", anche con il tag di chiusura in mezzo): via
  // il trattino ma resta lo spazio prima; maiuscola alla parola dopo una sigla tolta in testa alla frase; il punto mediano
  // prima del marcatore se ne va solo quando la sigla chiudeva il suo segmento ("Riciclo · VMAT2", non "· VMAT2 recycling");
  // poi il marcatore con lo spazio che lo precede; uno span rimasto vuoto sparisce, con lo spazio prima se non è
  // incollato a una parola; niente spazio subito dentro un tag
  s=s.replace(/[\u0000\u0001](<\/(?:b|i)>)?-(?=\S)/g,'$1').replace(/\u0001\s*((?:<[^>]+>\s*)*)(\p{Ll})/gu,(m,tags,c)=>tags+c.toUpperCase()).replace(/\u0001(\u0002?)\s*/g,'\u0000$1')
    .replace(/\s*·\s*\u0000(?=\s*(?:<|$|[·.,;:!?)]))/g,'').replace(glue?/\s*\u0000\s*/g:/\s*\u0000/g,(m,off,str)=>glue&&str[off-1]==='·'?' ':'');
  if(lang==='ko')s=s.replace(/(\S)\u0002(이|가|을|를|은|는|과|와|으로|로)(?![가-힣])/g,(m,c,part)=>c+koParticle(c,part)).replace(/\u0002/g,'');
  if(glue)s=s.replace(/(?<=[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}])\s*((?:<[^>]+>)*)\u0003/gu,'$1').replace(/\u0004((?:<[^>]+>)*)\s*(?=[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}])/gu,'$1').replace(/[\u0003\u0004]/g,'');
  return s.replace(/<(b|i)(?: class="[^"]*")?><\/\1>(?=\p{L})/gu,'').replace(glue?/\s*<(b|i)(?: class="[^"]*")?><\/\1>\s*/g:/\s*<(b|i)(?: class="[^"]*")?><\/\1>/g,'')
    .replace(/(<(?:b|i)(?: class="[^"]*")?>)\s+/g,'$1').replace(/(^|<(?:p|div|br)>)\s+/g,'$1').replace(/\s*[(（]\s*[)）]/g,'').replace(/ {2,}/g,' ').replace(lang==='fr'?/ ([,.)])/g:/ ([,.;:!?)])/g,'$1');   // il francese vuole lo spazio prima di : ; ! ?
}
function langMeta(code){return LANG_META.find(l=>l.code===code)||LANG_META[0];}

function lookKey(k){const d=I18N[lang]||{},en=I18N.en||{},it=I18N.it||{};return d[k]!=null?d[k]:en[k]!=null?en[k]:it[k]!=null?it[k]:null;}
function T(key,params){
  const look=lookKey;
  let s=simpleView?look(key+'@simple'):null;   // nella vista semplificata vince la variante @simple (etichette), se esiste
  if(s==null&&kidMode)s=look(key+'@kid');      // in modalità ragazzi vince la variante @kid, se esiste
  if(s==null)s=look(key);
  if(s==null)s=key;
  if(params)for(const k in params)s=s.split('{'+k+'}').join(params[k]);
  if(simpleView)s=plainify(s);
  return s;
}
// ?kid=1 nell'URL vince (link condivisibile), altrimenti l'ultima scelta salvata
function detectKid(){
  let q=null,saved=null;
  try{q=new URLSearchParams(location.search).get('kid');}catch(e){}
  try{saved=localStorage.getItem('dopa.kid');}catch(e){}
  kidMode=q!=null?(q==='1'||q==='true'):saved==='1';
}
function detectSimple(){
  let q=null,saved=null;
  try{q=new URLSearchParams(location.search).get('simple');}catch(e){}
  try{saved=localStorage.getItem('dopa.simple');}catch(e){}
  simpleView=q!=null?(q==='1'||q==='true'):saved==='1';
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
  document.body.classList.toggle('kid',kidMode);
  const kb=$('kid-btn');if(kb)kb.setAttribute('aria-pressed',String(kidMode));
  document.body.classList.toggle('simple',simpleView);
  const sb=$('simple-btn');if(sb)sb.setAttribute('aria-pressed',String(simpleView));
  if(typeof renderDocs==='function')renderDocs();   // pagine di testo (ui.js)
}
function setLang(l){
  if(!I18N[l])return;lang=l;
  try{localStorage.setItem('dopa.lang',l);}catch(e){}
  applyI18n();
}
