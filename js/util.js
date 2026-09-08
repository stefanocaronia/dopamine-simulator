'use strict';
/* util.js — piccoli helper condivisi da tutti gli script. */
const $=id=>document.getElementById(id);
const wall=()=>performance.now()/1000;
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
// Mescola due colori esadecimali: t=0 dà a, t=1 dà b
function mixHex(a,b,t){const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16),m=(p,q)=>Math.round(p+(q-p)*t);return `rgb(${m(x>>16&255,y>>16&255)},${m(x>>8&255,y>>8&255)},${m(x&255,y&255)})`;}
