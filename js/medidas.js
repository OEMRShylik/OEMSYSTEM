// ══════════════════════════════════════════════════
//  MODAL NOVO PEDIDO
// ══════════════════════════════════════════════════
//  MEDIDAS PRENSAGEM — cascata
// ══════════════════════════════════════════════════
function buildPrMang() {
  const mangs = [...new Set(CRIMP.map(r=>r.mang))].sort();
  const sel = document.getElementById('pr-mang');
  mangs.forEach(m => { const o=document.createElement('option'); o.value=m; o.textContent=m; sel.appendChild(o); });
}

function prOnMang() {
  const mang = document.getElementById('pr-mang').value;
  prClearResults();
  hide('pr-row-size'); hide('pr-row-capa'); hide('pr-results');
  if (!mang) return;
  // Para cada size único, pegar o primeiro cod correspondente para exibir como label
  const rows = CRIMP.filter(r=>r.mang===mang);
  const seen = new Map();
  rows.forEach(r => { if(!seen.has(r.size)) seen.set(r.size, r.cod); });
  const sel = document.getElementById('pr-size');
  sel.innerHTML = '<option value="">Selecionar tamanho</option>';
  seen.forEach((cod, size) => {
    const o = document.createElement('option');
    o.value = size;
    o.textContent = cod;
    sel.appendChild(o);
  });
  show('pr-row-size');
}

function prOnSize() {
  const mang = document.getElementById('pr-mang').value;
  const size = document.getElementById('pr-size').value;
  prClearResults();
  hide('pr-row-capa'); hide('pr-results');
  if (!size) return;
  const capas = [...new Set(CRIMP.filter(r=>r.mang===mang&&r.size===size).map(r=>r.capa))];
  const chips = document.getElementById('pr-capa-chips');
  chips.innerHTML = '';
  capas.forEach(c => {
    const btn = document.createElement('button');
    btn.textContent = c;
    btn.style.cssText = 'padding:8px 14px;border:1.5px solid #1e2d40;border-radius:6px;font-size:14.4px;font-weight:700;cursor:pointer;background:#0a0e1a;color:#8899aa;transition:all .12s;font-family:Inter,sans-serif;';
    btn.onmouseover = () => { if(!btn.dataset.sel){ btn.style.borderColor='#4a90ff'; btn.style.color='#4a90ff'; }};
    btn.onmouseout  = () => { if(!btn.dataset.sel){ btn.style.borderColor='#1e2d40'; btn.style.color='#8899aa'; }};
    btn.onclick = () => {
      chips.querySelectorAll('button').forEach(b=>{delete b.dataset.sel;b.style.background='#0a0e1a';b.style.borderColor='#1e2d40';b.style.color='#8899aa';});
      btn.dataset.sel='1'; btn.style.background='#1a56db'; btn.style.borderColor='#4a90ff'; btn.style.color='#fff';
      prSelectCapa(c, btn);
    };
    chips.appendChild(btn);
  });
  show('pr-row-capa');
}

function prSelectCapa(capa, btn) {
  document.querySelectorAll('#pr-capa-chips button').forEach(b=>{
    delete b.dataset.sel;
    b.style.background='#0a0e1a'; b.style.borderColor='#1e2d40'; b.style.color='#8899aa';
  });
  btn.dataset.sel='1'; btn.style.background='#1a56db'; btn.style.borderColor='#4a90ff'; btn.style.color='#fff';

  const mang = document.getElementById('pr-mang').value;
  const size = document.getElementById('pr-size').value;
  const row = CRIMP.find(r=>r.mang===mang&&r.size===size&&r.capa===capa);
  if (!row) return;

  const cor = row.correcao;
  const corStr = cor===0 ? '0,0' : (cor>0?'+':'')+cor.toFixed(1);
  const corColor = '#ffffff';

  // SVG elements — TELA vai para o centro, MEDIDA é referência do paquímetro
  const svgCastanha = document.getElementById('pr-castanha');
  const svgMedida   = document.getElementById('pr-medida');   // exibe TELA
  const svgCorrecao = document.getElementById('pr-correcao');
  if (svgCastanha) svgCastanha.textContent = row.castanha;
  if (svgMedida)   svgMedida.textContent   = row.tela.toFixed(1);   // ← TELA
  if (svgCorrecao) { svgCorrecao.textContent = corStr; svgCorrecao.setAttribute('fill', corColor); }

  // Side panel — mostra medida (MEDIDA do PDF), castanha e correção
  const sideMedida   = document.getElementById('pr-medida-side');
  const sideCastanha = document.getElementById('pr-castanha-side');
  const sideCorrecao = document.getElementById('pr-correcao-side');
  if (sideMedida)   sideMedida.textContent   = row.tela.toFixed(1); // tela no centro
  if (sideCastanha) sideCastanha.textContent = row.castanha;
  if (sideCorrecao) { sideCorrecao.textContent = corStr; sideCorrecao.style.color = corColor; }
  const sidePaq = document.getElementById('pr-paq-side');
  if (sidePaq) { sidePaq.textContent = row.medida.toFixed(2); sidePaq.style.color = '#c8e060'; }

  // Paquímetro: display inicial = MEDIDA do PDF (valor alvo para comparação)
  const paqEl   = document.getElementById('pr-paquimetro');
  const paqDisp = document.getElementById('pr-paq-display');
  if (paqEl)   paqEl.value = '';
  paqSetDisplay(row.medida.toFixed(2), '#1e2e1e');

  // Guarda medida de referência no dataset para prCheckPaquimetro
  if (paqEl) paqEl.dataset.ref = row.medida;

  // Show results
  document.getElementById('pr-results').style.display = 'flex';
  const div = document.getElementById('pr-results-divider');
  if (div) div.style.display = 'block';
}

