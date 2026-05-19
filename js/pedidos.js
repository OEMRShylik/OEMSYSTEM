// ══════════════════════════════════════════════════
//  DETALHE DO PEDIDO
// ══════════════════════════════════════════════════

let _paginasOP    = [];
let _adminOpAtivo = {}; // operador escolhido pelo admin para cada coluna (persiste durante o pedido)

function _filtrarPaginasBrancas(paginas) {
  return (paginas || []).filter(pg =>
    !!(pg.item_codigo) || !!(pg.descricao) || !!(pg.lista_itens?.length) || pg.corte_mm != null
  );
}

function _filtrarPaginasParaEtapa(paginas, etapa) {
  const base = _filtrarPaginasBrancas(paginas);
  if (etapa === 'corte') {
    // Excluir páginas de índice/kit (corte_mm=0) — exibidas apenas via botão de kit
    const itens = base.filter(pg => !pg.is_index);
    if (!itens.some(pg => pg._cortado)) return itens;
    return itens.filter(pg => !pg._cortado);
  }
  if (etapa === 'prensagem') {
    const itens = base.filter(pg => !pg.is_index);
    if (!itens.some(pg => pg._cortado)) return itens;
    return itens.filter(pg => pg._cortado && !pg._prensado);
  }
  if (etapa === 'embalagem') {
    const itens = base.filter(pg => !pg.is_index);
    if (!itens.some(pg => pg._prensado)) return itens;
    return itens.filter(pg => pg._prensado);
  }
  return base;
}
let _paginaAtual  = 0;
let _marcadorAtivo = false;

let _pdfDoc      = null;
let _pdfPage     = 1;
let _pdfB64      = null;

async function abrirPedido(idx) {
  currentPedidoIdx = idx;
  const p = pedidos[idx];
  const _etapaEfetiva = window._forcarEtapa ?? p.etapa;
  window._forcarEtapa       = null;
  window._etapaVizualizacao = _etapaEfetiva;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-detalhe').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const _navPed = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (_navPed) _navPed.classList.add('active');

  document.getElementById('detalhe-title').textContent = `#${p.id} — ${p.cliente}`;
  document.getElementById('detalhe-date').textContent  = p.entrega ? `Entrega: ${p.entrega}` : '';

  const badge = document.getElementById('detalhe-status-badge');
  const colorMap = {
    separacao:  'background:#eff6ff;color:#1e40af',
    inspecao:   'background:#f0fdf4;color:#166534',
    corte:      'background:#fee2e2;color:#991b1b',
    prensagem:  'background:#fef9c3;color:#854d0e',
    embalagem:  'background:#dcfce7;color:#166534',
    finalizado: 'background:#f3f4f6;color:#374151'
  };
  if (p.subEtapa === 'aprovacao') {
    badge.textContent = 'EM APROVAÇÃO';
    badge.style.cssText = 'font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;background:#fef3c7;color:#92400e;border:1px solid #fbbf24;';
  } else if (_etapaEfetiva !== p.etapa) {
    badge.textContent = 'PENDÊNCIAS DE ' + _etapaEfetiva.toUpperCase();
    badge.style.cssText = 'font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;background:#fef3c7;color:#92400e;border:1px solid #fbbf24;';
  } else {
    badge.textContent = (p.etapa || '').toUpperCase();
    badge.style.cssText = `font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;${colorMap[p.etapa]||'background:#f3f4f6;color:#374151'}`;
  }

  // Botão Limpar Pedido — apenas Admin
  {
    const _isAdminLimpar = typeof currentUser !== 'undefined' &&
      (currentUser?.setor === 'Admin' || currentUser?.permissoes?.all === true);
    const _btnLimpar = document.getElementById('btn-limpar-pedido');
    if (_btnLimpar) _btnLimpar.style.display = _isAdminLimpar ? '' : 'none';
  }

  _adminOpAtivo = {}; // reset ao trocar de pedido
  _paginasOP   = _filtrarPaginasParaEtapa(p.paginasOP, _etapaEfetiva);
  _paginaAtual = 0;

  // Auto-detecta tipo se ainda não definido e paginasOP disponível
  if (!p.tipo && p.paginasOP?.length) {
    p.tipo = _detectarTipoPedido(p.paginasOP);
    if (p.tipo) salvarEstado();
  }
  _pdfDoc      = null;
  _pdfB64      = null;

  Object.keys(_amostrasDB).forEach(k => delete _amostrasDB[k]);
  if (p.amostragens && typeof p.amostragens === 'object') {
    // Re-mapeia de índice real (p.paginasOP) para índice filtrado (_paginasOP)
    const _fullPags = p.paginasOP || [];
    _paginasOP.forEach((pg, fi) => {
      const ri = _fullPags.indexOf(pg);
      if (ri >= 0 && p.amostragens[ri]) {
        _amostrasDB[fi] = JSON.parse(JSON.stringify(p.amostragens[ri]));
      }
    });
    const _colEtapaMap = { corte:'corte', prensagem:'prensagem', embalagem:'conferencia' };
    const _colAtiva    = _colEtapaMap[_etapaEfetiva];
    Object.values(_amostrasDB).forEach(db => {
      delete db._etapa_preenchida;
      // Em modo fantasma, limpa a coluna da etapa pendente — itens pulados não têm valores válidos
      if (_etapaEfetiva !== p.etapa && _colAtiva && Array.isArray(db.amostras)) {
        db.amostras.forEach(am => { am[_colAtiva] = ''; });
      }
    });
  }

  _mostrarConteudo('');

  // Garante extração da OP independente da etapa
  if (!p.paginasOP && p.pdfB64) _extrairDadosPDF(p);

  // Modo aprovação: apenas admin pode abrir
  if (p.subEtapa === 'aprovacao') {
    const _isAdmin = typeof currentUser !== 'undefined' &&
      (currentUser?.setor === 'Admin' || currentUser?.permissoes?.all === true);
    if (!_isAdmin) return;
    setTimeout(() => _mostrarPainelAprovacao(currentPedidoIdx), 60);
    return;
  }
}

// Página é índice de kit se: marcada is_index OU (corte=0 com lista_itens só de PC, sem MT)
function _paginaEhIndice(pg) {
  if (pg.is_index) return true;
  if ((pg.corte_mm || 0) > 0) return false;
  return pg.lista_itens?.length > 0 &&
         !pg.lista_itens.some(it => it.unidade === 'MT');
}

// Detecta tipo do pedido a partir das páginas da OP
function _detectarTipoPedido(paginasOP) {
  const pags = paginasOP || [];
  if (!pags.length) return null;
  const temIndice = pags.some(_paginaEhIndice);
  const temCorte  = pags.some(pg => (pg.corte_mm || 0) > 0);
  if (temIndice && temCorte)  return 'mangueira-kit';
  if (!temIndice && temCorte) return 'mangueira-avulso';
  return 'pecas';
}

async function _extrairDadosPDF(p) {
  try {
    const b64 = p.pdfB64;
    if (!b64) return;
    const resp = await fetch('/extrair', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ data: b64, filename: 'op.pdf' }),
    });
    if (resp.ok) {
      const data = await resp.json();
      p.paginasOP = _filtrarPaginasBrancas(data.paginas);
      _paginasOP  = p.paginasOP;
      // Auto-detecta tipo se ainda não foi definido manualmente
      if (!p.tipo && p.paginasOP?.length) {
        p.tipo = _detectarTipoPedido(p.paginasOP);
        // Re-renderiza painel de aprovação se estiver aberto (tipo acabou de ser detectado)
        if (p.subEtapa === 'aprovacao' && currentPedidoIdx !== null && pedidos[currentPedidoIdx] === p) {
          setTimeout(() => _mostrarPainelAprovacao(currentPedidoIdx), 0);
        }
      }
      salvarEstado();
    }
  } catch(e) { console.error('Extrair:', e); }
}

function _arrayBufferToB64(buf) {
  const uint8 = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < uint8.length; i += 8192)
    bin += String.fromCharCode(...uint8.subarray(i, i + 8192));
  return btoa(bin);
}

// ══════════════════════════════════════════════════
//  INICIAR PEDIDO
// ══════════════════════════════════════════════════
function abrirIniciarPedido() {
  const _p = pedidos[currentPedidoIdx];
  // Retomar da última página SOMENTE se a etapa não mudou desde a última visita
  const _emModoFantasma = window._etapaVizualizacao && window._etapaVizualizacao !== _p?.etapa;
  const _podeRetomar = !_emModoFantasma
    && _p?._iniciado
    && _p?._ultimaPagina != null
    && _p?._ultimaEtapa === _p?.etapa;
  _paginaAtual = _podeRetomar ? Math.min(_p._ultimaPagina, Math.max(0, _paginasOP.length - 1)) : 0;

  // Registra timestamp de início da etapa (só no primeiro Iniciar, não no Retomar, e não em modo fantasma)
  if (_p && !_podeRetomar && !_emModoFantasma) {
    const _etapaAtiva = _p.etapa;
    if (_etapaAtiva && !['separacao', 'finalizado'].includes(_etapaAtiva)) {
      if (!_p._ts_etapas) _p._ts_etapas = {};
      if (!_p._ts_etapas[_etapaAtiva + '_inicio']) {
        _p._ts_etapas[_etapaAtiva + '_inicio'] = new Date().toISOString();
      }
    }
  }

  _fecharViewer();

  const p = pedidos[currentPedidoIdx];

  // Pedido finalizado: exibir tela somente-leitura com amostragens
  if (p?.etapa === 'finalizado') {
    _mostrarPedidoFinalizado();
    return;
  }

  const conteudo = document.getElementById('detalhe-conteudo');
  if (conteudo) conteudo.innerHTML = '';

  _mostrarPaginaOP();
}

const _amostrasDB = {};

function _getAmostras(pageIdx, pg) {
  if (!_amostrasDB[pageIdx]) {
    const qty = Math.max(1, Math.min(8, Math.round(pg.item_qty || 1)));
    _amostrasDB[pageIdx] = {
      amostras: Array.from({length: qty}, () => ({
        corte: '', prensagem: '', conferencia: '', embalagem: ''
      })),
      operador:    '',
      visualizado: false,
      ts_inicio:   null,
    };
  }
  return _amostrasDB[pageIdx];
}

function _registrarAbertura(pageIdx, pg) {
  const db    = _getAmostras(pageIdx, pg);
  const etapa = pedidos[currentPedidoIdx]?.etapa || 'separacao';

  // Registra operador/timestamp apenas na primeira visualização
  if (!db.visualizado) {
    db.visualizado = true;
    db.ts_inicio   = new Date().toISOString();
    db.operador    = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.nome : '';
  }

  // Registra operador ativo por etapa (sem auto-preencher valores — operador preenche manualmente)
  const _nomeOp  = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.nome : '';
  const _isAdmin = typeof currentUser !== 'undefined' &&
    (currentUser?.setor === 'Admin' || currentUser?.permissoes?.all === true);

  if (etapa === 'corte' && !db.operador_corte) {
    if (_isAdmin && _adminOpAtivo.operador_corte) db.operador_corte = _adminOpAtivo.operador_corte;
    else if (_nomeOp) db.operador_corte = _nomeOp;
  }
  if (etapa === 'prensagem' && !db.operador_prensagem) {
    if (_isAdmin && _adminOpAtivo.operador_prensagem) db.operador_prensagem = _adminOpAtivo.operador_prensagem;
    else if (_nomeOp) db.operador_prensagem = _nomeOp;
  }
  if (etapa === 'embalagem' && !db.operador_conferencia) {
    if (_isAdmin && _adminOpAtivo.operador_conferencia) db.operador_conferencia = _adminOpAtivo.operador_conferencia;
    else if (_nomeOp) db.operador_conferencia = _nomeOp;
  }
}

// Retorna o valor de referência da medida para preencher automaticamente ao clicar em "+"
function _getMedidaReferencia(pageIdx, campo) {
  const pg = _paginasOP[pageIdx];
  if (!pg) return null;
  if (campo === 'corte' && pg.corte_mm) {
    return pg.corte_mm.toLocaleString('pt-BR', {minimumFractionDigits:3, maximumFractionDigits:3});
  }
  if (campo === 'prensagem') {
    const _override = pedidos[currentPedidoIdx]?._substPrensagem?.[pageIdx];
    if (_override) return _override;
    const m = _buscarMedidaPrensagem(pg);
    return m !== null ? m.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) : null;
  }
  if (campo === 'conferencia') {
    const itemMT = pg.lista_itens?.find(it => it.unidade === 'MT' && !/^HPM/i.test(it.codigo || ''));
    if (itemMT && itemMT.quantidade > 0)
      return Number(itemMT.quantidade).toLocaleString('pt-BR', {minimumFractionDigits:3, maximumFractionDigits:3});
  }
  return null;
}

// Verifica se ao menos uma amostragem da coluna ativa está preenchida
function _itemAmostragemPreenchida(pageIdx) {
  const etapa = window._etapaVizualizacao || pedidos[currentPedidoIdx]?.etapa;
  const colunaMap = { corte:'corte', prensagem:'prensagem', embalagem:'conferencia' };
  const col = colunaMap[etapa];
  if (!col) return false;
  const db = _amostrasDB[pageIdx];
  if (!db) return false;
  return db.amostras.some(am => String(am[col] || '').trim() !== '');
}

// Verifica se TODAS as amostragens da coluna ativa estão preenchidas
function _todasAmostragemPreenchidas(pageIdx) {
  const etapa = window._etapaVizualizacao || pedidos[currentPedidoIdx]?.etapa;
  const colunaMap = { corte:'corte', prensagem:'prensagem', embalagem:'conferencia' };
  const col = colunaMap[etapa];
  if (!col) return true;
  const db = _amostrasDB[pageIdx];
  if (!db || !db.amostras.length) return true;
  return db.amostras.every(am => String(am[col] || '').trim() !== '');
}

// Destaca campos de amostragem vazios em vermelho por 2s
function _destacarAmostragemVazia(pageIdx) {
  const etapa = window._etapaVizualizacao || pedidos[currentPedidoIdx]?.etapa;
  const colunaMap = { corte:'corte', prensagem:'prensagem', embalagem:'conferencia' };
  const col = colunaMap[etapa];
  const db = _amostrasDB[pageIdx];
  if (!db || !col) return;
  db.amostras.forEach((am, ri) => {
    if (String(am[col] || '').trim() !== '') return;
    const el = document.getElementById(`am_${pageIdx}_${ri}_${col}`);
    if (!el) return;
    el.style.borderColor = '#dc2626';
    el.style.background  = '#fee2e2';
    setTimeout(() => { el.style.borderColor = ''; el.style.background = ''; }, 2000);
  });
}

function _mostrarAvisoAmostragemIncompleta(onConfirmar) {
  const old = document.getElementById('modal-amostra-incompleta');
  if (old) old.remove();
  const m = document.createElement('div');
  m.id = 'modal-amostra-incompleta';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
  m.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:300px;max-width:95vw;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.25);font-family:Inter,sans-serif;">
      <div style="padding:20px 20px 14px;text-align:center;">
        <div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px;">Amostragens Incompletas</div>
        <div style="font-size:12px;color:#6b7280;">Existem campos não preenchidos</div>
      </div>
      <div style="display:flex;border-top:1px solid #f3f4f6;">
        <button id="btn-amincompleta-nao"
          style="flex:1;padding:12px;border:none;background:#fff;color:#374151;font-size:13px;font-weight:700;cursor:pointer;border-right:1px solid #f3f4f6;border-radius:0 0 0 14px;">Voltar</button>
        <button id="btn-amincompleta-sim"
          style="flex:1;padding:12px;border:none;background:#fff;color:#d97706;font-size:13px;font-weight:700;cursor:pointer;border-radius:0 0 14px 0;">Continuar</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  document.getElementById('btn-amincompleta-nao').onclick = () => m.remove();
  document.getElementById('btn-amincompleta-sim').onclick = () => { m.remove(); onConfirmar(); };
}

function _buscarMedidaPrensagem(pg) {
  if (!pg.lista_itens?.length || typeof CRIMP === 'undefined') return null;

  let codigoCapa = null;
  let codigoMang = null;

  pg.lista_itens.forEach(it => {
    const cod  = (it.codigo   || '').toUpperCase().trim();
    const desc = (it.descricao || '').toUpperCase();
    // Capa: código começa com padrão de capa ou descrição menciona "CAPA"
    if (!codigoCapa && (/^H[A-Z]*CP/.test(cod) || /^HFB/.test(cod) || desc.includes('CAPA PRENS') || desc.includes('CAPA '))) {
      codigoCapa = cod;
    }
    // Mangueira: unidade MT (metro), excluindo protetores HPM
    if (!codigoMang && it.unidade === 'MT' && !/^HPM/i.test(cod)) {
      codigoMang = cod;
    }
  });

  if (!codigoCapa && !codigoMang) return null;
  // Sem capa = kit só de mangueira → não auto-preencher prensagem
  if (!codigoCapa) return null;

  // Normaliza para matching parcial (r.cod pode ter sufixo como 'L','E')
  const _codMatch = (rCod, itemCod) => {
    const rc = (rCod || '').toUpperCase();
    const ic = (itemCod || '').toUpperCase();
    return rc === ic || rc.startsWith(ic) || ic.startsWith(rc);
  };
  const _capMatch = (rCap, itemCap) => (rCap || '').toUpperCase() === itemCap;

  let row = null;

  // 1) Correspondência por capa E mangueira (mais preciso)
  if (codigoCapa && codigoMang) {
    row = CRIMP.find(r => _capMatch(r.capa, codigoCapa) && _codMatch(r.cod, codigoMang));
  }
  // 2) Só capa
  if (!row && codigoCapa) {
    row = CRIMP.find(r => _capMatch(r.capa, codigoCapa));
  }
  // 3) Só mangueira (cod ou família)
  if (!row && codigoMang) {
    row = CRIMP.find(r => _codMatch(r.cod, codigoMang));
    if (!row) {
      // tenta pela família (r.mangueira é o prefixo, ex: "HR17" para "HR1706")
      row = CRIMP.find(r => codigoMang.startsWith((r.mangueira || '').toUpperCase()));
    }
  }

  return row ? row.medida : null;
}

function _amostraChange(pageIdx, rowIdx, campo, val) {
  if (_amostrasDB[pageIdx]) _amostrasDB[pageIdx].amostras[rowIdx][campo] = val;
}

