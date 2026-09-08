'use strict';
/* figures.js — infografiche SVG per la pagina "Come funziona". Le etichette passano da T() (chiavi fig.*),
   i colori da C (model.js). Nei testi delle pagine il segnaposto {fig:nome} viene sostituito da FIG[nome](). */

const FIG={};
const _esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const _svg=(w,h,body,cls)=>'<svg class="figsvg'+(cls?' '+cls:'')+'" viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" style="max-width:'+w+'px">'+body+'</svg>';
const _txt=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'" fill="'+(o.c||'#c3cfdd')+'" font-size="'+(o.s||12)+'" font-weight="'+(o.w||600)+'" text-anchor="'+(o.a||'middle')+'"'+(o.dir?' direction="'+o.dir+'"':'')+'>'+_esc(s)+'</text>';};
const _badge=(x,y,n,c)=>'<circle cx="'+x+'" cy="'+y+'" r="9" fill="'+c+'"/><text x="'+x+'" y="'+(y+4)+'" fill="#06101a" font-size="11" font-weight="800" text-anchor="middle">'+n+'</text>';
const _d2=(x,y,c,sc)=>'<path d="M'+x+' '+(y-5.5)+'h-2.5M'+x+' '+(y-5.5)+'a5.5 5.5 0 0 1 0 11h-2.5" fill="none" stroke="'+(c||C.d2)+'" stroke-width="1.8" transform="scale('+(sc||1)+')"/>';
const _dat=(x,y,c)=>'<rect x="'+(x-6)+'" y="'+(y-9)+'" width="12" height="18" rx="4" fill="#241447" stroke="'+(c||C.dat)+'" stroke-width="1.5"/><path d="M'+(x-1)+' '+(y-5)+'v10" stroke="#7a4fc0" stroke-width="2"/>';
const _dot=(x,y,c,r)=>'<circle cx="'+x+'" cy="'+y+'" r="'+(r||3.2)+'" fill="'+(c||C.dopa)+'"/><circle cx="'+x+'" cy="'+y+'" r="'+((r||3.2)*2.4)+'" fill="'+(c||C.dopa)+'" opacity=".16"/>';

// Dove nasce la dopamina e dove agisce
FIG.brain=function(){
  const box=(x,y,w,h,c,t1,t2)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="12" fill="rgba(12,18,29,.9)" stroke="'+c+'" stroke-width="1.5"/>'+_txt(x+w/2,y+24,t1,{c:c,s:13,w:800})+_txt(x+w/2,y+44,t2,{s:11,w:500,c:'#9fb0c4'});
  let b='';
  b+=box(10,40,200,64,C.dopa,T('fig.brain.mid'),T('fig.brain.mid2'));
  b+=box(360,8,230,64,C.d2,T('fig.brain.str'),T('fig.brain.str2'));
  b+=box(360,86,230,64,C.active,T('fig.brain.pfc'),T('fig.brain.pfc2'));
  b+='<defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="'+C.dopa+'"/></marker></defs>';
  b+='<path d="M212 66C290 66 290 40 356 40" fill="none" stroke="'+C.dopa+'" stroke-width="2.5" marker-end="url(#fa)"/>';
  b+='<path d="M212 78C290 78 290 118 356 118" fill="none" stroke="'+C.dopa+'" stroke-width="2.5" marker-end="url(#fa)"/>';
  for(let i=0;i<7;i++)b+=_dot(228+i*17,66-i*2.2,C.dopa,2.4)+_dot(228+i*17,78+i*3.6,C.dopa,2.4);
  return _svg(600,158,b);
};

