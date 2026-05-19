// ══════════════════════════════════════════════════
//  COMPONENTES.JS  —  OEM RS
//  View dos componentes utilizados em um pedido
//  Campos: Componente, Descrição, Medida, Quantidade
//  Dados: persistidos em db/components.json via Flask
// ══════════════════════════════════════════════════

// ── CSS injetado uma única vez ──────────────────────
(function _css() {
  if (document.getElementById('comp-css')) return;
  const s = document.createElement('style');
  s.id = 'comp-css';
  s.textContent = `
    /* ── Tela de componentes ── */
    #comp-root {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg, #f9fafb);
      font-family: Inter, system-ui, sans-serif;
    }

    /* Barra de pesquisa + contador */
    #comp-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px 10px;
      flex-shrink: 0;
    }
    #comp-search {
      flex: 1;
      padding: 8px 12px;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      font-size: 13px;
      font-family: Inter, sans-serif;
      outline: none;
      background: #fff;
      transition: border-color .15s;
    }
    #comp-search:focus { border-color: #1a56db; }
    #comp-count {
      font-size: 11px;
      font-weight: 700;
      color: #6b7280;
      white-space: nowrap;
      background: #f3f4f6;
      padding: 4px 10px;
      border-radius: 10px;
    }

    /* Tabela */
    #comp-table-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 0 16px 16px;
    }
    #comp-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Inter, sans-serif;
      font-size: 13px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }
    #comp-table thead tr {
      background: #f8fafc;
      border-bottom: 2px solid #e5e7eb;
    }
    #comp-table thead th {
      padding: 11px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: .6px;
      white-space: nowrap;
      user-select: none;
      cursor: pointer;
    }
    #comp-table thead th:hover { color: #1a56db; }
    #comp-table thead th.sorted-asc::after  { content: ' ↑'; color: #1a56db; }
    #comp-table thead th.sorted-desc::after { content: ' ↓'; color: #1a56db; }

    #comp-table tbody tr {
      border-bottom: 1px solid rgba(0,0,0,.04);
      transition: background .1s;
    }
    #comp-table tbody tr:last-child { border-bottom: none; }
    #comp-table tbody tr:hover { background: #f8fafc; }

    #comp-table td {
      padding: 10px 14px;
      vertical-align: middle;
    }

    /* Coluna Componente — badge monoespaçado */
    .comp-cod {
      font-family: 'Courier New', 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      background: #f1f5f9;
      color: #1e293b;
      padding: 3px 9px;
      border-radius: 6px;
      display: inline-block;
      white-space: nowrap;
      border: 1px solid #e2e8f0;
    }

    /* Coluna Descrição */
    .comp-desc {
      color: #374151;
      font-size: 13px;
      max-width: 260px;
    }

    /* Coluna Medida */
    .comp-medida {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #1a56db;
      white-space: nowrap;
      text-align: right;
    }

    /* Coluna Quantidade */
    .comp-qtd {
      font-weight: 800;
      color: #111;
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .comp-qtd-unit {
      font-size: 10px;
      font-weight: 600;
      color: #9ca3af;
      margin-left: 3px;
    }

    /* Estado vazio */
    #comp-empty {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 56px 24px;
      color: #9ca3af;
      text-align: center;
    }
    #comp-empty.visible { display: flex; }
    #comp-empty-icon { font-size: 48px; opacity: .4; }
    #comp-empty-title {
      font-size: 15px;
      font-weight: 700;
      color: #374151;
    }
    #comp-empty-sub {
      font-size: 13px;
      color: #9ca3af;
    }

    /* Rodapé com totais */
    #comp-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      background: #fff;
      border-top: 1px solid #e5e7eb;
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .comp-total-item {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .comp-total-label {
      font-size: 10px;
      font-weight: 700;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .comp-total-value {
      font-size: 16px;
      font-weight: 800;
      color: #111;
      font-variant-numeric: tabular-nums;
    }
    .comp-total-divider {
      width: 1px;
      height: 28px;
      background: #e5e7eb;
    }

    @keyframes compFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #comp-root { animation: compFadeIn .18s ease; }
  `;
  document.head.appendChild(s);
})();

// ── Estado local ────────────────────────────────────
let _compPedidoId  = null;   // id do pedido ativo
let _compDados     = {};      // { [pedidoId]: [{componente,descricao,medida,quantidade,unidade}] }
let _compFiltro    = '';
let _compSortCol   = null;
let _compSortDir   = 1;       // 1=asc, -1=desc