function _amostraAdj(pageIdx, rowIdx, campo, delta) {
  const db = _amostrasDB[pageIdx];
  if (!db) return;
  const curStr = String(db.amostras[rowIdx][campo] || '').trim();
  if (delta > 0 && curStr === '') {
    const ref = _getMedidaReferencia(pageIdx, campo);
    if (ref) {
      db.amostras[rowIdx][campo] = ref;
      const el = document.getElementById(`am_${pageIdx}_${rowIdx}_${campo}`);
      if (el) el.value = ref;
      return;
    }
  }
  const cur = parseFloat(curStr.replace(/\./g,'').replace(',','.')) || 0;
  const novo = Math.round((cur + delta) * 1000) / 1000;
  db.amostras[rowIdx][campo] = novo.toLocaleString('pt-BR', {minimumFractionDigits:3, maximumFractionDigits:3});
  const el = document.getElementById(`am_${pageIdx}_${rowIdx}_${campo}`);
  if (el) el.value = db.amostras[rowIdx][campo];
}

function _operadorChange(pageIdx, val) {
  if (_amostrasDB[pageIdx]) _amostrasDB[pageIdx].operador = val;
}

function _setOperadorAdmin(pageIdx, campo, val) {
  const db = _amostrasDB[pageIdx];
  if (!db) return;
  db[campo] = val;
  // Persiste para novas páginas deste pedido
  _adminOpAtivo[campo] = val;
  // Propaga para páginas já carregadas no mesmo pedido (mesma coluna)
  Object.values(_amostrasDB).forEach(d => { if (!d[campo]) d[campo] = val; });
  salvarEstado();
  const painel = document.getElementById(`painel-amostras-${pageIdx}`);
  if (painel) painel.innerHTML = _renderAmostragens(pageIdx, _paginasOP[pageIdx]);
}
window._setOperadorAdmin = _setOperadorAdmin;

// ══════════════════════════════════════════════════
//  CHECKLIST DE INSPEÇÃO
// ══════════════════════════════════════════════════

const _CHECKLIST_GRUPOS = [
  { grupo: 'TERMINAL', itens: [
    'CONEXÕES SEM OXIDAÇÃO',
    'TERMINAIS SEM OBSTRUÇÃO',
    'CHAVE DO SEXTAVADO IGUAL PARA TODO O KIT',
    'DIÂMETRO DA ROSCA CONFORME TABELA',
    'VEDAÇÃO DA ROSCA',
    'TERMINAL GIRATÓRIO DESTRAVADO',
    'DIÂMETRO DA ESPIGA CONFORME DIÂMETRO DA MANGUEIRA',
    "PRESENÇA DO ANEL O'RING/ANEL DE VEDAÇÃO, DUREZA E MEDIDAS CONFORMES",
  ]},
  { grupo: 'CAPA', itens: [
    'CAPAS SEM OXIDAÇÃO',
    'GRAVAÇÃO DAS CAPAS COM LOTE/CÓDIGO',
    'CAPAS COM GARRAS',
    'CAPA INTEGRAS EM TODO SEU CORPO',
  ]},
  { grupo: 'CONJUNTO', itens: [
    'KIT CONFORME PEDIDO',
    'ETIQUETA ADESIVA NA EMBALAGEM DO KIT',
    'QUANTIDADE INSPECIONADA CONFORME ORDEM',
  ]},
  { grupo: 'EMBALAGEM', itens: [
    'CÓDIGO/NOME DO CLIENTE',
    'COMPONENTES CORRESPONDENTE COM A DESCRIÇÃO DO ITEM',
  ]},
];

// índice flat: _CHECKLIST_FLAT[i] = texto do item
const _CHECKLIST_FLAT = _CHECKLIST_GRUPOS.flatMap(g => g.itens);

function _checklistOperador(grupo, nome) {
  const p = pedidos[currentPedidoIdx];
  if (!p || !p.checklist_inspecao) return;
  if (!p.checklist_inspecao.operadores) p.checklist_inspecao.operadores = {};
  p.checklist_inspecao.operadores[grupo] = nome;
  if (typeof salvarEstado === 'function') salvarEstado();
}

function _checklistChange(idx, valor) {
  if (window._soLeitura) return;
  const p = pedidos[currentPedidoIdx];
  if (!p) return;
  if (!p.checklist_inspecao) {
    p.checklist_inspecao = { usuario: '', ts_inicio: null, ts_fim: null, itens: {} };
  }
  const cl = p.checklist_inspecao;
  if (!cl.ts_inicio) {
    cl.ts_inicio = new Date().toISOString();
    cl.usuario = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.nome : '';
  }
  const item = _CHECKLIST_FLAT[idx];
  if (cl.itens[item] === valor) {
    // segundo clique no mesmo botão desmarca
    delete cl.itens[item];
  } else {
    cl.itens[item] = valor;
  }
  // Atualiza botões visualmente sem re-renderizar a tabela inteira
  ['C','NC','NA'].forEach(v => {
    const btn = document.getElementById(`ck_${idx}_${v}`);
    if (!btn) return;
    const cor = { C:'#059669', NC:'#dc2626', NA:'#9ca3af' }[v];
    const sel = cl.itens[item] === v;
    btn.style.background = sel ? cor : 'transparent';
    btn.style.borderColor = sel ? cor : '#d1d5db';
  });
  if (typeof salvarEstado === 'function') salvarEstado();
}

function _fmtDtLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function _fmtDtDisplay(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2,'0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function _renderChecklist() {
  const p = pedidos[currentPedidoIdx];
  if (!p) return '';
  if (!p.checklist_inspecao) {
    p.checklist_inspecao = { usuario: '', ts_inicio: null, ts_fim: null, itens: {}, operadores: {} };
  }
  const cl = p.checklist_inspecao;
  if (!cl.operadores) cl.operadores = {};
  const nomeOp = cl.usuario || ((typeof currentUser !== 'undefined' && currentUser) ? currentUser.nome : '');

  const _isAdminCk = typeof currentUser !== 'undefined' && (currentUser?.setor === 'Admin' || currentUser?.permissoes?.all === true);
  const _allUsersCk = typeof _getUsuariosRuntime === 'function' ? _getUsuariosRuntime() : (typeof USUARIOS !== 'undefined' ? USUARIOS : []);
  const usersProducao = _allUsersCk.filter(u =>
    u.setor === 'Produção' || u.setor === 'Admin' || (_isAdminCk && u.setor === 'Gestão')
  );

  let flatIdx = 0;
  let tbody = '';
  _CHECKLIST_GRUPOS.forEach(g => {
    const operadorSel = cl.operadores[g.grupo] || '';
    const optionsHtml = usersProducao.map(u => {
      const primeiroNome = (u.nome || '').split(' ')[0];
      return `<option value="${primeiroNome}" ${operadorSel === primeiroNome ? 'selected' : ''}>${primeiroNome}</option>`;
    }).join('');
    const selectHtml = `<select onchange="_checklistOperador('${g.grupo}',this.value)"
      style="font-size:9px;font-family:Inter,sans-serif;border:1px solid #d1d5db;border-radius:5px;
             padding:2px 3px;color:#374151;background:#fafafa;width:70px;cursor:pointer;">
      <option value="">—</option>
      ${optionsHtml}
    </select>`;

    g.itens.forEach((item, i) => {
      const idx = flatIdx++;
      const val = cl.itens[item] || '';
      const btn = (v, cor, label) => {
        const sel = val === v;
        return `<button id="ck_${idx}_${v}" onclick="_checklistChange(${idx},'${v}')"
          style="width:20px;height:20px;border-radius:50%;border:2px solid ${sel?cor:'#d1d5db'};
                 background:${sel?cor:'transparent'};cursor:pointer;padding:0;
                 transition:background .15s,border-color .15s;"
          title="${label}"></button>`;
      };
      const grupoCell = i === 0
        ? `<td rowspan="${g.itens.length}" style="padding:3px 4px;font-size:9px;font-weight:800;
             color:#374151;text-align:center;vertical-align:middle;white-space:nowrap;
             border-right:1px solid #e5e7eb;letter-spacing:.5px;font-family:Inter,sans-serif;">
             ${g.grupo}</td>`
        : '';
      const inspetorCell = i === 0
        ? `<td rowspan="${g.itens.length}" style="padding:3px 4px;text-align:center;vertical-align:middle;
             border-left:1px solid #e5e7eb;">${selectHtml}</td>`
        : '';
      tbody += `<tr style="border-top:1px solid #f3f4f6;">
        ${grupoCell}
        <td style="padding:2px 6px;font-size:10px;color:#374151;font-family:Inter,sans-serif;line-height:1.3;">${item}</td>
        <td style="text-align:center;padding:2px 3px;">${btn('C','#059669','Conforme')}</td>
        <td style="text-align:center;padding:2px 3px;">${btn('NC','#dc2626','Não Conforme')}</td>
        <td style="text-align:center;padding:2px 3px;">${btn('NA','#9ca3af','Não se Aplica')}</td>
        ${inspetorCell}
      </tr>`;
    });
  });

  const rodape = nomeOp
    ? `<div style="margin-top:6px;text-align:center;font-size:11px;font-weight:700;color:#059669;font-family:Inter,sans-serif;">${nomeOp}</div>`
    : '';

  const tsBlock = _isAdminCk
    ? `<div style="display:flex;gap:12px;margin-top:10px;justify-content:center;flex-wrap:wrap;font-family:Inter,sans-serif;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
          <span style="font-size:9px;font-weight:700;color:#6b7280;letter-spacing:.5px;">INÍCIO DA INSPEÇÃO</span>
          <input type="datetime-local" value="${_fmtDtLocal(cl.ts_inicio)}"
            onchange="_adminSetChecklistTs('ts_inicio',this.value)"
            style="font-size:11px;border:1px solid #d1d5db;border-radius:6px;padding:3px 7px;font-family:Inter,sans-serif;color:#374151;cursor:pointer;">
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
          <span style="font-size:9px;font-weight:700;color:#6b7280;letter-spacing:.5px;">FIM DA INSPEÇÃO</span>
          <input type="datetime-local" value="${_fmtDtLocal(cl.ts_fim)}"
            onchange="_adminSetChecklistTs('ts_fim',this.value)"
            style="font-size:11px;border:1px solid #d1d5db;border-radius:6px;padding:3px 7px;font-family:Inter,sans-serif;color:#374151;cursor:pointer;">
        </div>
      </div>`
    : (cl.ts_inicio
        ? `<div style="margin-top:6px;text-align:center;font-size:10px;color:#9ca3af;font-family:Inter,sans-serif;">
            Início: ${_fmtDtDisplay(cl.ts_inicio)}${cl.ts_fim ? ' · Fim: ' + _fmtDtDisplay(cl.ts_fim) : ''}
           </div>`
        : '');

  return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-top:0;">
    <div style="font-size:12px;font-weight:700;color:#374151;font-family:Inter,sans-serif;margin-bottom:6px;text-align:center;">Checklist de Inspeção</div>
    <div style="overflow-x:auto;">
      <table style="border-collapse:collapse;width:100%;table-layout:auto;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:4px 4px;font-size:9px;color:#6b7280;font-weight:700;"></th>
            <th style="padding:4px 6px;font-size:9px;color:#6b7280;font-weight:700;text-align:left;">REQUISITO</th>
            <th style="padding:4px 3px;font-size:9px;color:#059669;font-weight:700;text-align:center;white-space:nowrap;">C</th>
            <th style="padding:4px 3px;font-size:9px;color:#dc2626;font-weight:700;text-align:center;white-space:nowrap;">NC</th>
            <th style="padding:4px 3px;font-size:9px;color:#9ca3af;font-weight:700;text-align:center;white-space:nowrap;">NA</th>
            <th style="padding:4px 4px;font-size:9px;color:#6b7280;font-weight:700;text-align:center;white-space:nowrap;">RESPONSÁVEL</th>
          </tr>
        </thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    ${rodape}${tsBlock}
  </div>`;
}

function _adminSetChecklistTs(campo, valor) {
  const p = pedidos[currentPedidoIdx];
  if (!p?.checklist_inspecao) return;
  p.checklist_inspecao[campo] = valor ? new Date(valor).toISOString() : null;
  if (!p._ts_etapas) p._ts_etapas = {};
  if (campo === 'ts_inicio') p._ts_etapas['inspecao_inicio'] = p.checklist_inspecao[campo];
  if (campo === 'ts_fim')    p._ts_etapas['inspecao_fim']    = p.checklist_inspecao[campo];
  salvarEstado();
}

function _adminSetEtapaTs(etapaKey, campo, valor) {
  const p = pedidos[currentPedidoIdx];
  if (!p) return;
  if (!p._ts_etapas) p._ts_etapas = {};
  // Se valor em branco, mantém o que havia (não sobrescreve com now)
  if (!valor) return;
  p._ts_etapas[etapaKey + '_' + campo] = new Date(valor).toISOString();
  salvarEstado();
}
window._adminSetEtapaTs = _adminSetEtapaTs;

// ══════════════════════════════════════════════════
//  SUBSTITUIÇÃO DE MANGUEIRA (etapa Corte)
// ══════════════════════════════════════════════════

let _mangBitola = ''; // sufixo de bitola para filtrar substituições

function _abrirSubstMangueira(pageIdx, itemIdx) {
  const p = pedidos[currentPedidoIdx];
  if (!p?.paginasOP?.[pageIdx]?.lista_itens?.[itemIdx]) return;
  const it = p.paginasOP[pageIdx].lista_itens[itemIdx];
  const currentCod = it.codigo || '';

  // Extrai bitola: últimos 2 dígitos do código (ex: HR208 → "08", HR212 → "12")
  const _bitolaMatch = currentCod.match(/(\d{2})$/);
  _mangBitola = _bitolaMatch ? _bitolaMatch[1] : '';

  const _mangRows = typeof CRIMP !== 'undefined'
    ? [...new Map(CRIMP.map(r => [r.cod, r])).values()]
        .filter(m => !_mangBitola || m.cod.endsWith(_mangBitola))
        .sort((a,b) => a.cod.localeCompare(b.cod))
    : [];

  const optsHtml = (rows) => rows.map(m =>
    `<option value="${m.cod}" ${m.cod === currentCod ? 'selected' : ''}>${m.cod}${m.mangueira?' — '+m.mangueira:''}${m.size?' '+m.size:''}</option>`
  ).join('');

  document.getElementById('modal-subst-mang')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-subst-mang" onclick="if(event.target===this)_fecharSubstMangueira()"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:14px;padding:20px;width:480px;max-width:94vw;max-height:85vh;
                  display:flex;flex-direction:column;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,.18);font-family:Inter,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:15px;font-weight:800;color:#111;">Substituir Mangueira</div>
          <button onclick="_fecharSubstMangueira()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#6b7280;">✕</button>
        </div>
        <div style="font-size:12px;color:#6b7280;">Código atual: <strong style="color:#1a56db;">${currentCod}</strong>${_mangBitola ? `<span style="margin-left:10px;background:#fef3c7;color:#92400e;border:1px solid #fbbf24;border-radius:5px;padding:1px 7px;font-size:11px;font-weight:700;">Bitola: …${_mangBitola}</span>` : ''}</div>
        <input type="text" id="mang-search" placeholder="Filtrar por código ou família..."
          oninput="_filtrarMangueiras(this.value)"
          style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;width:100%;box-sizing:border-box;">
        <select id="mang-select" size="10"
          style="border:1px solid #d1d5db;border-radius:8px;font-size:12px;font-family:'Courier New',monospace;
                 padding:4px;flex:1;min-height:160px;">
          ${optsHtml(_mangRows)}
        </select>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button onclick="_fecharSubstMangueira()"
            style="padding:8px 20px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
            Cancelar
          </button>
          <button onclick="_confirmarSubstMangueira(${pageIdx},${itemIdx})"
            style="padding:8px 20px;background:#1a56db;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
            Substituir
          </button>
        </div>
      </div>
    </div>`);
  setTimeout(() => document.getElementById('mang-search')?.focus(), 50);
}

function _fecharSubstMangueira() {
  document.getElementById('modal-subst-mang')?.remove();
}

function _filtrarMangueiras(q) {
  const sel = document.getElementById('mang-select');
  if (!sel || typeof CRIMP === 'undefined') return;
  const query = q.toLowerCase().trim();
  const rows = [...new Map(CRIMP.map(r => [r.cod, r])).values()]
    .filter(m => !_mangBitola || m.cod.endsWith(_mangBitola))
    .sort((a,b) => a.cod.localeCompare(b.cod));
  const filtered = query
    ? rows.filter(m =>
        m.cod.toLowerCase().includes(query) ||
        (m.mangueira || '').toLowerCase().includes(query) ||
        (m.descricao  || '').toLowerCase().includes(query))
    : rows;
  sel.innerHTML = filtered.map(m =>
    `<option value="${m.cod}">${m.cod}${m.mangueira?' — '+m.mangueira:''}${m.size?' '+m.size:''}</option>`
  ).join('');
}

function _confirmarSubstMangueira(pageIdx, itemIdx) {
  const sel = document.getElementById('mang-select');
  if (!sel?.value) return;
  const novoCod = sel.value;
  const p = pedidos[currentPedidoIdx];
  // Usa _paginasOP (índice filtrado = referência ao objeto correto em p.paginasOP)
  const pg = _paginasOP[pageIdx];
  if (!pg?.lista_itens?.[itemIdx]) return;
  const it = pg.lista_itens[itemIdx];
  const oldCod = it.codigo;
  it.codigo = novoCod;
  // Atualiza descrição se disponível no CRIMP
  const crimp = typeof CRIMP !== 'undefined' ? CRIMP.find(r => r.cod === novoCod) : null;
  if (crimp?.descricao) it.descricao = crimp.descricao;

  // Recalcula medida de prensagem para o novo código e persiste no pedido
  if (typeof _buscarMedidaPrensagem === 'function') {
    const novaMedida = _buscarMedidaPrensagem(pg);
    if (novaMedida !== null) {
      if (!p._substPrensagem) p._substPrensagem = {};
      p._substPrensagem[pageIdx] = novaMedida.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    } else {
      if (p._substPrensagem) delete p._substPrensagem[pageIdx];
    }
  }

  // Reset do auto-fill de prensagem para recalcular com o novo código
  if (_amostrasDB[pageIdx]) {
    delete _amostrasDB[pageIdx]._etapa_preenchida;
    _amostrasDB[pageIdx].amostras.forEach(am => { am.prensagem = ''; });
  }

  _fecharSubstMangueira();
  salvarEstado();
  _mostrarPaginaOP();
}

// Identifica adaptadores pelo prefixo do código (HA*, HV*) ou "ADAPT" na descrição
function _isAdaptador(it) {
  return /^H(A|V|EH)/i.test(it.codigo || '') || /ADAPT/i.test(it.descricao || '');
}

// Retorna todos os adaptadores de um pedido kit (de todas as páginas índice)
function _getAdaptadoresKit(p) {
  if (!p?.paginasOP) return [];
  return p.paginasOP
    .filter(pg => pg.is_index)
    .flatMap(pg => (pg.lista_itens || []).filter(_isAdaptador));
}

// Quantidade de kits a produzir (extraída de item_qty das páginas não-índice)
function _getKitQty(p) {
  const pg = (p?.paginasOP || []).find(pg => !pg.is_index && pg.item_qty > 0);
  return Math.ceil(pg?.item_qty || 1);
}

