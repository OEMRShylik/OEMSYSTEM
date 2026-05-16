// ══════════════════════════════════════════════════
//  DASHBOARD — OEM RS
//  Dados: carregados dinamicamente de db/report.json
//  Faturamento: lançado manualmente pelo dashboard
// ══════════════════════════════════════════════════

// ── Dias úteis estimados por mês (para mang/dia e mang/hora) ──
const DIAS_UTEIS = {
  '01':22,'02':20,'03':21,'04':22,'05':21,'06':22,
  '07':23,'08':21,'09':22,'10':23,'11':20,'12':19
};
const HORAS_DIA = 8.5;

// ── Nomes dos meses ──
const MES_NOME = {
  '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril',
  '05':'Maio','06':'Junho','07':'Julho','08':'Agosto',
  '09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro'
};

// ── State ──
window.DASH_ANO     = 'all';
window.DASH_MES_SEL = null;
window.DASH_PEDIDOS = [];

// ── Dados calculados dinamicamente ──
let _D_IND = [];   // indicadores mensais
let _D_CLI = [];   // clientes consolidados
let _D_ANOS = [];  // anos disponíveis

// ════════════════════════════════════════════════════
//  CARREGAR DADOS DO REPORT.JSON
// ════════════════════════════════════════════════════

async function _carregarReport() {
  try {
    const r = await fetch('/db/report.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    const peds = (json.pedidos || []).filter(p => p && p.pedido);
    window.DASH_PEDIDOS = peds;
    _calcularIndicadores(peds);
    return true;
  } catch (e) {
    console.warn('[dashboard] report.json indisponível:', e);
    // Fallback: usa DASH_PEDIDOS que já pode ter sido setado
    if (window.DASH_PEDIDOS?.length) {
      _calcularIndicadores(window.DASH_PEDIDOS);
      return true;
    }
    return false;
  }
}

function _calcularIndicadores(peds) {
  // Agrupar por mês+ano
  const porMes = {};
  peds.forEach(p => {
    const key = `${p.ano}-${p.mes}`;
    if (!porMes[key]) {
      porMes[key] = {
        mes: MES_NOME[p.mes] || p.mes_nome || p.mes,
        mes_num: p.mes,
        ano: p.ano,
        pedidos: 0,
        mang: 0,
        faturamento: 0,
      };
    }
    porMes[key].pedidos++;
    porMes[key].mang    += (p.qtd || 0);
    porMes[key].faturamento += (p.fat || 0);
  });

  // Calcular mang/dia e mang/hora e ordenar
  _D_IND = Object.values(porMes)
    .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes_num.localeCompare(b.mes_num))
    .map(d => {
      const dias  = DIAS_UTEIS[d.mes_num] || 22;
      const horas = dias * HORAS_DIA;
      return {
        ...d,
        mang_dia:  dias  > 0 ? Math.round((d.mang / dias)  * 100) / 100 : 0,
        mang_hora: horas > 0 ? Math.round((d.mang / horas) * 100) / 100 : 0,
      };
    });

  // Anos disponíveis
  _D_ANOS = [...new Set(_D_IND.map(d => d.ano))].sort();

  // Clientes consolidados
  const porCli = {};
  peds.forEach(p => {
    if (!porCli[p.cliente]) porCli[p.cliente] = { cliente: p.cliente, pedidos: 0, faturamento: 0, mang: 0 };
    porCli[p.cliente].pedidos++;
    porCli[p.cliente].faturamento += (p.fat || 0);
    porCli[p.cliente].mang        += (p.qtd || 0);
  });
  _D_CLI = Object.values(porCli).sort((a, b) => b.faturamento - a.faturamento);

  // Montar MESES_ORD dinamicamente
  window._MESES_ORD = _D_IND.map(d => ({
    mes:  d.mes_num,
    ano:  d.ano,
    nome: d.mes.slice(0, 3) + '/' + String(d.ano).slice(2),
  }));
}

function _filtrarInd(ano) {
  if (ano === 'all') return _D_IND;
  return _D_IND.filter(d => d.ano === parseInt(ano));
}
function _filtrarCli(ano) {
  if (ano === 'all') return _D_CLI;
  const peds = window.DASH_PEDIDOS.filter(p => p.ano === parseInt(ano));
  const map = {};
  peds.forEach(p => {
    if (!map[p.cliente]) map[p.cliente] = { cliente: p.cliente, pedidos: 0, faturamento: 0, mang: 0 };
    map[p.cliente].pedidos++;
    map[p.cliente].faturamento += (p.fat || 0);
    map[p.cliente].mang        += (p.qtd || 0);
  });
  return Object.values(map).sort((a, b) => b.faturamento - a.faturamento);
}