// ── Carregar banco de componentes ───────────────────
async function _compCarregar() {
  // Tenta servidor
  try {
    const r = await fetch('db/components.json', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      _compDados = j.pedidos || {};
      return;
    }
  } catch (_) {}

  // Fallback localStorage
  try {
    const raw = localStorage.getItem('oem_components_v1');
    if (raw) _compDados = JSON.parse(raw).pedidos || {};
  } catch (_) {}
}

// ── Salvar banco de componentes ─────────────────────
async function _compSalvar() {
  const payload = JSON.stringify({ pedidos: _compDados });

  // localStorage como cache rápido
  try { localStorage.setItem('oem_components_v1', payload); } catch (_) {}

  // Servidor
  try {
    await fetch('/salvar_components', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  } catch (_) {}
}

// ── Abrir tela de componentes ───────────────────────
async function abrirComponentes() {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  _compPedidoId = p.id;
  _compFiltro   = '';
  _compSortCol  = null;
  _compSortDir  = 1;

  // Fecha qualquer viewer de PDF aberto
  if (typeof _fecharViewer === 'function') _fecharViewer();

  const conteudo = document.getElementById('detalhe-conteudo');
  if (!conteudo) return;
  conteudo.innerHTML = '';

  // Garante dados carregados
  await _compCarregar();

  // Sempre recalcula se o pedido tem paginasOP (garante quantidades corretas)
  // Isso evita servir cache com cálculo antigo/errado
  if (p.paginasOP?.length) {
    const calculado = _extrairComponentesDaOP(p.paginasOP);
    if (calculado.length) {
      _compDados[p.id] = calculado;
      await _compSalvar();
    }
  }

  conteudo.appendChild(_compBuildUI(p));
  _compRenderTabela();
}

// ── Filtro de matéria prima ────────────────────────
// Matéria prima: código começa com LETRA (H, S, HA, HCP, HPT, S2SC, SR...)
// Ignorar: começa com dígito → mangueira montada finalizada (99.xxx, 12345...)
function _isMateriaPrima(codigo) {
  if (!codigo) return false;
  return /^[A-Za-z]/.test(codigo.trim());
}

// ── Extrair componentes com cálculo correto de quantidades ──
//
// Estrutura da OP:
//   Página índice (is_index=true):
//     item_qty    = quantidade de kits a produzir (ex: 18)
//     lista_itens = mangueiras montadas com qtd POR KIT (ex: 4 PC 99.150.861)
//
//   Páginas filhas (is_index=false):
//     item_codigo = código da mangueira montada (ex: "99.150.861")
//     lista_itens = matéria prima com qtd POR UNIDADE da mangueira
//
// Cálculo:
//   qtd_total_mang = qtd_no_kit × qtd_kits
//   qtd_total_comp = qtd_comp_por_unidade × qtd_total_mang
//
function _extrairComponentesDaOP(paginasOP) {
  const mapa = {};

  // 1. Encontrar página índice e quantidade de kits
  const pgIdx = paginasOP.find(pg => pg.is_index);
  const qtdKits = pgIdx ? (parseFloat(pgIdx.item_qty) || 1) : 1;

  // 2. Montar mapa: código_mangueira_montada → qtd_no_kit
  //    (itens da página índice que NÃO são matéria prima)
  const qtdNoKit = {};
  if (pgIdx?.lista_itens?.length) {
    pgIdx.lista_itens.forEach(it => {
      const cod = (it.codigo || '').trim();
      if (cod && !_isMateriaPrima(cod)) {
        // É uma mangueira montada (99.xxx) → guarda qtd por kit
        qtdNoKit[cod] = (parseFloat(it.quantidade) || 0);
      }
    });
  }

  // 3. Incluir itens H* da página índice (corte_mm = 0): componentes comuns ao kit inteiro
  if (pgIdx?.lista_itens?.length) {
    pgIdx.lista_itens.forEach(it => {
      const cod = (it.codigo || '').trim();
      if (!cod || !/^H/i.test(cod)) return; // só itens começados com H
      const qtdTotal = (parseFloat(it.quantidade) || 0) * qtdKits;
      if (mapa[cod]) {
        mapa[cod].quantidade += qtdTotal;
      } else {
        mapa[cod] = {
          componente: cod,
          descricao:  it.descricao || '',
          quantidade: qtdTotal,
          unidade:    _classificarUnidade(cod, it.unidade),
        };
      }
    });
  }

  // 4. Para cada página, calcular quantidades reais dos componentes
  //    Pula apenas a página de índice/resumo (pgIdx); demais páginas com corte=0
  //    são acessórios válidos (ex: adaptadores HEA08M) e devem ser contabilizados.
  paginasOP.forEach(pg => {
    if (pg === pgIdx) return;                 // pula só o índice principal
    if (!pg.lista_itens?.length) return;

    let qtdTotalMang;
    if (pg.is_index) {
      // Índice secundário (outro tipo de kit no mesmo pedido):
      // usa a própria item_qty sem multiplicar por qtdKits
      qtdTotalMang = parseFloat(pg.item_qty) || 1;
    } else {
      const codMang   = (pg.item_codigo || '').trim();
      const qtdPorKit = qtdNoKit[codMang] ?? (parseFloat(pg.item_qty) || 1);
      qtdTotalMang    = qtdPorKit * qtdKits; // ex: 4 × 18 = 72
    }

    pg.lista_itens.forEach(it => {
      const cod = (it.codigo || '').trim();
      if (!cod || !_isMateriaPrima(cod)) return; // ignora montadas

      const qtdPorUnidade = parseFloat(it.quantidade) || 0;
      const qtdTotal      = qtdPorUnidade * qtdTotalMang;

      if (mapa[cod]) {
        mapa[cod].quantidade += qtdTotal;
      } else {
        mapa[cod] = {
          componente: cod,
          descricao:  it.descricao || '',
          quantidade: qtdTotal,
          unidade:    _classificarUnidade(cod, it.unidade),
        };
      }
    });
  });

  // 5. Fallback: se não achou página índice, tenta extração simples
  //    filtrando só matéria prima (evita mostrar nada)
  if (!pgIdx && !Object.keys(mapa).length) {
    paginasOP.forEach(pg => {
      (pg.lista_itens || []).forEach(it => {
        const cod = (it.codigo || '').trim();
        if (!cod || !_isMateriaPrima(cod)) return;
        const qtd = parseFloat(it.quantidade) || 0;
        if (mapa[cod]) {
          mapa[cod].quantidade += qtd;
        } else {
          mapa[cod] = {
            componente: cod,
            descricao:  it.descricao || '',
            quantidade: qtd,
            unidade:    _classificarUnidade(cod, it.unidade),
          };
        }
      });
    });
  }

  return Object.values(mapa).sort((a, b) => a.componente.localeCompare(b.componente));
}

// ── Classificar unidade por tipo de componente ─────
// MT  → mangueiras (H2SC, H1SC, HR, SR, S2SC, S1SC, HPM, HRP...)
// PC  → terminais (HPT, HPAS, HPAG, HFJ, HFB, HFG, HFS, HFTB...),
//        capas (HCP), adaptadores (HA, HAA, HAM, HV, HP...),
//        demais peças
function _classificarUnidade(codigo, unidadeOriginal) {
  const cod = (codigo || '').toUpperCase().trim();

  // Mangueiras cruas e protetores → MT (metros)
  // H2SC, H1SC, H3SC, H4SP, HR1, HR2, HR3...
  // S2SC, S1SC, SR17, SR25...
  // HPM (protetor), HRP (revestimento)
  if (/^H[1-4]SC/i.test(cod))  return 'MT';
  if (/^HR\d/i.test(cod))       return 'MT';
  if (/^S[1-4]SC/i.test(cod))  return 'MT';
  if (/^SR\d/i.test(cod))       return 'MT';
  if (/^HPM/i.test(cod))        return 'MT';
  if (/^HRP/i.test(cod))        return 'MT';
  if (/^H2SP/i.test(cod))       return 'MT';
  if (/^H4SP/i.test(cod))       return 'MT';

  // Todo o resto → PC (peças): terminais, capas, adaptadores, conexões
  return 'PC';
}



// ── Construir UI ────────────────────────────────────
function _compBuildUI(p) {
  const root = document.createElement('div');
  root.id = 'comp-root';

  root.innerHTML = `
    <!-- Tabela -->
    <div id="comp-table-wrap">
      <table id="comp-table">
        <thead>
          <tr>
            <th id="comp-th-componente">Componente</th>
            <th id="comp-th-descricao">Descrição</th>
            <th id="comp-th-unidade" style="text-align:center;">Unidade</th>
            <th id="comp-th-quantidade" style="text-align:right;">Quantidade</th>
          </tr>
        </thead>
        <tbody id="comp-tbody"></tbody>
      </table>

      <!-- Estado vazio -->
      <div id="comp-empty">
        <div id="comp-empty-icon">🔩</div>
        <div id="comp-empty-title">Nenhum componente encontrado</div>
        <div id="comp-empty-sub" id="comp-empty-sub"></div>
      </div>
    </div>

  `;

  return root;
}

// ── Renderizar tabela ───────────────────────────────
function _compRenderTabela() {
  const itens = _compGetItens();

  const tbody    = document.getElementById('comp-tbody');
  const emptyEl  = document.getElementById('comp-empty');
  const emptySubEl = document.getElementById('comp-empty-sub');

  if (!tbody) return;

  if (!itens.length) {
    tbody.innerHTML = '';
    emptyEl?.classList.add('visible');
    if (emptySubEl) {
      emptySubEl.textContent = _compFiltro
        ? `Nenhum resultado para "${_compFiltro}"`
        : 'Este pedido não possui componentes registrados.';
    }

    return;
  }

  emptyEl?.classList.remove('visible');



  // Destaque da busca
  const q = _compFiltro.trim();

  tbody.innerHTML = itens.map(it => {
    const cod    = _compHighlight(it.componente || '', q);
    const desc   = _compHighlight(it.descricao  || '', q);
    const unidade = it.unidade || '—';
    const qtd    = parseFloat(it.quantidade) || 0;
    const qtdFmt = _compFmtQtd(qtd);

    // Cor da badge de unidade
    const unBg    = unidade === 'MT' ? '#e0f2fe' : '#f0fdf4';
    const unColor = unidade === 'MT' ? '#0369a1' : '#166534';
    const unBorder= unidade === 'MT' ? '#7dd3fc' : '#86efac';

    return `<tr>
      <td><span class="comp-cod">${cod}</span></td>
      <td><span class="comp-desc">${desc}</span></td>
      <td style="text-align:center;">
        <span style="display:inline-block;font-size:11px;font-weight:800;padding:2px 10px;
                     border-radius:8px;letter-spacing:.4px;
                     background:${unBg};color:${unColor};border:1px solid ${unBorder};">
          ${unidade}
        </span>
      </td>
      <td>
        <span class="comp-qtd">${qtdFmt}</span>
      </td>
    </tr>`;
  }).join('');
}

// ── Busca ───────────────────────────────────────────
function _compBuscar(q) {
  _compFiltro = q;
  _compRenderTabela();
}

// ── Ordenação ───────────────────────────────────────
function _compSort(col) {
  if (_compSortCol === col) {
    _compSortDir *= -1;
  } else {
    _compSortCol = col;
    _compSortDir = 1;
  }
  _compRenderTabela();
}

// ── Itens filtrados + ordenados ─────────────────────
function _compGetItens() {
  let lista = (_compDados[_compPedidoId] || []).slice();

  // Filtro
  const q = _compFiltro.trim().toLowerCase();
  if (q) {
    lista = lista.filter(it =>
      (it.componente || '').toLowerCase().includes(q) ||
      (it.descricao  || '').toLowerCase().includes(q) ||
      (it.medida     || '').toLowerCase().includes(q) ||
      String(it.quantidade || '').includes(q)
    );
  }

  // Ordenação
  if (_compSortCol) {
    lista.sort((a, b) => {
      let va = a[_compSortCol] ?? '';
      let vb = b[_compSortCol] ?? '';
      if (_compSortCol === 'quantidade') {
        return (parseFloat(va) - parseFloat(vb)) * _compSortDir;
      }
      return String(va).localeCompare(String(vb), 'pt-BR') * _compSortDir;
    });
  }

  return lista;
}

// ── Utilitários ─────────────────────────────────────

// Formata quantidade: inteiro se sem casas, decimal se necessário
function _compFmtQtd(n) {
  if (!n && n !== 0) return '—';
  const f = parseFloat(n);
  if (isNaN(f)) return String(n);
  return Number.isInteger(f)
    ? f.toLocaleString('pt-BR')
    : f.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

// Destaca termo buscado no texto
function _compHighlight(text, q) {
  if (!q || !text) return _esc(text);
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return _esc(text).replace(
    new RegExp(`(${safe})`, 'gi'),
    '<mark style="background:#fef9c3;color:#92400e;border-radius:2px;padding:0 1px;">$1</mark>'
  );
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Expõe globalmente ───────────────────────────────
window.abrirComponentes  = abrirComponentes;
window._compBuscar       = _compBuscar;
window._compSort         = _compSort;
