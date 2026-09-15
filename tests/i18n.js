'use strict';
/* tests/i18n.js — dictionary consistency. Every language must have the same keys as it.js (the source), with the
   same {placeholders}, the same HTML tags and the same class="…" values. Run alone (node tests/i18n.js) or through
   tests/run.js. Exit code 1 when something differs. */
const fs=require('fs'),path=require('path');
function load(root){
  global.window={};global.I18N=window.I18N={};
  for(const f of fs.readdirSync(path.join(root,'i18n')).filter(f=>f.endsWith('.js')))require(path.join(root,'i18n',f));
  return I18N;
}
const ph=s=>(String(s).match(/\{[a-zA-Z]+\}/g)||[]).sort().join(',');
const tags=s=>(String(s).match(/<\/?[a-z]+[^>]*>/g)||[]).map(t=>t.replace(/^<(\/?)([a-z]+).*/,'<$1$2>')).sort().join('');
const classes=s=>(String(s).match(/class="[^"]+"/g)||[]).sort().join(',');
function check(root){
  const I=load(root),it=I.it,problems=[];
  for(const l of Object.keys(I)){
    if(l==='it')continue;const d=I[l];
    for(const k of Object.keys(it))if(!(k in d))problems.push(`${l}: missing ${k}`);
    for(const k of Object.keys(d))if(!(k in it))problems.push(`${l}: extra ${k}`);
    for(const k of Object.keys(it)){
      if(!(k in d))continue;
      if(ph(it[k])!==ph(d[k]))problems.push(`${l}: placeholders differ in ${k}`);
      if(tags(it[k])!==tags(d[k]))problems.push(`${l}: tags differ in ${k}`);
      if(classes(it[k])!==classes(d[k]))problems.push(`${l}: classes differ in ${k}`);
    }
  }
  // advanced markers (hidden by the essential view): <adv>…</adv> must be balanced, and the source must carry some
  for(const l of Object.keys(I))for(const k of Object.keys(I[l])){const v=String(I[l][k]);const o=(v.match(/<adv>/g)||[]).length,c=(v.match(/<\/adv>/g)||[]).length;if(o!==c)problems.push(`${l}: unbalanced <adv> in ${k}`);}
  const advIt=Object.values(it).reduce((n,v)=>n+(String(v).match(/class="adv"|<adv>/g)||[]).length,0);
  if(advIt<15)problems.push(`it: only ${advIt} advanced markers, expected at least 15`);
  return {langs:Object.keys(I),keys:Object.keys(it).length,problems,advIt};
}
module.exports={check};
if(require.main===module){
  const r=check(path.join(__dirname,'..'));
  console.log(`i18n: ${r.langs.length} languages, ${r.keys} keys in it`);
  for(const p of r.problems)console.log('  '+p);
  console.log(r.problems.length?`${r.problems.length} problem(s)`:'all dictionaries consistent');
  process.exit(r.problems.length?1:0);
}
