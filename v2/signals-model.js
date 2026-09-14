'use strict';
// Visual preferences live in cell flags, alongside the host's existing color.
(function (root) {
  const presets = {
    flow: {pattern:'flow',speed:.55,depth:.75,scale:2.65,seed:19514,blurPx:12,glow:1.5,coupling:'light'},
    fine: {pattern:'grain',speed:.55,depth:1,scale:.3,seed:19514,blurPx:4.5,glow:1.5,coupling:'light'},
    smoke: {pattern:'cloud',speed:1.05,depth:.75,scale:1.65,seed:18783,blurPx:.5,glow:1.5,coupling:'light'},
    coarse: {pattern:'grain',speed:.55,depth:1,scale:4,seed:17321,blurPx:12,glow:.7,coupling:'light'},
    ribbons: {pattern:'flow',speed:.55,depth:.75,scale:1.65,seed:18052,blurPx:5,glow:0,coupling:'light'}
  };
  const eligible = type => ['unit','counter','duration_sec','duration_min','duration_sec_count','sleep','timer','led_pulse','modular','points'].includes(type);
  const bounds = {seed:[0,999999],scale:[.3,4],speed:[0,12],depth:[0,1],blurPx:[0,18],glow:[0,1.5]};
  const periods = {wave44:8000,wave55:10000,box4444:16000};
  function recipe(name) { return {version:1,renderer:'noise',...presets[name || 'smoke']}; }
  function defaults(type, id = '', random) {
    const keys = Object.keys(presets), hash = [...id].reduce((n,c) => (Math.imul(n,31)+c.charCodeAt(0)) >>> 0, 0);
    const preset = random === undefined ? keys[hash % keys.length] : keys[Math.min(keys.length-1,Math.floor(Math.max(0,random)*keys.length))];
    return {version:1,preset,material:recipe(preset),fadeMinutes:15,motion:'auto',pulse:{pattern:'beat',unit:'bpm',tail:.75}};
  }
  function validate(config) {
    if (!config || config.version !== 1 || config.material?.version !== 1 || config.material.renderer !== 'noise') throw new Error('Unsupported visual settings');
    if (!['cloud','grain','flow','none'].includes(config.material.pattern) || !['light','free'].includes(config.material.coupling)) throw new Error('Invalid material');
    for (const [key,[min,max]] of Object.entries(bounds)) if (!Number.isFinite(config.material[key]) || config.material[key] < min || config.material[key] > max) throw new Error('Invalid material ' + key);
    if (!Number.isInteger(config.material.seed) || !Number.isFinite(config.fadeMinutes) || config.fadeMinutes < 0 || config.fadeMinutes > 10080) throw new Error('Invalid fade');
    if (!['auto','on','off'].includes(config.motion) || !['beat','wave',...Object.keys(periods)].includes(config.pulse?.pattern) || !['bpm','ms'].includes(config.pulse.unit) || !Number.isFinite(config.pulse.tail) || config.pulse.tail < .3 || config.pulse.tail > .95) throw new Error('Invalid pulse');
    return config;
  }
  function pulse(pattern, phase, tail=.75) {
    phase = ((phase % 1) + 1) % 1;
    if (pattern === 'beat') {
      const attack=.02, p=Math.min(1,Math.max(0,(phase-attack)/tail));
      const t=phase/attack;
      return phase < attack ? t*t*t*(t*(t*6-15)+10) : (1-p)**1.5;
    }
    if (pattern === 'box4444') {
      const stage=Math.floor(phase*4), p=phase*4%1;
      return .08+.92*[(1-Math.cos(Math.PI*p))/2,1,(1+Math.cos(Math.PI*p))/2,0][stage];
    }
    return .08+.92*(1-Math.cos(2*Math.PI*phase))/2;
  }
  function recency(at, now, minutes) {
    if (!Number.isFinite(at) || at <= 0 || minutes <= 0) return 0;
    return Math.max(0,1-Math.max(0,now-at)/(minutes*60000)) ** 1.35;
  }
  const api = {presets,periods,eligible,recipe,defaults,validate,pulse,recency};
  if (typeof module !== 'undefined') module.exports=api; else root.SstmSignals=api;
})(typeof window !== 'undefined' ? window : globalThis);
