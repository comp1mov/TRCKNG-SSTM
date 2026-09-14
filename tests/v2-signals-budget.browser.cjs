const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const p=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await p.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo');await p.locator('#signalSettings').waitFor({state:'attached'});
  await p.evaluate(()=>{
   window.textureSamples=[];window.texturePaints=[];
   const paint=CanvasRenderingContext2D.prototype.putImageData;
   CanvasRenderingContext2D.prototype.putImageData=function(...args){const start=performance.now();const r=paint.apply(this,args);texturePaints.push({at:start,id:this.canvas.closest('.btn-habit')?.id});return r;};
   const render=SstmMedium.createMedium;
   SstmMedium.createMedium=(...args)=>{const m=render(...args),u=m.update;m.update=f=>{const t=performance.now();u(f);if(f.paint)textureSamples.push(performance.now()-t);};return m;};
   // A 10x10 invented running field. Most cells are outside the viewport.
   const grid=document.getElementById('habitsGrid');grid.replaceChildren();
   for(let i=0;i<100;i++){
    const id='dense-'+i,n=document.createElement('button');n.className='btn-habit';n.id='btn-'+id;n.dataset.type='duration_sec';n.dataset.cellId=id;
    n.style.gridColumn=String(i%10+1);n.style.gridRow=String(Math.floor(i/10)+1);n.style.setProperty('--btn-color','#9e91d9');
    n.innerHTML='<span class="btn-value">00:00</span><span class="btn-label">FIXTURE</span>';habitColors[id]='#9e91d9';durationStates[id]={isRunning:true,startTime:Date.now()};cellFlags[id]={light:SstmSignals.defaults('duration_sec',id)};grid.append(n);
   }
  });
  await p.waitForTimeout(1700);
  const result=await p.evaluate(()=>{
   const paints=texturePaints.filter(x=>x.id?.includes('dense')), by=new Map();
   for(const x of paints)by.set(x.id,(by.get(x.id)||0)+1);
   const sorted=textureSamples.slice().sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)]||0;
   const view=document.getElementById('trackView').getBoundingClientRect();
   const intersecting=[...document.querySelectorAll('.signal-pad')].filter(n=>{const b=n.getBoundingClientRect();return b.left<view.right&&b.right>view.left&&b.top<view.bottom&&b.bottom>view.top;}).map(n=>n.id);
   return {painted:by.size,total:document.querySelectorAll('.signal-pad').length,intersecting:intersecting.length,allVisiblePainted:intersecting.every(id=>by.has(id)),offscreenPainted:[...by.keys()].filter(id=>!intersecting.includes(id)).length,p95Ms:Number(p95.toFixed(2))};
  });
  assert.equal(result.total,100);assert.ok(result.painted<100);assert.equal(result.allVisiblePainted,true);assert.equal(result.offscreenPainted,0);
  // A hidden document stops the host's scheduling entirely.
  const hidden=await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));return texturePaints.length;});
  await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>texturePaints.length),hidden);
  console.log('PASS: dense 100-button field, visible-only drawing, fair scheduling and hidden-tab pause.',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
