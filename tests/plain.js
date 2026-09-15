'use strict';
/* tests/plain.js — the simplified view must leave no acronym in any visible text, in any language.
   Loads the dictionaries and js/i18n.js on a stub DOM, switches simpleView on, runs T() over every key that can be
   shown in that view (hidden elements' tooltips, the biologists' page and the pieces marked adv are skipped) and looks
   for DAT1, COMT, VMAT2, MAO, D2, SNAP25, A2A in the result. Run alone (node tests/plain.js) or through tests/run.js. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const ACR=/(?<![A-Za-z0-9])(DAT1|COMT|VMAT2|MAO|D2|SNAP25|A2A)(?![A-Za-z0-9])/;
const HIDDEN=/^(bio\.|tip\.(comt|vmat2|maob|dead)\.|leg\.(comt|vmat2|maob)|w\.|simple\.|tip\.simple)/;
const stripAdv=s=>s.replace(/<p class="adv">[\s\S]*?<\/p>/g,'').replace(/<div class="adv">[\s\S]*?<\/div>/g,'').replace(/<adv>[\s\S]*?<\/adv>/g,'');
function check(root){
  const el=()=>({style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},querySelector:el,querySelectorAll(){return[];},innerHTML:'',textContent:''});
  const sb={console,document:{getElementById:el,querySelector:el,querySelectorAll(){return[];},documentElement:el(),body:el(),title:''},localStorage:{getItem(){return null;},setItem(){}},navigator:{language:'it'},location:{search:'',href:'http://x/'},history:{replaceState(){}},URL,URLSearchParams};
  sb.window=sb;vm.createContext(sb);
  for(const f of fs.readdirSync(path.join(root,'i18n')).filter(f=>f.endsWith('.js')))vm.runInContext(fs.readFileSync(path.join(root,'i18n',f),'utf8'),sb,{filename:f});
  vm.runInContext(fs.readFileSync(path.join(root,'js/util.js'),'utf8'),sb);
  vm.runInContext(fs.readFileSync(path.join(root,'js/i18n.js'),'utf8'),sb);
  const G=e=>vm.runInContext(e,sb);
  G('simpleView=true');
  const problems=[];let checked=0;
  for(const lang of Object.keys(G('I18N'))){
    G(`lang=${JSON.stringify(lang)}`);
    for(const w of ['d2','dat1','snap25','a2a','vmat2','mao','comt'])if(G(`lookKey('w.${w}')`)==null)problems.push(`${lang}: missing plain word w.${w}`);
    for(const k of Object.keys(G('I18N')[lang])){
      if(HIDDEN.test(k)||k.includes('@'))continue;
      const out=stripAdv(G(`T(${JSON.stringify(k)})`));checked++;
      const m=out.replace(/<[^>]+>/g,'').match(ACR);
      if(m)problems.push(`${lang}: "${m[1]}" still visible in ${k}`);
      if(/<i class="c-[a-z0-9]+"><\/i>/.test(out))problems.push(`${lang}: empty coloured span left in ${k}`);
      if(/[(（]\s*[)）]/.test(out))problems.push(`${lang}: empty parentheses left in ${k}`);
    }
  }
  return {problems,checked};
}
module.exports={check};
if(require.main===module){
  const r=check(path.join(__dirname,'..'));
  for(const p of r.problems)console.log('  '+p);
  console.log(r.problems.length?`${r.problems.length} problem(s)`:`simplified view: no acronym left in ${r.checked} visible texts`);
  process.exit(r.problems.length?1:0);
}
