// Fabricated demo only; no account, private browser profile or external requests.
const pw = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const engine = process.env.SSTM_BROWSER || 'chromium', output = path.join(require('node:os').tmpdir(), 'sstm-v2-creation-map', engine); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await pw[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'msedge' } : {}) });
 try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, hasTouch: true, serviceWorkers: 'block' }), errors=[];
  await ctx.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const page = await ctx.newPage(); page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=en'); await page.locator('#creationGroups').waitFor({state:'attached'});
  const journal = () => page.evaluate(()=>JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')));
  const close = () => page.locator('#cellEditModal .surface-panel-head button').last().click();
  // Reserve a 1-cell gap beside a real button. A 2x2 creation must keep its anchor.
  await page.evaluate(()=>moveCellTo('cell03',1,5));
  const before = await page.evaluate(()=>JSON.stringify([cellLayout,habitLabels,weekData]));
  await page.locator('.field-add-slot[data-slot="1:4"]').click();
  await page.locator('#cellEditInput').fill('Wide fixture');
  await page.locator('#creationGroups [data-creation-group=time]').click();
  await page.locator('#cellEditModal [data-type=timer]').click();
  await page.locator('#cellEditModal [data-layout-size="2x2"]').click();
  assert.match(await page.locator('#creationPlacement').innerText(), /Neighbours/);
  await page.locator('#timerDuration').fill('0'); await page.locator('#cellEditSave').click();
  assert.equal(await page.evaluate(()=>JSON.stringify([cellLayout,habitLabels,weekData])),before,'Failed validation does not move neighbours');
  await close(); assert.equal(await page.evaluate(()=>JSON.stringify([cellLayout,habitLabels,weekData])),before,'Cancel is a true draft');
  await page.locator('.field-add-slot[data-slot="1:4"]').click(); await page.locator('#cellEditInput').fill('Wide fixture');
  await page.locator('#cellEditModal [data-layout-size="2x2"]').click(); await page.locator('#cellEditSave').click();
  const id=await page.evaluate(()=>HABITS.find(id=>habitLabels[id]==='Wide fixture'));
  assert.deepEqual(await page.evaluate(id=>[cellLayout[id].row,cellLayout[id].col,cellLayout[id].rowSpan,cellLayout[id].colSpan],id),[1,4,2,2]);
  assert.equal(await page.evaluate(()=>cellLayout.cell03.col),6);
  assert.deepEqual(await page.evaluate(id=>Object.fromEntries(Object.entries(weekData).map(([week,values])=>[week,Object.fromEntries(Object.entries(values).filter(([key])=>key!==id))])),id),JSON.parse(before)[2]);
  await page.locator(`#btn-${id}`).click(); assert.equal(await page.locator(`#value-${id}`).innerText(),'1');
  const snapshot=await page.evaluate(()=>buildCloudSnapshot()); await page.evaluate(s=>{SstmData.validate(s);applyCloudSnapshot(s);},snapshot);
  assert.deepEqual(await page.evaluate(id=>getCellLayout(id),id),snapshot.pinData[0].cellLayout[id]);
  // Every PIN has usable empty positions; view-only slots never become account cells.
  const snapshots=await page.evaluate(()=>buildCloudSnapshot());
  for (const pin of [0,1,2]) { await page.locator(`#pin${pin}`).click(); await page.locator('.field-add-slot').first().waitFor(); }
  assert.equal(await page.evaluate(()=>HABITS.length),9);
  for (const [width,height,lang] of [[1280,1000,'en'],[768,1024,'en'],[390,844,'ru'],[320,700,'en'],[844,390,'ru']]) {
   await page.setViewportSize({width,height}); await page.evaluate(l=>SstmI18n.setLanguage(l),lang);
   await page.locator('.empty-field-cell').first().click();
   for(const group of ['capture','time','money','tools']) {
    await page.locator(`#creationGroups [data-creation-group=${group}]`).click();
    const visible=page.locator('#creationTypes [data-type]:visible'); assert.ok(await visible.count());
    const boxes=await visible.evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};}));
    for(const b of boxes) assert.ok(b.left>=0&&b.right<=width+1&&b.height>=44);
   }
   await page.screenshot({path:path.join(output,`create-${width}-${lang}.png`)}); await close();
   await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceMoments').click(); await page.locator('#momentAddState').click(); await page.locator('#stateBrowse').click();
   assert.equal(await page.locator('.state-map-word').count(),64); assert.equal(await page.locator('#stateWheel').isVisible(),false);
   assert.equal(await page.locator('#statePages').isVisible(),false);
   const boxes=await page.locator('.state-map-word').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};}));
   for(const b of boxes) assert.ok(b.left>=0&&b.right<=width+1&&b.height>=44);
   for(let i=0;i<boxes.length;i++)for(let k=i+1;k<boxes.length;k++){const a=boxes[i],b=boxes[k];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);}
   await page.locator('#stateMap').scrollIntoViewIfNeeded(); await page.screenshot({path:path.join(output,`map-${width}-${lang}.png`)});
   if (engine === 'chromium' && width === 390) {
    const count=(await journal()).moments.length, cdp=await ctx.newCDPSession(page), a=await page.locator('.state-map-word').first().boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2}]});
    for(let i=1;i<=5;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+a.width/2,y:a.y+a.height/2-i*25}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await cdp.detach();
    assert.equal((await journal()).moments.length,count,'Scrolling over words does not capture a state');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.locator('#momentModal .surface-panel-head button').last().click();
  }
  assert.deepEqual(await journal(),snapshots.cycleJournal,'Browsing maps and empty cells records nothing');
  await page.setViewportSize({width:1280,height:1000});
  await page.locator('#surfaceMenuButton').click(); await page.locator('#surfaceMoments').click(); await page.locator('#momentAddState').click(); await page.locator('#stateBrowse').click();
  const n=(await journal()).moments.length;
  await page.locator('#stateMapGesture').click();
  const start=page.locator('.state-map-word[data-state=energy]'), end=page.locator('.state-map-word[data-state="sstm:state:interested"]');
  await start.scrollIntoViewIfNeeded(); const a=await start.boundingBox(),b=await end.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2); await page.mouse.down(); await page.mouse.move(2,2,{steps:10}); await page.mouse.up();
  assert.equal((await journal()).moments.length,n,'Release outside the matrix cancels selection');
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2); await page.mouse.down(); await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10}); await page.mouse.up();
  assert.equal((await journal()).moments.length,n+1); assert.equal((await journal()).moments.at(-1).state.id,'sstm:state:interested');
  // Idle/running indicator is at the bottom, clear of the number and label.
  await page.locator('#pin0').click();
  const dot=await page.locator('#btn-cell04').evaluate(n=>{const s=getComputedStyle(n,'::after');return {top:s.top,bottom:s.bottom,height:s.height};});
  assert.equal(dot.bottom,'8px'); assert.equal(dot.height,'7px');
  assert.deepEqual(errors,[]); console.log(`PASS ${engine}: atomic creation/displacement, PIN slots, snapshot roundtrip, responsive grouped editor and 64-state matrix, single gesture capture, bottom indicators. ${output}`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
