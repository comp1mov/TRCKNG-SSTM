const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:5173/TRCKNG-SSTM/v2/?mode=demo&lang=ru');await p.locator('#signalSettings').waitFor({state:'attached'});
  await p.evaluate(()=>{
   let j=JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')),at=Date.now();
   j=SstmData.point(j,at-60000);const c=j.cycles.at(-1);
   j=SstmData.tagInterval(j,c.id,c.points[0].id,'дорога прогулка');j=SstmData.point(j,at);
   TRCKNG_STORAGE.setItem('sstm_v2_cycles',JSON.stringify(j));dispatchEvent(new Event('sstm-v2-loaded'));
  });
  await p.locator('#cycleOpen').click();await p.getByLabel('Изменить теги отрезка 2',{exact:true}).click();
  const input=p.getByLabel('Теги отрезка 2',{exact:true}),choices=p.locator('.cycle-tag-choices');
  assert.equal(await input.inputValue(),'');
  assert.ok(await choices.getByRole('button',{name:'#дорога',exact:true}).isVisible());
  assert.ok(await choices.getByRole('button',{name:'#идея',exact:true}).isVisible());
  const stored=await p.evaluate(()=>TRCKNG_STORAGE.getItem('sstm_v2_cycles'));
  await input.fill('#ПР');assert.deepEqual(await choices.locator('button').allTextContents(),['#прогулка']);
  await input.press('ArrowDown');await p.keyboard.press('Enter');
  assert.equal(await input.inputValue(),'#прогулка ');
  assert.equal(await p.evaluate(()=>TRCKNG_STORAGE.getItem('sstm_v2_cycles')),stored,'Choosing is draft-only');
  assert.equal(await choices.getByRole('button',{name:'#прогулка',exact:true}).count(),0);
  await choices.getByRole('button',{name:'#дорога',exact:true}).click();assert.equal(await input.inputValue(),'#прогулка дорога ');
  // Collapse/reopen keeps the selected draft; no implicit save or carry-forward.
  await p.locator('.cycle-edit-actions').getByRole('button',{name:'СВЕРНУТЬ',exact:true}).click();
  await p.getByLabel('Изменить теги отрезка 2',{exact:true}).click();assert.equal(await input.inputValue(),'#прогулка дорога ');
  for(const width of [320,768,1280]){
   await p.setViewportSize({width,height:900});
   const b=await choices.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);
  }
  await p.locator('.cycle-edit-actions').getByRole('button',{name:'СОХРАНИТЬ',exact:true}).click();
  assert.deepEqual(await p.evaluate(()=>{const c=JSON.parse(TRCKNG_STORAGE.getItem('sstm_v2_cycles')).cycles.at(-1);return c.tags[c.points[1].id];}),['прогулка','дорога']);
  await p.locator('#cycleModal .surface-panel-head button').last().click();await p.locator('#cycleCapture').click();await p.locator('#cycleOpen').click();
  await p.getByLabel('Изменить теги отрезка 3',{exact:true}).click();assert.equal(await p.getByLabel('Теги отрезка 3',{exact:true}).inputValue(),'');
  assert.ok(await choices.getByRole('button',{name:'#дорога',exact:true}).isVisible());
  await p.evaluate(()=>SstmI18n.setLanguage('en'));
  assert.ok(await p.getByText('Previously used tags',{exact:true}).isVisible());
  assert.ok(await choices.getByRole('button',{name:'#дорога',exact:true}).isVisible());
  assert.deepEqual(errors,[]);console.log('PASS: historical interval/moment suggestions, empty-input discovery, prefix/keyboard/tap completion, no duplicates, draft preservation, explicit save, no carry-forward, responsive RU/EN.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
