#!/usr/bin/env node
'use strict';
/* tests/run.js — integration tests of the model, no browser needed.
   Loads js/util.js and js/model.js in a vm sandbox (seeded Math.random, so runs are reproducible), drives the
   simulation with update(1/60) exactly like the page does, and checks every brain, stimulus level, intervention,
   substance and after-effect against expected ranges. Also runs the dictionary check (tests/i18n.js).
   Usage: node tests/run.js [--verbose] [--seed=N]   Exit code 1 on any failure. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const args=process.argv.slice(2),verbose=args.includes('--verbose');
const seed=+((args.find(a=>a.startsWith('--seed='))||'--seed=20260908').split('=')[1]);

// ── sandbox with a seeded PRNG (mulberry32) ──
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const sandbox={console,performance,Math:Object.assign(Object.create(Math),{random:mulberry32(seed)})};
vm.createContext(sandbox);
for(const f of ['js/util.js','js/model.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f});
const G=expr=>vm.runInContext(expr,sandbox);   // evaluate inside the model's scope
const M=G('({setGeometry,resetSim,setMode,setAge,setStimulus,setSpeed,update,startCaffeine,startMph,startExercise,toggleScroll,startSubst,thresholdNow,releaseMult,datBlock,datSpeedMult,threshMult,sleepMult,synthMult,supply,ageFactor,effectiveD2,baseD2,passPct})');
M.setGeometry(1000,520);

// ── helpers ──
const DT=1/60;
// resetSim() keeps part of the D2 tolerance on purpose (sleep recovers only +0.1), so tests restore it explicitly
function reset(o={}){M.resetSim();M.setSpeed(o.speed||1);M.setMode(o.mode||'normal');M.setAge(o.age||30);M.setStimulus(o.stim??0.3);G('d2Sens=1;effD2=null;sleepDebt=0;rebuildReceptors();');if(o.pre)o.pre();}
// runs `sec` simulated seconds (speed 1 = real seconds) and returns the fraction of time the neurons were receptive
function run(sec){const P=G('postNeurons'),n=Math.round(sec/DT);let acc=0;for(let i=0;i<n;i++){M.update(DT);let a=0;for(const p of P)if(p.active)a++;acc+=a/P.length;}return acc/n;}
const S=()=>G('({ves:vesCount,debt:sleepDebt,sens:d2Sens,d2:effectiveD2(),thr:thresholdNow(),relm:releaseMult(),block:datBlock(),dsp:datSpeedMult(),synth:synthMult(),supply:supply(),total:stats.total,fires:stats.fires,misses:stats.misses,comt:stats.comt,lost:stats.lost,maob:stats.maob,spk:displaySpikeRate,b:displayBurstRate,rel:displayRelRate,fireRate:displayFireRate,pass:passPct(),parts:particles.length,comts:comts.length,dat1:dat1s.length,recs:receptors.length,eaten:comts.reduce((a,c)=>a+c.eaten,0),caff:caffeineActive,caffEnd:caffEndTimer,mph:mphActive,reb:mphRebound,exer:exerciseActive,scroll:scrollActive,age,mode,now})');
// averages over the window from the counters, not from the displayed moving averages: an EMA read at one instant
// swings with the seed, counted events do not
function rate(fn,sec){const a=S(),r=fn(sec),b=S(),f=b.fires-a.fires,m=b.misses-a.misses;
  return {rec:r,rel:(b.total-a.total)/sec,fires:f/sec,pass:f+m?Math.round(100*f/(f+m)):0};}

let fails=0,checks=0;const lines=[];
function ok(name,cond,detail){checks++;if(!cond)fails++;const l=(cond?'  ok   ':'  FAIL ')+name+(detail!==undefined?'   ['+detail+']':'');lines.push(l);if(verbose||!cond)console.log(l);}
function within(name,v,lo,hi){ok(name,v>=lo&&v<=hi,`${fmt(v)} expected ${lo}..${hi}`);}
function fmt(v){return typeof v==='number'?(Number.isInteger(v)?v:v.toFixed(2)):String(v);}
function section(t){if(verbose)console.log('\n'+t);}

// ── A. release and firing by brain and stimulus ──
section('A. release and firing');
reset({stim:0});run(10);let r=rate(run,30),s=S();
within('tonic only: release/s',r.rel,2,4);within('tonic only: receptive fraction',r.rec,0,0.1);within('tonic only: spikes Hz',s.spk,2,4);within('tonic only: bursts/s',s.b,0,0.3);
reset({stim:0.1});run(10);const n10=rate(run,30);s=S();
within('neurotypical 10%: receptive fraction',n10.rec,0.10,0.40);within('neurotypical 10%: release/s',n10.rel,4.5,7.5);within('neurotypical 10%: firings/s',n10.fires,0.2,1.8);within('neurotypical 10%: cortical impulses passed %',n10.pass,5,65);
reset({stim:0.3});run(10);const n30=rate(run,30);s=S();
within('neurotypical 30%: receptive fraction',n30.rec,0.55,0.95);within('neurotypical 30%: release/s',n30.rel,10,14);within('neurotypical 30%: spikes Hz',s.spk,6,9);within('neurotypical 30%: bursts/s',s.b,0.6,1.2);within('neurotypical 30%: firings/s',n30.fires,1.8,5);
reset({stim:1});run(10);const n100=rate(run,30);s=S();
within('neurotypical 100%: receptive fraction',n100.rec,0.9,1);within('neurotypical 100%: release/s',n100.rel,28,38);within('neurotypical 100%: impulses passed %',n100.pass,90,100);within('neurotypical 100%: firings/s',n100.fires,10,14);
reset({mode:'adhd',stim:0.1});run(10);const a10=rate(run,30);
within('ADHD 10%: receptive fraction',a10.rec,0,0.15);ok('ADHD 10% well below neurotypical 10%',a10.rec<n10.rec-0.1,`${fmt(a10.rec)} vs ${fmt(n10.rec)}`);
reset({mode:'adhd',stim:0.3});run(10);const a30=rate(run,30);
within('ADHD 30%: receptive fraction',a30.rec,0.10,0.45);ok('ADHD 30% below neurotypical 30%',a30.rec<n30.rec-0.2,`${fmt(a30.rec)} vs ${fmt(n30.rec)}`);

// ── B. interventions ──
section('B. interventions');
// threshold compared with no sleep debt: caffeine also halves the perceived debt, which would lower the ratio further
reset({stim:0.1});run(10);G('sleepDebt=0;');const thr0=S().thr;M.startCaffeine();M.update(DT);s=S();
within('caffeine: threshold x0.8',s.thr/thr0,0.78,0.82);within('caffeine: release x1.10',s.relm,1.09,1.11);
G('sleepDebt=0.5;');const thrDebt=S().thr;G('caffeineTimer=0;caffeineActive=false;');ok('caffeine halves the perceived sleep debt on the threshold',S().thr/thrDebt>1.3,fmt(S().thr/thrDebt));G('sleepDebt=0;');M.startCaffeine();run(1);
const caff=rate(run,15);ok('caffeine raises the receptive fraction at 10%',caff.rec>n10.rec+0.1,`${fmt(caff.rec)} vs ${fmt(n10.rec)}`);
G('sleepDebt=0.5;caffeineTimer=0.2;');run(1);s=S();ok('caffeine ends and the crash toast fires with sleep debt',!s.caff&&s.caffEnd>0,`active ${s.caff}, crash timer ${fmt(s.caffEnd)}`);
reset({mode:'adhd',stim:0.1});run(10);M.startMph();run(1);s=S();
within('methylphenidate: DAT1 block',s.block,0.84,0.86);within('methylphenidate: DAT1 speed x0.3',s.dsp,0.29,0.31);
const mph=rate(run,20);ok('methylphenidate lifts ADHD 10% receptive fraction',mph.rec>a10.rec+0.15,`${fmt(mph.rec)} vs ${fmt(a10.rec)}`);
G('mphTimer=0.1;');run(1);s=S();within('methylphenidate rebound: DAT1 speed x1.3',s.dsp,1.29,1.31);ok('rebound is timed (15 s)',s.reb>13&&s.reb<15,fmt(s.reb));
// under the drug the transporters must sit barred, not keep reaching out: share of frames with an arm out, with vs without
function armsOut(sec){const D=G('dat1s'),n=Math.round(sec/DT);let c=0;for(let i=0;i<n;i++){M.update(DT);for(const d of D)if(d.arm>0)c++;}return c/n/D.length;}   // mean share of transporters with the arm out
reset({mode:'adhd',stim:0.3});run(10);const armsFree=armsOut(15);reset({mode:'adhd',stim:0.3});run(10);M.startMph();run(1);const armsMph=armsOut(15);
ok('methylphenidate: transporters reach out far less (<=40% of the drug-free share)',armsMph<=armsFree*0.4,`${fmt(armsMph)} vs ${fmt(armsFree)}`);
reset({stim:0.1});run(10);M.startExercise();run(5);s=S();
within('exercise: bursts/s (+1.5)',s.b,1.3,2.4);within('exercise: release/s at 10%',s.rel,14,26);ok('exercise active',s.exer);
reset({stim:0.1});run(5);M.toggleScroll();run(20);s=S();
within('easy rewards: D2 sensitivity after 20 s',s.sens,0.5,0.7);ok('easy rewards: fewer effective D2',s.d2<12,s.d2);within('easy rewards: bursts/s (+1)',s.b,1.0,1.8);
const sensOn=s.sens;M.toggleScroll();run(20);s=S();ok('easy rewards off: sensitivity recovers',s.sens>sensOn+0.05&&!s.scroll,`${fmt(sensOn)} -> ${fmt(s.sens)}`);

// ── C. substances (real-time timers) ──
section('C. substances');
reset({stim:0.1});run(5);M.startSubst('nic');run(10);s=S();
within('nicotine: release x1.30',s.relm,1.29,1.31);within('nicotine: bursts/s (+1)',s.b,1.0,1.8);run(9);s=S();within('nicotine: D2 sensitivity after a dose (-20%)',s.sens,0.76,0.86);
G('subst.nic.t=0.1;');run(1);s=S();within('nicotine after-effect: release dip x0.85',s.relm,0.84,0.86);
reset({stim:0.1});run(5);M.startSubst('can');run(10);s=S();within('cannabis: release x1.15',s.relm,1.14,1.16);within('cannabis: bursts/s (+0.6)',s.b,0.6,1.4);
G('subst.can.t=0.1;');run(1);s=S();within('cannabis after-effect: synthesis x0.7',s.synth,0.69,0.71);
reset({stim:0.1});run(5);M.startSubst('alc');run(10);s=S();within('alcohol: release x1.25',s.relm,1.24,1.26);within('alcohol: sleep debt x1.3',G('sleepMult()'),1.29,1.31);
const thrA=s.thr;G('subst.alc.t=0.1;');run(1);s=S();within('alcohol hangover: threshold x1.2',s.thr/thrA,1.17,1.23);
reset({stim:0.1});run(5);M.startSubst('coc');run(10);s=S();within('cocaine: DAT1 block 95%',s.block,0.94,0.96);within('cocaine: DAT1 speed x0.3',s.dsp,0.29,0.31);within('cocaine: bursts/s (+1.4)',s.b,1.3,2.3);
run(9);s=S();within('cocaine: D2 sensitivity after a dose (-50%)',s.sens,0.45,0.56);
G('subst.coc.t=0.1;');run(1);s=S();within('cocaine crash: DAT1 speed x1.5',s.dsp,1.49,1.51);within('cocaine crash: threshold x1.3',G('threshMult()'),1.29,1.31);
M.startSubst('coc');const t=G('subst.coc.t');ok('re-dosing restarts the effect (20 s)',t>19.9&&G('subst.coc.after')===0,fmt(t));

// ── D. state: sleep, brain, age, sleep debt, depletion, time scale ──
section('D. state');
reset({stim:0.3});run(20);G('sleepDebt=0.6;vesCount=40;d2Sens=0.7;');M.startCaffeine();M.resetSim();s=S();
ok('sleep: debt, reserve and effects reset',s.debt===0&&s.ves===100&&!s.caff&&s.parts===0,`debt ${s.debt} ves ${s.ves} caff ${s.caff}`);within('sleep: D2 sensitivity recovers +0.1',s.sens,0.79,0.81);
reset({mode:'normal'});s=S();ok('neurotypical: 12 D2, 3 DAT1, 3 COMT',s.d2===12&&s.dat1===3&&s.comts===3&&s.recs===36,`${s.d2}/${s.dat1}/${s.comts}/${s.recs}`);
reset({mode:'adhd'});s=S();ok('ADHD: 5 D2, 5 DAT1, 5 COMT',s.d2===5&&s.dat1===5&&s.comts===5&&s.recs===15,`${s.d2}/${s.dat1}/${s.comts}/${s.recs}`);
reset({age:12});ok('age 12: 14 D2, release x1.18',M.effectiveD2()===14&&Math.abs(M.ageFactor()-1.18)<0.005,`${M.effectiveD2()} / ${fmt(M.ageFactor())}`);
reset({age:70});ok('age 70: 9 D2, release x0.76',M.effectiveD2()===9&&Math.abs(M.ageFactor()-0.76)<0.005,`${M.effectiveD2()} / ${fmt(M.ageFactor())}`);
reset({age:5});ok('age 5: 15 D2 (bar full scale)',M.effectiveD2()===15,M.effectiveD2());
reset({age:100});ok('age 100: 7 D2, release x0.58 (-6% per decade over 30)',M.effectiveD2()===7&&Math.abs(M.ageFactor()-0.58)<0.005,`${M.effectiveD2()} / ${fmt(M.ageFactor())}`);
reset({stim:0.3});const thrB=S().thr;run(150);const debt=rate(run,30);s=S();
within('sleep debt after 180 s awake',s.debt,0.7,1);ok('sleep debt raises the threshold (>1.8x)',s.thr/thrB>1.8,fmt(s.thr/thrB));ok('sleep debt cuts the receptive fraction at 30%',debt.rec<n30.rec-0.3,`${fmt(debt.rec)} vs ${fmt(n30.rec)}`);
reset({stim:1});run(100);s=S();ok('depletion: reserve below 50% after 100 s at 100%',s.ves<50,fmt(s.ves));run(60);const dep=rate(run,10);s=S();ok('depletion: supply limits release near empty',s.ves<20&&s.supply<1&&dep.rel<n100.rel*0.6,`ves ${fmt(s.ves)} supply ${fmt(s.supply)} rel ${fmt(dep.rel)}`);
reset({stim:0.3,speed:1});run(10);let t0=S().total;run(5);const rel1=S().total-t0;reset({stim:0.3,speed:4});run(10);t0=S().total;run(5);const rel4=S().total-t0;
within('time scale x4: four times the releases per real second',rel4/rel1,3,5.2);

// ── E. mechanisms: COMT, cortical input, spikes ──
section('E. mechanisms');
reset({stim:0.6});run(30);s=S();
within('COMT: captures in 30 s at 60% (neurotypical)',s.comt,5,40);ok('COMT: captures equal the enzymes\' counters',s.eaten===s.comt,`${s.eaten} vs ${s.comt}`);ok('expired molecules are counted as dispersed, not as COMT',s.lost>0,s.lost);
reset({mode:'adhd',stim:0.6});run(30);s=S();within('COMT: captures in 30 s at 60% (ADHD, 5 enzymes)',s.comt,5,60);
reset({stim:0.1});run(10);t0=S();run(30);s=S();within('cortical input at 10%: impulses per neuron per s (1 + 0.3)',(s.fires+s.misses-t0.fires-t0.misses)/30/3,1.0,1.7);
reset({stim:1});run(10);t0=S();run(30);s=S();within('cortical input at 100%: impulses per neuron per s (1 + 3)',(s.fires+s.misses-t0.fires-t0.misses)/30/3,3.3,4.7);within('cortical input at 100%: almost nothing lost',(s.misses-t0.misses)/30,0,0.5);

// ── F. invariants after a long mixed run ──
section('F. invariants');
reset({stim:0.5,speed:2});M.startCaffeine();M.startMph();M.startExercise();M.toggleScroll();for(const k of ['nic','can','alc','coc'])M.startSubst(k);run(60);M.toggleScroll();run(60);s=S();
const finite=Object.values(s).every(v=>typeof v!=='number'||Number.isFinite(v));
ok('no NaN/Infinity in the state',finite);ok('particles within MAX_P',s.parts<=G('MAX_P'),s.parts);ok('reserve within 0..100',s.ves>=0&&s.ves<=100,fmt(s.ves));ok('D2 sensitivity within 0.3..1',s.sens>=0.3&&s.sens<=1,fmt(s.sens));ok('sleep debt within 0..1',s.debt>=0&&s.debt<=1,fmt(s.debt));ok('counters non-negative',[s.total,s.fires,s.misses,s.comt,s.lost,s.maob].every(v=>v>=0));

// ── G. dictionaries ──
section('G. dictionaries');
const i18n=require('./i18n.js').check(root);
ok(`i18n: ${i18n.langs.length} languages with the same keys, placeholders, tags and classes as it (${i18n.keys} keys)`,i18n.problems.length===0,i18n.problems.slice(0,5).join('; '));

console.log(`\n${checks-fails}/${checks} checks passed (seed ${seed}${verbose?'':', --verbose for every measurement'})`);
process.exit(fails?1:0);
