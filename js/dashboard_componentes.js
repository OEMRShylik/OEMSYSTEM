// ══════════════════════════════════════════════════
//  DASHBOARD — COMPONENTES
//  Agrega componentes utilizados por mês e por ano
//  a partir dos dados de pedidos + _compDados
// ══════════════════════════════════════════════════

// ── CSS ────────────────────────────────────────────
(function _dashCompCss() {
  if (document.getElementById('dash-comp-css')) return;
  const s = document.createElement('style');
  s.id = 'dash-comp-css';
  s.textContent = `
    /* ── Container geral ── */
    #dash-comp-section {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      margin: 0 16px 16px;
    }

    /* ── Header da seção ── */
    #dash-comp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px 12px;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 10px;
    }
    #dash-comp-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #dash-comp-subtitle {
      font-size: 11px;
      font-weight: 500;
      color: var(--text2);
      margin-top: 2px;
    }

    /* ── Controles ── */
    #dash-comp-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Tabs Mês / Ano */
    .dash-comp-tab {
      padding: 5px 14px;
      border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--white);
      font-size: 12px;
      font-weight: 700;
      color: var(--text2);
      cursor: pointer;
      font-family: Inter, sans-serif;
      transition: all .15s;
    }
    .dash-comp-tab.active {
      background: var(--blue);
      color: #fff;
      border-color: var(--blue);
    }

    /* Seletor de período */
    #dash-comp-periodo {
      padding: 5px 10px;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      font-family: Inter, sans-serif;
      color: var(--text);
      background: var(--white);
      outline: none;
      cursor: pointer;
    }
    #dash-comp-periodo:focus { border-color: var(--blue); }

    /* ── Tabela ── */
    #dash-comp-table-wrap {
      overflow-x: auto;
      max-height: 480px;
      overflow-y: auto;
    }

    #dash-comp-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Inter, sans-serif;
      font-size: 12px;
      min-width: 600px;
    }

    #dash-comp-table thead {
      position: sticky;
      top: 0;
      z-index: 2;
    }

    #dash-comp-table thead th {
      padding: 9px 12px;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      color: var(--text2);
      text-transform: uppercase;
      letter-spacing: .6px;
      white-space: nowrap;
      background: #f8fafc;
      border-bottom: 2px solid var(--border);
    }
    #dash-comp-table thead th.num { text-align: right; }
    #dash-comp-table thead th.total-col {
      background: #eff6ff;
      color: var(--blue);
    }

    #dash-comp-table tbody tr {
      border-bottom: 1px solid rgba(0,0,0,.04);
      transition: background .1s;
    }
    #dash-comp-table tbody tr:last-child { border-bottom: none; }
    #dash-comp-table tbody tr:hover { background: #f8fafc; }

    #dash-comp-table td {
      padding: 9px 12px;
      vertical-align: middle;
      white-space: nowrap;
    }
    #dash-comp-table td.num { text-align: right; }
    #dash-comp-table td.total-col {
      font-weight: 800;
      color: var(--blue);
      background: #f0f7ff;
      text-align: right;
    }

    /* Badge código */
    .dash-comp-cod {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      font-weight: 700;
      background: #f1f5f9;
      color: #1e293b;
      padding: 2px 8px;
      border-radius: 5px;
      border: 1px solid #e2e8f0;
      display: inline-block;
    }

    /* Badge unidade */
    .dash-comp-un-MT {
      font-size: 10px; font-weight: 800;
      padding: 1px 7px; border-radius: 6px;
      background: #e0f2fe; color: #0369a1;
      border: 1px solid #7dd3fc;
    }
    .dash-comp-un-PC {
      font-size: 10px; font-weight: 800;
      padding: 1px 7px; border-radius: 6px;
      background: #f0fdf4; color: #166534;
      border: 1px solid #86efac;
    }

    /* Barra de progresso inline na coluna total */
    .dash-comp-bar-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;
    }
    .dash-comp-bar {
      width: 60px;
      height: 5px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .dash-comp-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: var(--blue);
    }

    /* Estado vazio */
    #dash-comp-empty {
      display: none;
      padding: 48px 24px;
      text-align: center;
      color: var(--text2);
      font-size: 13px;
      font-family: Inter, sans-serif;
    }
    #dash-comp-empty.show { display: block; }

    /* Rodapé com totais gerais */
    #dash-comp-footer {
      padding: 10px 18px;
      border-top: 1px solid var(--border);
      background: #f8fafc;
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      align-items: center;
    }
    .dash-comp-stat {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .dash-comp-stat-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text2);
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .dash-comp-stat-value {
      font-size: 15px;
      font-weight: 800;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .dash-comp-stat-divider {
      width: 1px;
      height: 26px;
      background: var(--border);
    }
  `;
  document.head.appendChild(s);
})();