// Círculos de conferência: totalCircles = kitQty (um por kit), independente da qty do item
// kitCodigo + codigo formam chave composta para pedidos com múltiplos kits
function _renderAdaptCircles(kitCodigo, codigo, kitQty, count) {
  const safeId = `adapt-circles-${kitCodigo.replace(/[^a-z0-9]/gi,'_')}_${codigo.replace(/[^a-z0-9]/gi,'_')}`;
  const circles = Array.from({length: kitQty}, (_, i) => {
    const filled = i < count;
    return `<div onclick="_toggleAdaptadorUnit('${kitCodigo}','${codigo}',${i})"
      style="width:22px;height:22px;border-radius:50%;border:2px solid ${filled?'#059669':'#d1d5db'};
             background:${filled?'#059669':'transparent'};cursor:pointer;flex-shrink:0;
             display:flex;align-items:center;justify-content:center;transition:all .15s;">
      ${filled?'<span style="color:#fff;font-size:11px;line-height:1;">✓</span>':''}
    </div>`;
  }).join('');
  return `<div id="${safeId}" style="display:flex;gap:4px;flex-wrap:wrap;">${circles}</div>`;
}

function _toggleAdaptadorUnit(kitCodigo, codigo, unitIdx) {
  if (window._soLeitura) return;
  const p = pedidos[currentPedidoIdx]; if (!p) return;
  if (!p.adaptadoresEmbalados) p.adaptadoresEmbalados = {};
  const compKey = `${kitCodigo}__${codigo}`;
  const pgIdx   = (p.paginasOP||[]).findIndex(pg => pg.is_index && pg.item_codigo === kitCodigo);
  const indexPg = pgIdx >= 0 ? p.paginasOP[pgIdx] : null;
  const kitQty  = Math.ceil(indexPg?.item_qty || 1);
  const current = p.adaptadoresEmbalados[compKey] || 0;
  p.adaptadoresEmbalados[compKey] = (unitIdx < current) ? unitIdx : unitIdx + 1;
  salvarEstado();

  // Atualiza círculos no modal
  const safeId = `adapt-circles-${kitCodigo.replace(/[^a-z0-9]/gi,'_')}_${codigo.replace(/[^a-z0-9]/gi,'_')}`;
  const el = document.getElementById(safeId);
  if (el) el.outerHTML = _renderAdaptCircles(kitCodigo, codigo, kitQty, p.adaptadoresEmbalados[compKey]);

  // Atualiza subtítulo do modal
  const hdr = document.getElementById('adapt-modal-hdr');
  if (hdr && indexPg) hdr.textContent = _adaptModalSubtitle(p, indexPg);

  // Atualiza botão da barra inferior (contador + cor)
  if (indexPg) {
    const adapt = (indexPg.lista_itens||[]).filter(_isAdaptador);
    const total = adapt.length * kitQty;
    const emb   = adapt.reduce((s, it) => {
      const ck = `${kitCodigo}__${it.codigo}`;
      return s + Math.min(p.adaptadoresEmbalados[ck]||0, kitQty);
    }, 0);
    const done = total > 0 && emb >= total;
    const navBtn = document.getElementById(`kit-nav-btn-${pgIdx}`);
    if (navBtn) {
      navBtn.style.background  = done ? '#f0fdf4' : '#eff6ff';
      navBtn.style.color       = done ? '#059669' : '#1a56db';
      navBtn.style.borderColor = done ? '#86efac' : '#bfdbfe';
      navBtn.innerHTML = `${kitCodigo}${total>0?` (${emb}/${total})`:''}`;
    }
  }
}
window._toggleAdaptadorUnit = _toggleAdaptadorUnit;

function _adaptModalSubtitle(p, indexPg) {
  const adapt  = (indexPg.lista_itens || []).filter(_isAdaptador);
  const kitQty = Math.ceil(indexPg.item_qty || 1);
  const total  = adapt.length * kitQty;
  const emb    = adapt.reduce((s,it) => {
    const compKey = `${indexPg.item_codigo}__${it.codigo}`;
    return s + Math.min(p.adaptadoresEmbalados?.[compKey]||0, kitQty);
  }, 0);
  return `${emb} / ${total} conferidos`;
}

