'use strict';
/* util.js — piccoli helper condivisi da tutti gli script. */
const $=id=>document.getElementById(id);
const wall=()=>performance.now()/1000;
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
