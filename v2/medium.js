'use strict';
// Portable visual material. The host owns time, color, data and the frame budget.
(function (root) {
const mix=(a,b,t)=>a+(b-a)*t, smooth=t=>t*t*t*(t*(t*6-15)+10);
function createNoise(seed){
  const permutation=new Uint8Array(512), shuffled=Array.from({length:256},(_,i)=>i);
  let randomSeed=seed>>>0;
  for(let i=255;i>0;i--){randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;const j=randomSeed%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  for(let i=0;i<512;i++)permutation[i]=shuffled[i&255];
  const hash=(a,b,c)=>permutation[(a&255)+permutation[(b&255)+permutation[c&255]]]/255;
  const noise=(x,y,z)=>{
    const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),u=smooth(x-ix),v=smooth(y-iy),w=smooth(z-iz);
    return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),u),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),u),v),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),u),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),u),v),w);
  };
  return (x,y,z)=>.57*noise(x,y,z)+.28*noise(x*2+13,y*2+7,z*1.6+5)+.15*noise(x*4+29,y*4+19,z*2.1+9);
}
// Medium receives a visual signal; it has no knowledge of buttons or records.
const mediumPatterns={
  cloud:(sample,u,v,z)=>sample(u*3+z*.12,v*3,z),
  grain:(sample,u,v,z)=>sample(u*13,v*13,z*.8),
  flow:(sample,u,v,z)=>Math.pow(.5+.5*Math.sin(u*8+v*2.5+sample(u*2.2,v*2.2,z)*9+z*.35),2.4)
};
function createMedium(host,initial){
  const layer=document.createElement('span');layer.className='sl-medium';layer.setAttribute('aria-hidden','true');
  const canvas=document.createElement('canvas'),bloom=document.createElement('canvas');canvas.className='sl-noise';bloom.className='sl-bloom';layer.append(bloom,canvas);host.prepend(layer);
  const ctx=canvas.getContext('2d',{alpha:false}),bloomCtx=bloom.getContext('2d',{alpha:false});
  let config={version:1,renderer:'noise',pattern:'cloud',seed:17321,scale:1,speed:1,depth:.75,blurPx:5,glow:.7,coupling:'light'};
  let sample=createNoise(config.seed),phase=0,dirty=true,aspect=1,pixels,color='',disposed=false;
  const bounded=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
  function configure(next){
    if(next.version!==undefined&&next.version!==1)throw new Error('Unsupported Medium version');
    if(next.renderer!==undefined&&next.renderer!=='noise')throw new Error('Unsupported Medium renderer');
    const oldSeed=config.seed;
    config={...config,
      pattern:next.pattern==='none'||Object.hasOwn(mediumPatterns,next.pattern)?next.pattern:config.pattern,
      coupling:['light','free'].includes(next.coupling)?next.coupling:config.coupling
    };
    for(const [key,min,max] of [['seed',0,999999],['scale',.3,4],['speed',0,12],['depth',0,1],['blurPx',0,18],['glow',0,1.5]])config[key]=bounded(next[key],min,max,config[key]);
    config.seed=Math.round(config.seed);if(oldSeed!==config.seed)sample=createNoise(config.seed);
    layer.style.setProperty('--sl-blur',config.blurPx+'px');layer.style.setProperty('--sl-bloom',String(config.glow/1.5));dirty=true;
  }
  function resize(){
    const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const nextAspect=rect.width/rect.height, height=Math.max(40,Math.min(96,Math.round(72/nextAspect)));
    if(pixels&&aspect===nextAspect&&canvas.height===height)return;
    aspect=nextAspect;
    // Assigning canvas dimensions clears it, even when the dimensions are unchanged.
    if(canvas.width!==72||canvas.height!==height||!pixels){
      canvas.width=bloom.width=72;canvas.height=bloom.height=height;
      if(ctx)pixels=ctx.createImageData(canvas.width,canvas.height);
    }
    dirty=true;
  }
  function paint(hex){
    if(!ctx||!pixels)return;
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),{width,height,data}=pixels,pattern=mediumPatterns[config.pattern];
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const u=(x/width-.5)*aspect/config.scale+.5,v=(y/height-.5)/config.scale+.5;
      const n=Math.max(0,Math.min(1,(pattern(sample,u,v,phase)-.2)/.62));
      const brightness=.04+.96*n*n,index=(y*width+x)*4;
      data[index]=Math.min(255,rgb[0]*brightness+12*n);data[index+1]=Math.min(255,rgb[1]*brightness+12*n);data[index+2]=Math.min(255,rgb[2]*brightness+12*n);data[index+3]=255;
    }
    ctx.putImageData(pixels,0,0);if(bloomCtx)bloomCtx.drawImage(canvas,0,0);dirty=false;color=hex;
  }
  function update(frame){
    if(disposed||!frame.visible)return;
    layer.hidden=config.pattern==='none';if(layer.hidden)return;
    const level=bounded(frame.level,0,1,0);
    layer.style.opacity=String(config.depth*level*.42);
    if(frame.motion&&config.speed>0){
      const pace=config.coupling==='free'?1:level>0?(.25+.75*level)*bounded(frame.tempoRatio,.5,4,1):0;
      phase+=bounded(frame.deltaSeconds,0,.1,0)*config.speed*.65*pace;if(pace>0)dirty=true;
    }
    if(frame.color!==color)dirty=true;
    if(dirty&&frame.paint&&config.depth>0)paint(frame.color);
  }
  try { configure(initial); } catch (error) { layer.remove(); throw error; } resize();const observer=new ResizeObserver(resize);observer.observe(host);
  function attach(nextHost){
    if(disposed||host===nextHost)return;
    observer.unobserve(host);host=nextHost;host.prepend(layer);observer.observe(host);resize();
  }
  return {configure,update,resize,attach,snapshot:()=>({...config}),dispose:()=>{disposed=true;observer.disconnect();layer.remove();}};
}
const api = { createMedium, createNoise };
if (typeof module !== 'undefined') module.exports = api; else root.SstmMedium = api;
})(typeof window !== 'undefined' ? window : globalThis);