// ── Estado ──────────────────────────────────────────
let _dcModo    = 'mes';   // 'mes' | 'ano'
let _dcAnoSel  = null;    // ano selecionado no modo 'mes'

// ── Ponto de entrada público ─────────────────────────
function renderDashboardComponentes(containerEl) {
  if (!containerEl) return;
  _dcAnoSel = _dcAnoSel || _detectarAnoAtual();
  containerEl.innerHTML = _buildHTML();
  _attachEvents();
  _renderTabela();
}

// ── Detectar ano com mais dados ──────────────────────
function _detectarAnoAtual() {
  const anos = _getAnos();
  if (!anos.length) return new Date().getFullYear();
  // Prefere o ano mais recente com dados
  return anos[anos.length - 1];
}

// ── Agregar dados ────────────────────────────────────
// Retorna: { [cod]: { componente, descricao, unidade, periodos: {[key]:qtd}, total } }
function _agregar(modo) {
  const resultado = {};

  if (typeof pedidos === 'undefined' || !pedidos?.length) return resultado;
  if (typeof _compDados === 'undefined') return resultado;

  pedidos.forEach(p => {
    const comps = _compDados[p.id];
    if (!comps?.length) return;

    // Parsear data de entrega
    const periodo = _parsePeriodo(p.entrega, modo);
    if (!periodo) return;

    // Filtrar por ano selecionado no modo mês
    if (modo === 'mes') {
      const ano = _parseAno(p.entrega);
      if (ano !== _dcAnoSel) return;
    }

    comps.forEach(comp => {
      const cod = comp.componente;
      if (!cod) return;
      const qtd = parseFloat(comp.quantidade) || 0;

      if (!resultado[cod]) {
        resultado[cod] = {
          componente: cod,
          descricao:  comp.descricao || '',
          unidade:    comp.unidade || 'PC',
          periodos:   {},
          total:      0,
        };
      }
      resultado[cod].periodos[periodo] = (resultado[cod].periodos[periodo] || 0) + qtd;
      resultado[cod].total += qtd;
    });
  });

  return resultado;
}

// ── Parsear período ──────────────────────────────────
function _parsePeriodo(entrega, modo) {
  if (!entrega) return null;
  const parts = entrega.split('/');
  if (parts.length < 3) return null;
  const d = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const y = parseInt(parts[2]);
  if (isNaN(m) || isNaN(y)) return null;
  if (modo === 'mes') return `${String(m).padStart(2,'0')}/${y}`;  // "01/2026"
  return String(y);                                                  // "2026"
}

function _parseAno(entrega) {
  if (!entrega) return null;
  const parts = entrega.split('/');
  return parts.length >= 3 ? parseInt(parts[2]) : null;
}

// ── Obter lista de anos disponíveis ──────────────────
function _getAnos() {
  if (typeof pedidos === 'undefined') return [];
  const anos = new Set();
  pedidos.forEach(p => {
    const a = _parseAno(p.entrega);
    if (a) anos.add(a);
  });
  return [...anos].sort((a, b) => a - b);
}

