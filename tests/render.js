'use strict';
/* tests/render.js — smoke test of the drawing code without a browser.
   The model tests cannot see a ReferenceError inside render.js: the page's loop catches it and the canvas just
   freezes. Here util, the Italian dictionary, i18n, model, render and ui are loaded in a vm sandbox with a stub DOM
   and a permissive 2D context (every method exists and returns something usable), then render() is called in both
   views, with every hover key, at a large and a tiny canvas. Anything thrown is a failure.
   Run alone (node tests/render.js) or through tests/run.js. */
const fs=require('fs'),path=require('path'),vm=require('vm');
function ctxStub(){
  const gradient={addColorStop(){}};
  return new Proxy({},{get(t,k){
    if(k==='measureText')return()=>({width:40});
    if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;
    if(k==='getImageData')return()=>({data:new Uint8ClampedArray(4)});
    if(typeof k==='symbol')return undefined;
    return()=>{};   // every other method is a no-op
  },set(){return true;}});
}
function elStub(){
  const el={style:{},dataset:{},children:[],classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    getBoundingClientRect(){return {left:0,top:0,width:1000,height:520};},getContext(){return ctxStub();},
    addEventListener(){},removeEventListener(){},setAttribute(){},getAttribute(){return null;},querySelector(){return elStub();},querySelectorAll(){return [];},
    appendChild(){},remove(){},insertBefore(){},focus(){},blur(){},textContent:'',innerHTML:'',hidden:false,width:0,height:0,value:'0',title:''};
  return el;
}
function check(root){
  const problems=[];
  const document={createElement(){return elStub();},getElementById(){return elStub();},querySelector(){return elStub();},querySelectorAll(){return [];},
    documentElement:elStub(),body:elStub(),title:'',addEventListener(){},activeElement:null};
  const sandbox={console,performance,Math,document,localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    navigator:{language:'it'},location:{search:'',hash:'',href:'http://x/',pathname:'/'},history:{replaceState(){},pushState(){}},
    requestAnimationFrame(){},setTimeout(){return 0;},clearTimeout(){},URL,URLSearchParams,Event:function(){},KeyboardEvent:function(){}};
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  const files=['js/util.js','i18n/it.js','js/i18n.js','js/model.js','js/render.js','js/ui.js'];
  try{for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f});}
  catch(e){problems.push('load: '+e.message);return {problems};}
  const G=e=>vm.runInContext(e,sandbox);
  try{G('detectLang();lang="it";');}catch(e){problems.push('i18n: '+e.message);}
  const scenes=[
    {name:'full view, large canvas',w:1000,h:520,simple:false},
    {name:'essential view, large canvas',w:1000,h:520,simple:true},
    {name:'full view, tiny canvas (no labels)',w:360,h:220,simple:false},
    {name:'essential view, tiny canvas',w:360,h:220,simple:true},
  ];
  for(const sc of scenes){
    try{
      G(`simpleView=${sc.simple};setGeometry(${sc.w},${sc.h});W=${sc.w};H=${sc.h};ready=true;resetSim();setSpeed(1);setMode('adhd');setStimulus(0.6);`);
      G("startCaffeine();startMph();startExercise();toggleScroll();for(const k of ['nic','can','alc','coc'])startSubst(k);sleepDebt=0.7;");
      G('for(let i=0;i<180;i++)update(1/60);');
      G('render();');
      // every hover target, including the ones with a particle attached
      const keys=G('Object.keys(TIPS)');
      for(const k of keys){G(`hover={key:'${k}',x:100,y:100,r:10,rect:{x:0,y:0,w:10,h:10},ni:0,p:particles[0]||null};render();`);}
      G('hover=null;');
      // toasts and tooltips build without throwing in this state
      G('buildToasts();for(const k of Object.keys(TIPS))TIPS[k]({ni:0,p:particles[0]||null,x:0,y:0});');
    }catch(e){problems.push(sc.name+': '+e.message);}
  }
  return {problems,scenes:scenes.length};
}
module.exports={check};
if(require.main===module){
  const r=check(path.join(__dirname,'..'));
  for(const p of r.problems)console.log('  '+p);
  console.log(r.problems.length?`${r.problems.length} problem(s)`:`render smoke test: ${r.scenes} scenes drawn without errors`);
  process.exit(r.problems.length?1:0);
}