function _abrirAdaptadoresModal(pgIdx) {
  const p = pedidos[currentPedidoIdx]; if (!p) return;
  const indexPg = p.paginasOP?.[pgIdx];
  if (!indexPg || !indexPg.is_index) return;
  const adaptadores = (indexPg.lista_itens || []).filter(_isAdaptador);
  if (!adaptadores.length) return;
  if (!p.adaptadoresEmbalados) p.adaptadoresEmbalados = {};
  const kitQty   = Math.ceil(indexPg.item_qty || 1);
  const kitCodigo = indexPg.item_codigo;

  const theadHtml = `
    <thead>
      <tr style="background:#f3f4f6;border-bottom:2px solid #e5e7eb;">
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;white-space:nowrap;">CÓDIGO</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;">DESCRIÇÃO</th>
        <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;white-space:nowrap;">QTD/KIT</th>
        <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;white-space:nowrap;">CONFERIDO</th>
      </tr>
    </thead>`;

  const tbodyHtml = adaptadores.map((it, ri) => {
    const compKey = `${kitCodigo}__${it.codigo}`;
    const count = Math.min(p.adaptadoresEmbalados[compKey] || 0, kitQty);
    const bg    = ri % 2 === 0 ? '#fff' : '#fafafa';
    return `<tr style="background:${bg};border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 10px;font-size:11px;font-weight:700;font-family:'Courier New',monospace;white-space:nowrap;">${it.codigo}</td>
      <td style="padding:8px 10px;font-size:11px;color:#374151;font-family:Inter,sans-serif;">${it.descricao||''}</td>
      <td style="padding:8px 10px;text-align:center;font-size:12px;font-weight:700;color:${(it.quantidade||1)>1?'#d97706':'#374151'};">${it.quantidade||1}</td>
      <td style="padding:8px 10px;text-align:center;">${_renderAdaptCircles(kitCodigo, it.codigo, kitQty, count)}</td>
    </tr>`;
  }).join('');

  document.getElementById('modal-adapt-emb')?.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-adapt-emb';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:680px;max-width:97vw;max-height:90vh;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.25);display:flex;flex-direction:column;font-family:Inter,sans-serif;">
      <div style="background:linear-gradient(135deg,#1a56db,#1e40af);padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div>
          <div style="font-size:14px;font-weight:800;color:#fff;">Adaptadores — ${kitCodigo}</div>
          <div id="adapt-modal-hdr" style="font-size:11px;color:rgba(255,255,255,.8);margin-top:2px;">${_adaptModalSubtitle(p, indexPg)}</div>
        </div>
        <button onclick="document.getElementById('modal-adapt-emb').remove()"
          style="background:rgba(255,255,255,.15);border:none;border-radius:8px;color:#fff;font-size:20px;line-height:1;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
      <div style="flex:1;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;">
          ${theadHtml}
          <tbody>${tbodyHtml}</tbody>
        </table>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function _renderAmostragens(pageIdx, pg) {
  const etapa  = window._etapaVizualizacao || pedidos[currentPedidoIdx]?.etapa || 'separacao';
  if (etapa === 'inspecao') return _renderChecklist();

  const db     = _getAmostras(pageIdx, pg);
  const etapaColuna = { corte:'corte', prensagem:'prensagem', embalagem:'conferencia', finalizado:null };
  const colunaAtiva = etapaColuna[etapa] || null;

  // Em modo fantasma: exibe apenas a coluna da etapa pendente
  const _emModoFantasma = window._etapaVizualizacao && window._etapaVizualizacao !== (pedidos[currentPedidoIdx]?.etapa || '');
  const allColunas = ['corte','prensagem','conferencia'];
  const allLabels  = ['Corte','Prensagem','Conferência/Embalagem'];
  const colunas = _emModoFantasma && colunaAtiva ? [colunaAtiva] : allColunas;
  const labels  = _emModoFantasma && colunaAtiva
    ? [allLabels[allColunas.indexOf(colunaAtiva)]]
    : allLabels;

  let thead = `<tr style="background:#f3f4f6;">
    <th style="padding:5px 8px;font-size:11px;color:#6b7280;font-weight:700;text-align:center;">#</th>
    ${colunas.map((c,i)=>{
      const isAtiva = c === colunaAtiva;
      return `<th style="padding:5px 8px;font-size:11px;font-weight:700;text-align:center;white-space:nowrap;color:${isAtiva?'#1a56db':'#6b7280'};">${labels[i]}${isAtiva?' ✎':''}</th>`;
    }).join('')}
  </tr>`;

  let rows = db.amostras.map((am, ri) => {
    const cells = colunas.map(campo => {
      const val = am[campo] || '';
      const isAtiva = campo === colunaAtiva;
      if (isAtiva) {
        return `<td style="padding:3px 4px;text-align:center;">
          <div style="display:flex;align-items:center;gap:2px;justify-content:center;">
            <button onclick="_amostraAdj(${pageIdx},${ri},'${campo}',-0.001)"
              style="width:26px;height:26px;border-radius:50%;background:#0891b2;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;padding:0;"
              onmouseenter="this.style.background='#0e7490'" onmouseleave="this.style.background='#0891b2'">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.8" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <input id="am_${pageIdx}_${ri}_${campo}" type="text" value="${val}"
              onchange="_amostraChange(${pageIdx},${ri},'${campo}',this.value)"
              onfocus="this.select()"
              style="width:58px;text-align:center;border:1.5px solid #1a56db;border-radius:4px;padding:2px 3px;font-size:12px;font-weight:700;font-family:'Courier New',monospace;outline:none;background:#fff;">
            <button onclick="_amostraAdj(${pageIdx},${ri},'${campo}',0.001)"
              style="width:26px;height:26px;border-radius:50%;background:#0891b2;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;padding:0;"
              onmouseenter="this.style.background='#0e7490'" onmouseleave="this.style.background='#0891b2'">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </td>`;
      } else {
        const hasVal = val && val !== '';
        return `<td style="padding:3px 6px;text-align:center;">
          <span style="display:inline-block;width:56px;text-align:center;font-size:12px;font-family:'Courier New',monospace;color:${hasVal?'#111':'#d1d5db'};font-weight:${hasVal?700:400};">
            ${hasVal ? val : '—'}
          </span>
        </td>`;
      }
    }).join('');
    return `<tr style="border-top:1px solid #f3f4f6;">
      <td style="padding:3px 8px;text-align:center;font-size:11px;color:#9ca3af;font-weight:600;">${ri+1}</td>
      ${cells}
    </tr>`;
  }).join('');

  const opAtual  = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.nome : '';
  const _isAdmin = typeof currentUser !== 'undefined' &&
    (currentUser?.setor === 'Admin' || currentUser?.permissoes?.all === true);

  // Nomes por coluna: usa o salvo, ou o usuário atual se é a coluna ativa
  const opPorColuna = {
    corte:      db.operador_corte       || (colunaAtiva === 'corte'       ? opAtual : ''),
    prensagem:  db.operador_prensagem   || (colunaAtiva === 'prensagem'   ? opAtual : ''),
    conferencia:db.operador_conferencia || (colunaAtiva === 'conferencia' ? opAtual : ''),
  };

  // Opções de usuário para dropdown admin — inclui inativos
  const _allUsersAm = typeof _getUsuariosRuntime === 'function' ? _getUsuariosRuntime() : (typeof USUARIOS !== 'undefined' ? USUARIOS : []);
  const _optsAdmin = _allUsersAm
    .filter(u => u.setor === 'Produção' || u.setor === 'Admin')
    .map(u => u.nome);

  const _campoOp = { corte: 'operador_corte', prensagem: 'operador_prensagem', conferencia: 'operador_conferencia' };

  const rodapeRow = `<tr>
    <td></td>
    ${colunas.map(c => {
      const nome    = opPorColuna[c] || '';
      const isAtiva = c === colunaAtiva;
      if (_isAdmin && isAtiva) {
        const opts = _optsAdmin.map(n =>
          `<option value="${n}" ${nome === n ? 'selected' : ''}>${n}</option>`
        ).join('');
        return `<td style="padding:4px 6px;text-align:center;">
          <select onchange="_setOperadorAdmin(${pageIdx},'${_campoOp[c]}',this.value)"
            style="font-size:11px;font-family:Inter,sans-serif;border:1px solid #d1d5db;border-radius:5px;
                   padding:2px 4px;color:#059669;font-weight:700;max-width:95px;cursor:pointer;">
            <option value="">— Operador —</option>
            ${opts}
          </select>
        </td>`;
      }
      return `<td style="padding:5px 6px;text-align:center;">
        <span style="font-size:11px;font-weight:700;font-family:Inter,sans-serif;color:${nome ? '#059669' : 'transparent'};">${nome || '·'}</span>
      </td>`;
    }).join('')}
  </tr>`;

  // Bloco de timestamps por etapa (editável para Admin)
  const p = pedidos[currentPedidoIdx];
  const _tsEtapas = p?._ts_etapas || {};
  // mapeamento coluna → chave em _ts_etapas
  const _colunaParaEtapa = { corte:'corte', prensagem:'prensagem', conferencia:'embalagem' };

  const tsBlock = (_isAdmin && colunaAtiva) ? (() => {
    const etapaKey = _colunaParaEtapa[colunaAtiva];
    const ini = _tsEtapas[etapaKey + '_inicio'] || null;
    const fim = _tsEtapas[etapaKey + '_fim']    || null;
    return `<div style="display:flex;gap:16px;margin-top:12px;justify-content:center;flex-wrap:wrap;padding-top:10px;border-top:1px solid #f3f4f6;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
        <span style="font-size:8px;font-weight:600;color:#9ca3af;letter-spacing:.4px;font-family:Inter,sans-serif;">INÍCIO</span>
        <input type="datetime-local" value="${_fmtDtLocal(ini)}"
          onchange="_adminSetEtapaTs('${etapaKey}','inicio',this.value)"
          style="font-size:11px;border:1px solid #d1d5db;border-radius:6px;padding:3px 7px;font-family:Inter,sans-serif;color:#374151;cursor:pointer;">
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
        <span style="font-size:8px;font-weight:600;color:#9ca3af;letter-spacing:.4px;font-family:Inter,sans-serif;">FIM</span>
        <input type="datetime-local" value="${_fmtDtLocal(fim)}"
          onchange="_adminSetEtapaTs('${etapaKey}','fim',this.value)"
          style="font-size:11px;border:1px solid #d1d5db;border-radius:6px;padding:3px 7px;font-family:Inter,sans-serif;color:#374151;cursor:pointer;">
      </div>
    </div>`;
  })() : '';

  return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-top:0;">
    <div style="font-size:12px;font-weight:700;color:#374151;font-family:Inter,sans-serif;margin-bottom:6px;text-align:center;">Amostragens</div>
    <div style="overflow-x:auto;">
      <table style="border-collapse:collapse;width:100%;">
        <thead>${thead}</thead>
        <tbody>${rows}${rodapeRow}</tbody>
      </table>
    </div>
    ${tsBlock}
  </div>`;
}

function _mostrarPaginaOP() {
  // Preservar o botão Baixar OP antes de limpar o conteúdo
  const _opBarExistente = document.getElementById('op-inline-bar');

  if (!_paginasOP.length) {
    _mostrarConteudo(`<div style="padding:40px;text-align:center;color:#9ca3af;font-family:'Courier New',monospace;">
      <div style="font-size:32px;margin-bottom:8px;"></div>
      <div>Extraindo dados do PDF...</div>
    </div>`);
    _reinserirOpBar();
    return;
  }

  const pg    = _paginasOP[_paginaAtual];
  const total = _paginasOP.length;

  // Salva a página atual e etapa para retomar depois
  const _pAtual = pedidos[currentPedidoIdx];
  if (_pAtual) {
    _pAtual._ultimaPagina = _paginaAtual;
    _pAtual._ultimaEtapa  = _pAtual.etapa;
  }

  const _emAprovacao  = pedidos[currentPedidoIdx]?.subEtapa === 'aprovacao';
  const _etapaEfetiva2 = window._etapaVizualizacao || pedidos[currentPedidoIdx]?.etapa || '';

  _registrarAbertura(_paginaAtual, pg);

  let listaHTML = '';
  if (pg.lista_itens?.length) {
    const _etapaAtual = _etapaEfetiva2;
    listaHTML = `
      <div style="margin:12px 0 0;">
        <table style="width:100%;border-collapse:collapse;font-family:'Courier New',monospace;font-size:13px;">
          <tbody>
            ${pg.lista_itens.map((it, iIdx)=>{
              const isMang = it.unidade === 'MT' && !/^HPM/i.test(it.codigo);
              const editBtn = (isMang && (_etapaAtual === 'corte' || _emAprovacao))
                ? `<button onclick="_abrirSubstMangueira(${_paginaAtual},${iIdx})"
                    title="Substituir mangueira"
                    style="margin-left:5px;padding:0 5px;font-size:10px;line-height:18px;background:#eff6ff;border:1px solid #93c5fd;border-radius:4px;cursor:pointer;color:#1a56db;font-weight:700;vertical-align:middle;">✏</button>`
                : '';
              return `
              <tr data-hl="item_row_${iIdx}" style="border-radius:3px;transition:background .15s;">
                <td style="padding:1px 12px 1px 0;white-space:nowrap;color:#333;">${String(it.quantidade.toFixed ? it.quantidade.toFixed(6) : it.quantidade).padStart(10)}</td>
                <td style="padding:1px 12px 1px 0;white-space:nowrap;font-weight:700;">${it.unidade}</td>
                <td style="padding:1px 12px 1px 0;white-space:nowrap;font-weight:700;">${it.codigo}${editBtn}</td>
                <td style="padding:1px 0;color:#333;">${it.descricao}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // Filtrar texto indesejado do campo OBS
  const _obsLimpo = (pg.obs || '')
    .replace(/TESTES APLICADOS EM LINHA[^\n]*/gi, '')
    .replace(/\(REGISTRO MESTRE\)/gi, '')
    .replace(/Total\s+de\s+PIS\s*:\s*\d+/gi, '')
    .replace(/Aten[çc][aã]o[!.]*/gi, '')
    .trim();

  // id_extra: ignorar se capturou erroneamente "OBS" ou "OBS :" do PDF
  const _idExtraLimpo = /^OBS\s*:?\s*$/i.test(pg.id_extra || '') ? null : (pg.id_extra || null);
  // angulo: ignorar se PDF capturou erroneamente texto de outro campo (ex: "Embalagem Individual...")
  const _anguloLimpo = (/embalagem individual/i.test(pg.angulo || '') || /^reto$/i.test((pg.angulo || '').trim())) ? null : (pg.angulo || null);

  const infoRows = [
    ['Tipo de Corte',         pg.tipo_corte],
    ['Angulo de Montagem',    _anguloLimpo],
    ['Embalagem Individual',  pg.embalagem],
    ['Forma de Embalagem',    pg.forma_emb],
    ['Gravação Capa',         pg.gravacao],
    ['ID Extra',              _idExtraLimpo],
    ['OBS',                   _obsLimpo || null],
  ];
  const infoHTML = `
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid #ccc;">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px;font-family:'Courier New',monospace;">INFORMAÇÃO PRODUTO (REGISTRO MESTRE):</div>
      ${infoRows.filter(([,val])=> val && String(val).trim()).map(([label, val], iIdx)=>`
        <div data-hl="info_${iIdx}" style="font-family:'Courier New',monospace;font-size:13px;margin-bottom:3px;border-radius:3px;transition:background .15s;">
          ${label} : ${val}
        </div>`).join('')}
    </div>`;

  // Indicador de item pulado (mostrado quando o item foi pulado nesta etapa)
  const _ehPulado = !pg.is_index && (
    (_etapaEfetiva2 === 'corte'     && pg._pulado_corte)     ||
    (_etapaEfetiva2 === 'prensagem' && pg._pulado_prensagem) ||
    (_etapaEfetiva2 === 'embalagem' && pg._pulado_embalagem)
  );
  const _puladoBanner = _ehPulado
    ? `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:7px 12px;margin-bottom:10px;font-size:11px;font-weight:700;color:#92400e;font-family:Inter,sans-serif;">
        Item pulado — ainda não produzido nesta etapa
      </div>` : '';

  const corteVal = pg.is_index
    ? '0,0000000'
    : (pg.corte_mm != null ? pg.corte_mm.toLocaleString('pt-BR',{minimumFractionDigits:7}) : '');

  const amostrasHTML = _emAprovacao ? '' : _renderAmostragens(_paginaAtual, pg);

  // Limpar campos redundantes da descrição (vêm do extract.py)
  const _descLimpa = (pg.descricao || '')
    .replace(/PRODUTO ACABADO\s*:\s*\S+\s*/gi, '')
    .replace(/QUANTIDADE\s*:\s*[\d.,]+\s*/gi, '')
    .trim();

  _mostrarConteudo(`
    <div style="flex:1;overflow-y:auto;min-height:0;">
      <div style="display:flex;gap:0;">
        <div style="flex:1;min-width:0;background:#fff;${_emAprovacao ? '' : 'border-right:1px solid #e5e7eb;'}padding:14px 16px;font-family:'Courier New',monospace;overflow-x:auto;">
          ${_emAprovacao ? `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:7px 12px;margin-bottom:10px;font-size:11px;font-weight:700;color:#92400e;font-family:Inter,sans-serif;">Modo Aprovação — marcações e substituições são salvas</div>` : ''}
          ${_puladoBanner}
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <div data-hl="item_codigo" style="font-size:14px;font-weight:700;border-radius:3px;transition:background .15s;">ITEM A PRODUZIR: ${pg.item_codigo||'—'}</div>
            <div data-hl="item_qty" style="font-size:14px;font-weight:700;border-radius:3px;transition:background .15s;">QUANTIDADE: ${pg.item_qty!=null?Number(pg.item_qty).toFixed(2):''}</div>
          </div>
          ${_descLimpa?`<div data-hl="descricao" style="font-weight:700;font-size:13px;margin-bottom:10px;border-radius:3px;transition:background .15s;">${_descLimpa}</div>`:''}
          <div data-hl="corte" style="font-weight:700;font-size:14px;margin-bottom:10px;border-radius:3px;transition:background .15s;">
            TAMANHO DE CORTE (Em Milímetros): ${corteVal}
          </div>
          ${listaHTML}
          <div style="border-top:1px solid #999;margin:16px 0;"></div>
          ${infoHTML}
        </div>
        ${_emAprovacao ? '' : `
        <div style="width:420px;flex-shrink:0;padding:14px 12px;background:#f9fafb;overflow-x:auto;" id="painel-amostras-${_paginaAtual}">
          ${amostrasHTML}
        </div>`}
      </div>
    </div>
    <div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:#fff;border-top:1px solid #e5e7eb;">
      ${_emAprovacao
        ? `<button onclick="_mostrarPainelAprovacao(${currentPedidoIdx})"
            style="padding:9px 18px;background:#fef3c7;color:#92400e;border:2px solid #fbbf24;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;">
            ← Painel
          </button>`
        : `<button onclick="_pgAnterior()" ${_paginaAtual===0?'disabled':''}
            style="padding:9px 20px;background:${_paginaAtual===0?'#e5e7eb':'#1a56db'};color:${_paginaAtual===0?'#9ca3af':'#fff'};border:none;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:${_paginaAtual===0?'default':'pointer'};">
            ← Anterior
          </button>`
      }
      <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:10px;min-width:0;">
        ${_emAprovacao ? `
        <button id="btn-marcador-op" onclick="_toggleMarcador()" title="Marcador de texto"
          style="padding:6px 13px;background:${_marcadorAtivo?'#fef08a':'#f3f4f6'};color:${_marcadorAtivo?'#713f12':'#374151'};border:1px solid ${_marcadorAtivo?'#fbbf24':'#d1d5db'};border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;${_marcadorAtivo?'box-shadow:0 0 0 2px #fbbf24;':''}transition:background .15s;">
          Marcador
        </button>` : ''}
        ${(_etapaEfetiva2 === 'embalagem' && _isKitOrder()) ? (() => {
          const _p = pedidos[currentPedidoIdx];
          const _embIndexPgs = (_p?.paginasOP||[])
            .map((_pg, _i) => ({pg: _pg, i: _i}))
            .filter(({pg}) => pg.is_index && (pg.lista_itens||[]).some(it => !_isAdaptador(it)));
          if (!_embIndexPgs.length) return '';
          const _embBtns = _embIndexPgs.map(({pg: _pg, i: _i}) => {
            const _items  = (_pg.lista_itens||[]).filter(it => !_isAdaptador(it));
            const _adapts = (_pg.lista_itens||[]).filter(_isAdaptador);
            const _kQty   = Math.ceil(_pg.item_qty || 1);
            const _embIt  = _items.filter(it => (_p.itensEmbalados||[]).includes(it.codigo)).length;
            const _embAd  = _adapts.filter(it => ((_p.adaptadoresEmbalados||{})[`${_pg.item_codigo}__${it.codigo}`]||0) >= _kQty).length;
            const _emb    = _embIt + _embAd;
            const _total  = _items.length + _adapts.length;
            const _done   = _total > 0 && _emb >= _total;
            return `<button id="kit-emb-btn-${_i}" onclick="_abrirKitModal(${_i})"
              style="padding:6px 13px;background:${_done?'#f0fdf4':'#eff6ff'};color:${_done?'#059669':'#1a56db'};border:1px solid ${_done?'#86efac':'#bfdbfe'};border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Courier New',monospace;white-space:nowrap;flex-shrink:0;">
              ${_pg.item_codigo}${_total>0?` (${_emb}/${_total})`:''}
            </button>`;
          }).join('');
          const _embMuitos = _embIndexPgs.length > 2;
          const _embArrow  = 'padding:4px 8px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;line-height:1;';
          const _embL = _embMuitos ? `<button onclick="document.getElementById('kit-emb-scroll').scrollBy({left:-200,behavior:'smooth'})" style="${_embArrow}">‹</button>` : '';
          const _embR = _embMuitos ? `<button onclick="document.getElementById('kit-emb-scroll').scrollBy({left:200,behavior:'smooth'})" style="${_embArrow}">›</button>` : '';
          return `<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;min-width:0;">
            ${_embL}
            <div id="kit-emb-scroll" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;justify-content:center;">${_embBtns}</div>
            ${_embR}
          </div>`;
        })() : ''}
        ${(_etapaEfetiva2 === 'inspecao' && pedidos[currentPedidoIdx]?.tipo === 'mangueira-kit') ? (() => {
          const _p = pedidos[currentPedidoIdx];
          const _indexPgs = (_p?.paginasOP||[])
            .map((_pg, _i) => ({pg: _pg, i: _i}))
            .filter(({pg}) => pg.is_index && (pg.lista_itens||[]).some(_isAdaptador));
          if (!_indexPgs.length) return '';
          const _btns = _indexPgs.map(({pg: _pg, i: _i}) => {
            const _adapt = (_pg.lista_itens||[]).filter(_isAdaptador);
            const _kQty  = Math.ceil(_pg.item_qty || 1);
            const _total = _adapt.length * _kQty;
            const _emb   = _adapt.reduce((s, it) => {
              const _ck = `${_pg.item_codigo}__${it.codigo}`;
              return s + Math.min((_p.adaptadoresEmbalados||{})[_ck]||0, _kQty);
            }, 0);
            const _done  = _total > 0 && _emb >= _total;
            return `<button id="kit-nav-btn-${_i}" onclick="_abrirAdaptadoresModal(${_i})"
              style="padding:6px 13px;background:${_done?'#f0fdf4':'#eff6ff'};color:${_done?'#059669':'#1a56db'};border:1px solid ${_done?'#86efac':'#bfdbfe'};border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Courier New',monospace;white-space:nowrap;flex-shrink:0;">
              ${_pg.item_codigo}${_total>0?` (${_emb}/${_total})`:''}
            </button>`;
          }).join('');
          const _muitosKits = _indexPgs.length > 2;
          const _arrowStyle = 'padding:4px 8px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;line-height:1;';
          const _arrows_l = _muitosKits ? `<button onclick="document.getElementById('kit-btns-scroll').scrollBy({left:-200,behavior:'smooth'})" style="${_arrowStyle}">‹</button>` : '';
          const _arrows_r = _muitosKits ? `<button onclick="document.getElementById('kit-btns-scroll').scrollBy({left:200,behavior:'smooth'})" style="${_arrowStyle}">›</button>` : '';
          return `<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;min-width:0;">
            ${_arrows_l}
            <div id="kit-btns-scroll" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;justify-content:center;">${_btns}</div>
            ${_arrows_r}
          </div>`;
        })() : ''}
        <span style="font-size:12px;color:#6b7280;font-family:Inter,sans-serif;">${_paginaAtual+1} / ${total}</span>
      </div>
      ${(() => {
        if (_emAprovacao) {
          return `<button onclick="_pgProxima_aprov()"
            style="padding:9px 20px;background:#1a56db;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;">
            ${_paginaAtual===total-1 ? '← Painel' : 'Próxima →'}
          </button>`;
        }

        const _pEmb = pedidos[currentPedidoIdx];
        let _rightBtn = '';
        if (_paginaAtual === total-1) {
          if (window._soLeitura) {
            _rightBtn = '';
          } else if (_etapaEfetiva2 === 'embalagem') {
            const _nFotos = (_pEmb.fotosEmbalagem || []).length;
            const _isAdminEmb = typeof currentUser !== 'undefined' &&
              (currentUser?.setor === 'Admin' || currentUser?.permissoes?.all === true);
            const _podeConcluirEmb = _nFotos > 0 || _isAdminEmb;
            _rightBtn = `<div style="display:flex;gap:8px;align-items:center;">
              ${_nFotos < 3 ? `<button onclick="_abrirCameraEmbalagem()"
                style="padding:9px 16px;background:#d97706;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;">
                Foto (${_nFotos}/3)
              </button>` : ''}
              ${_podeConcluirEmb ? `<button onclick="_concluirPedido()"
                style="padding:9px 16px;background:#059669;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;">
                ✓ Concluir
              </button>` : ''}
            </div>`;
          } else {
            _rightBtn = `<button onclick="_concluirPedido()"
              style="padding:9px 20px;background:#059669;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;">
              ${typeof _labelConcluir === 'function' ? _labelConcluir(_etapaEfetiva2) : '✓ Concluir'}
            </button>`;
          }
        } else {
          _rightBtn = `<button onclick="_pgProxima()"
            style="padding:9px 20px;background:#1a56db;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;">
            Próxima →
          </button>`;
        }

        return _rightBtn;
      })()}
    </div>`);

  // Reinsere o botão APÓS _mostrarConteudo limpar o DOM
  _reinserirOpBar();

  // Restaurar marcas e cursor do marcador (innerHTML foi reconstruído)
  _aplicarMarcas(_paginaAtual);
  _aplicarMarcasAuto();
  if (_marcadorAtivo) {
    const _cnt = document.getElementById('detalhe-conteudo');
    if (_cnt) { _cnt.style.cursor = 'crosshair'; _cnt.addEventListener('click', _onMarkClick); }
  }
}

function _reinserirOpBar() { /* removido — botões na barra fixa */ }

// ══════════════════════════════════════════════════
//  CÂMERA — REGISTRO FOTOGRÁFICO DE EMBALAGEM
// ══════════════════════════════════════════════════
let _camStream = null;

function _abrirCameraEmbalagem() {
  const p = pedidos[currentPedidoIdx];
  if (!p) return;
  if ((p.fotosEmbalagem || []).length >= 3) return;

  document.getElementById('modal-camera-emb')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-camera-emb"
      style="position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column;font-family:Inter,sans-serif;">
      <div style="flex:1;position:relative;overflow:hidden;min-height:0;">
        <video id="cam-video" autoplay playsinline muted
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>
        <img id="cam-preview"
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:none;background:#000;">
        <canvas id="cam-canvas" style="display:none;"></canvas>
        <div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);
                    background:rgba(0,0,0,.6);color:#fff;font-size:12px;font-weight:700;
                    padding:4px 14px;border-radius:20px;" id="cam-counter">
        </div>
      </div>
      <div id="cam-bar-live"
        style="background:#111;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-shrink:0;">
        <button onclick="_fecharCameraEmb()"
          style="padding:10px 20px;background:#374151;color:#fff;border:none;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;">
          ✕ Cancelar
        </button>
        <button onclick="_camCapturar()"
          style="padding:12px 28px;background:#d97706;color:#fff;border:none;border-radius:9px;font-size:15px;font-weight:800;cursor:pointer;">
          Capturar
        </button>
      </div>
      <div id="cam-bar-preview"
        style="display:none;background:#111;padding:18px 24px;flex-shrink:0;flex-direction:row;justify-content:space-between;align-items:center;gap:12px;">
        <button onclick="_camNovamente()"
          style="padding:10px 20px;background:#374151;color:#fff;border:none;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;">
          Tirar Novamente
        </button>
        <button onclick="_camSalvar()" id="cam-btn-salvar"
          style="padding:12px 28px;background:#059669;color:#fff;border:none;border-radius:9px;font-size:15px;font-weight:800;cursor:pointer;">
          Salvar
        </button>
      </div>
    </div>`);

  const _nFotos = (p.fotosEmbalagem || []).length;
  const ctr = document.getElementById('cam-counter');
  if (ctr) ctr.textContent = `Foto ${_nFotos + 1} de 3`;

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    .then(stream => {
      _camStream = stream;
      const v = document.getElementById('cam-video');
      if (v) { v.srcObject = stream; v.play(); }
    })
    .catch(() => {
      _fecharCameraEmb();
      if (typeof _mostrarToast === 'function') _mostrarToast('Câmera não disponível', '#dc2626');
    });
}

function _fecharCameraEmb() {
  if (_camStream) { _camStream.getTracks().forEach(t => t.stop()); _camStream = null; }
  document.getElementById('modal-camera-emb')?.remove();
}

function _camCapturar() {
  const video   = document.getElementById('cam-video');
  const canvas  = document.getElementById('cam-canvas');
  const preview = document.getElementById('cam-preview');
  if (!video || !canvas || !preview) return;
  canvas.width  = video.videoWidth  || 1280;
  canvas.height = video.videoHeight || 720;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  preview.src          = canvas.toDataURL('image/jpeg', 0.88);
  preview.style.display = 'block';
  video.style.display   = 'none';
  document.getElementById('cam-bar-live').style.display    = 'none';
  document.getElementById('cam-bar-preview').style.display = 'flex';
}

function _camNovamente() {
  const video   = document.getElementById('cam-video');
  const preview = document.getElementById('cam-preview');
  if (preview) { preview.style.display = 'none'; preview.src = ''; }
  if (video)   { video.style.display = 'block'; }
  document.getElementById('cam-bar-live').style.display    = 'flex';
  document.getElementById('cam-bar-preview').style.display = 'none';
}

async function _camSalvar() {
  const preview = document.getElementById('cam-preview');
  if (!preview?.src || preview.src === window.location.href) return;
  const btn = document.getElementById('cam-btn-salvar');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

  const p = pedidos[currentPedidoIdx];
  if (!p) return;
  const count = (p.fotosEmbalagem || []).length;
  if (count >= 3) { _fecharCameraEmb(); return; }

  const seq        = String(count + 1).padStart(3, '0');
  const clienteSafe = (p.cliente || '').toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 20);
  const filename   = `${clienteSafe}_${p.id}_${seq}.jpg`;
  const b64        = preview.src.split(',')[1];

  try {
    const r = await fetch('/salvar_foto', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, data: b64 }),
    });
    if (r.ok) {
      if (!p.fotosEmbalagem) p.fotosEmbalagem = [];
      p.fotosEmbalagem.push(filename);
      salvarEstado();
      _fecharCameraEmb();
      _mostrarPaginaOP();
    } else {
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
      if (typeof _mostrarToast === 'function') _mostrarToast('Erro ao salvar foto', '#dc2626');
    }
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; }
    if (typeof _mostrarToast === 'function') _mostrarToast('Erro ao salvar foto', '#dc2626');
  }
}

// ── Marca Texto ───────────────────────────────────────────────────────────────
function _toggleMarcador() {
  _marcadorAtivo = !_marcadorAtivo;
  const btn = document.getElementById('btn-marcador-op');
  if (btn) {
    btn.style.background  = _marcadorAtivo ? '#fef08a' : '#f3f4f6';
    btn.style.color       = _marcadorAtivo ? '#713f12' : '#374151';
    btn.style.borderColor = _marcadorAtivo ? '#fbbf24' : '#d1d5db';
    btn.style.boxShadow   = _marcadorAtivo ? '0 0 0 2px #fbbf24' : '';
  }
  const cnt = document.getElementById('detalhe-conteudo');
  if (cnt) {
    cnt.style.cursor = _marcadorAtivo ? 'crosshair' : '';
    cnt.removeEventListener('click', _onMarkClick);
    if (_marcadorAtivo) cnt.addEventListener('click', _onMarkClick);
  }
}

function _onMarkClick(e) {
  const el = e.target.closest('[data-hl]');
  if (!el) return;
  e.stopPropagation();
  const key = el.dataset.hl;
  const p = pedidos[currentPedidoIdx];
  if (!p) return;
  if (!p._marks) p._marks = {};
  if (!p._marks[_paginaAtual]) p._marks[_paginaAtual] = [];
  const arr = p._marks[_paginaAtual];
  const idx = arr.indexOf(key);
  if (idx >= 0) {
    arr.splice(idx, 1);
    el.style.background = '';
  } else {
    arr.push(key);
    el.style.background = '#fef08a';
  }
  salvarEstado();
}