// ══ PAQUÍMETRO 7 segmentos (visor LCD fiel) ══
(function(){
  const SEGS={'0':[1,1,1,1,1,1,0],'1':[0,1,1,0,0,0,0],'2':[1,1,0,1,1,0,1],
    '3':[1,1,1,1,0,0,1],'4':[0,1,1,0,0,1,1],'5':[1,0,1,1,0,1,1],
    '6':[1,0,1,1,1,1,1],'7':[1,1,1,0,0,0,0],'8':[1,1,1,1,1,1,1],
    '9':[1,1,1,1,0,1,1],'-':[0,0,0,0,0,0,1],' ':[0,0,0,0,0,0,0],'.':[0,0,0,0,0,0,0]};
  const DW=22,DH=42,GAP=4,SW=5;
  // Segmento vertical: hexágono com chanfro nas pontas (topo e base)
  function segV(x,y,len,w){
    const c=w*0.42;
    return `M${x+c},${y} L${x+w-c},${y} L${x+w},${y+c} L${x+w},${y+len-c} L${x+w-c},${y+len} L${x+c},${y+len} L${x},${y+len-c} L${x},${y+c} Z`;
  }
  // Segmento horizontal: hexágono com chanfro nas pontas (esq e dir)
  function segH(x,y,len,w){
    const c=w*0.42;
    return `M${x+c},${y} L${x+len-c},${y} L${x+len},${y+c} L${x+len},${y+w-c} L${x+len-c},${y+w} L${x+c},${y+w} L${x},${y+w-c} L${x},${y+c} Z`;
  }
  function drawDigit(g,x,bits,col,dim){
    const w=SW,half=DH/2,len=DW-w;
    [{d:segH(x+w/2,0,len,w),i:0},{d:segV(x+DW-w,w/2,half-w,w),i:1},
     {d:segV(x+DW-w,half+w/2,half-w,w),i:2},{d:segH(x+w/2,DH-w,len,w),i:3},
     {d:segV(x,half+w/2,half-w,w),i:4},{d:segV(x,w/2,half-w,w),i:5},
     {d:segH(x+w/2,half-w/2,len,w),i:6}
    ].forEach(s=>{
      const el=document.createElementNS('http://www.w3.org/2000/svg','path');
      el.setAttribute('d',s.d);el.setAttribute('fill',bits[s.i]?col:dim);g.appendChild(el);
    });
  }
  function drawDot(g,x,col){
    const r=document.createElementNS('http://www.w3.org/2000/svg','rect');
    r.setAttribute('x',x);r.setAttribute('y',DH-SW);r.setAttribute('width',SW+1);
    r.setAttribute('height',SW+1);r.setAttribute('rx','1');r.setAttribute('fill',col);g.appendChild(r);
  }
  window.paqRenderDisplay=function(text,color){
    const g=document.getElementById('pr-paq-digits');
    if(!g)return;
    while(g.firstChild)g.removeChild(g.firstChild);
    const dim='rgba(80,110,80,0.28)';
    const chars=text.split('');
    let totalW=0;
    chars.forEach(c=>{totalW+=(c==='.')?SW+3:DW+GAP;});
    totalW-=GAP;
    let cx=Math.max(0,114-totalW);
    chars.forEach(c=>{
      if(c==='.'){drawDot(g,cx,color);cx+=SW+3;}
      else{drawDigit(g,cx,SEGS[c]||SEGS[' '],color,dim);cx+=DW+GAP;}
    });
  };
  window.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{if(window.paqRenderDisplay)window.paqRenderDisplay('  -  ','#1e2e1e');},100);
  });
})();

