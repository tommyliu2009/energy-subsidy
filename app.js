(function(){
const DATA = window.ESK;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const linkify = s => esc(s).replace(/(https?:\/\/[^\s；;，,）)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
const today = (() => { const d = new Date(new Date().toLocaleString('en-US', {timeZone:'Asia/Taipei'})); d.setHours(0,0,0,0); return d; })();
const daysLeft = iso => iso ? Math.round((new Date(iso + 'T00:00:00') - today) / 864e5) : null;

const items0 = DATA.items.map(x => {
  const d = daysLeft(x.deadline);
  let status = x.status;
  if (d !== null && d < 0 && status === '開放中') status = '已截止';
  return {...x, days: d, status, _txt: [x.name, x.org, x.target, x.summary, x.region, x.year, x.parent, x.cats.join(' ')].join(' ').toLowerCase()};
});
let items = items0;
const prep = x => { const d = daysLeft(x.deadline); return {...x, days: d, _txt: [x.name, x.org, x.target, x.summary, x.region, x.year, x.parent].join(' ').toLowerCase()}; };

const RANGES = [['all','不限'],['7','7 天內'],['30','30 天內'],['90','90 天內'],['rolling','隨時受理/待公告']];
const state = {tab:'all', cats:new Set(), q:'', status:new Set(['開放中','即將開放','常態性/依公告']), level:new Set(), targets:new Set(), range:'all', region:'', org:'', sort:'deadline'};

function counts(key){ const m = {}; items.forEach(x => [].concat(x[key]).forEach(v => m[v] = (m[v]||0)+1)); return m; }
const bound = new Set(); let statusTouched = false;
function buildChips(key, order){
  const box = document.querySelector(`.chips[data-key="${key}"]`); const c = counts(key);
  const vals = order || Object.keys(c).sort((a,b)=>c[b]-c[a]);
  box.innerHTML = vals.filter(v=>c[v]).map(v => `<button class="chip" data-v="${esc(v)}">${esc(v)}<small>${c[v]}</small></button>`).join('');
  if (bound.has(key)) return; bound.add(key);
  box.addEventListener('click', e => { const b = e.target.closest('.chip'); if(!b) return;
    if (key==='status') statusTouched = true; const v = b.dataset.v; state[key].has(v) ? state[key].delete(v) : state[key].add(v); render(); });
}
buildChips('status', ['開放中','即將開放','常態性/依公告','已截止','歷史(已結束)']);
buildChips('level', ['中央','縣市','鄉鎮市']);
buildChips('cats', ['節能','淨零','環境部']);
const rbox = document.querySelector('.chips[data-key="range"]');
rbox.innerHTML = RANGES.map(([v,l]) => `<button class="chip" data-v="${v}">${l}</button>`).join('');
rbox.addEventListener('click', e => { const b = e.target.closest('.chip'); if(b){ state.range = b.dataset.v; render(); }});

const fillSelect = (sel, key) => { sel.querySelectorAll('option:not([value=""])').forEach(o=>o.remove()); const c = counts(key); Object.keys(c).sort((a,b)=>a.localeCompare(b,'zh-Hant')).forEach(v => sel.insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(v)}（${c[v]}）</option>`)); };
fillSelect($('#region'), 'region'); fillSelect($('#org'), 'org');
$('#region').onchange = e => { state.region = e.target.value; render(); };
$('#org').onchange = e => { state.org = e.target.value; render(); };
$('#sort').onchange = e => { state.sort = e.target.value; render(); };
let t, composing = false; const qEl = $('#q');
const doSearch = () => { clearTimeout(t); const v = qEl.value.trim().toLowerCase(); if (v === state.q) return; state.q = v; render(); if (v) { const l = $('#count'); if (l && window.innerWidth < 820) l.scrollIntoView({behavior:'smooth', block:'start'}); } };
qEl.addEventListener('compositionstart', () => composing = true);
qEl.addEventListener('compositionend', () => { composing = false; clearTimeout(t); t = setTimeout(doSearch, 250); });
qEl.addEventListener('input', () => { if (composing) return; clearTimeout(t); t = setTimeout(doSearch, 250); });
qEl.addEventListener('search', doSearch);
qEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); doSearch(); qEl.blur(); } });
const qBtn = $('#qBtn'); if (qBtn) qBtn.addEventListener('click', doSearch);
// 頁面載入前已輸入的字也要算
if (qEl.value.trim()) state.q = qEl.value.trim().toLowerCase();
$('#reset').onclick = () => { state.status.clear(); state.level.clear(); state.cats.clear(); state.range='all'; state.region=''; state.org=''; state.q=''; statusTouched=false;
  $('#q').value=''; $('#region').value=''; $('#org').value=''; render(); };
$('#openFilters').onclick = () => $('#filters').classList.add('open');
$('#applyFilters').onclick = () => $('#filters').classList.remove('open');

function badge(x){
  if (x.days === null) return `<span class="badge b-roll">${esc(x.deadlineText || '待公告')}</span>`;
  if (x.days < 0) return `<span class="badge b-done">已截止</span>`;
  if (x.days === 0) return `<span class="badge b-urgent">今天截止</span>`;
  const cls = x.days <= 7 ? 'b-urgent' : x.days <= 30 ? 'b-near' : 'b-ok';
  return `<span class="badge ${cls}">剩 ${x.days} 天</span>`;
}
const fmtDate = x => x.deadline ? x.deadline.replace(/-/g,'/') : (x.deadlineText || '待公告');

function match(x){
  if (state.tab==='urgent' && !(x.status==='開放中' || (x.days!==null && x.days>=0 && x.days<=14))) return false;
  if (['節能','淨零','環境部'].includes(state.tab) && !x.cats.includes(state.tab)) return false;
  if (state.cats.size && !x.cats.some(v => state.cats.has(v))) return false;
  if (state.q && !state.q.split(/\s+/).every(w => x._txt.includes(w.replace(/台/g,'臺')) || x._txt.includes(w))) return false;
  if (state.status.size && !(state.q && !statusTouched) && !state.status.has(x.status)) return false;
  if (state.level.size && !state.level.has(x.level)) return false;
  if (state.region && x.region !== state.region) return false;
  if (state.org && x.org !== state.org) return false;
  if (state.range === 'rolling') return x.days === null;
  if (state.range !== 'all') return x.days !== null && x.days >= 0 && x.days <= +state.range;
  return true;
}
function sortFn(a,b){
  const big = 1e9, ka = a.days ?? big/2, kb = b.days ?? big/2;
  const rank = x => x.days === null ? (x.status==='常態性/依公告' ? 1.5 : 1) : x.days < 0 ? 2 : 0;   // 未截止 → 不定期 → 已截止
  switch(state.sort){
    case 'deadline': return rank(a)-rank(b) || (rank(a)===2 ? kb-ka : ka-kb);
    case 'deadline_desc': return rank(a)-rank(b) || kb-ka;
    case 'updated': return (b.updated||'').localeCompare(a.updated||'');
    case 'name': return a.name.localeCompare(b.name,'zh-Hant');
  }
}
function card(x){
  return `<article class="card ${x.status==='已截止'?'closed':''}" data-id="${x.id}" tabindex="0">
    <div class="top"><span class="st st-${esc(x.status)}">${esc(x.status)}</span><span class="tag lv-${esc(x.level)}">${esc(x.level)}</span>${x.cats.map(c=>`<span class="tag cat">${esc(c)}</span>`).join('')}${x.year?`<span class="tag">${esc(x.year)}年</span>`:''}${x.region!=='全國'?`<span class="tag">📍${esc(x.region)}</span>`:''}</div>
    <h3>${esc(x.name)}</h3>
    <div class="org">🏛 ${esc(x.org)}${x.target?`　👥 ${esc(x.target)}`:''}</div>
    <p class="summary">${esc(x.summary)}</p>
    ${x.cycle||x.nextOpen?`<div class="cycle">🔁 ${esc(x.nextOpen||x.cycle)}</div>`:''}${x.kind==='歷史'?`<div class="cycle">🗂 ${esc(x.year)}年度${x.parent?'　所屬：'+esc(x.parent):''}</div>`:''}
    <div class="bottom"><span class="dl">截止 <b>${esc(fmtDate(x))}</b>${badge(x)}</span>
      ${x.url?`<a class="btn primary" href="${esc(x.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">原始連結 ↗</a>`:''}</div>
  </article>`;
}
let RES = [], shown = 0; const PAGE = 60;
function more(){
  const next = RES.slice(shown, shown + PAGE);
  $('#list').insertAdjacentHTML('beforeend', next.map(card).join(''));
  shown += next.length;
  let b = document.getElementById('moreBtn');
  if (!b) { b = document.createElement('button'); b.id = 'moreBtn'; b.className = 'btn'; b.style.cssText = 'display:block;margin:16px auto;padding:10px 24px';
    b.onclick = more; $('#list').after(b); }
  b.hidden = shown >= RES.length; b.textContent = `顯示更多（已顯示 ${shown} / ${RES.length}）`;
}
if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting && shown < RES.length) more(); }, {rootMargin:'600px'});
  setTimeout(() => { const b = document.getElementById('moreBtn'); if (b) io.observe(b); }, 0); }
function render(){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===state.tab));
  const isE = state.tab==='esco'; document.body.classList.toggle('esco-mode', isE);
  if (isE) return renderEsco();
  document.querySelectorAll('.chips[data-key]').forEach(box => { const k = box.dataset.key;
    box.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', k==='range' ? state.range===c.dataset.v : state[k].has(c.dataset.v))); });
  const res = items.filter(match).sort(sortFn);
  RES = res; shown = 0; $('#list').innerHTML = ''; more();
  $('#empty').hidden = res.length > 0;
  $('#count').textContent = state.q ? `「${qEl.value.trim()}」找到 ${res.length} 筆補助${statusTouched?'':'（含已截止）'}` : `找到 ${res.length} 筆補助`;
}
$('#list').addEventListener('click', e => { const c = e.target.closest('.card'); if (!c) return; if (c.dataset.e!==undefined) openEsco(+c.dataset.e); else openModal(+c.dataset.id); });
$('#list').addEventListener('keydown', e => { if (e.key==='Enter'){ const c = e.target.closest('.card'); if (c) openModal(+c.dataset.id); }});

function openModal(id){
  const x = items.find(i => i.id === id);
  const row = (k,v,html) => v ? `<dt>${k}</dt><dd>${html ? v : esc(v)}</dd>` : '';
  $('#mBody').innerHTML = `
    <div class="top"><span class="st st-${esc(x.status)}">${esc(x.status)}</span><span class="tag lv-${esc(x.level)}">${esc(x.level)}</span><span class="tag">📍${esc(x.region)}</span></div>
    <h2 id="mTitle">${esc(x.name)}</h2>
    <dl class="kv">
      ${row('主辦單位', x.org)}
      ${row('截止日期', esc(fmtDate(x)) + badge(x), true)}
      ${row('補助對象', x.target)}
      ${row('摘要', x.summary)}
      ${row('年度', x.year)}${row('所屬計畫', x.parent)}${row('週期規律', x.cycle)}
      ${row('預估下次開放', x.nextOpen)}
      ${row('分類', x.cats.join('、'))}${row('資料來源', x.src)}
      ${row('最後更新', x.updated)}
    </dl>
    ${x.notes ? `<div class="notes"><b>備註／參考連結</b><br>${linkify(x.notes)}</div>` : ''}
    <div class="actions">${x.url?`<a class="btn primary" href="${esc(x.url)}" target="_blank" rel="noopener">前往原始公告 ↗</a>`:''}
      <button class="btn" data-close>關閉</button></div>`;
  $('#modal').hidden = false; document.body.style.overflow = 'hidden';
}
const closeModal = () => { $('#modal').hidden = true; document.body.style.overflow = ''; };
$('#modal').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#filters').classList.remove('open'); }});

const open = items.filter(x => x.status==='開放中').length;
const week = items.filter(x => x.days !== null && x.days >= 0 && x.days <= 14).length;
const upcoming = items.filter(x => x.status==='即將開放').length;
const rolling = items.filter(x => x.status==='常態性/依公告').length;
const nc = c => items.filter(x => x.cats.includes(c)).length;
$('#stats').innerHTML = `<span class="stat"><b>${items.length}</b>筆補助</span><span class="stat"><b>${nc('節能')}</b>節能</span><span class="stat"><b>${nc('淨零')}</b>淨零</span><span class="stat"><b>${nc('環境部')}</b>環境部</span><span class="stat"><b>${DATA.esco.length}</b>ESCO 廠商</span><span class="stat"><b>${rolling}</b>常態性/依公告</span><span class="stat"><b>${open}</b>開放中</span><span class="stat"><b>${week}</b>14 天內截止</span><span class="stat"><b>${upcoming}</b>即將開放</span>`;
$('#updated').textContent = DATA.generated; $('#total').textContent = items.length;
// ===== ESCO 廠商 =====
const ES = DATA.esco.map((o,i)=>({...o, i, _t:Object.values(o).join(' ').toLowerCase(), tech:(o['能源系統技術專長']||'').split('，').filter(Boolean), svc:(o['節能服務業務範圍']||'').split('，').filter(Boolean), area:(o['服務範圍']||'').split('，').filter(Boolean)}));
const es = {tech:new Set(), svc:new Set(), area:new Set(), city:'', sort:'wins'};
function eChips(id,key){ const c={}; ES.forEach(o=>o[key].forEach(v=>c[v]=(c[v]||0)+1)); const box=$(id);
  box.innerHTML=Object.keys(c).sort((a,b)=>c[b]-c[a]).map(v=>`<button class="chip" data-v="${esc(v)}">${esc(v)}<small>${c[v]}</small></button>`).join('');
  box.onclick=e=>{const b=e.target.closest('.chip'); if(!b) return; const s=es[key]; s.has(b.dataset.v)?s.delete(b.dataset.v):s.add(b.dataset.v); renderEsco();}; }
eChips('#eTech','tech'); eChips('#eSvc','svc'); eChips('#eArea','area');
{ const c={}; ES.forEach(o=>c[o['縣市']]=(c[o['縣市']]||0)+1); Object.keys(c).sort((a,b)=>c[b]-c[a]).forEach(v=>$('#eCity').insertAdjacentHTML('beforeend',`<option value="${esc(v)}">${esc(v)}（${c[v]}）</option>`)); }
$('#eCity').onchange=e=>{es.city=e.target.value; renderEsco();}; $('#eSort').onchange=e=>{es.sort=e.target.value; renderEsco();};
$('#eReset').onclick=()=>{es.tech.clear();es.svc.clear();es.area.clear();es.city='';$('#eCity').value='';state.q='';qEl.value='';renderEsco();};
function renderEsco(){
  ['tech','svc','area'].forEach(k=>document.querySelectorAll(`#e${{tech:'Tech',svc:'Svc',area:'Area'}[k]} .chip`).forEach(c=>c.classList.toggle('on',es[k].has(c.dataset.v))));
  const q=state.q; let r=ES.filter(o=>(!q||q.split(/\s+/).every(w=>o._t.includes(w)||o._t.includes(w.replace(/臺/g,'台'))))&&[...es.tech].every(v=>o.tech.includes(v))&&[...es.svc].every(v=>o.svc.includes(v))&&[...es.area].every(v=>o.area.includes(v))&&(!es.city||o['縣市']===es.city));
  r.sort((a,b)=> es.sort==='wins'? b['得標件數_2024起']-a['得標件數_2024起'] : es.sort==='cases'? b['改善實績數']-a['改善實績數'] : es.sort==='cap'? (+b['實收資本額_百萬元']||0)-(+a['實收資本額_百萬元']||0) : a['公司名稱'].localeCompare(b['公司名稱'],'zh-Hant'));
  const b=document.getElementById('moreBtn'); if(b) b.hidden=true;
  $('#list').innerHTML=r.map(o=>`<article class="card" data-e="${o.i}" tabindex="0"><div class="top"><span class="tag">📍${esc(o['縣市'])}</span>${o['得標件數_2024起']?`<span class="tag cat">政府標案得標 ${o['得標件數_2024起']} 件</span>`:''}${o['改善實績數']?`<span class="tag">改善實績 ${o['改善實績數']}</span>`:''}</div>
    <h3>${esc(o['公司名稱'])}</h3><div class="org">🔧 ${esc(o.tech.join('、')||'未填')}</div><p class="summary">業務：${esc(o.svc.join('、'))}<br>服務範圍：${esc(o.area.join('、'))}</p>
    <div class="bottom"><span class="dl">☎ ${esc(o['電話'])}</span><a class="btn primary" href="${esc(o['詳情網址'])}" target="_blank" rel="noopener" onclick="event.stopPropagation()">能源署登錄資料 ↗</a></div></article>`).join('');
  $('#empty').hidden=r.length>0; $('#count').textContent=`ESCO 節能服務業廠商 ${r.length} 家`;
}
function openEsco(i){ const o=ES[i]; const row=(k,v)=>v?`<dt>${k}</dt><dd>${linkify(String(v))}</dd>`:'';
  $('#mBody').innerHTML=`<h2 id="mTitle">${esc(o['公司名稱'])}</h2><dl class="kv">${row('統一編號',o['統一編號'])}${row('負責人',o['負責人'])}${row('實收資本額（百萬元）',o['實收資本額_百萬元'])}${row('地址',o['公司地址'])}${row('網址',o['網址'])}${row('電話',o['電話'])}${row('服務範圍',o['服務範圍'])}${row('能源系統技術專長',o['能源系統技術專長'])}${row('節能服務業務範圍',o['節能服務業務範圍'])}${row('公協會',o['公協會'])}${row('改善實績',o['改善實績'])}${row('政府標案得標（2024 起，標案王）',o['得標件數_2024起']?o['得標件數_2024起']+' 件':'')}${row('近期得標案例',o['得標案例'])}</dl>
  <div class="actions"><a class="btn primary" href="${esc(o['詳情網址'])}" target="_blank" rel="noopener">能源署 ESCO 登錄資料 ↗</a><button class="btn" data-close>關閉</button></div>`;
  $('#modal').hidden=false; document.body.style.overflow='hidden'; }
const _q0 = doSearch;
{ const h=location.hash.slice(1); if(['all','urgent','節能','淨零','環境部','esco'].includes(decodeURIComponent(h))) state.tab=decodeURIComponent(h); }
render();
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.tab = b.dataset.t; history.replaceState(null,'','#'+b.dataset.t); render(); });

})();