function _aplicarMarcas(pageIdx) {
  const p = pedidos[currentPedidoIdx];
  const keys = p?._marks?.[pageIdx] || [];
  const cnt = document.getElementById('detalhe-conteudo');
  if (!cnt) return;
  cnt.querySelectorAll('[data-hl]').forEach(el => {
    el.style.background = keys.includes(el.dataset.hl) ? '#fef08a' : '';
  });
}

// Marcação automática permanente: HPM, FITA, Ângulo ≠ 0
function _aplicarMarcasAuto() {
  const cnt = document.getElementById('detalhe-conteudo');
  if (!cnt) return;
  const pg = _paginasOP[_paginaAtual];
  if (!pg) return;

  // 1. Linhas de lista_itens com código HPM*
  (pg.lista_itens || []).forEach((it, i) => {
    if (/^HPM/i.test(it.codigo || '')) {
      const el = cnt.querySelector(`[data-hl="item_row_${i}"]`);
      if (el) el.style.background = '#fef08a';
    }
  });

  // 2. Campos de info: FITA em ID Extra / OBS  |  Ângulo de Montagem ≠ 0
  const _idExtraLimpo = /^OBS\s*:?\s*$/i.test(pg.id_extra || '') ? null : (pg.id_extra || null);
  const _obsLimpo = (pg.obs || '')
    .replace(/Total\s+de\s+PIS\s*:\s*\d+/gi, '')
    .replace(/Aten[çc][aã]o[!.]*/gi, '')
    .trim() || null;

  const _anguloLimpo2 = (/embalagem individual/i.test(pg.angulo || '') || /^reto$/i.test((pg.angulo || '').trim())) ? null : (pg.angulo || null);
  const infoRows = [
    ['Tipo de Corte',        pg.tipo_corte],
    ['Angulo de Montagem',   _anguloLimpo2],
    ['Embalagem Individual', pg.embalagem],
    ['Forma de Embalagem',   pg.forma_emb],
    ['Gravacao Capa',        pg.gravacao],
    ['ID Extra',             _idExtraLimpo],
    ['OBS',                  _obsLimpo],
  ];

  let fIdx = 0;
  infoRows.forEach(([label, val]) => {
    if (!val || !String(val).trim()) return;
    const el = cnt.querySelector(`[data-hl="info_${fIdx}"]`);
    if (el) {
      const v = String(val);
      // FITA em ID Extra ou OBS
      if ((label === 'ID Extra' || label === 'OBS') && /FITA/i.test(v)) {
        el.style.background = '#fef08a';
      }
      // Ângulo diferente de zero/nulo
      if (label === 'Angulo de Montagem') {
        const ang = v.trim().replace(/[º°\s]/g, '');
        if (ang && !/^0+\.?0*$/.test(ang)) {
          el.style.background = '#fef08a';
        }
      }
    }
    fIdx++;
  });
}

window._toggleMarcador = _toggleMarcador;

function _isKitOrder() {
  const p = pedidos[currentPedidoIdx];
  if (p?.tipo === 'mangueira-kit')    return true;
  if (p?.tipo === 'mangueira-avulso') return false;
  if (p?.tipo === 'pecas')            return false;
  // Fallback: auto-detecta por páginas índice
  return _paginasOP.some(_paginaEhIndice);
}

function _pgAnterior() { if(_paginaAtual>0){_paginaAtual--;_mostrarPaginaOP();} }

function _pgProxima_aprov() {
  if (_paginaAtual < _paginasOP.length - 1) {
    _paginaAtual++;
    _mostrarPaginaOP();
  } else {
    _mostrarPainelAprovacao(currentPedidoIdx);
  }
}

function _pgProxima() {
  const p     = pedidos[currentPedidoIdx];
  const pg    = _paginasOP[_paginaAtual];
  const etapa = window._etapaVizualizacao || p?.etapa;

  if (p && pg && !pg.is_index && ['corte','prensagem','embalagem'].includes(etapa)) {
    if (!_todasAmostragemPreenchidas(_paginaAtual)) {
      _destacarAmostragemVazia(_paginaAtual);
      _mostrarAvisoAmostragemIncompleta(() => {
        // Marca como pulado (phantom) e avança
        if (etapa === 'corte')     { pg._pulado_corte     = true; }
        if (etapa === 'prensagem') { pg._pulado_prensagem = true; }
        if (etapa === 'embalagem') { pg._pulado_embalagem = true; }
        salvarEstado();
        if (typeof _mostrarToast === 'function') _mostrarToast('Item adicionado como pendente', '#f59e0b');
        if (_paginaAtual < _paginasOP.length - 1) { _paginaAtual++; _mostrarPaginaOP(); }
      });
      return;
    }
    if (etapa === 'corte') {
      pg._cortado = true; pg._pulado_corte = false; salvarEstado();
    } else if (etapa === 'prensagem') {
      pg._prensado = true; pg._pulado_prensagem = false; salvarEstado();
    } else if (etapa === 'embalagem' && pg.item_codigo) {
      if (!p.itensEmbalados) p.itensEmbalados = [];
      if (!p.itensEmbalados.includes(pg.item_codigo)) p.itensEmbalados.push(pg.item_codigo);
      salvarEstado();
    }
  }
  if (_paginaAtual < _paginasOP.length - 1) { _paginaAtual++; _mostrarPaginaOP(); }
}

function _pgPular() {
  const p     = pedidos[currentPedidoIdx];
  const pg    = _paginasOP[_paginaAtual];
  if (!p || !pg || pg.is_index) return;
  const etapa = window._etapaVizualizacao || p.etapa;
  if (etapa === 'corte')     pg._pulado_corte     = true;
  if (etapa === 'prensagem') pg._pulado_prensagem  = true;
  if (etapa === 'embalagem') pg._pulado_embalagem  = true;
  salvarEstado();
  if (typeof _mostrarToast === 'function') _mostrarToast('Item pulado', '#f59e0b');
  if (_paginaAtual < _paginasOP.length - 1) { _paginaAtual++; _mostrarPaginaOP(); }
  else _mostrarPaginaOP();
}

function _kitModalRowHTML(pgIdx, it, embalados) {
  const ok = embalados.includes(it.codigo);
  const safeCode = it.codigo.replace(/[^a-z0-9]/gi,'_');
  return `<tr id="kit-row-${pgIdx}-${safeCode}"
      onclick="_toggleKitItem(${pgIdx},'${it.codigo}')"
      style="background:${ok?'#f0fdf4':'transparent'};border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background .12s;">
    <td style="padding:7px 8px;white-space:nowrap;font-family:'Courier New',monospace;font-size:12px;">${Number(it.quantidade||0).toFixed(6)}</td>
    <td style="padding:7px 8px;font-weight:700;font-family:'Courier New',monospace;font-size:12px;">${it.unidade||''}</td>
    <td style="padding:7px 8px;font-weight:700;font-family:'Courier New',monospace;font-size:12px;">${it.codigo||''}</td>
    <td style="padding:7px 8px;color:#374151;font-size:12px;">${it.descricao||''}</td>
    <td style="padding:7px 8px;text-align:center;font-size:16px;">${ok?'✓':'<span style="color:#d1d5db;font-size:20px;">○</span>'}</td>
  </tr>`;
}

function _toggleKitItem(pgIdx, itemCodigo) {
  if (window._soLeitura) return;
  const p = pedidos[currentPedidoIdx]; if (!p) return;
  if (!p.itensEmbalados) p.itensEmbalados = [];
  const idx = p.itensEmbalados.indexOf(itemCodigo);
  if (idx >= 0) p.itensEmbalados.splice(idx, 1);
  else p.itensEmbalados.push(itemCodigo);
  salvarEstado();

  const indexPg = p.paginasOP?.[pgIdx];
  if (!indexPg) return;
  const embalados = p.itensEmbalados;

  // Atualiza linha no modal
  const safeCode = itemCodigo.replace(/[^a-z0-9]/gi,'_');
  const row = document.getElementById(`kit-row-${pgIdx}-${safeCode}`);
  const it = (indexPg.lista_itens||[]).find(x => x.codigo === itemCodigo);
  if (row && it) row.outerHTML = _kitModalRowHTML(pgIdx, it, embalados);

  // Atualiza subtítulo do modal e botão da barra (inclui adaptadores no total)
  const kitCodigo = indexPg.item_codigo;
  const kitQty    = Math.ceil(indexPg.item_qty || 1);
  const items  = (indexPg.lista_itens||[]).filter(it2 => !_isAdaptador(it2));
  const adapts = (indexPg.lista_itens||[]).filter(it2 => _isAdaptador(it2));
  const embIt  = items.filter(it2 => embalados.includes(it2.codigo)).length;
  const embAd  = adapts.filter(it2 => (p.adaptadoresEmbalados?.[`${kitCodigo}__${it2.codigo}`]||0) >= kitQty).length;
  const emb    = embIt + embAd;
  const total  = items.length + adapts.length;
  const pct    = total > 0 ? Math.round(emb / total * 100) : 0;
  const hdr = document.getElementById('kit-modal-hdr');
  if (hdr) hdr.textContent = `${emb} de ${total} itens embalados`;
  const pctEl = document.getElementById('kit-modal-pct');
  if (pctEl) pctEl.textContent = `${pct}%`;

  const done   = total > 0 && emb >= total;
  const navBtn = document.getElementById(`kit-emb-btn-${pgIdx}`);
  if (navBtn) {
    navBtn.style.background  = done ? '#f0fdf4' : '#eff6ff';
    navBtn.style.color       = done ? '#059669' : '#1a56db';
    navBtn.style.borderColor = done ? '#86efac' : '#bfdbfe';
    navBtn.innerHTML = `${kitCodigo}${total>0?` (${emb}/${total})`:''}`;
  }
}
window._toggleKitItem = _toggleKitItem;

function _toggleAdaptEmbalagem(pgIdx, itemCodigo) {
  if (window._soLeitura) return;
  const p = pedidos[currentPedidoIdx]; if (!p) return;
  if (!p.adaptadoresEmbalados) p.adaptadoresEmbalados = {};
  const indexPg   = p.paginasOP?.[pgIdx]; if (!indexPg) return;
  const kitCodigo = indexPg.item_codigo;
  const kitQty    = Math.ceil(indexPg.item_qty || 1);
  const compKey   = `${kitCodigo}__${itemCodigo}`;
  const current   = p.adaptadoresEmbalados[compKey] || 0;
  // Toggle: completo → zera; incompleto → marca tudo
  p.adaptadoresEmbalados[compKey] = current >= kitQty ? 0 : kitQty;
  salvarEstado();

  const done     = p.adaptadoresEmbalados[compKey] >= kitQty;
  const safeCode = itemCodigo.replace(/[^a-z0-9]/gi,'_');
  const row      = document.getElementById(`adapt-emb-row-${pgIdx}-${safeCode}`);
  if (row) {
    row.style.background = done ? '#f0fdf4' : '#fff8f0';
    const statusCell = row.querySelector('td:last-child');
    if (statusCell) statusCell.innerHTML = done ? '✓' : '<span style="color:#d1d5db;font-size:20px;">○</span>';
  }

  // Recalcula totais (itens + adaptadores) para header e botão da barra
  const embalados = p.itensEmbalados || [];
  const adaptEmb  = p.adaptadoresEmbalados;
  const items  = (indexPg.lista_itens||[]).filter(it => !_isAdaptador(it));
  const adapts = (indexPg.lista_itens||[]).filter(it => _isAdaptador(it));
  const embIt  = items.filter(it => embalados.includes(it.codigo)).length;
  const embAd  = adapts.filter(it => (adaptEmb[`${kitCodigo}__${it.codigo}`]||0) >= kitQty).length;
  const emb    = embIt + embAd;
  const total  = items.length + adapts.length;
  const pct    = total > 0 ? Math.round(emb / total * 100) : 0;

  const hdr = document.getElementById('kit-modal-hdr');
  if (hdr) hdr.textContent = `${emb} de ${total} itens embalados`;
  const pctEl = document.getElementById('kit-modal-pct');
  if (pctEl) pctEl.textContent = `${pct}%`;

  const navDone = total > 0 && emb >= total;
  const navBtn  = document.getElementById(`kit-emb-btn-${pgIdx}`);
  if (navBtn) {
    navBtn.style.background  = navDone ? '#f0fdf4' : '#eff6ff';
    navBtn.style.color       = navDone ? '#059669' : '#1a56db';
    navBtn.style.borderColor = navDone ? '#86efac' : '#bfdbfe';
    navBtn.innerHTML = `${kitCodigo}${total>0?` (${emb}/${total})`:''}`;
  }
}
window._toggleAdaptEmbalagem = _toggleAdaptEmbalagem;

