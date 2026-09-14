// Reproduce the real report: reduced-motion device, several controls on together.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const ctx=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
  await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.stack));
  await p.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru');await p.locator('#signalSettings').waitFor({state:'attached'});
  await p.evaluate(()=>{
   cellFlags.cell08.light={...SstmSignals.defaults('led_pulse','cell08'),pulse:{pattern:'wave44',unit:'ms',tail:.75}};
   ledSettings.cell08={bpm:7.5};saveLedSettings();saveCellFlags();renderHabits();
  });
  await p.locator('#btn-cell08').click();
  const origin=await p.evaluate(()=>ledStates.cell08.startedAt);
  for(const [phase,want] of [[0,.08],[.25,.54],[.5,1],[.75,.54]]){
   await p.clock.setFixedTime(origin+8000*phase);
   await p.waitForFunction(w=>Math.abs(Number(document.getElementById('btn-cell08').style.getPropertyValue('--sl-light'))-w)<.01,want);
  }
  assert.equal(await p.locator('#btn-cell08').getAttribute('aria-pressed'),'true');
  // Static texture cannot disable the independently switched Pulse either.
  await p.evaluate(()=>{cellFlags.cell08.light.motion='off';saveCellFlags();renderHabits();});
  await p.clock.setFixedTime(origin+8000);await p.waitForFunction(()=>Number(document.getElementById('btn-cell08').style.getPropertyValue('--sl-light'))<.1);
  await p.clock.setFixedTime(origin+12000);await p.waitForFunction(()=>Number(document.getElementById('btn-cell08').style.getPropertyValue('--sl-light'))>.99);
  // Counter mark + several running timers. Saving/toggling a neighbour used to
  // replace every canvas and zero its light until the next intersection callback.
  await p.locator('#btn-cell01').click();await p.locator('#btn-cell06').click();
  await p.waitForFunction(()=>Number(document.getElementById('btn-cell02').style.getPropertyValue('--sl-light'))===1);
  await p.evaluate(()=>{
   window.retainedMaterial=document.querySelector('#btn-cell02>.sl-medium');
   window.retainedCanvas=retainedMaterial.querySelector('.sl-noise');
   window.retainedPixels=retainedCanvas.toDataURL();
  });
  for (const id of ['cell04','cell05','cell04']) {
   await p.locator('#btn-'+id).click();
   await p.waitForFunction(()=>document.querySelector('#btn-cell02>.sl-medium')===retainedMaterial);
   assert.equal(await p.evaluate(()=>document.querySelector('#btn-cell02 .sl-noise')===retainedCanvas),true);
   assert.equal(await p.evaluate(()=>retainedCanvas.toDataURL()===retainedPixels),true);
   assert.equal(await p.locator('#btn-cell02').evaluate(n=>n.style.getPropertyValue('--sl-light')),'1');
  }
  // Resize/re-observe without a size change must retain the painted backing buffer.
  await p.evaluate(()=>renderHabits());await p.waitForTimeout(80);
  assert.equal(await p.evaluate(()=>retainedCanvas.toDataURL()===retainedPixels),true);
  // A second PIN may reuse a cell ID but must not borrow its visual material.
  await p.locator('#pin1').click();await p.locator('#pin0').click();await p.waitForTimeout(80);
  assert.equal(await p.evaluate(()=>document.querySelector('#btn-cell02>.sl-medium')===retainedMaterial),false);
  assert.equal(await p.evaluate(()=>ledStates.cell08.startedAt),origin);
  await p.locator('#btn-cell08').click();await p.waitForFunction(()=>document.getElementById('btn-cell08').getAttribute('aria-pressed')==='false');
  assert.equal(await p.locator('#btn-cell08').evaluate(n=>n.style.getPropertyValue('--sl-light')),'0');
  assert.deepEqual(errors,[]);
  console.log('PASS: Pulse phases on a reduced-motion device, static texture independent of rhythm, retained canvas/pixels/light on neighbour toggles and rebuilds, PIN isolation and stop.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