// ════════════════════════════════════════════════════
//  RENDER PRINCIPAL
// ════════════════════════════════════════════════════

async function renderDashboard() {
  const root = document.getElementById('dash-root');
  if (!root) return;

  // Mostrar loading enquanto carrega
  if (!_D_IND.length) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;
      font-family:Inter,sans-serif;color:#6b7280;gap:12px;">
      <div style="width:20px;height:20px;border:3px solid #e5e7eb;border-top-color:#1a56db;
        border-radius:50%;animation:spin .7s linear infinite;"></div>
      Carregando dados...
    </div>`;
    await _carregarReport();
    if (!_D_IND.length) {
      root.innerHTML = `<div style="padding:48px;text-align:center;font-family:Inter,sans-serif;color:#9ca3af;">
        <div style="font-size:32px;margin-bottom:8px;">📊</div>
        <div style="font-size:15px;font-weight:700;color:#374151;">Sem dados de produção</div>
        <div style="font-size:13px;margin-top:6px;">Adicione pedidos via <strong>+ Novo Pedido</strong> para popular o dashboard.</div>
      </div>`;
      return;
    }
  } else {
    // Recarrega dados silenciosamente
    await _carregarReport();
  }

  const ano    = window.DASH_ANO;
  const indAT  = _filtrarInd(ano);
  const cliAT  = _filtrarCli(ano);
  const allInd = _D_IND;

  if (!indAT.length) { renderDashboard._retry = true; return; }

  const totFat  = indAT.reduce((s, d) => s + d.faturamento, 0);
  const totMang = indAT.reduce((s, d) => s + d.mang, 0);
  const totPed  = indAT.reduce((s, d) => s + d.pedidos, 0);
  const maxMang = Math.max(...allInd.map(d => d.mang), 1);
  const maxFat  = Math.max(...cliAT.map(c => c.faturamento), 1);

  const ultimo   = indAT[indAT.length - 1] || indAT[0];
  const anterior = indAT[indAT.length - 2] || ultimo;

  const ticketMedio = ultimo.pedidos > 0 ? ultimo.faturamento / ultimo.pedidos : 0;
  const ticketAnt   = anterior.pedidos > 0 ? anterior.faturamento / anterior.pedidos : 0;

  const fmtR  = v => 'R$\u00a0' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtRc = v => 'R$\u00a0' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt   = v => v >= 1e6 ? (v/1e6).toFixed(2)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'k' : String(Math.round(v));
  const dV    = v => v > 0 ? '▲' : v < 0 ? '▼' : '—';
  const dC    = v => v > 0 ? 'up' : v < 0 ? 'dn' : '';
  const dd    = (a, b, k) => { const v = a[k]-b[k]; return `<span class="dash-delta ${dC(v)}">${dV(v)}</span>`; };

  const MESES_ORD = window._MESES_ORD || [];
  const mesSel    = window.DASH_MES_SEL || MESES_ORD[MESES_ORD.length - 1] || { mes: '01', ano: new Date().getFullYear() };
  const pedsMes   = window.DASH_PEDIDOS
    .filter(p => p.mes === mesSel.mes && p.ano === mesSel.ano)
    .sort((a, b) => b.qtd - a.qtd);
  const totQtdMes = pedsMes.reduce((s, p) => s + (p.qtd || 0), 0);
  const totFatMes = pedsMes.reduce((s, p) => s + (p.fat || 0), 0);

  const periodoStr = _D_ANOS.length
    ? _D_ANOS[0] === _D_ANOS[_D_ANOS.length-1]
      ? String(_D_ANOS[0])
      : _D_ANOS[0] + ' – ' + _D_ANOS[_D_ANOS.length-1]
    : '';

  root.innerHTML = `
  <div class="dash-wrap">

    <!-- HEADER -->
    <div class="dash-header">
      <div>
        <div class="dash-title">Dashboard de Produção</div>
        <div class="dash-subtitle">OEM RS · ${periodoStr} · ${allInd.length} ${allInd.length===1?'mês':'meses'}</div>
      </div>
      <div class="dash-year-tabs">
        <button class="dash-ytab ${ano==='all'?'active':''}"  onclick="dashFiltrar('all',this)">Geral</button>
        ${_D_ANOS.slice().reverse().map(a =>
          `<button class="dash-ytab ${ano===String(a)?'active':''}" onclick="dashFiltrar('${a}',this)">${a}</button>`
        ).join('')}
      </div>
    </div>

    <!-- KPIs -->
    <div class="dash-kpis">
      ${_kpi('📦','Pedidos',       totPed,                      `${indAT.length} ${indAT.length===1?'mês':'meses'} acumulado`, '')}
      ${_kpi('🔧','Produção',      fmt(totMang)+' mang',        `${fmt(Math.round(totMang/indAT.length))}/mês médio`, '')}
      ${_kpi('💰','Faturamento',   fmtR(totFat),                `${fmtR(Math.round(totFat/indAT.length))}/mês médio`, '')}
      ${_kpi('⚡','Mang/hora',     ultimo.mang_hora.toFixed(2), `${anterior.mang_hora.toFixed(2)} mês ant. ${dd(ultimo,anterior,'mang_hora')}`, '')}
      ${_kpi('📋','Ticket Médio',  fmtR(ticketMedio),           `${fmtR(ticketAnt)} mês ant. <span class="dash-delta ${dC(ticketMedio-ticketAnt)}">${dV(ticketMedio-ticketAnt)}</span>`, ticketMedio>ticketAnt?'kpi-ok':'kpi-amber')}
      ${_kpi('🏆','Maior Cliente', cliAT[0]?.cliente||'—',      fmtR(cliAT[0]?.faturamento||0), '')}
      ${_kpi('📈','Mang/dia',      ultimo.mang_dia.toFixed(1),  `${anterior.mang_dia.toFixed(1)} mês ant. ${dd(ultimo,anterior,'mang_dia')}`, '')}
      ${_kpi('🗓️','Último mês',    fmtR(ultimo.faturamento),    `${ultimo.mes} · ${ultimo.pedidos} pedidos`, '')}
    </div>

    <!-- BARRAS + CLIENTES -->
    <div class="dash-charts-row">
      <div class="dash-card">
        <div class="dash-card-title">
          Produção Mensal (mangueiras)
          <span style="margin-left:auto;display:flex;gap:10px;font-size:11px;font-weight:400;color:#6b7280">
            ${_D_ANOS.map((a,i) => {
              const cores = ['#3b82f6','#10b981','#f59e0b','#ef4444'];
              return `<span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cores[i%cores.length]};margin-right:3px;vertical-align:middle"></span>${a}</span>`;
            }).join('')}
          </span>
        </div>
        <div class="dash-bar-chart">
          ${allInd.map((d, i) => {
            const pct  = Math.round((d.mang / maxMang) * 100);
            const lbl  = d.mes.slice(0,3) + '/' + String(d.ano).slice(2);
            const last = i === allInd.length - 1;
            const dim  = ano !== 'all' && d.ano !== parseInt(ano);
            const anoIdx = _D_ANOS.indexOf(d.ano);
            const cores  = ['y2026','y2025','y2027','y2028'];
            return `<div class="dash-bar-col" title="${d.mes} ${d.ano}: ${d.mang.toLocaleString('pt-BR')} mang">
              <div class="dash-bar-val">${d.mang>=1000?(d.mang/1000).toFixed(1)+'k':d.mang}</div>
              <div class="dash-bar-track">
                <div class="dash-bar-fill ${last?'current':''} ${cores[anoIdx]||'y2025'}"
                  style="height:${pct}%;${dim?'opacity:0.2':''}"></div>
              </div>
              <div class="dash-bar-lbl ${last?'active':''}" style="${dim?'opacity:0.3':''}">${lbl}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="dash-card dash-card-sm">
        <div class="dash-card-title">Top por Pedidos <span class="dash-badge">${ano==='all'?'Geral':ano}</span></div>
        <div style="display:flex;flex-direction:column;gap:7px;">
          ${[...cliAT].sort((a,b)=>b.pedidos-a.pedidos).slice(0,10).map((c,i)=>`
            <div style="display:flex;align-items:center;gap:7px;font-family:Inter,sans-serif;">
              <div style="font-size:11px;font-weight:800;color:#94a3b8;min-width:16px;">${'①②③④⑤⑥⑦⑧⑨⑩'[i]||i+1}</div>
              <div style="font-size:11px;font-weight:700;color:#374151;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.cliente}</div>
              <div style="font-size:10px;background:#eff6ff;color:#1d4ed8;padding:1px 7px;border-radius:8px;font-weight:700;">${c.pedidos}p</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- FATURAMENTO POR CLIENTE -->
    <div class="dash-card dash-card-full">
      <div class="dash-card-title">Faturamento por Cliente <span class="dash-badge">${ano==='all'?'Geral':ano}</span></div>
      <div style="display:flex;flex-direction:column;gap:7px;">
        ${cliAT.slice(0,14).map((c,i)=>{
          const pct=Math.round((c.faturamento/maxFat)*100);
          const cores=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6','#a855f7','#6366f1','#f43f5e','#0ea5e9'];
          return `<div style="display:flex;align-items:center;gap:8px;font-family:Inter,sans-serif;">
            <div style="width:110px;font-size:11px;font-weight:700;color:#374151;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.cliente}</div>
            <div style="flex:1;height:20px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
              <div class="dash-fat-bar" style="height:100%;background:${cores[i%cores.length]};width:0%;border-radius:4px;opacity:0.82;" data-w="${pct}"></div>
            </div>
            <div style="font-size:11px;font-weight:700;color:#111;min-width:90px;text-align:right;">${fmtR(c.faturamento)}</div>
            <div style="font-size:10px;color:#9ca3af;min-width:24px;text-align:right;">${c.pedidos}p</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- TABELA MENSAL -->
    <div class="dash-card dash-card-full">
      <div class="dash-card-title">Indicadores Mensais</div>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead>
            <tr><th>Mês</th><th>Pedidos</th><th>Produção</th><th>Mang/dia</th><th>Mang/hora</th><th>Faturamento</th><th>Ticket Médio</th></tr>
          </thead>
          <tbody>
            ${allInd.map((d,i)=>{
              const last=i===allInd.length-1;
              const dim=ano!=='all'&&d.ano!==parseInt(ano);
              const tick=d.pedidos>0?fmtR(d.faturamento/d.pedidos):'—';
              return `<tr class="${last?'dash-tr-highlight':''}" style="${dim?'opacity:0.35':''}">
                <td><strong>${d.mes}</strong> <span class="dash-yr-badge">${d.ano}</span></td>
                <td>${d.pedidos}</td>
                <td><strong>${d.mang.toLocaleString('pt-BR')}</strong></td>
                <td>${d.mang_dia.toFixed(1)}</td>
                <td>${d.mang_hora.toFixed(2)}</td>
                <td><strong>${fmtR(d.faturamento)}</strong></td>
                <td>${tick}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="dash-tfoot">
              <td><strong>TOTAL/MÉD.</strong></td>
              <td>${allInd.reduce((s,d)=>s+d.pedidos,0)}</td>
              <td><strong>${allInd.reduce((s,d)=>s+d.mang,0).toLocaleString('pt-BR')}</strong></td>
              <td>${(allInd.reduce((s,d)=>s+d.mang_dia,0)/allInd.length).toFixed(1)}</td>
              <td>${(allInd.reduce((s,d)=>s+d.mang_hora,0)/allInd.length).toFixed(2)}</td>
              <td><strong>${fmtR(allInd.reduce((s,d)=>s+d.faturamento,0))}</strong></td>
              <td>${fmtR(allInd.reduce((s,d)=>s+d.faturamento,0)/Math.max(1,allInd.reduce((s,d)=>s+d.pedidos,0)))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- PEDIDOS POR MÊS -->
    <div class="dash-card dash-card-full" id="dash-pedidos-card">
      <div class="dash-card-title" style="flex-wrap:wrap;gap:10px;">
        <span>Pedidos do Mês</span>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-left:auto;">
          ${MESES_ORD.map(m=>`
            <button class="dash-mes-btn ${m.mes===mesSel.mes&&m.ano===mesSel.ano?'active':''}"
              onclick="dashSelMes('${m.mes}',${m.ano})">
              ${m.nome}
            </button>`).join('')}
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
        <div class="dash-mes-stat">
          <div class="dash-mes-stat-val">${pedsMes.length}</div>
          <div class="dash-mes-stat-lbl">Pedidos</div>
        </div>
        <div class="dash-mes-stat">
          <div class="dash-mes-stat-val">${totQtdMes.toLocaleString('pt-BR')}</div>
          <div class="dash-mes-stat-lbl">Mangueiras</div>
        </div>
        <div class="dash-mes-stat">
          <div class="dash-mes-stat-val">${fmtR(totFatMes)}</div>
          <div class="dash-mes-stat-lbl">Faturamento</div>
        </div>
        <div style="margin-left:auto;">
          <input type="text" placeholder="🔍 Buscar pedido ou cliente..."
            oninput="dashFiltrarPedidos(this.value)"
            style="padding:6px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;
                   font-family:Inter,sans-serif;outline:none;width:240px;transition:border-color .15s;"
            onfocus="this.style.borderColor='#1a56db'" onblur="this.style.borderColor='#e5e7eb'">
        </div>
      </div>

      <div class="dash-table-wrap">
        <table class="dash-table" id="dash-ped-table">
          <thead>
            <tr>
              <th style="width:110px">Pedido</th>
              <th>Cliente</th>
              <th style="text-align:right">Mangueiras</th>
              <th style="text-align:right;min-width:160px">Faturamento</th>
            </tr>
          </thead>
          <tbody id="dash-ped-tbody">
            ${_renderPedidosRows(pedsMes, fmtRc)}
          </tbody>
        </table>
      </div>
    </div>

  </div>`;

  // Animações
  requestAnimationFrame(() => {
    document.querySelectorAll('.dash-bar-fill').forEach((el, i) => {
      const h = el.style.height; el.style.height = '0';
      el.style.transition = `height .55s cubic-bezier(.34,1.56,.64,1) ${i*.04}s`;
      requestAnimationFrame(() => { el.style.height = h; });
    });
    document.querySelectorAll('.dash-fat-bar').forEach((el, i) => {
      const w = el.dataset.w + '%'; el.style.width = '0';
      el.style.transition = `width .6s ease ${i*.05}s`;
      requestAnimationFrame(() => { el.style.width = w; });
    });
  });
}

// ── Tabela de pedidos com botão de faturamento ──
function _renderPedidosRows(peds, fmtRc) {
  if (!peds.length) return `<tr><td colspan="4" style="text-align:center;padding:24px;color:#9ca3af;font-family:Inter,sans-serif;">Nenhum pedido encontrado</td></tr>`;

  // Admin pode editar faturamento
  const isAdmin = typeof currentUser !== 'undefined' && currentUser?.setor === 'Admin';

  return peds.map(p => {
    const temFat   = p.fat != null && p.fat > 0;
    const fatStr   = temFat
      ? `<span style="font-family:Inter,sans-serif;font-size:12px;font-weight:700;color:#059669;">${fmtRc(p.fat)}</span>`
      : `<span style="color:#d1d5db;font-size:12px;">—</span>`;

    const btnFat = isAdmin
      ? `<button class="btn-fat-edit ${temFat ? 'tem-fat' : ''}"
          onclick="event.stopPropagation(); abrirModalFaturamento('${p.pedido}','${p.cliente.replace(/'/g,"\\'")}',${p.fat ?? null})"
          title="${temFat ? 'Editar faturamento' : 'Lançar faturamento'}">
          💰 ${temFat ? 'Editar' : 'Lançar'}
        </button>`
      : '';

    const qtdColor = (p.qtd||0) >= 300 ? '#7c3aed' : (p.qtd||0) >= 100 ? '#1d4ed8' : '#374151';

    return `<tr class="dash-ped-row" onclick="dashAbrirPedido('${p.pedido}')" title="Clique para abrir #${p.pedido}">
      <td><span class="dash-ped-num">#${p.pedido}</span></td>
      <td><strong>${p.cliente}</strong></td>
      <td style="text-align:right;font-family:'Courier New',monospace;font-weight:700;color:${qtdColor};">
        ${(p.qtd||0) > 0 ? (p.qtd).toLocaleString('pt-BR') : '<span style="color:#d1d5db">—</span>'}
      </td>
      <td style="text-align:right;">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
          ${fatStr}
          ${btnFat}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Filtrar busca de pedidos ──
function dashFiltrarPedidos(q) {
  const mesSel = window.DASH_MES_SEL || (window._MESES_ORD || [])[((window._MESES_ORD||[]).length)-1] || {};
  const fmtRc  = v => 'R$\u00a0' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let peds = window.DASH_PEDIDOS
    .filter(p => p.mes === mesSel.mes && p.ano === mesSel.ano)
    .sort((a, b) => b.qtd - a.qtd);
  if (q?.trim()) {
    const qq = q.toLowerCase();
    peds = peds.filter(p => p.pedido.toLowerCase().includes(qq) || p.cliente.toLowerCase().includes(qq));
  }
  const tbody = document.getElementById('dash-ped-tbody');
  if (tbody) tbody.innerHTML = _renderPedidosRows(peds, fmtRc);
}

// ── Selecionar mês ──
function dashSelMes(mes, ano) {
  window.DASH_MES_SEL = { mes, ano };
  renderDashboard();
  setTimeout(() => {
    document.getElementById('dash-pedidos-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
}

// ── Abrir pedido ──
function dashAbrirPedido(numPedido) {
  if (typeof pedidos !== 'undefined' && pedidos.length) {
    const idx = pedidos.findIndex(p => p.id === numPedido || p.id === numPedido.replace(/^0+/, ''));
    if (idx >= 0 && typeof abrirPedido === 'function') { abrirPedido(idx); return; }
  }
  const p = window.DASH_PEDIDOS.find(x => x.pedido === numPedido);
  if (p) _dashModalPedido(p);
}

function _dashModalPedido(p) {
  const fmtR = v => 'R$\u00a0' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isAdmin = typeof currentUser !== 'undefined' && currentUser?.setor === 'Admin';
  let m = document.getElementById('dash-ped-modal');
  if (!m) { m = document.createElement('div'); m.id = 'dash-ped-modal'; m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);'; document.body.appendChild(m); }
  m.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:340px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.22);animation:upcIn .18s ease;">
      <div style="background:linear-gradient(135deg,#1a56db,#0e3fa8);padding:24px 20px 20px;position:relative;">
        <button onclick="document.getElementById('dash-ped-modal').remove()" style="position:absolute;top:12px;right:14px;background:rgba(255,255,255,.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Pedido</div>
        <div style="font-size:24px;font-weight:900;color:#fff;font-family:'Roboto',sans-serif;">#${p.pedido}</div>
        <div style="font-size:14px;font-weight:700;color:rgba(255,255,255,.9);margin-top:4px;">${p.cliente}</div>
      </div>
      <div style="padding:20px;font-family:Inter,sans-serif;display:flex;flex-direction:column;gap:0;">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:13px;color:#6b7280;">Mangueiras</span>
          <span style="font-size:13px;font-weight:700;color:#1a56db;">${(p.qtd||0) > 0 ? p.qtd.toLocaleString('pt-BR')+' un.' : '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:13px;color:#6b7280;">Faturamento</span>
          <span style="font-size:13px;font-weight:700;color:${(p.fat||0)>0?'#059669':'#9ca3af'}">${(p.fat||0)>0?fmtR(p.fat):'Não lançado'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;">
          <span style="font-size:13px;color:#6b7280;">Período</span>
          <span style="font-size:13px;font-weight:700;">${MES_NOME[p.mes]||p.mes_nome||p.mes} ${p.ano}</span>
        </div>
        ${isAdmin ? `<button class="btn-fat-edit ${(p.fat||0)>0?'tem-fat':''}" style="width:100%;justify-content:center;margin-top:8px;padding:10px;"
          onclick="document.getElementById('dash-ped-modal').remove(); abrirModalFaturamento('${p.pedido}','${p.cliente.replace(/'/g,"\\'")}',${p.fat??null})">
          💰 ${(p.fat||0)>0?'Editar faturamento':'Lançar faturamento'}
        </button>` : ''}
      </div>
    </div>`;
  m.onclick = e => { if (e.target === m) m.remove(); };
}

// ── Helpers ──
function _kpi(icon, label, val, sub, cls) {
  return `<div class="dash-kpi ${cls}">
    <div class="dash-kpi-icon">${icon}</div>
    <div class="dash-kpi-body">
      <div class="dash-kpi-label">${label}</div>
      <div class="dash-kpi-val">${val}</div>
      <div class="dash-kpi-sub">${sub}</div>
    </div>
  </div>`;
}

function dashFiltrar(ano, btn) {
  window.DASH_ANO = String(ano);
  renderDashboard();
}