function _abrirKitModal(pgIdx) {
  const p = pedidos[currentPedidoIdx]; if (!p) return;
  const indexPg = p.paginasOP?.[pgIdx];
  if (!indexPg || !indexPg.is_index) { if (typeof _mostrarToast === 'function') _mostrarToast('Sem página de kit', '#6b7280'); return; }

  const kitCodigo  = indexPg.item_codigo;
  const kitQty     = Math.ceil(indexPg.item_qty || 1);
  const embalados  = p.itensEmbalados || [];
  const adaptEmb   = p.adaptadoresEmbalados || {};
  const items      = (indexPg.lista_itens || []).filter(it => !_isAdaptador(it));
  const adapts     = (indexPg.lista_itens || []).filter(it => _isAdaptador(it));

  const embIt  = items.filter(it => embalados.includes(it.codigo)).length;
  const embAd  = adapts.filter(it => (adaptEmb[`${kitCodigo}__${it.codigo}`]||0) >= kitQty).length;
  const emb    = embIt + embAd;
  const total  = items.length + adapts.length;
  const pct    = total > 0 ? Math.round(emb / total * 100) : 0;

  const itensHTML = items.map(it => _kitModalRowHTML(pgIdx, it, embalados)).join('');

  const adaptsHTML = adapts.length ? `
    <tr><td colspan="5" style="padding:10px 8px 4px;font-size:10px;font-weight:800;color:#6b7280;letter-spacing:.5px;background:#f8fafc;border-top:2px solid #e5e7eb;">
      ADAPTADORES
    </td></tr>
    ${adapts.map(it => {
      const compKey  = `${kitCodigo}__${it.codigo}`;
      const cnt      = adaptEmb[compKey] || 0;
      const done     = cnt >= kitQty;
      const safeCode = it.codigo.replace(/[^a-z0-9]/gi,'_');
      return `<tr id="adapt-emb-row-${pgIdx}-${safeCode}"
          onclick="_toggleAdaptEmbalagem(${pgIdx},'${it.codigo}')"
          style="background:${done?'#f0fdf4':'#fff8f0'};border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background .12s;">
        <td style="padding:7px 8px;white-space:nowrap;font-family:'Courier New',monospace;font-size:12px;">${kitQty}</td>
        <td style="padding:7px 8px;font-weight:700;font-family:'Courier New',monospace;font-size:12px;">PC</td>
        <td style="padding:7px 8px;font-weight:700;font-family:'Courier New',monospace;font-size:12px;">${it.codigo||''}</td>
        <td style="padding:7px 8px;color:#374151;font-size:12px;">${it.descricao||''}</td>
        <td style="padding:7px 8px;text-align:center;font-size:16px;">${done?'✓':'<span style="color:#d1d5db;font-size:20px;">○</span>'}</td>
      </tr>`;
    }).join('')}` : '';

  const old = document.getElementById('kit-modal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'kit-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:740px;max-width:96vw;max-height:90vh;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.25);display:flex;flex-direction:column;font-family:Inter,sans-serif;">
      <div style="background:linear-gradient(135deg,#1a56db,#1e40af);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div>
          <div style="font-size:15px;font-weight:800;color:#fff;">${kitCodigo} — #${p.id}</div>
          <div id="kit-modal-hdr" style="font-size:12px;color:rgba(255,255,255,.8);margin-top:3px;">${emb} de ${total} itens embalados</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="kit-modal-pct" style="background:rgba(255,255,255,.2);border-radius:20px;padding:4px 14px;font-size:13px;color:#fff;font-weight:800;">${pct}%</div>
          <button onclick="document.getElementById('kit-modal').remove()"
            style="background:rgba(255,255,255,.15);border:none;border-radius:8px;color:#fff;font-size:20px;line-height:1;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#f3f4f6;">
            <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;">QTD</th>
            <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;">UN</th>
            <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;">CÓDIGO</th>
            <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;">DESCRIÇÃO</th>
            <th style="padding:6px 8px;text-align:center;font-size:10px;font-weight:700;color:#6b7280;">STATUS</th>
          </tr></thead>
          <tbody>${itensHTML}${adaptsHTML}</tbody>
        </table>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// Mapa de progressão de etapas
const _PROXIMA_ETAPA = {
  inspecao:  'corte',
  corte:     'prensagem',
  prensagem: 'embalagem',
  embalagem: 'finalizado',
};
const _ETAPA_LABEL = {
  inspecao:  'INSPEÇÃO',
  corte:     'CORTE',
  prensagem: 'PRENSAGEM',
  embalagem: 'EMBALAGEM',
  finalizado:'FINALIZADO',
};

function _concluirPedido(_forcar) {
  const p = pedidos[currentPedidoIdx];
  if (!p) return;

  // Bloquear se há pendências de estoque não resolvidas
  const _pendAbertas = (p.pendencias || []).filter(pend => pend.status !== 'Empenhado' && !pend.resolvido);
  if (_pendAbertas.length > 0) {
    const _om = document.getElementById('modal-estoque-bloqueio');
    if (_om) _om.remove();
    const _mb = document.createElement('div');
    _mb.id = 'modal-estoque-bloqueio';
    _mb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
    _mb.onclick = e => { if (e.target === _mb) _mb.remove(); };
    _mb.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:440px;max-width:95vw;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.3);font-family:Inter,sans-serif;">
        <div style="background:linear-gradient(135deg,#f59e0b,#b45309);padding:16px 18px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:14px;font-weight:800;color:#fff;">Falta de Estoque Pendente</div>
            <div style="font-size:11px;color:rgba(255,255,255,.85);margin-top:3px;">${_pendAbertas.length} pendência(s) não resolvida(s)</div>
          </div>
          <button onclick="document.getElementById('modal-estoque-bloqueio').remove()"
            style="background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;line-height:1;">×</button>
        </div>
        <div style="padding:16px 18px;">
          <div style="font-size:12px;color:#374151;margin-bottom:10px;">Resolva as faltas de estoque antes de finalizar o pedido:</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">
            ${_pendAbertas.map(pend => `
              <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fef3c7;border:1.5px solid #fbbf24;border-radius:8px;">
                <span style="font-size:18px;flex-shrink:0;"></span>
                <div>
                  <div style="font-size:12px;font-weight:700;color:#92400e;font-family:'Courier New',monospace;">${pend.item||'—'}</div>
                  <div style="font-size:11px;color:#b45309;">Status: ${pend.status||'Em Falta'}</div>
                </div>
              </div>`).join('')}
          </div>
          <button onclick="document.getElementById('modal-estoque-bloqueio').remove()"
            style="width:100%;padding:10px;border:none;border-radius:9px;background:#1a56db;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">
            Voltar
          </button>
        </div>
      </div>`;
    document.body.appendChild(_mb);
    return;
  }

  _adminOpAtivo = {}; // limpa operador escolhido ao concluir etapa

  const _etapaEf = window._etapaVizualizacao || p.etapa;

  // Marcar último item — com modal de confirmação se amostragens incompletas
  const _pgFinal = _paginasOP[_paginaAtual];
  if (!_forcar && _pgFinal && !_pgFinal.is_index && ['corte','prensagem','embalagem'].includes(_etapaEf)) {
    if (!_todasAmostragemPreenchidas(_paginaAtual)) {
      _destacarAmostragemVazia(_paginaAtual);
      _mostrarAvisoAmostragemIncompleta(() => {
        if (_etapaEf === 'corte')     { _pgFinal._pulado_corte     = true; }
        if (_etapaEf === 'prensagem') { _pgFinal._pulado_prensagem = true; }
        if (_etapaEf === 'embalagem') { _pgFinal._pulado_embalagem = true; }
        _concluirPedido(true);
      });
      return;
    }
  }
  if (_pgFinal && !_pgFinal.is_index && ['corte','prensagem','embalagem'].includes(_etapaEf)) {
    // Em modo fantasma sempre marca como concluído (itens eram _pulado_*).
    // Em modo normal, só marca se o item não foi recém-pulado pelo modal "Continuar".
    const _emModoFantasma = _etapaEf !== p.etapa;
    const _deveMarcar = _emModoFantasma || (!_pgFinal._pulado_corte && !_pgFinal._pulado_prensagem && !_pgFinal._pulado_embalagem);
    if (_deveMarcar) {
      if (_etapaEf === 'corte') {
        _pgFinal._cortado = true; _pgFinal._pulado_corte = false;
      } else if (_etapaEf === 'prensagem') {
        _pgFinal._prensado = true; _pgFinal._pulado_prensagem = false;
      } else if (_etapaEf === 'embalagem' && _pgFinal.item_codigo) {
        if (!p.itensEmbalados) p.itensEmbalados = [];
        if (!p.itensEmbalados.includes(_pgFinal.item_codigo)) p.itensEmbalados.push(_pgFinal.item_codigo);
      }
    }
  }

  // MODO PHANTOM: pedido já está em etapa posterior; salva medições e fecha
  if (_etapaEf !== p.etapa) {
    // Persiste amostragens do fantasma usando índices reais de p.paginasOP
    if (!p.amostragens) p.amostragens = {};
    const _fullPagsP = p.paginasOP || [];
    _paginasOP.forEach((pg, fi) => {
      const ri = _fullPagsP.indexOf(pg);
      if (ri >= 0 && _amostrasDB[fi]) {
        p.amostragens[ri] = JSON.parse(JSON.stringify(_amostrasDB[fi]));
      }
    });
    salvarEstado();
    renderKanban();
    window._etapaVizualizacao = null;
    _mostrarConteudo(`<div style="padding:48px;text-align:center;font-family:Inter,sans-serif;">
      <div style="font-size:48px;margin-bottom:12px;">✓</div>
      <div style="font-size:18px;font-weight:800;color:#059669;margin-bottom:6px;">Pendências Concluídas!</div>
      <div style="font-size:14px;color:#6b7280;">Itens de <strong>${_etapaEf.toUpperCase()}</strong> processados com sucesso.</div>
    </div>`);
    setTimeout(() => voltarPedidos(), 1800);
    return;
  }

  // ── BLOQUEIO: verificar se todos os itens de embalagem foram embalados ──
  if (p.etapa === 'embalagem') {
    const _embalados   = p.itensEmbalados || [];
    const _todasPags   = _filtrarPaginasBrancas(p.paginasOP || []);
    let _faltando = [];

    if (p.tipo === 'mangueira-kit') {
      const _indexPgs = _todasPags.filter(pg => pg.is_index);
      // Itens de mangueira montada
      const _kitItens = _indexPgs.flatMap(pg => (pg.lista_itens || []).filter(it => !_isAdaptador(it)));
      const _faltandoItens = _kitItens.filter(it => !_embalados.includes(it.codigo));
      // Adaptadores: verificar se todos os kits foram embalados (count >= kitQty)
      const _faltandoAdapt = _indexPgs.flatMap(pg => {
        const _kQty = Math.ceil(pg.item_qty || 1);
        return (pg.lista_itens || []).filter(_isAdaptador).filter(it => {
          const _ck = `${pg.item_codigo}__${it.codigo}`;
          return (p.adaptadoresEmbalados?.[_ck] || 0) < _kQty;
        });
      });
      _faltando = [..._faltandoItens, ..._faltandoAdapt];
    } else {
      // Avulso: verificar todas as páginas de item não puladas
      const _itemPgs = _todasPags.filter(pg => !pg.is_index && pg.item_codigo && !pg._pulado_embalagem);
      _faltando = _itemPgs.filter(pg => !_embalados.includes(pg.item_codigo))
                          .map(pg => ({ codigo: pg.item_codigo, descricao: pg.descricao || '' }));
    }

    if (_faltando.length > 0) {
      // Mostra modal de bloqueio com lista de itens faltantes
      const _old = document.getElementById('modal-embala-incompleto');
      if (_old) _old.remove();
      const _m = document.createElement('div');
      _m.id = 'modal-embala-incompleto';
      _m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
      _m.onclick = e => { if (e.target === _m) _m.remove(); };
      _m.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:480px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.25);font-family:Inter,sans-serif;">
          <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:16px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div>
              <div style="font-size:14px;font-weight:800;color:#fff;">Embalagem Incompleta</div>
              <div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:3px;">${_faltando.length} item(ns) ainda não embalado(s)</div>
            </div>
            <button onclick="document.getElementById('modal-embala-incompleto').remove()"
              style="background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;line-height:1;">×</button>
          </div>
          <div style="flex:1;overflow-y:auto;padding:14px 16px;">
            <div style="font-size:12px;color:#374151;margin-bottom:10px;">Embale todos os itens antes de finalizar o pedido:</div>
            <div style="display:flex;flex-direction:column;gap:5px;">
              ${_faltando.map(it => `
                <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;">
                  <span style="font-size:16px;flex-shrink:0;">○</span>
                  <div>
                    <div style="font-size:12px;font-weight:700;color:#111;font-family:'JetBrains Mono',monospace;">${it.codigo}</div>
                    ${it.descricao ? `<div style="font-size:11px;color:#6b7280;">${it.descricao}</div>` : ''}
                  </div>
                </div>`).join('')}
            </div>
          </div>
          <div style="padding:12px 16px;border-top:1px solid #e5e7eb;flex-shrink:0;">
            <button onclick="document.getElementById('modal-embala-incompleto').remove()"
              style="width:100%;padding:10px;border:none;border-radius:9px;background:#1a56db;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">
              Voltar e embalar os itens restantes
            </button>
          </div>
        </div>`;
      document.body.appendChild(_m);
      return; // bloqueia a finalização
    }
  }

  // Determina próxima etapa baseado na etapa atual (Peças pula direto para finalizado após inspeção)
  const etapaAtual  = p.etapa;
  const proximaEtapa = (p.tipo === 'pecas' && etapaAtual === 'inspecao')
    ? 'finalizado'
    : (_PROXIMA_ETAPA[etapaAtual] || 'finalizado');
  const proximaLabel = _ETAPA_LABEL[proximaEtapa]  || proximaEtapa.toUpperCase();

  // Salvar timestamp final da inspeção ao concluir (só se Admin não tiver editado)
  if (etapaAtual === 'inspecao' && p.checklist_inspecao) {
    if (!p.checklist_inspecao.ts_fim) {
      p.checklist_inspecao.ts_fim = new Date().toISOString();
    }
  }

  // Registrar timestamp de fim de cada etapa (só se Admin não tiver editado)
  if (!['separacao', 'finalizado'].includes(etapaAtual)) {
    if (!p._ts_etapas) p._ts_etapas = {};
    if (!p._ts_etapas[etapaAtual + '_fim']) {
      p._ts_etapas[etapaAtual + '_fim'] = new Date().toISOString();
    }
    // Garantir que o início também foi registrado (caso de migração de dados antigos)
    if (!p._ts_etapas[etapaAtual + '_inicio']) {
      p._ts_etapas[etapaAtual + '_inicio'] = p._ts_etapas[etapaAtual + '_fim'];
    }
  }

  p.etapa = proximaEtapa;
  p._iniciado    = false;  // reset para nova etapa mostrar "Iniciar" e não "Retomar"
  p._ultimaPagina = null;  // reset para nova etapa começar do primeiro item
  // Re-mapeia _amostrasDB (índice filtrado) → p.amostragens (índice real de p.paginasOP)
  if (!p.amostragens) p.amostragens = {};
  const _fullPagsC = p.paginasOP || [];
  _paginasOP.forEach((pg, fi) => {
    const ri = _fullPagsC.indexOf(pg);
    if (ri >= 0 && _amostrasDB[fi]) {
      p.amostragens[ri] = JSON.parse(JSON.stringify(_amostrasDB[fi]));
    }
  });
  p.amostragens_operador = typeof currentUser !== 'undefined' && currentUser ? currentUser.nome : '';
  p.amostragens_ts = new Date().toISOString();
  salvarEstado();
  renderKanban();

  // Desativa modo andamento ao concluir
  if (typeof _setModoAndamento === 'function') {
    _setModoAndamento(false, currentPedidoIdx);
  }

  _mostrarConteudo(`<div style="padding:48px;text-align:center;font-family:Inter,sans-serif;">
    <div style="font-size:48px;margin-bottom:12px;">✓</div>
    <div style="font-size:18px;font-weight:800;color:#059669;margin-bottom:6px;">Etapa Concluída!</div>
    <div style="font-size:14px;color:#6b7280;">Movido para <strong>${proximaLabel}</strong></div>
  </div>`);
  setTimeout(() => voltarPedidos(), 1800);
}

// ══════════════════════════════════════════════════
//  PEDIDO FINALIZADO — tela somente-leitura
// ══════════════════════════════════════════════════
function _mostrarPedidoFinalizado() {
  _mostrarConteudo(`
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                min-height:300px;padding:48px 24px;font-family:Inter,sans-serif;text-align:center;gap:16px;">
      <div style="font-size:56px;">✓</div>
      <div style="font-size:20px;font-weight:800;color:#059669;">Pedido Concluído</div>
      <div style="font-size:14px;color:#6b7280;max-width:320px;line-height:1.6;">
        Este pedido já foi finalizado e não pode ser editado.<br>
        Use o botão <strong>Relatório do Pedido</strong> para visualizar os registros.
      </div>
    </div>`);
}

