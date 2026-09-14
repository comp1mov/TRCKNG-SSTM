'use strict';
(() => {
  const M=window.SstmSignals, $=id=>document.getElementById(id), grid=$('habitsGrid'), modal=$('cellEditModal');
  const tr=text=>window.SstmI18n?.text(text) || text;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const names={flow:'Мягкое течение',fine:'Мелкое зерно',smoke:'Дым',coarse:'Крупное зерно',ribbons:'Ленты'};
  const fields=document.createElement('details'); fields.className='signal-settings'; fields.id='signalSettings';
  fields.innerHTML=`<summary>Свет и фактура</summary>
    <div class="signal-preview" id="signalPreview" aria-hidden="true"><strong>00:00</strong><span>ПРЕДПРОСМОТР</span></div>
    <p id="signalCompatibility" hidden>Это оформление создано в более новой версии. Оно сохранится без изменений.</p>
    <div id="signalEditable">
      <div class="signal-controls"><label>Фактура<select id="signalPreset">${Object.entries(names).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}<option value="custom">Моя настройка</option></select></label>
      <label><span aria-hidden="true">↻</span><button id="signalRandom" type="button">Случайная фактура</button></label>
      <label id="signalFadeRow">Затухание отметки, мин<input id="signalFade" type="number" min="0" max="10080" step="any"></label>
      <label>Движение фактуры<select id="signalMotion"><option value="auto">По настройке устройства</option><option value="on">Включено</option><option value="off">Статичная фактура</option></select></label></div>
      <p id="signalHint">Свет показывает работающий таймер или давность отметки. Оформление не меняет записи.</p>
      <details><summary>Настроить фактуру</summary><div class="signal-controls">
      <label>Рисунок<select id="signalPattern"><option value="flow">Течения</option><option value="grain">Зерно</option><option value="cloud">Дым</option><option value="none">Без фактуры</option></select></label>
      <label>Эволюция<select id="signalCoupling"><option value="light">Со светом</option><option value="free">Независимо</option></select></label>
      ${[['speed','Скорость',0,12,.05],['depth','Глубина',0,1,.05],['scale','Масштаб',.3,4,.05],['blurPx','Размытие',0,18,.5],['glow','Ореол',0,1.5,.05]].map(([key,label,min,max,step])=>`<label><span>${label}<output id="signal-${key}-value"></output></span><input id="signal-${key}" data-material="${key}" type="range" min="${min}" max="${max}" step="${step}"></label>`).join('')}
      <label>Seed<input id="signal-seed" data-material="seed" type="number" min="0" max="999999" step="1"></label>
      </div></details>
    </div>`;
  $('creationAdvanced').before(fields);
  const colorRow=$('cellEditColor').closest('.color-picker-wrap'); colorRow.id='signalColor'; fields.before(colorRow);
  colorRow.querySelector('.color-picker-label').textContent=tr('Цвет');
  const pulseFields=document.createElement('div'); pulseFields.className='signal-pulse';
  pulseFields.innerHTML=`<div class="signal-controls">
    <label>Ритм<select id="signalPulsePattern"><option value="beat">Удар</option><option value="wave">Волна</option><option value="wave44">4 + 4</option><option value="wave55">5 + 5</option><option value="box4444">4 + 4 + 4 + 4</option></select></label>
    <label>Показывать<select id="signalPulseUnit"><option value="bpm">BPM</option><option value="ms">мс</option></select></label>
    <label id="signalMsRow">Полный цикл, мс<input id="signalPulseMs" type="number" min="200" max="60000" step="any"></label>
    <label id="signalTailRow">Затухание удара<input id="signalTail" type="range" min="30" max="95" step="1"></label>
    </div><p id="signalPulseNote"></p>`;
  $('ledSettingsFields').append(pulseFields);
  $('ledBpm').step='any';
  let subject, draft, unsupported=false, previewMaterial=null, previewOrigin=Date.now();
  const selected=()=>modal.querySelector('[data-type].active')?.dataset.type;
  const isPulse=()=>selected()==='led_pulse';
  const number=n=>Number(n.toFixed(2)).toLocaleString(SstmI18n.locale,{useGrouping:false,maximumFractionDigits:2});
  const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
  function paintLabels() {
    for (const key of ['speed','depth','scale','blurPx','glow']) {
      const n=draft.material[key]; $('signal-'+key+'-value').textContent=number(['depth','glow'].includes(key)?n*100:n)+(['depth','glow'].includes(key)?'%':key==='blurPx'?' px':'×');
    }
  }
  function showPulse() {
    if (!draft) return;
    const p=draft.pulse, fixed=M.periods[p.pattern], bpm=Number($('ledBpm').value);
    if (fixed) $('ledBpm').value=String(60000/fixed);
    const period=fixed || 60000/(Number.isFinite(bpm)&&bpm>0?bpm:60);
    $('signalPulseMs').value=String(Number(period.toFixed(6)));
    $('ledBpm').readOnly=Boolean(fixed); $('signalPulseMs').readOnly=Boolean(fixed);
    $('ledBpm').parentElement.hidden=p.unit==='ms'; $('signalMsRow').hidden=p.unit!=='ms';
    $('signalTailRow').hidden=p.pattern!=='beat';
    $('signalPulseNote').textContent=`${number(60000/period)} BPM = ${number(period)} ${tr('мс')} · ${tr('Полный цикл')}`;
    $('signalPreview').querySelector('strong').textContent=isPulse()?number(p.unit==='ms'?period:60000/period):'00:00';
  }
  function showDraft() {
    if (!draft) return;
    fields.hidden=!M.eligible(selected());
    $('signalEditable').hidden=unsupported; $('signalCompatibility').hidden=!unsupported;
    $('signalFadeRow').hidden=!['unit','counter'].includes(selected());
    $('signalPreset').value=draft.preset in names?draft.preset:'custom';
    $('signalPattern').value=draft.material.pattern; $('signalCoupling').value=draft.material.coupling;
    $('signalMotion').value=draft.motion; $('signalFade').value=draft.fadeMinutes;
    for (const key of ['speed','depth','scale','blurPx','glow','seed']) $('signal-'+key).value=draft.material[key];
    $('signalPulsePattern').value=draft.pulse.pattern; $('signalPulseUnit').value=draft.pulse.unit; $('signalTail').value=draft.pulse.tail*100;
    pulseFields.querySelectorAll('input,select').forEach(n=>{n.disabled=unsupported;});
    paintLabels(); showPulse();
    if (previewMaterial) previewMaterial.configure(draft.material);
  }
  function initializeDraft() {
    if (subject===modal.dataset.subjectId && modal.dataset.lightDraft==='yes') return;
    subject=modal.dataset.subjectId;
    const saved=cellFlags[subject]?.light;
    unsupported=false;
    const creating=pendingNewCell?.id===subject || !habitLabels[subject]?.trim();
    try { draft=clone(saved?M.validate(saved):M.defaults(habitTypes[subject],subject,creating?random():undefined)); }
    catch { unsupported=true; draft=M.defaults(habitTypes[subject],subject); draft.material.pattern='none'; }
    modal.dataset.lightDraft='yes'; previewOrigin=Date.now(); showDraft();
  }
  const original=window.openCellEditModal;
  window.openCellEditModal=function(...args) {
    const result=original.apply(this,args); initializeDraft(); return result;
  };
  // A fast interaction can open the shared editor before this adapter loads.
  if (editingHabit && modal.dataset.subjectId) initializeDraft();
  function updateMaterial() {
    draft.material.pattern=$('signalPattern').value; draft.material.coupling=$('signalCoupling').value;
    for (const key of ['speed','depth','scale','blurPx','glow','seed']) draft.material[key]=Number($('signal-'+key).value);
    draft.preset='custom'; $('signalPreset').value='custom'; paintLabels(); previewMaterial?.configure(draft.material);
  }
  fields.addEventListener('input',event=>{
    if (!draft || unsupported) return;
    if (event.target.matches('[data-material],#signalPattern,#signalCoupling')) updateMaterial();
    else if (event.target.id==='signalFade') draft.fadeMinutes=Number(event.target.value);
    else if (event.target.id==='signalMotion') draft.motion=event.target.value;
  });
  function applyPreset(name) {
    if (!Object.hasOwn(names,name)) return;
    draft.preset=name; draft.material=M.recipe(name); showDraft();
  }
  $('signalPreset').addEventListener('change',event=>applyPreset(event.target.value));
  $('signalRandom').onclick=()=>{
    const keys=Object.keys(names).filter(key=>key!==draft.preset); applyPreset(keys[Math.floor(random()*keys.length)]);
  };
  pulseFields.addEventListener('input',event=>{
    if (!draft || unsupported) return;
    if (event.target.id==='signalPulseMs') {
      const ms=Number(event.target.value); if (ms>=200 && ms<=60000) $('ledBpm').value=String(60000/ms);
      // Preserve an incomplete typed value until validation or a deliberate unit switch.
      return;
    }
    draft.pulse.pattern=$('signalPulsePattern').value; draft.pulse.unit=$('signalPulseUnit').value; draft.pulse.tail=Number($('signalTail').value)/100;
    showPulse();
  });
  $('ledBpm').addEventListener('input',showPulse);
  modal.addEventListener('click',event=>{if(event.target.closest('[data-type]')) showDraft();});
  window.TRCKNG_LIGHT={prepareEdit({type}) {
    if (!M.eligible(type) || unsupported) return undefined;
    try { M.validate(draft); } catch { throw new Error(tr('Проверь параметры света и фактуры.')); }
    if (type==='led_pulse') {
      const bpm=Number($('ledBpm').value), ms=Number($('signalPulseMs').value);
      if (!Number.isFinite(bpm)||bpm<1||bpm>300||(draft.pulse.unit==='ms'&&(!Number.isFinite(ms)||ms<200||ms>60000))) throw new Error(tr('Укажи темп от 1 до 300 BPM или цикл от 200 до 60000 мс.'));
    }
    return clone(draft);
  }};
  // Dispose legacy per-button intervals before using the one shared animation loop.
  stopAllLedPulses();
  const entries=new Map(), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const visibility=new IntersectionObserver(changes=>{for(const c of changes) { const e=entries.get(c.target); if(e)e.visible=c.isIntersecting; }},{root:$('trackView')});
  function bind() {
    const detached=new Map([...entries].filter(([node])=>!node.isConnected).map(([node,e])=>[`${e.pin}:${e.id}`,{node,e}]));
    for (const node of grid.querySelectorAll('.btn-habit:not(.empty-field-cell)')) {
      if (entries.has(node) || !M.eligible(node.dataset.type)) continue;
      const id=node.dataset.cellId || node.id.replace(/^btn-/,''), type=node.dataset.type;
      const previous=detached.get(`${currentPin}:${id}`);
      let config, material, retained;
      try {
        config=clone(M.validate(cellFlags[id]?.light || M.defaults(type,id)));
        if(previous?.e.type===type && JSON.stringify(previous.e.config)===JSON.stringify(config)) {
          retained=previous.e;material=retained.material;material?.attach(node);
          visibility.unobserve(previous.node);entries.delete(previous.node);
        } else material=SstmMedium.createMedium(node,config.material);
      }
      catch { config=M.defaults(type,id); config.material.pattern='none'; }
      node.classList.add('signal-pad'); node.classList.remove('led-on');
      const entry=retained?{...retained,config,material}:{id,pin:currentPin,type,config,material,visible:false,lastLevel:-1,lastMark:null,lastCheck:0,paintedAt:0};
      if(retained)node.style.setProperty('--sl-light',String(retained.lastLevel));
      entries.set(node,entry);visibility.observe(node);
      if (type==='led_pulse') {
        const bpm=ledSettings[id]?.bpm || 60, value=node.querySelector('.btn-value'), detail=node.querySelector('.btn-breakdown');
        if (value) value.textContent=number(config.pulse.unit==='ms'?60000/bpm:bpm);
        if (detail) detail.textContent=config.pulse.unit==='ms'?`${tr('мс')} · ${number(bpm)} BPM`:`BPM · ${number(60000/bpm)} ${tr('мс')}`;
      }
    }
    for (const [node,e] of entries) if (!node.isConnected) { e.material?.dispose(); visibility.unobserve(node); entries.delete(node); }
    SstmReadability?.fit();
  }
  new MutationObserver(changes=>{if(changes.some(c=>[...c.addedNodes,...c.removedNodes].some(n=>n.classList?.contains('btn-habit'))))bind();}).observe(grid,{childList:true});
  bind();
  const motion=config=>config.motion==='on'||(config.motion==='auto'&&!reduced.matches);
  function level(e,now) {
    if (previousWeekPreview) return 0;
    if (e.type==='led_pulse') {
      if (!ledStates[e.id]?.isActive) return 0;
      const period=60000/(ledSettings[e.id]?.bpm || 60), origin=ledStates[e.id].startedAt || 0;
      // A deliberately started Pulse is the functional signal. The texture's
      // reduced-motion preference must not silently turn its clock into a lamp.
      return M.pulse(e.config.pulse.pattern,(now-origin)/period,e.config.pulse.tail);
    }
    if (['unit','counter'].includes(e.type)) {
      if (now-e.lastCheck>150 || now<e.lastCheck) {e.lastMark=SstmUnitRecency.lastMark(unitSettings[e.id],counterChangeLog,e.id);e.lastCheck=now;}
      return M.recency(e.lastMark,now,e.config.fadeMinutes);
    }
    return e.type==='timer'?timerStates[e.id]?.isRunning?1:0
      :['modular','points'].includes(e.type)?document.getElementById('btn-'+e.id)?.classList.contains('running')?1:0
      :durationStates[e.id]?.isRunning?1:0;
  }
  let frame=0,last=0,cursor=0;
  function tick(time) {
    frame=0; if (document.hidden) return;
    const dt=last?Math.min(.1,(time-last)/1000):0; last=time;
    const now=Date.now(), visible=[...entries].filter(([,e])=>e.visible), start=performance.now(); let paints=0;
    for (let i=0;i<visible.length;i++) {
      const [node,e]=visible[(i+cursor)%visible.length], l=level(e,now);
      if(e.type==='led_pulse') {
        const pressed=String(!previousWeekPreview&&Boolean(ledStates[e.id]?.isActive));
        if(node.getAttribute('aria-pressed')!==pressed)node.setAttribute('aria-pressed',pressed);
      }
      if (Math.abs(l-e.lastLevel)>.004 || l===0&&e.lastLevel!==0) {node.style.setProperty('--sl-light',String(l));e.lastLevel=l;}
      const paint=l>0 && time-e.paintedAt>=32 && paints<3 && performance.now()-start<5;
      // Slow evolution stays independent of beat frequency. Only Pulse modulates light.
      e.material?.update({deltaSeconds:dt*.22,level:l,tempoRatio:1,color:habitColors[e.id]||'#ffffff',motion:motion(e.config)&&l>0,visible:true,paint});
      if (paint) {e.paintedAt=time;paints++;}
    }
    cursor=(cursor+Math.max(1,paints))%Math.max(1,visible.length);
    const showPreview=modal.classList.contains('visible')&&fields.open&&!fields.hidden&&draft;
    if (showPreview) {
      if (!previewMaterial) previewMaterial=SstmMedium.createMedium($('signalPreview'),draft.material);
      const color=$('cellEditColor').value, period=60000/(Number($('ledBpm').value)||60);
      const l=isPulse()?M.pulse(draft.pulse.pattern,(now-previewOrigin)/period,draft.pulse.tail):1;
      $('signalPreview').style.setProperty('--sl-source',color); $('signalPreview').style.setProperty('--sl-light',String(l));
      previewMaterial.update({deltaSeconds:dt*.22,level:l,tempoRatio:1,color,motion:motion(draft),visible:true,paint:performance.now()-start<8});
    } else if (previewMaterial) {previewMaterial.dispose();previewMaterial=null;}
    frame=requestAnimationFrame(tick);
  }
  const resume=()=>{last=0;if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else resume();});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;last=0;}); window.addEventListener('pageshow',resume);
  new MutationObserver(()=>{if(!modal.classList.contains('visible')&&!editingHabit)delete modal.dataset.lightDraft;}).observe(modal,{attributes:true,attributeFilter:['class']});
  window.addEventListener('sstm-language-changed',()=>{if(draft){paintLabels();showPulse();}});
  resume();
})();