// Il viaggio di una molecola: cinque tappe
FIG.journey=function(){
  let b='';
  b+='<rect x="12" y="26" width="248" height="176" rx="26" fill="#0e1b2d" stroke="#2c5079" stroke-width="4"/>';
  b+='<rect x="440" y="26" width="290" height="176" rx="26" fill="#0d1727" stroke="#26415f" stroke-width="4"/>';
  b+='<rect x="256" y="40" width="5" height="148" fill="rgba(70,110,200,.7)"/>';
  b+=_txt(136,48,T('fig.pre'),{c:'#6b85a3',s:10.5,w:700})+_txt(585,48,T('fig.post'),{c:'#6b85a3',s:10.5,w:700})+_txt(350,196,T('cv.cleft'),{c:'#55708f',s:10,w:700});
  // vescicole e sintesi
  const ves=[[176,86],[196,74],[216,90],[186,110],[210,116],[232,104],[196,138],[222,140],[238,124]];
  for(const [x,y] of ves)b+=_dot(x,y,C.dopa,3);
  b+='<rect x="34" y="70" width="98" height="34" rx="10" fill="rgba(51,136,221,.12)" stroke="'+C.vmat+'" stroke-width="1.5" stroke-dasharray="5 4"/>'+_txt(83,92,'♻ VMAT2',{c:'#7ab8ff',s:11,w:800});
  b+='<rect x="34" y="120" width="98" height="34" rx="17" fill="rgba(255,51,85,.12)" stroke="'+C.dead+'" stroke-width="1.5"/>'+_txt(83,142,'✕ MAO',{c:'#ff6b85',s:11,w:800});
  b+='<path d="M136 87L166 87" stroke="'+C.vmat+'" stroke-width="2" marker-end="url(#fb)"/>';
  b+='<defs><marker id="fb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#7ab8ff"/></marker><marker id="fg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="'+C.dopa+'"/></marker><marker id="fp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c98cff"/></marker></defs>';
  // rilascio e diffusione
  b+='<circle cx="258" cy="84" r="9" fill="none" stroke="'+C.dopa+'" stroke-width="1.5" opacity=".7"/>';
  b+='<path d="M268 84C310 70 360 96 424 92" fill="none" stroke="'+C.dopa+'" stroke-width="2" stroke-dasharray="3 5" marker-end="url(#fg)"/>';
  for(const [x,y] of [[300,78],[330,92],[360,80],[392,94],[372,112],[318,118]])b+=_dot(x,y,C.dopa,3);
  // recettori
  for(const y of [70,96,122,148])b+='<g transform="translate(444 '+y+')">'+_d2(0,0)+'</g>';
  b+=_dot(440,96,C.dopa,3.4);
  // anello del segnale
  b+='<circle cx="600" cy="114" r="34" fill="none" stroke="#15243a" stroke-width="6"/><path d="M600 80A34 34 0 0 1 634 114" fill="none" stroke="'+C.active+'" stroke-width="6" stroke-linecap="round"/>'+_txt(600,118,T('cv.silent'),{c:'#4f6a8c',s:9.5});
  // ricaptazione
  b+=_dat(262,150,C.dat);
  b+='<path d="M330 150L276 150" fill="none" stroke="#c98cff" stroke-width="2" marker-end="url(#fp)"/>'+_dot(340,150,C.dopa,3);
  b+='<path d="M250 150C200 150 160 130 138 106" fill="none" stroke="#c98cff" stroke-width="1.5" stroke-dasharray="3 4"/>';
  // badge numerati con etichette
  const L=[[196,60,1,C.dopa],[262,62,2,C.dopa],[470,58,3,C.d2],[300,164,4,'#c98cff'],[100,178,5,'#7ab8ff']];
  for(const [x,y,n,c] of L)b+=_badge(x,y,n,c);
  b+=_txt(196,236,'1 · '+T('fig.j1'),{s:11,a:'middle'})+_txt(196,252,'5 · '+T('fig.j5'),{s:11})+_txt(560,236,'2 · '+T('fig.j2'),{s:11})+_txt(560,252,'3 · '+T('fig.j3'),{s:11})+_txt(380,268,'4 · '+T('fig.j4'),{s:11});
  return _svg(744,280,b);
};

// La soglia: silente, recettivo (pronto a rispondere), e la soglia che si sposta
FIG.threshold=function(){
  const ring=(x,pct,thr,act,label,sub)=>{
    const R=40,a0=-Math.PI/2,a1=a0+Math.PI*2*pct,ta=a0+Math.PI*2*thr;
    const arc='M'+(x+R*Math.cos(a0))+' '+(86+R*Math.sin(a0))+'A'+R+' '+R+' 0 '+(pct>.5?1:0)+' 1 '+(x+R*Math.cos(a1))+' '+(86+R*Math.sin(a1));
    let s='<circle cx="'+x+'" cy="86" r="'+R+'" fill="none" stroke="#15243a" stroke-width="7"/>';
    if(pct>0)s+='<path d="'+arc+'" fill="none" stroke="'+(act?C.active:'#3d6a8a')+'" stroke-width="7" stroke-linecap="round"/>';
    s+='<path d="M'+(x+(R-9)*Math.cos(ta))+' '+(86+(R-9)*Math.sin(ta))+'L'+(x+(R+9)*Math.cos(ta))+' '+(86+(R+9)*Math.sin(ta))+'" stroke="rgba(255,255,255,.7)" stroke-width="2.5"/>';
    s+=_txt(x,90,act?T('cv.receptive'):T('cv.silent'),{c:act?C.active:'#4f6a8c',s:act?10:10.5,w:act?800:600});
    s+=_txt(x,148,label,{s:12,w:800,c:'#eef4fb'})+_txt(x,164,sub,{s:10.5,w:500,c:'#9fb0c4'});
    return s;
  };
  let b=ring(90,.22,.4,false,T('fig.th.a'),T('fig.th.a2'))+ring(290,.55,.4,true,T('fig.th.b'),T('fig.th.b2'))+ring(490,.55,.7,false,T('fig.th.c'),T('fig.th.c2'));
  b+='<path d="M158 86L222 86" stroke="#55708f" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M358 86L422 86" stroke="#55708f" stroke-width="1.5" stroke-dasharray="4 4"/>';
  b+=_txt(290,22,T('fig.th.tick'),{s:11,c:'#c3cfdd',w:600});
  return _svg(580,176,b);
};