// ══════════════════════════════════════════════════
//  RELATÓRIO DO PEDIDO — PDF gerado no servidor
// ══════════════════════════════════════════════════
async function _gerarRelatorio() {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  if (typeof _mostrarToast === 'function') _mostrarToast('Gerando relatório…', '#1a56db');

  try {
    // Carrega dados de laudos de teste (lazy)
    const laudosPayload = [];
    for (const l of (p.laudos || [])) {
      const data = typeof getAnexoData === 'function' ? await getAnexoData(l, p.id) : null;
      if (data) laudosPayload.push({ filename: l.filename || '', data });
    }

    const _nomeAtual = (typeof currentUser !== 'undefined' && currentUser?.nome) ? currentUser.nome : '';
    const _opFallback = p.amostragens_operador || _nomeAtual || '—';
    const _checklist = p.checklist_inspecao ? { ...p.checklist_inspecao } : null;
    if (_checklist && !_checklist.usuario) _checklist.usuario = _opFallback;

    const payload = {
      pedido:    p.id,
      cliente:   p.cliente,
      entrega:   p.entrega,
      paginas:   p.paginasOP || [],
      amostragens: p.amostragens || {},
      operador:  _opFallback,
      ts:        p.amostragens_ts || '',
      checklist_inspecao: _checklist,
      ts_etapas: p._ts_etapas || null,
      laudos:    laudosPayload,
      fotos_embalagem: p.fotosEmbalagem || [],
    };

    const resp = await fetch('/gerar_relatorio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const { pdf } = await resp.json();
    _dlB64(`RELATORIO_${p.id}.pdf`, pdf);
    if (typeof _mostrarToast === 'function') _mostrarToast('Relatório gerado!', '#059669');
  } catch (e) {
    console.error('Relatório:', e);
    if (typeof _mostrarToast === 'function') _mostrarToast('Erro ao gerar relatório.', '#ef4444');
  }
}

// ══════════════════════════════════════════════════
//  SEPARAÇÃO
// ══════════════════════════════════════════════════
function abrirSeparacao() {
  _fecharViewer();
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  const conteudo = document.getElementById('detalhe-conteudo');
  if (!conteudo) return;
  conteudo.innerHTML = '';

  if (p.pdfSepData) {
    abrirPdfViewer('Separação — #' + p.id + '.pdf', p.pdfSepData);
    return;
  }

  // Sem PDF: área para anexar
  conteudo.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                flex:1;gap:16px;padding:48px 24px;color:#9ca3af;font-family:Inter,sans-serif;">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".35">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
      <div style="text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#374151;margin-bottom:6px;">Nenhum PDF de separação anexado</div>
        <div style="font-size:13px;color:#9ca3af;">Anexe o PDF com as etiquetas de separação deste pedido</div>
      </div>
      ${window._soLeitura ? '' : `<button onclick="document.getElementById('upload-pdf-sep').click()"
        style="padding:10px 24px;background:#1a56db;color:#fff;border:none;border-radius:10px;
               font-size:14px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;
               display:flex;align-items:center;gap:8px;">
        Anexar PDF de Separação
      </button>
      <input type="file" id="upload-pdf-sep" accept=".pdf" style="display:none"
        onchange="anexarPdfSeparacao(event)">`}
    </div>`;
}

// ══════════════════════════════════════════════════
//  ETIQUETAS DO PEDIDO (kits)
// ══════════════════════════════════════════════════
async function abrirEtiqPedido() {
  _fecharViewer();
  const p    = pedidos[currentPedidoIdx];
  const kits = p.anexos?.kits;
  if (p.processing) { _mostrarConteudo(_msgAguardando('Etiquetas do Pedido','Processando PDF...')); return; }
  if (!kits?.length) { _mostrarConteudo(_msgAguardando('Etiquetas do Pedido','Nenhuma etiqueta gerada.')); return; }

  // Um único kit: abre direto
  if (kits.length === 1) {
    _mostrarConteudo(_msgAguardando('Etiquetas do Pedido','Carregando...'));
    const data = await getAnexoData(kits[0], p.id);
    if (!data) { _mostrarConteudo(_msgAguardando('Etiquetas do Pedido','PDF não encontrado no servidor.')); return; }
    _mostrarConteudo('');
    abrirPdfViewer(kits[0].filename, data);
    return;
  }

  // Múltiplos kits: tela de seleção
  const btnsHTML = kits.map((kit, i) => {
    const match = (kit.filename || '').match(/^KIT_([^_]+)_/i);
    const label = match ? match[1] : kit.filename;
    return `<button onclick="_abrirEtiqKit(${i})"
      style="display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;
             background:#fff;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;
             text-align:left;transition:border-color .15s,background .15s;"
      onmouseover="this.style.borderColor='#1a56db';this.style.background='#eff6ff'"
      onmouseout="this.style.borderColor='#e5e7eb';this.style.background='#fff'">
      <span style="font-size:24px;flex-shrink:0;"></span>
      <div>
        <div style="font-size:13px;font-weight:800;color:#1a56db;font-family:'Courier New',monospace;">${label}</div>
        <div style="font-size:10px;color:#9ca3af;font-family:Inter,sans-serif;margin-top:2px;">${kit.filename}</div>
      </div>
      <span style="margin-left:auto;font-size:16px;color:#9ca3af;">›</span>
    </button>`;
  }).join('');

  _mostrarConteudo(`
    <div style="padding:24px 20px;font-family:Inter,sans-serif;max-width:500px;margin:0 auto;">
      <div style="font-size:16px;font-weight:800;color:#111;margin-bottom:4px;">Etiquetas do Pedido</div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:20px;">${kits.length} kits disponíveis — selecione para visualizar</div>
      <div style="display:flex;flex-direction:column;gap:10px;">${btnsHTML}</div>
    </div>`);
}

async function _abrirEtiqKit(kitIdx) {
  const p   = pedidos[currentPedidoIdx];
  const kit = p.anexos?.kits?.[kitIdx];
  if (!kit) return;
  _mostrarConteudo(_msgAguardando('Etiquetas do Pedido','Carregando...'));
  const data = await getAnexoData(kit, p.id);
  if (!data) { _mostrarConteudo(_msgAguardando('Etiquetas do Pedido','PDF não encontrado no servidor.')); return; }
  _mostrarConteudo('');
  abrirPdfViewer(kit.filename, data);
}
window._abrirEtiqKit = _abrirEtiqKit;

// ══════════════════════════════════════════════════
//  ETIQUETA DE EMBALAGEM
// ══════════════════════════════════════════════════
async function abrirEtiqEmbalagem() {
  _fecharViewer();
  const p   = pedidos[currentPedidoIdx];
  const emb = p.anexos?.embalagem;
  if (p.processing) { _mostrarConteudo(_msgAguardando('Etiqueta de Embalagem','Processando PDF...')); return; }
  if (!emb)         { _mostrarConteudo(_msgAguardando('Etiqueta de Embalagem','Nenhuma etiqueta gerada.')); return; }
  _mostrarConteudo(_msgAguardando('Etiqueta de Embalagem','Carregando...'));
  const data = await getAnexoData(emb, p.id);
  if (!data) { _mostrarConteudo(_msgAguardando('Etiqueta de Embalagem','PDF não encontrado no servidor.')); return; }
  _mostrarConteudo('');
  abrirPdfViewer(emb.filename, data);
}

// ── Download direto da OP ──────────────────────────
async function _baixarOP() {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;
  const filename = p.anexos?.op?.filename || (p.id + '.pdf');
  let b64 = _getPdfOp(p);
  if (!b64 && p.anexos?.op) b64 = await getAnexoData(p.anexos.op, p.id);
  if (!b64 && p._pdfFilename) b64 = await getPdfB64(p);
  if (!b64) { alert('PDF da OP não encontrado.'); return; }
  _dlB64(filename, b64);
}

// ══════════════════════════════════════════════════
//  LAUDO DE TESTE
// ══════════════════════════════════════════════════
async function abrirLaudo() {
  _fecharViewer();
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  const conteudo = document.getElementById('detalhe-conteudo');
  if (!conteudo) return;
  conteudo.innerHTML = '';

  const laudos = p.laudos || [];
  const MAX_LAUDOS = 3;

  if (!laudos.length) {
    conteudo.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  flex:1;gap:16px;padding:48px 24px;color:#9ca3af;font-family:Inter,sans-serif;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".35">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <path d="M9 13h6M9 17h4"/>
        </svg>
        <div style="text-align:center;">
          <div style="font-size:15px;font-weight:700;color:#374151;margin-bottom:6px;">Nenhum laudo de teste anexado</div>
          <div style="font-size:13px;color:#9ca3af;">Anexe até ${MAX_LAUDOS} laudos de teste (PDF)</div>
        </div>
        ${window._soLeitura ? '' : `<button onclick="document.getElementById('upload-pdf-laudo').click()"
          style="padding:10px 24px;background:#1a56db;color:#fff;border:none;border-radius:10px;
                 font-size:14px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;
                 display:flex;align-items:center;gap:8px;">
          Anexar Laudo de Teste
        </button>
        <input type="file" id="upload-pdf-laudo" accept=".pdf" style="display:none"
          onchange="anexarPdfLaudo(event)">`}
      </div>`;
    return;
  }

  // Lista de laudos (1, 2 ou 3)
  conteudo.innerHTML = `
    <div style="padding:16px;display:flex;flex-direction:column;gap:10px;font-family:Inter,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:13px;font-weight:700;color:#374151;">Laudos de Teste</div>
        <div style="font-size:11px;color:#6b7280;">${laudos.length} / ${MAX_LAUDOS}</div>
      </div>
      ${laudos.map((l, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;
                    background:#fff;border:1px solid #e5e7eb;border-radius:10px;">
          <div style="width:32px;height:32px;background:#eff6ff;border-radius:8px;
                      display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:700;color:#374151;">Laudo ${i+1}</div>
            <div style="font-size:11px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.filename}</div>
          </div>
          <button onclick="abrirLaudoIdx(${i})"
            style="padding:5px 12px;background:#1a56db;color:#fff;border:none;border-radius:7px;
                   font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;white-space:nowrap;flex-shrink:0;">
            Ver
          </button>
          ${window._soLeitura ? '' : `<button onclick="removerLaudo(${i})"
            style="padding:5px 10px;background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:7px;
                   font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;flex-shrink:0;">
            ✕
          </button>`}
        </div>`).join('')}
      ${(laudos.length < MAX_LAUDOS && !window._soLeitura) ? `
      <button onclick="document.getElementById('upload-pdf-laudo').click()"
        style="padding:10px 18px;background:#f0f9ff;color:#1a56db;border:1.5px dashed #93c5fd;
               border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;
               display:flex;align-items:center;justify-content:center;gap:8px;">
        Adicionar Laudo ${laudos.length + 1}
      </button>` : `
      <div style="font-size:11px;color:#9ca3af;text-align:center;padding:4px;">
        Limite de ${MAX_LAUDOS} laudos atingido
      </div>`}
      <input type="file" id="upload-pdf-laudo" accept=".pdf" style="display:none"
        onchange="anexarPdfLaudo(event)">
    </div>`;
}

async function abrirLaudoIdx(i) {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p?.laudos?.[i]) return;
  _mostrarConteudo(_msgAguardando('Laudo de Teste','Carregando PDF...'));
  const data = p.laudos[i].data || await getAnexoData(p.laudos[i], p.id);
  _mostrarConteudo('');
  if (!data) { _mostrarConteudo(_msgAguardando('Laudo de Teste','PDF não encontrado.')); return; }
  abrirPdfViewer(p.laudos[i].filename, data);
}

function anexarPdfLaudo(event) {
  const file = event.target.files[0];
  if (!file) return;
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;
  if (!p.laudos) p.laudos = [];
  const reader = new FileReader();
  reader.onload = e => {
    const n  = p.laudos.length + 1;
    const fn = 'LAUDO_' + n + '_' + p.id + '.pdf';
    p.laudos.push({ filename: fn, data: e.target.result.split(',')[1], _salvo: false });
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof _mostrarToast === 'function') _mostrarToast('Laudo ' + n + ' anexado!', '#1a56db');
    abrirLaudo();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function removerLaudo(i) {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p || !p.laudos) return;
  p.laudos.splice(i, 1);
  p.laudos.forEach((l, n) => { l.filename = 'LAUDO_' + (n + 1) + '_' + p.id + '.pdf'; });
  if (typeof salvarEstado === 'function') salvarEstado();
  abrirLaudo();
}

// ══════════════════════════════════════════════════
//  ORDEM DE PRODUÇÃO
// ══════════════════════════════════════════════════
async function abrirOP() {
  _fecharViewer();
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  const conteudo = document.getElementById('detalhe-conteudo');
  if (!conteudo) return;
  conteudo.innerHTML = '';

  // Lazy load do PDF da OP
  const filename = p.anexos?.op?.filename || (p.id + '.pdf');
  _mostrarConteudo(_msgAguardando('Ordem de Produção','Carregando PDF...'));
  let pdfB64 = _getPdfOp(p);
  if (!pdfB64 && p.anexos?.op) {
    pdfB64 = await getAnexoData(p.anexos.op, p.id);
  }
  if (!pdfB64 && p._pdfFilename) {
    pdfB64 = await getPdfB64(p);
  }
  _mostrarConteudo('');
  abrirPdfViewer(filename, pdfB64);
}

// ══════════════════════════════════════════════════
//  VISUALIZADOR DE PDF UNIFICADO
//  Fundo cinza escuro (#525659), botões Imprimir / Baixar,
//  contador de páginas — igual ao visualizador de etiquetas
// ══════════════════════════════════════════════════
async function abrirPdfViewer(filename, b64) {
  _pdfB64  = b64;
  _pdfPage = 1;

  // Mobile: tela cheia
  if (window.innerWidth < 768) {
    _abrirPdfMobile(filename, b64);
    return;
  }

  const area = document.getElementById('detalhe-conteudo');
  const existingViewer = document.getElementById('inline-pdf-viewer');
  if (existingViewer) existingViewer.remove();

  const viewer = document.createElement('div');
  viewer.id = 'inline-pdf-viewer';
  viewer.style.cssText = 'background:#525659;padding:0;display:flex;flex-direction:column;flex:1;min-height:0;';

  // ── Header idêntico ao das etiquetas (Imprimir + Baixar + ×) ──
  viewer.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,0,0,.35);flex-shrink:0;gap:8px;">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
        <span style="font-size:12px;font-weight:600;color:#fff;font-family:Inter,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${filename}</span>
        <span id="ipdf-page-count" style="background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:700;padding:2px 9px;border-radius:10px;font-family:Inter,sans-serif;white-space:nowrap;flex-shrink:0;">…</span>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button id="ipdf-print-btn"
          style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:none;color:#fff;padding:6px 13px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.25)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">
          Imprimir
        </button>
        <button onclick="_dlB64('${filename.replace(/'/g,"\\'")}',_pdfB64)"
          style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:none;color:#fff;padding:6px 13px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.25)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">
          Baixar
        </button>
        <button onclick="_fecharViewer()"
          style="background:rgba(220,50,50,.45);border:none;color:#fff;width:30px;height:30px;border-radius:50%;font-size:17px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .15s;"
          onmouseover="this.style.background='rgba(220,50,50,.7)'" onmouseout="this.style.background='rgba(220,50,50,.45)'">×</button>
      </div>
    </div>
    <div id="ipdf-pages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;align-items:center;padding:14px;"></div>`;

  area.appendChild(viewer);
  viewer.scrollIntoView({ behavior:'smooth' });

  if (!b64) {
    document.getElementById('ipdf-pages').innerHTML = `
      <div style="padding:48px;text-align:center;color:rgba(255,255,255,.5);font-family:Inter,sans-serif;">
        <div style="font-size:40px;margin-bottom:8px;"></div>
        <div>Nenhum PDF disponível</div>
      </div>`;
    document.getElementById('ipdf-page-count').textContent = '0 páginas';
    return;
  }

  try {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    _pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
    _pdfDoc._b64 = b64;

    const pagesEl = document.getElementById('ipdf-pages');
    const countEl = document.getElementById('ipdf-page-count');
    const total   = _pdfDoc.numPages;
    if (countEl) countEl.textContent = `${total} ${total === 1 ? 'página' : 'páginas'}`;

    // Botão imprimir
    const printBtn = document.getElementById('ipdf-print-btn');
    if (printBtn) {
      printBtn.onclick = () => _imprimirTodasPaginas('#ipdf-pages canvas');
    }

    const maxW = (viewer.clientWidth || 800) - 28;
    const frag = document.createDocumentFragment();

    for (let pg = 1; pg <= total; pg++) {
      const page   = await _pdfDoc.getPage(pg);
      const vp0    = page.getViewport({ scale: 1 });
      const scale  = Math.min(maxW / vp0.width, 2.0);
      const vp     = page.getViewport({ scale });

      const canvas  = document.createElement('canvas');
      canvas.width  = vp.width;
      canvas.height = vp.height;
      canvas.style.cssText = 'display:block;border-radius:4px;';

      // Container com dimensões fixas: canvas + text layer alinhados pixel-a-pixel
      const pageBox = document.createElement('div');
      pageBox.style.cssText = `position:relative;width:${vp.width}px;height:${vp.height}px;`
        + 'border-radius:4px;box-shadow:0 4px 16px rgba(0,0,0,.5);overflow:hidden;flex-shrink:0;';
      pageBox.appendChild(canvas);

      // Text layer nativo do PDF.js — posiciona cada span exatamente sobre o texto do canvas
      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'ipdf-text-layer';
      textLayerDiv.style.cssText = `position:absolute;inset:0;width:${vp.width}px;height:${vp.height}px;overflow:hidden;`;
      pageBox.appendChild(textLayerDiv);

      // Rótulo de página
      const lbl = document.createElement('div');
      lbl.style.cssText = 'position:absolute;top:6px;right:6px;background:rgba(0,0,0,.55);color:#fff;'
        + 'font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;font-family:Inter,sans-serif;z-index:3;pointer-events:none;';
      lbl.textContent = `${pg} / ${total}`;
      pageBox.appendChild(lbl);

      const wrap = document.createElement('div');
      wrap.style.cssText = 'width:100%;display:flex;justify-content:center;';
      wrap.appendChild(pageBox);
      frag.appendChild(wrap);

      // Renderizar canvas
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

      // Renderizar text layer (habilita Ctrl+F via find-in-page do navegador)
      try {
        const textContent = await page.getTextContent();
        pdfjsLib.renderTextLayer({
          textContent,
          container: textLayerDiv,
          viewport:  vp,
          textDivs:  [],
        });
      } catch (_) {}
    }
    pagesEl.appendChild(frag);

  } catch(e) {
    console.error('PDF render:', e);
    const pagesEl = document.getElementById('ipdf-pages');
    if (pagesEl) pagesEl.innerHTML = `<div style="padding:24px;color:#f87171;font-family:Inter,sans-serif;font-size:13px;">Erro ao renderizar PDF.</div>`;
  }
}

// ── Impressão: todas as páginas renderizadas ──
function _imprimirTodasPaginas(selector) {
  const canvases = document.querySelectorAll(selector);
  if (!canvases.length) return;
  let ifr = document.getElementById('print-iframe');
  if (!ifr) {
    ifr = document.createElement('iframe');
    ifr.id = 'print-iframe';
    ifr.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(ifr);
  }
  const doc = ifr.contentDocument || ifr.contentWindow.document;
  doc.open();
  doc.write('<html><head><style>*{margin:0;padding:0;}body{background:#fff;}img{display:block;width:100%;page-break-after:always;}</style></head><body>');
  canvases.forEach(c => doc.write(`<img src="${c.toDataURL()}">`));
  doc.write('</body></html>');
  doc.close();
  setTimeout(() => { ifr.contentWindow.focus(); ifr.contentWindow.print(); }, 300);
}