function paqSetDisplay(text,color){
  const el=document.getElementById('pr-paq-display');
  if(el)el.textContent=text;
  if(window.paqRenderDisplay)window.paqRenderDisplay(text,color||'#1e2e1e');
}

function prCheckPaquimetro() {
  const paqEl=document.getElementById('pr-paquimetro');
  if(!paqEl)return;
  const paq=parseFloat(paqEl.value);
  const ref=parseFloat(paqEl.dataset.ref||'NaN');
  if(isNaN(paq)){
    paqSetDisplay(isNaN(ref)?'  - ':'  '+ref.toFixed(2),'#1e2e1e');
    return;
  }
  const txt=paq.toFixed(2);
  if(isNaN(ref)){paqSetDisplay(txt,'#1e2e1e');return;}
  const diff=Math.abs(paq-ref);
  paqSetDisplay(txt, diff<=0.5?'#0a5a20':diff<=1.0?'#8a4a00':'#7a0a0a');
}

function prClearResults() {
  // Limpa apenas as medidas exibidas, sem tocar nas seleções de mangueira/tamanho/capa
  const svgC = document.getElementById('pr-castanha'); if(svgC) svgC.textContent='—';
  const svgM = document.getElementById('pr-medida');   if(svgM) svgM.textContent='—';
  const svgR = document.getElementById('pr-correcao'); if(svgR){ svgR.textContent='—'; svgR.setAttribute('fill','#ffffff'); }
  paqSetDisplay('  -  ','#1e2e1e');
  const sm = document.getElementById('pr-medida-side');   if(sm) sm.textContent='—';
  const sc = document.getElementById('pr-castanha-side'); if(sc) sc.textContent='—';
  const sr = document.getElementById('pr-correcao-side'); if(sr){ sr.textContent='—'; sr.style.color='#ffffff'; }
  const sp = document.getElementById('pr-paq-side'); if(sp){ sp.textContent='—'; sp.style.color='#c8e060'; }
  const pEl = document.getElementById('pr-paquimetro'); if(pEl) pEl.value='';
  const res = document.getElementById('pr-results'); if(res) res.style.display='none';
  const div = document.getElementById('pr-results-divider'); if(div) div.style.display='none';
}

function prReset() {
  document.getElementById('pr-mang').value = '';
  hide('pr-row-size'); hide('pr-row-capa');
  // SVG resets
  const svgC = document.getElementById('pr-castanha'); if(svgC) svgC.textContent='—';
  const svgM = document.getElementById('pr-medida');   if(svgM) svgM.textContent='—';
  const svgR = document.getElementById('pr-correcao'); if(svgR){ svgR.textContent='—'; svgR.setAttribute('fill','#ffffff'); }
  paqSetDisplay('  -  ','#1e2e1e');
  // Side panel resets
  const sm = document.getElementById('pr-medida-side');   if(sm) sm.textContent='—';
  const sc = document.getElementById('pr-castanha-side'); if(sc) sc.textContent='—';
  const sr = document.getElementById('pr-correcao-side'); if(sr){ sr.textContent='—'; sr.style.color='#ffffff'; }
  const sp = document.getElementById('pr-paq-side'); if(sp){ sp.textContent='—'; sp.style.color='#c8e060'; }
  // Paquimetro input
  const pEl = document.getElementById('pr-paquimetro'); if(pEl) pEl.value='';
  // Results panel
  const res = document.getElementById('pr-results'); if(res) res.style.display='none';
  const div = document.getElementById('pr-results-divider'); if(div) div.style.display='none';
}

// Clock for prensagem screen
function updatePrClock() {
  const el = document.getElementById('pr-clock');
  if (el) el.textContent = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
}

function show(id) { const el=document.getElementById(id); el.style.display=''; void el.offsetWidth; }
function hide(id) { document.getElementById(id).style.display='none'; }