// ADHD vs neurotipico: recettori, trasportatori, segnale
FIG.adhd=function(){
  const row=(y,name,c,nd2,ndat,sig)=>{
    let s=_txt(6,y+5,name,{c:c,s:12.5,w:800,a:'start'});
    for(let i=0;i<nd2;i++)s+='<g transform="translate('+(150+i*15)+' '+y+')">'+_d2(0,0)+'</g>';
    for(let i=0;i<ndat;i++)s+='<g transform="translate('+(372+i*18)+' '+y+')">'+_dat(0,0)+'</g>';
    s+='<rect x="480" y="'+(y-7)+'" width="120" height="14" rx="7" fill="#15243a"/><rect x="480" y="'+(y-7)+'" width="'+(120*sig)+'" height="14" rx="7" fill="'+C.active+'" opacity=".85"/>';
    return s;
  };
  let b=_txt(150,18,T('fig.adhd.d2'),{s:10.5,c:'#8697ad',a:'start'})+_txt(366,18,T('fig.adhd.dat'),{s:10.5,c:'#8697ad',a:'start'})+_txt(480,18,T('fig.adhd.signal'),{s:10.5,c:'#8697ad',a:'start'});
  b+=row(56,T('mode.normal'),C.active,12,3,.9)+row(112,T('mode.adhd'),C.adhd,5,5,.3);
  b+=_txt(300,158,T('fig.adhd.note'),{s:10.5,c:'#9fb0c4',w:500});
  return _svg(610,170,b);
};

// Debito di sonno: quota percepita e quota mascherata dalla caffeina
FIG.sleep=function(){
  let b='<defs><pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="rgba(142,111,209,.16)"/><rect width="5" height="10" fill="rgba(240,160,96,.5)"/></pattern></defs>';
  b+=_txt(10,22,T('fig.sleep.title'),{s:12,w:800,c:'#eef4fb',a:'start'});
  b+='<rect x="10" y="34" width="560" height="30" rx="10" fill="#121b2a" stroke="#2a3d57"/>';
  b+='<rect x="10" y="34" width="220" height="30" rx="10" fill="rgba(142,111,209,.55)"/>';
  b+='<rect x="230" y="34" width="200" height="30" fill="url(#hatch)"/>';
  b+='<path d="M120 76L120 70" stroke="#b39cf0" stroke-width="1.5"/>'+_txt(120,92,T('fig.sleep.real'),{s:11,c:'#b39cf0'});
  b+='<path d="M330 76L330 70" stroke="#f0a060" stroke-width="1.5"/>'+_txt(330,92,T('fig.sleep.masked'),{s:11,c:'#f0a060'});
  b+=_txt(500,92,T('fig.sleep.sleep'),{s:11,c:'#8697ad'});
  return _svg(580,104,b);
};

// Assuefazione: i recettori calano con le ricompense facili e tornano lentamente
FIG.tolerance=function(){
  const x0=48,x1=580,y0=24,y1=140;
  let b='<path d="M'+x0+' '+y0+'V'+y1+'H'+x1+'" fill="none" stroke="#2a3d57" stroke-width="1.5"/>';
  b+='<rect x="160" y="'+y0+'" width="150" height="'+(y1-y0)+'" fill="rgba(158,203,255,.10)"/>'+_txt(235,y0+16,T('fig.tol.on'),{s:11,c:C.scroll,w:700});
  b+='<path d="M'+x0+' 44H160C200 44 230 100 310 106C370 110 470 60 '+x1+' 46" fill="none" stroke="'+C.d2+'" stroke-width="3"/>';
  b+='<path d="M'+x0+' 44H'+x1+'" stroke="rgba(255,204,0,.35)" stroke-width="1" stroke-dasharray="4 4"/>';
  b+=_txt(x0-6,48,'12',{s:11,c:C.d2,a:'end'})+_txt(x0-6,110,'4',{s:11,c:C.d2,a:'end'});
  b+='<text x="14" y="'+((y0+y1)/2)+'" fill="'+C.d2+'" font-size="11" font-weight="700" text-anchor="middle" transform="rotate(-90 14 '+((y0+y1)/2)+')">'+_esc(T('fig.tol.y'))+'</text>';
  b+=_txt(445,132,T('fig.tol.off'),{s:11,c:'#aab8cc',w:700})+_txt(445,158,T('fig.tol.weeks'),{s:10.5,c:'#8697ad',w:500});
  b+=_txt(100,158,T('fig.tol.x'),{s:10.5,c:'#8697ad',w:500});
  return _svg(600,170,b);
};

// Sostituisce i segnaposto {fig:nome} con le infografiche
function withFigures(html){return html.replace(/\{fig:([a-z]+)\}/g,(m,k)=>FIG[k]?'<figure class="fig">'+FIG[k]()+'</figure>':'');}