// ── Mobile: tela cheia ──
async function _abrirPdfMobile(filename, b64) {
  let overlay = document.getElementById('pdf-mobile-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pdf-mobile-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#525659;display:flex;flex-direction:column;';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(0,0,0,.4);flex-shrink:0;">
      <button onclick="document.getElementById('pdf-mobile-overlay').remove()"
        style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:0 6px;">←</button>
      <div style="flex:1;font-size:13px;font-weight:600;color:#fff;font-family:Inter,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${filename}</div>
      <button id="ipdf-print-btn-mob"
        style="background:rgba(255,255,255,.15);border:none;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">Imprimir</button>
      <button onclick="_dlB64('${filename.replace(/'/g,"\\'")}',_pdfB64)"
        style="background:rgba(255,255,255,.15);border:none;color:#fff;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">Baixar</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:8px;background:rgba(0,0,0,.3);flex-shrink:0;">
      <button onclick="_pdfPrev()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">‹</button>
      <span id="ipdf-info" style="color:#fff;font-size:13px;font-family:Inter,sans-serif;white-space:nowrap;background:rgba(255,255,255,.15);padding:3px 12px;border-radius:12px;">1/1</span>
      <button onclick="_pdfNext()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">›</button>
    </div>
    <div style="flex:1;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:10px;">
      <canvas id="ipdf-canvas" style="max-width:100%;display:block;border-radius:4px;"></canvas>
    </div>`;

  _pdfB64  = b64;
  _pdfPage = 1;
  await _renderPdfPage();

  const printBtnM = document.getElementById('ipdf-print-btn-mob');
  if (printBtnM) {
    printBtnM.onclick = () => {
      const canvas = document.getElementById('ipdf-canvas');
      if (!canvas) return;
      _imprimirTodasPaginas('#ipdf-canvas');
    };
  }
}

async function _renderPdfPage() {
  try {
    if (!_pdfDoc || _pdfDoc._b64 !== _pdfB64) {
      const bin = atob(_pdfB64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      _pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      _pdfDoc._b64 = _pdfB64;
    }
    const page   = await _pdfDoc.getPage(_pdfPage);
    const canvas = document.getElementById('ipdf-canvas');
    if (!canvas) return;
    const maxW  = canvas.parentElement.clientWidth - 20 || 600;
    const vp0   = page.getViewport({ scale: 1 });
    const scale = Math.min(maxW / vp0.width, 2.5);
    const vp    = page.getViewport({ scale });
    canvas.width  = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const info = document.getElementById('ipdf-info');
    if (info) info.textContent = `${_pdfPage} / ${_pdfDoc.numPages}`;
  } catch(e) { console.error('PDF render:', e); }
}

function _pdfPrev() { if (_pdfPage > 1) { _pdfPage--; _renderPdfPage(); } }
function _pdfNext() { if (_pdfDoc && _pdfPage < _pdfDoc.numPages) { _pdfPage++; _renderPdfPage(); } }

function _fecharViewer() {
  const v = document.getElementById('inline-pdf-viewer');
  if (v) v.remove();
  const m = document.getElementById('pdf-mobile-overlay');
  if (m) m.remove();
}

function _dlB64(filename, b64) {
  if (!b64) return;
  const bin  = atob(b64);
  const buf  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const blob = new Blob([buf], {type:'application/pdf'});
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ── Helpers ──
function _msgAguardando(titulo, sub) {
  return `<div style="padding:32px;text-align:center;font-family:Inter,sans-serif;">
    <div style="font-size:32px;margin-bottom:8px;"></div>
    <div style="font-size:15px;font-weight:700;color:#111;">${titulo}</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px;">${sub}</div>
  </div>`;
}

function _mostrarConteudo(html) {
  _fecharViewer();
  const el = document.getElementById('detalhe-conteudo');
  if (!el) return;
  // Se o html já traz estrutura flex própria (OP pages), injeta direto.
  // Caso contrário, envolve em um div scrollável para manter comportamento anterior.
  if (html && !html.trimStart().startsWith('<div style="flex:1;overflow-y:auto')) {
    el.innerHTML = `<div style="flex:1;overflow-y:auto;min-height:0;">${html}</div>`;
  } else {
    el.innerHTML = html;
  }
}

function _getPdfOp(p) {
  if (!p) return null;
  if (p.anexos?.op?.data) return p.anexos.op.data;
  const campos = ['pdfB64','pdf_b64','pdf','base64','pdfBase64','arquivo','file'];
  for (const c of campos) {
    if (p[c] && typeof p[c] === 'string' && p[c].length > 200) return p[c];
  }
  for (const [key, val] of Object.entries(p)) {
    if (typeof val === 'string' && val.length > 1000 &&
        !['id','cliente','entrega','status','etapa'].includes(key) &&
        /^[A-Za-z0-9+/=]{100,}$/.test(val.slice(0, 100))) {
      return val;
    }
  }
  return null;
}

// ── Voltar ──
// Retorna para arquivo se o pedido foi aberto a partir da view de arquivo
let _voltarParaArquivo = false;

function voltarPedidos() {
  window._etapaVizualizacao = null;
  _fecharViewer();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (_voltarParaArquivo) {
    _voltarParaArquivo = false;
    document.getElementById('screen-arquivo').classList.add('active');
    const navArq = document.querySelector('.nav-item[onclick*="arquivo"]');
    if (navArq) navArq.classList.add('active');
    if (typeof _renderArquivo === 'function') _renderArquivo(document.getElementById('arquivo-search')?.value || '');
  } else {
    document.getElementById('screen-pedidos').classList.add('active');
    const navPedidos = document.querySelector('.nav-item[onclick*="pedidos"]');
    if (navPedidos) navPedidos.classList.add('active');
    renderKanban();
  }
  currentPedidoIdx = null;
}

// ══════════════════════════════════════════════════
//  LIMPAR PEDIDO (Admin only)
// ══════════════════════════════════════════════════

function _abrirModalLimparPedido() {
  const p = (typeof pedidos !== 'undefined') ? pedidos[currentPedidoIdx] : null;
  if (!p) return;

  document.getElementById('modal-limpar-pedido')?.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-limpar-pedido';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:370px;max-width:94vw;overflow:hidden;
                box-shadow:0 24px 60px rgba(0,0,0,.3);animation:upcIn .18s ease;font-family:Inter,sans-serif;">
      <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:20px 18px 16px;position:relative;">
        <button onclick="document.getElementById('modal-limpar-pedido').remove()"
          style="position:absolute;top:10px;right:12px;background:rgba(255,255,255,.15);border:none;
                 color:#fff;width:27px;height:27px;border-radius:50%;font-size:15px;cursor:pointer;line-height:1;">×</button>
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.75);letter-spacing:1px;text-transform:uppercase;">Atenção — ação irreversível</div>
        <div style="font-size:18px;font-weight:800;color:#fff;margin-top:2px;">Excluir Pedido</div>
      </div>
      <div style="padding:18px;display:flex;flex-direction:column;gap:14px;">
        <div style="background:#fee2e2;border:1.5px solid #fecaca;border-radius:10px;padding:14px 16px;">
          <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:6px;">#${p.id} — ${p.cliente || '—'}</div>
          <div style="font-size:12px;color:#374151;line-height:1.6;">
            Isso irá <strong>excluir permanentemente</strong>:<br>
            • O pedido e seu card do Kanban<br>
            • Todos os PDFs em <code style="background:#fca5a522;padding:1px 5px;border-radius:4px;">data/${p.id}/</code><br>
            • Registros de falta de estoque deste pedido<br>
            • Dados deste pedido no Dashboard
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="document.getElementById('modal-limpar-pedido').remove()"
            style="flex:1;padding:11px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;
                   color:#374151;font-size:13px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            Cancelar
          </button>
          <button onclick="_confirmarLimparPedido()"
            style="flex:1;padding:11px;border:none;border-radius:10px;
                   background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;
                   font-size:13px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            Sim, excluir tudo
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function _confirmarLimparPedido() {
  document.getElementById('modal-limpar-pedido')?.remove();
  const idx = currentPedidoIdx;
  const p   = (typeof pedidos !== 'undefined') ? pedidos[idx] : null;
  if (!p) return;

  if (typeof _mostrarToast === 'function') _mostrarToast('Excluindo pedido…', '#dc2626');

  // 1. Remover PDFs físicos do servidor
  try {
    await fetch('/limpar_pdfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido_id: p.id }),
    });
  } catch (e) {
    console.warn('[excluir pedido] erro ao remover PDFs:', e);
  }

  // 2. Remover do report.json (dashboard)
  try {
    await fetch('/excluir_pedido_report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido_id: p.id }),
    });
    // Sincronizar DASH_PEDIDOS em memória
    if (Array.isArray(window.DASH_PEDIDOS)) {
      window.DASH_PEDIDOS = window.DASH_PEDIDOS.filter(d => d.pedido !== p.id);
    }
  } catch (e) {
    console.warn('[excluir pedido] erro ao remover do report:', e);
  }

  // 3. Remover registros de falta de estoque deste pedido
  if (Array.isArray(window.ESTOQUE_DB)) {
    window.ESTOQUE_DB = window.ESTOQUE_DB.filter(r => r.pedido !== p.id);
    if (typeof _salvarEstoque === 'function') _salvarEstoque();
  }

  // 4. Remover pedido do array global
  if (typeof pedidos !== 'undefined') pedidos.splice(idx, 1);
  currentPedidoIdx = null;

  // 5. Persistir estado (sem o pedido removido)
  if (typeof salvarEstado === 'function') salvarEstado();

  // 6. Voltar ao Kanban
  if (typeof _mostrarToast === 'function') _mostrarToast('Pedido excluído.', '#059669');
  voltarPedidos();
}

window._abrirModalLimparPedido = _abrirModalLimparPedido;
window._confirmarLimparPedido  = _confirmarLimparPedido;

// ── Stubs ──
function iniciarAmostras()           {}
function renderAmostras(idx)         {}
function adjAmostra(i,d)             {}
function setAmostra(i,v)             {}
function _updateAmostrasCard(i,v)    {}
function avancarOuCapturar()         {}
function detalhePagePrev()           {}
function detalhePageNext()           {}
function _renderBotoesGerados(p)     {}

function anexarPdfSeparacao(event) {
  const file = event.target.files[0];
  if (!file) return;
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;
  const reader = new FileReader();
  reader.onload = e => {
    p.pdfSepData = e.target.result.split(',')[1];
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof _mostrarToast === 'function') _mostrarToast('PDF de separação anexado!', '#1a56db');
    abrirSeparacao();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ══════════════════════════════════════════════════
//  APROVAÇÃO DE PEDIDO (Admin only)
// ══════════════════════════════════════════════════

function _mostrarPainelAprovacao(idx) {
  const p = pedidos[idx];
  if (!p) return;

  // Mapeia tipo legado; tenta auto-detectar se ainda não definido
  const _tipoLegado = {'mangueira': 'mangueira-avulso'};
  const _tipoSalvo  = _tipoLegado[p.tipo] || p.tipo || null;
  const _tipoDetect = (!_tipoSalvo && p.paginasOP?.length) ? _detectarTipoPedido(p.paginasOP) : null;
  if (_tipoDetect && !p.tipo) { p.tipo = _tipoDetect; salvarEstado(); }
  const tipo = _tipoSalvo || _tipoDetect || 'mangueira-avulso';
  const _autoDetect = !_tipoSalvo && !!_tipoDetect;

  _mostrarConteudo(`
    <div style="flex:1;overflow-y:auto;min-height:0;padding:16px;font-family:Inter,sans-serif;">

      <div style="background:#fffbeb;border:2px solid #fbbf24;border-radius:12px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:26px;"></span>
        <div>
          <div style="font-size:14px;font-weight:800;color:#92400e;">Pedido Em Aprovação</div>
          <div style="font-size:12px;color:#a16207;margin-top:2px;">Revise os dados e aprove para liberar à produção</div>
        </div>
      </div>

      ${typeof _htmlPainel === 'function' ? _htmlPainel(p, idx) : ''}

      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;margin-bottom:12px;">Dados do Pedido</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;">Nº do Pedido</label>
            <input id="aprov-num" value="${p.id}"
              style="margin-top:4px;width:100%;box-sizing:border-box;padding:9px 11px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:700;font-family:Inter,sans-serif;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;">Data de Entrega</label>
            <input id="aprov-entrega" value="${p.entrega || ''}" placeholder="DD/MM/AAAA"
              style="margin-top:4px;width:100%;box-sizing:border-box;padding:9px 11px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:700;font-family:Inter,sans-serif;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;">Qtd. Mangueiras</label>
            <input id="aprov-qtd" type="number" min="0" step="1"
              value="${(() => {
                const pgIdxMang = (p.paginasOP || []).find(pg => pg.is_index);
                const qtdOp = (p.paginasOP || [])
                  .filter(pg => pg !== pgIdxMang && (pg.corte_mm || 0) > 0)
                  .reduce((acc, pg) => acc + (parseFloat(pg.item_qty) || 0), 0);
                const dashReg = (window.DASH_PEDIDOS || []).find(d => d.pedido === p.id);
                return dashReg?.qtd ?? (qtdOp || 0);
              })()}"
              placeholder="0"
              style="margin-top:4px;width:100%;box-sizing:border-box;padding:9px 11px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:700;font-family:Inter,sans-serif;outline:none;">
          </div>
          <div style="grid-column:1/-1;">
            <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;">Cliente</label>
            <input id="aprov-cliente" value="${p.cliente || ''}"
              style="margin-top:4px;width:100%;box-sizing:border-box;padding:9px 11px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:700;font-family:Inter,sans-serif;outline:none;">
          </div>
        </div>
      </div>

      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;margin-bottom:12px;">Tipo de Pedido</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <label id="aprov-tipo-mangueira-kit-lbl" onclick="_aprovSelecionarTipo('mangueira-kit')"
            style="flex:1;min-width:140px;display:flex;align-items:flex-start;gap:8px;cursor:pointer;padding:10px;border:2px solid ${tipo==='mangueira-kit'?'#1a56db':'#e5e7eb'};border-radius:10px;background:${tipo==='mangueira-kit'?'#eff6ff':'#fafafa'};transition:all .15s;">
            <input type="radio" name="aprov-tipo" id="aprov-tipo-mangueira-kit" value="mangueira-kit" ${tipo==='mangueira-kit'?'checked':''} style="margin-top:2px;accent-color:#1a56db;">
            <div>
              <div style="font-size:12px;font-weight:700;color:#111;">Mangueira Kit</div>
              <div style="font-size:10px;color:#6b7280;margin-top:2px;">Com volumes indexados</div>
            </div>
          </label>
          <label id="aprov-tipo-mangueira-avulso-lbl" onclick="_aprovSelecionarTipo('mangueira-avulso')"
            style="flex:1;min-width:140px;display:flex;align-items:flex-start;gap:8px;cursor:pointer;padding:10px;border:2px solid ${tipo==='mangueira-avulso'?'#1a56db':'#e5e7eb'};border-radius:10px;background:${tipo==='mangueira-avulso'?'#eff6ff':'#fafafa'};transition:all .15s;">
            <input type="radio" name="aprov-tipo" id="aprov-tipo-mangueira-avulso" value="mangueira-avulso" ${tipo==='mangueira-avulso'?'checked':''} style="margin-top:2px;accent-color:#1a56db;">
            <div>
              <div style="font-size:12px;font-weight:700;color:#111;">Mangueira Avulso</div>
              <div style="font-size:10px;color:#6b7280;margin-top:2px;">Embalagem livre</div>
            </div>
          </label>
          <label id="aprov-tipo-pecas-lbl" onclick="_aprovSelecionarTipo('pecas')"
            style="flex:1;min-width:140px;display:flex;align-items:flex-start;gap:8px;cursor:pointer;padding:10px;border:2px solid ${tipo==='pecas'?'#1a56db':'#e5e7eb'};border-radius:10px;background:${tipo==='pecas'?'#eff6ff':'#fafafa'};transition:all .15s;">
            <input type="radio" name="aprov-tipo" id="aprov-tipo-pecas" value="pecas" ${tipo==='pecas'?'checked':''} style="margin-top:2px;accent-color:#1a56db;">
            <div>
              <div style="font-size:12px;font-weight:700;color:#111;">Peças</div>
              <div style="font-size:10px;color:#6b7280;margin-top:2px;">Sep. → Insp. → Final</div>
            </div>
          </label>
        </div>
      </div>

      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:14px;" id="aprov-pdfs-section">
        <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;margin-bottom:12px;">PDFs de Etiquetas</div>
        ${_aprovPdfListHTML(idx)}
      </div>

      <button onclick="abrirIniciarPedido()"
        style="width:100%;padding:12px;background:#eff6ff;color:#1a56db;border:2px solid #bfdbfe;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;margin-bottom:10px;">
        Ver / Editar OP
      </button>

      <button onclick="_aprovarPedido(${idx})"
        style="width:100%;padding:14px;background:#059669;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
        Aprovar Pedido
      </button>

      <input type="file" id="aprov-upload-kits" accept=".pdf" style="display:none" onchange="_aprovUploadKits(event,${idx})">
      <input type="file" id="aprov-upload-embalagem" accept=".pdf" style="display:none" onchange="_aprovUploadEmb(event,${idx})">
      <input type="file" id="aprov-upload-corte" accept=".pdf" style="display:none" onchange="_aprovUploadCorte(event,${idx})">
    </div>`);

  // Esconde botões de ação após patches do aguardando.js dispararem (~50ms)
  setTimeout(() => {
    ['btn-iniciar-pedido','btn-separacao','btn-etiq-pedido','btn-etiq-embalagem',
     'btn-componentes','btn-baixar-op','btn-laudo','btn-relatorio-pedido','btn-op'
    ].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  }, 80);
}

function _aprovPdfListHTML(idx) {
  const p    = pedidos[idx];
  if (!p) return '';
  const kits  = Array.isArray(p.anexos?.kits) ? p.anexos.kits : [];
  const emb   = p.anexos?.embalagem || null;
  const corte = p.anexos?.corte     || null;

  const row = (label, hasItem, onView, onDel, onUpload) => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #f3f4f6;">
      <span style="flex:1;font-size:12px;font-weight:700;color:${hasItem?'#111':'#9ca3af'};">${label}</span>
      ${hasItem ? `
        <button onclick="${onView}" style="padding:4px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:11px;font-weight:700;color:#1a56db;cursor:pointer;">Ver</button>
        <button onclick="${onDel}" style="padding:4px 10px;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;font-size:11px;font-weight:700;color:#dc2626;cursor:pointer;">Excluir</button>
      ` : `<span style="font-size:11px;color:#9ca3af;">—</span>`}
      <button onclick="${onUpload}" style="padding:4px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:11px;font-weight:700;color:#059669;cursor:pointer;">↻ Trocar</button>
    </div>`;

  let html = '';
  if (kits.length > 0) {
    html += kits.map((k, i) => row(
      `Kit (${k.filename || 'kit-'+(i+1)+'.pdf'})`,
      true,
      `_aprovVerPDF(${idx},'kits',${i})`,
      `_aprovDeletePDF(${idx},'kits',${i})`,
      `document.getElementById('aprov-upload-kits').dataset.idx='${i}';document.getElementById('aprov-upload-kits').click()`
    )).join('');
  } else {
    html += row('Etiquetas Kit', false, '', '',
      `document.getElementById('aprov-upload-kits').dataset.idx='new';document.getElementById('aprov-upload-kits').click()`
    );
  }
  html += row('Etiqueta Embalagem', !!emb,
    `_aprovVerPDF(${idx},'embalagem',-1)`,
    `_aprovDeletePDF(${idx},'embalagem',-1)`,
    `document.getElementById('aprov-upload-embalagem').click()`
  );
  html += row('Etiqueta Corte', !!corte,
    `_aprovVerPDF(${idx},'corte',-1)`,
    `_aprovDeletePDF(${idx},'corte',-1)`,
    `document.getElementById('aprov-upload-corte').click()`
  );
  return html;
}

function _aprovVerPDF(idx, tipo, itemIdx) {
  const p = pedidos[idx]; if (!p) return;
  let item = null;
  if (tipo === 'kits' && Array.isArray(p.anexos?.kits)) item = p.anexos.kits[itemIdx];
  else if (tipo === 'embalagem') item = p.anexos?.embalagem;
  else if (tipo === 'corte')     item = p.anexos?.corte;
  if (!item?.data) return;
  if (typeof abrirPdfViewer === 'function') abrirPdfViewer(item.filename || 'arquivo.pdf', item.data);
}

function _aprovDeletePDF(idx, tipo, itemIdx) {
  const p = pedidos[idx]; if (!p || !p.anexos) return;
  if (tipo === 'kits' && Array.isArray(p.anexos.kits)) {
    p.anexos.kits.splice(itemIdx, 1);
  } else if (tipo === 'embalagem') {
    p.anexos.embalagem = null;
  } else if (tipo === 'corte') {
    p.anexos.corte = null;
  }
  salvarEstado();
  _refreshAprovPdfs(idx);
  if (typeof _mostrarToast === 'function') _mostrarToast('PDF excluído', '#6b7280');
}

function _aprovSelecionarTipo(tipo) {
  ['mangueira-kit','mangueira-avulso','pecas'].forEach(t => {
    const radio = document.getElementById(`aprov-tipo-${t}`);
    if (radio) radio.checked = (t === tipo);
    const lbl = document.getElementById(`aprov-tipo-${t}-lbl`);
    if (lbl) {
      lbl.style.borderColor = t === tipo ? '#1a56db' : '#e5e7eb';
      lbl.style.background  = t === tipo ? '#eff6ff' : '#fafafa';
    }
  });
}

async function _aprovUploadKits(event, idx) {
  const file = event.target.files[0]; if (!file) return;
  const itemIdxStr = event.target.dataset.idx;
  event.target.value = '';
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file);
  });
  const p = pedidos[idx]; if (!p) return;
  if (!p.anexos) p.anexos = {};
  if (!Array.isArray(p.anexos.kits)) p.anexos.kits = [];
  const entry = { filename: file.name, data: b64 };
  const i = parseInt(itemIdxStr);
  if (!isNaN(i) && i >= 0) p.anexos.kits[i] = entry;
  else p.anexos.kits.push(entry);
  salvarEstado(); _refreshAprovPdfs(idx);
  if (typeof _mostrarToast === 'function') _mostrarToast('PDF de kit atualizado', '#059669');
}

async function _aprovUploadEmb(event, idx) {
  const file = event.target.files[0]; if (!file) return;
  event.target.value = '';
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file);
  });
  const p = pedidos[idx]; if (!p) return;
  if (!p.anexos) p.anexos = {};
  p.anexos.embalagem = { filename: file.name, data: b64 };
  salvarEstado(); _refreshAprovPdfs(idx);
  if (typeof _mostrarToast === 'function') _mostrarToast('Etiqueta embalagem atualizada', '#059669');
}

async function _aprovUploadCorte(event, idx) {
  const file = event.target.files[0]; if (!file) return;
  event.target.value = '';
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file);
  });
  const p = pedidos[idx]; if (!p) return;
  if (!p.anexos) p.anexos = {};
  p.anexos.corte = { filename: file.name, data: b64 };
  salvarEstado(); _refreshAprovPdfs(idx);
  if (typeof _mostrarToast === 'function') _mostrarToast('Etiqueta corte atualizada', '#059669');
}

function _refreshAprovPdfs(idx) {
  const sec = document.getElementById('aprov-pdfs-section');
  if (sec) sec.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;margin-bottom:12px;">PDFs de Etiquetas</div>
    ${_aprovPdfListHTML(idx)}`;
}

function _aprovarPedido(idx) {
  const p = pedidos[idx]; if (!p) return;

  const num     = (document.getElementById('aprov-num')?.value     || '').trim();
  const cliente = (document.getElementById('aprov-cliente')?.value || '').trim();
  const entrega = (document.getElementById('aprov-entrega')?.value || '').trim();
  const tipoEl  = document.querySelector('[name="aprov-tipo"]:checked');
  const tipo    = tipoEl?.value || 'mangueira-avulso';
  const qtdMang = parseInt(document.getElementById('aprov-qtd')?.value || '0') || 0;

  if (!num)     { if (typeof _mostrarToast === 'function') _mostrarToast('Informe o número do pedido', '#dc2626'); return; }
  if (!cliente) { if (typeof _mostrarToast === 'function') _mostrarToast('Informe o cliente', '#dc2626'); return; }

  p.id      = num;
  p.cliente = cliente;
  p.entrega = entrega;
  p.tipo    = tipo;

  if (entrega) {
    const parts = entrega.split('/');
    if (parts.length === 3) {
      const dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00`);
      p.entregaDate = dt;
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      p.status = dt < hoje ? 'atrasado' : 'em-dia';
    }
  }

  delete p.subEtapa;
  salvarEstado();
  if (typeof renderKanban === 'function') renderKanban();

  // Atualizar qtd de mangueiras no report.json
  if (qtdMang >= 0) {
    fetch('/atualizar_qtd_report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido: num, qtd: qtdMang }),
    }).then(r => r.json()).then(res => {
      if (res.ok) {
        // Sincronizar DASH_PEDIDOS em memória
        const dashReg = (window.DASH_PEDIDOS || []).find(d => d.pedido === num);
        if (dashReg) dashReg.qtd = qtdMang;
      }
    }).catch(e => console.warn('[report] erro ao atualizar qtd:', e));
  }

  const newIdx = pedidos.indexOf(p);
  if (newIdx >= 0) abrirPedido(newIdx);

  if (typeof _mostrarToast === 'function') _mostrarToast(`Pedido #${num} aprovado!`, '#059669');
}