// ── Obter colunas de período ordenadas ───────────────
function _getColunas(dados, modo) {
  const keys = new Set();
  Object.values(dados).forEach(d => Object.keys(d.periodos).forEach(k => keys.add(k)));
  return [...keys].sort((a, b) => {
    if (modo === 'mes') {
      // "MM/YYYY" → comparar por YYYY depois MM
      const [ma, ya] = a.split('/').map(Number);
      const [mb, yb] = b.split('/').map(Number);
      return ya !== yb ? ya - yb : ma - mb;
    }
    return Number(a) - Number(b);
  });
}

// ── Formatar label da coluna ─────────────────────────
const _MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function _fmtColuna(key, modo) {
  if (modo === 'mes') {
    const [m, y] = key.split('/');
    return `${_MESES[parseInt(m)-1]}/${String(y).slice(2)}`;  // "Jan/26"
  }
  return key;  // "2026"
}

// ── Formatar quantidade ──────────────────────────────
function _fmtQtd(n) {
  if (!n) return '—';
  const f = parseFloat(n);
  if (isNaN(f) || f === 0) return '—';
  return Number.isInteger(f)
    ? f.toLocaleString('pt-BR')
    : f.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Construir HTML base ──────────────────────────────
function _buildHTML() {
  const anos = _getAnos();
  const anoOpts = anos.map(a =>
    `<option value="${a}" ${a === _dcAnoSel ? 'selected' : ''}>${a}</option>`
  ).join('');

  return `
    <div id="dash-comp-section">
      <div id="dash-comp-header">
        <div>
          <div id="dash-comp-title">🔩 Consumo de Componentes</div>
          <div id="dash-comp-subtitle">Matéria-prima consumida por período, calculada a partir das Ordens de Produção</div>
        </div>
        <div id="dash-comp-controls">
          <button class="dash-comp-tab active" id="dc-tab-mes"  onclick="_dcSetModo('mes')">Por Mês</button>
          <button class="dash-comp-tab"        id="dc-tab-ano"  onclick="_dcSetModo('ano')">Por Ano</button>
          <select id="dash-comp-periodo" onchange="_dcSetAno(+this.value)" title="Selecionar ano">
            ${anoOpts || '<option>—</option>'}
          </select>
        </div>
      </div>

      <div id="dash-comp-table-wrap">
        <table id="dash-comp-table">
          <thead id="dash-comp-thead"><tr></tr></thead>
          <tbody id="dash-comp-tbody"></tbody>
        </table>
        <div id="dash-comp-empty">🔩 Nenhum componente encontrado.<br>Abra pedidos e clique em <strong>Componentes</strong> para calcular o consumo.</div>
      </div>

      <div id="dash-comp-footer" id="dash-comp-footer-el"></div>
    </div>
  `;
}

// ── Eventos ──────────────────────────────────────────
function _attachEvents() {}  // inline onclick usado

function _dcSetModo(modo) {
  _dcModo = modo;
  document.getElementById('dc-tab-mes')?.classList.toggle('active', modo === 'mes');
  document.getElementById('dc-tab-ano')?.classList.toggle('active', modo === 'ano');
  // Mostrar/esconder seletor de ano
  const sel = document.getElementById('dash-comp-periodo');
  if (sel) sel.style.display = modo === 'mes' ? '' : 'none';
  _renderTabela();
}

function _dcSetAno(ano) {
  _dcAnoSel = ano;
  _renderTabela();
}

// ── Renderizar tabela ────────────────────────────────
function _renderTabela() {
  const dados   = _agregar(_dcModo);
  const colunas = _getColunas(dados, _dcModo);
  const itens   = Object.values(dados).sort((a, b) => b.total - a.total);

  const thead   = document.getElementById('dash-comp-thead');
  const tbody   = document.getElementById('dash-comp-tbody');
  const emptyEl = document.getElementById('dash-comp-empty');
  const footer  = document.getElementById('dash-comp-footer');
  const sel     = document.getElementById('dash-comp-periodo');

  if (!thead || !tbody) return;

  // Atualiza visibilidade do seletor de ano
  if (sel) sel.style.display = _dcModo === 'mes' ? '' : 'none';

  if (!itens.length) {
    thead.innerHTML = '<tr></tr>';
    tbody.innerHTML = '';
    emptyEl?.classList.add('show');
    if (footer) footer.innerHTML = '';
    return;
  }
  emptyEl?.classList.remove('show');

  // ── Header ──
  const maxTotal = Math.max(...itens.map(i => i.total));
  thead.innerHTML = `<tr>
    <th>Componente</th>
    <th>Descrição</th>
    <th>Un.</th>
    ${colunas.map(k => `<th class="num">${_fmtColuna(k, _dcModo)}</th>`).join('')}
    <th class="num total-col">Total</th>
  </tr>`;

  // ── Linhas ──
  tbody.innerHTML = itens.map(it => {
    const unCls = it.unidade === 'MT' ? 'dash-comp-un-MT' : 'dash-comp-un-PC';
    const pct   = maxTotal > 0 ? (it.total / maxTotal * 100).toFixed(1) : 0;
    const cells = colunas.map(k => {
      const v = it.periodos[k];
      const txt = v ? _fmtQtd(v) : '<span style="color:#e5e7eb;">—</span>';
      return `<td class="num">${txt}</td>`;
    }).join('');

    return `<tr>
      <td><span class="dash-comp-cod">${_esc(it.componente)}</span></td>
      <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;color:var(--text);">${_esc(it.descricao)}</td>
      <td><span class="${unCls}">${it.unidade}</span></td>
      ${cells}
      <td class="total-col">
        <div class="dash-comp-bar-wrap">
          <span>${_fmtQtd(it.total)}</span>
          <div class="dash-comp-bar">
            <div class="dash-comp-bar-fill" style="width:${pct}%;"></div>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');

  // ── Rodapé ──
  const totalPedidosComDados = (typeof pedidos !== 'undefined')
    ? pedidos.filter(p => {
        if (_dcModo === 'mes') {
          const a = _parseAno(p.entrega);
          return a === _dcAnoSel && _compDados?.[p.id]?.length;
        }
        return _compDados?.[p.id]?.length;
      }).length
    : 0;

  const totalTipos = itens.length;
  const totalPC    = itens.filter(i => i.unidade === 'PC').reduce((s,i) => s + i.total, 0);
  const totalMT    = itens.filter(i => i.unidade === 'MT').reduce((s,i) => s + i.total, 0);

  if (footer) {
    footer.innerHTML = `
      <div class="dash-comp-stat">
        <div class="dash-comp-stat-label">Tipos de componente</div>
        <div class="dash-comp-stat-value">${totalTipos}</div>
      </div>
      <div class="dash-comp-stat-divider"></div>
      <div class="dash-comp-stat">
        <div class="dash-comp-stat-label">Total peças (PC)</div>
        <div class="dash-comp-stat-value">${_fmtQtd(totalPC)}</div>
      </div>
      <div class="dash-comp-stat-divider"></div>
      <div class="dash-comp-stat">
        <div class="dash-comp-stat-label">Total metros (MT)</div>
        <div class="dash-comp-stat-value">${_fmtQtd(totalMT)}</div>
      </div>
      <div class="dash-comp-stat-divider"></div>
      <div class="dash-comp-stat">
        <div class="dash-comp-stat-label">Pedidos calculados</div>
        <div class="dash-comp-stat-value">${totalPedidosComDados}</div>
      </div>
    `;
  }
}

// ── Escape HTML ──────────────────────────────────────
function _esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Expõe globalmente ────────────────────────────────
window.renderDashboardComponentes = renderDashboardComponentes;
window._dcSetModo = _dcSetModo;
window._dcSetAno  = _dcSetAno;
