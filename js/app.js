// ══════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════
let pedidos = [];

let currentPedidoIdx = null;
let currentScreen = 'pedidos';

let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function init() {
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updatePrClock, 1000);
  updatePrClock();
  buildPrMang();
  renderDescasque();
  // Carrega dados de usuários do servidor (overrides, extras, senhas)
  if (typeof _carregarUsuariosServidor === 'function') {
    await _carregarUsuariosServidor();
  }

  try {
    await carregarEstado();
  } catch(e) {
    console.warn('Erro ao carregar estado:', e);
  }
  renderKanban();
  _updateTopbar('pedidos');
  _aplicarPermissoes();
}

function updateClock() {
  const d   = new Date();
  const dia = d.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
  const hms = d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const el  = document.getElementById('date-left');
  if (el) el.textContent = dia + ' · ' + hms;
}

// ══════════════════════════════════════════════════
//  NAV
// ══════════════════════════════════════════════════
const SCREEN_TITLES = {
  'dashboard':    'Dashboard de Produção',
  'pedidos':      'Gestão de Pedidos',
  'detalhe':      'Pedido',
  'prensagem':    'Medidas de Crimpagem',
  'descasque':    'Descasque',
  'angulos':      'Ângulos de Montagem',
  'medida-corte': 'Medida de Corte',
  'arquivo':      'Arquivo de Pedidos',
  'usuarios':     'Gestão de Usuários',
  'laudos':       'Laudos de Teste',
};

function _aplicarPermissoes() {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  const setor  = currentUser.setor || '';
  const isAdmin = setor === 'Admin';

  const navPedidos = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (navPedidos) navPedidos.style.display = isAdmin ? '' : 'none';

  if (!isAdmin && typeof currentScreen !== 'undefined' && currentScreen === 'pedidos') {
    const navPr = document.querySelector('.nav-item[onclick*="prensagem"]');
    if (navPr) navTo('prensagem', navPr);
  }

  const navDash = document.getElementById('nav-dashboard');
  if (navDash) navDash.style.display = ['Admin','Gestão','Comercial'].includes(setor) ? '' : 'none';
}
(function(){ let u=null; setInterval(()=>{ if(typeof currentUser!=='undefined'&&currentUser!==u){u=currentUser;_aplicarPermissoes();} },500); })();

function navTo(name, el) {
  if (name === 'pedidos' && typeof currentUser !== 'undefined' && currentUser) {
    const perm = currentUser.permissoes || {};
    const isAdmin = currentUser.setor === 'Admin' || perm.pedidos === true;
    if (!isAdmin) return;
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  currentScreen = name;

  _updateTopbar(name);

  if (name === 'dashboard') {
    if (typeof renderDashboard === 'function') renderDashboard();
  }
  if (name === 'angulos') {
    requestAnimationFrame(() => { _angDrawAll(); });
  }
  if (name === 'arquivo') {
    if (typeof _renderArquivo === 'function') _renderArquivo('');
  }
  if (name === 'usuarios') {
    if (typeof _renderUsuarios === 'function') _renderUsuarios();
  }
  if (name === 'laudos') {
    if (typeof renderLaudos === 'function') renderLaudos();
  }
}

function _updateTopbar(screen) {
  const titleEl  = document.getElementById('topbar-screen-title');
  const btnNovo  = document.getElementById('btn-novo-pedido-top');
  const searchEl = document.getElementById('kanban-search-bar');
  const isPedidos = (screen === 'pedidos');
  const title = SCREEN_TITLES[screen] || '';

  if (titleEl) {
    titleEl.textContent = title;
    titleEl.style.display = title ? 'block' : 'none';
  }
  if (btnNovo) btnNovo.style.display = isPedidos ? '' : 'none';
  if (searchEl) searchEl.style.display = isPedidos ? 'flex' : 'none';
}

// ══════════════════════════════════════════════════
//  KANBAN — ORDEM CORRETA DAS ETAPAS
//  1 Separação → 2 Inspeção → 3 Corte → 4 Prensagem → 5 Embalagem → 6 Finalizados
// ══════════════════════════════════════════════════
const ETAPAS = [
  {key:'separacao', label:'SEPARAÇÃO'},
  {key:'inspecao',  label:'INSPEÇÃO'},
  {key:'corte',     label:'CORTE'},
  {key:'prensagem', label:'PRENSAGEM'},
  {key:'embalagem', label:'EMBALAGEM'},
  {key:'finalizado',label:'FINALIZADOS'},
];

let _dragSrcIdx  = -1;
let _dragPedidoId = '';

const LIMITE_FINALIZADOS = 4;

function renderKanban(filter='') {
  const area = document.getElementById('kanban-area');
  area.innerHTML = '';
  const _isAdminKanban = typeof currentUser !== 'undefined' &&
    (currentUser?.setor === 'Admin' || currentUser?.permissoes?.all === true);
  ETAPAS.forEach((etapa, etapaIdx) => {
    let cards = pedidos.filter(p =>
      p.etapa === etapa.key &&
      (_isAdminKanban || p.subEtapa !== 'aprovacao') &&
      (!filter || p.cliente.toLowerCase().includes(filter) || p.id.includes(filter))
    );

    // Coluna FINALIZADOS: limitar aos 5 mais recentes; demais vão para o arquivo
    let arquivadosCount = 0;
    if (etapa.key === 'finalizado') {
      cards.sort((a, b) => {
        const ta = a.amostragens_ts ? new Date(a.amostragens_ts).getTime() : 0;
        const tb = b.amostragens_ts ? new Date(b.amostragens_ts).getTime() : 0;
        return tb - ta;
      });
      const totalFin = pedidos.filter(p => p.etapa === 'finalizado').length;
      arquivadosCount = Math.max(0, totalFin - LIMITE_FINALIZADOS);
      cards = cards.slice(0, LIMITE_FINALIZADOS);
    }

    const col = document.createElement('div');
    col.className = 'kanban-col';
    col.dataset.etapa    = etapa.key;
    col.dataset.etapaIdx = etapaIdx;

    col.addEventListener('dragover', e => {
      if (_dragSrcIdx === etapaIdx - 1) { e.preventDefault(); col.classList.add('drop-target'); }
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drop-target');
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drop-target');
      if (_dragSrcIdx !== etapaIdx - 1) return;
      const p = pedidos.find(p => p.id === _dragPedidoId && p.etapa === ETAPAS[_dragSrcIdx].key);
      if (p) { p.etapa = etapa.key; renderKanban(filter); salvarEstado(); }
    });

    const btnArquivo = arquivadosCount > 0
      ? `<button onclick="navTo('arquivo',document.querySelector('.nav-item[onclick*=arquivo]'))"
           style="font-size:10px;font-weight:700;color:#6b7280;background:#f3f4f6;
                  border:1px solid #e5e7eb;border-radius:10px;padding:2px 9px;
                  cursor:pointer;font-family:Inter,sans-serif;white-space:nowrap;
                  transition:all .12s;flex-shrink:0;"
           onmouseover="this.style.background='#e5e7eb'"
           onmouseout="this.style.background='#f3f4f6'">
           📁 ${arquivadosCount} arquivado${arquivadosCount > 1 ? 's' : ''}
         </button>`
      : '';

    // Phantom cards: pedidos em etapas posteriores que têm itens pulados pendentes aqui
    const _phantomCards = ['corte','prensagem'].includes(etapa.key)
      ? pedidos.filter(p =>
          p.etapa !== etapa.key &&
          (_isAdminKanban || p.subEtapa !== 'aprovacao') &&
          _phantomEtapas(p).includes(etapa.key) &&
          (!filter || p.cliente.toLowerCase().includes(filter) || p.id.includes(filter))
        ).map(p => renderCardFantasma(p, etapa.key)).join('')
      : '';

    col.innerHTML = `
      <div class="kanban-col-header" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <div class="kanban-col-title" style="flex:1;">${etapa.label} <span class="kanban-count">${cards.length}</span></div>
        ${btnArquivo}
      </div>
      ${cards.map(p => renderCard(p, etapaIdx)).join('')}
      ${_phantomCards}
    `;
    area.appendChild(col);

    col.querySelectorAll('.pedido-card[draggable="true"]').forEach(cardEl => {
      cardEl.addEventListener('dragstart', e => {
        _dragSrcIdx   = parseInt(cardEl.dataset.etapaIdx);
        _dragPedidoId = cardEl.dataset.pedidoId;
        e.dataTransfer.effectAllowed = 'move';
        cardEl.classList.add('dragging');
      });
      cardEl.addEventListener('dragend', () => {
        cardEl.classList.remove('dragging');
        document.querySelectorAll('.drop-target').forEach(c => c.classList.remove('drop-target'));
      });
    });
  });

  renderCalendario();
}

// Retorna lista de etapas onde o pedido tem itens pulados ainda pendentes
function _phantomEtapas(p) {
  if (!p.paginasOP) return [];
  const pgs = p.paginasOP;
  const result = [];
  if (p.etapa !== 'corte' && pgs.some(pg => !pg.is_index && pg._pulado_corte && !pg._cortado))
    result.push('corte');
  if (p.etapa !== 'prensagem' && pgs.some(pg => !pg.is_index && pg._pulado_prensagem && !pg._prensado))
    result.push('prensagem');
  return result;
}

function renderCardFantasma(p, etapaFantasma) {
  const idxReal  = pedidos.indexOf(p);
  const pgs      = p.paginasOP || [];
  const pendentes = etapaFantasma === 'corte'
    ? pgs.filter(pg => !pg.is_index && pg._pulado_corte    && !pg._cortado).length
    : pgs.filter(pg => !pg.is_index && pg._pulado_prensagem && !pg._prensado).length;
  const etapaLabel = etapaFantasma === 'corte' ? 'Corte' : 'Prensagem';
  return `<div class="pedido-card"
    style="border:2px dashed #f59e0b;background:#fffbeb;cursor:pointer;"
    onclick="abrirPedidoFantasma(${idxReal},'${etapaFantasma}')">
    <div class="pedido-card-top">
      <div class="pedido-num">#${p.id}</div>
      <div style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:#fef3c7;color:#92400e;border:1px solid #fbbf24;white-space:nowrap;">⏭ ${pendentes} pendente${pendentes>1?'s':''}</div>
    </div>
    <div class="pedido-cliente">${p.cliente}</div>
    <div style="font-size:10px;color:#92400e;font-weight:600;margin-top:2px;font-family:Inter,sans-serif;">Pendências de ${etapaLabel}</div>
    <div class="pedido-entrega">${p.entrega ? 'Entrega: '+p.entrega : ''}</div>
  </div>`;
}

function abrirPedidoFantasma(idx, etapaForcar) {
  window._forcarEtapa = etapaForcar;
  abrirPedido(idx);
}

function renderCard(p, etapaIdx) {
  const _isAdminCard = typeof currentUser !== 'undefined' &&
    (currentUser?.setor === 'Admin' || currentUser?.permissoes?.all === true);

  // Cards em aprovação ficam ocultos para não-admin
  if (p.subEtapa === 'aprovacao' && !_isAdminCard) return '';

  const idxReal  = pedidos.indexOf(p);
  const draggable = !p.processing && p.etapa !== 'finalizado' && !p.subEtapa;

  let topRight = '';
  if (p.subEtapa === 'aprovacao') {
    topRight = '';
  } else if (p.processing) {
    topRight = `<div class="pedido-processing"><span class="spinner"></span> Processando</div>`;
  } else if (p.etapa === 'finalizado') {
    topRight = `<div class="status-finalizado">✅</div>`;
  } else {
    const statusMap   = {'em-dia':'status-em-dia','atrasado':'status-atrasado','pronto':'status-pronto'};
    const statusLabel = {'em-dia':'EM DIA','atrasado':'ATRASADO','pronto':'PRONTO'};
    topRight = `<div class="status-badge ${statusMap[p.status]||''}">${statusLabel[p.status]||p.status}</div>`;
  }

  const _aprovBadge = p.subEtapa === 'aprovacao'
    ? `<div class="status-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fbbf24;font-size:9px;padding:2px 7px;margin-top:5px;text-align:center;border-radius:6px;">🔒 APROVAÇÃO</div>`
    : '';

  return `<div class="pedido-card ${p.processing?'processing':''} ${p.etapa==='finalizado'?'finalizado':''}"
    draggable="${draggable}"
    data-pedido-id="${p.id}"
    data-etapa-idx="${etapaIdx}"
    onclick="abrirPedido(${idxReal})">
    <div class="pedido-card-top">
      <div class="pedido-num">#${p.id}</div>
      ${topRight}
    </div>
    <div class="pedido-cliente">${p.cliente}</div>
    ${(p.tipo && p.subEtapa === 'aprovacao') ? (() => {
      const _tipoMap = {'mangueira-kit':'📦 Kit','mangueira-avulso':'🔧 Avulso','pecas':'⚙️ Peças','mangueira':'🔧 Avulso'};
      const _tipoClr = {'mangueira-kit':'#dbeafe;color:#1e40af','mangueira-avulso':'#f3f4f6;color:#374151','pecas':'#dcfce7;color:#166534','mangueira':'#f3f4f6;color:#374151'};
      return `<div style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:5px;display:inline-block;background:${_tipoClr[p.tipo]||'#f3f4f6;color:#374151'};margin-top:2px;">${_tipoMap[p.tipo]||p.tipo}</div>`;
    })() : ''}
    <div class="pedido-entrega">${p.entrega ? 'Entrega: '+p.entrega : ''}</div>
    ${_aprovBadge}
  </div>`;
}

function searchPedidos() {
  const q = document.getElementById('search-input').value.toLowerCase();
  renderKanban(q);
}

// ══════════════════════════════════════════════════
//  LIMPAR DADOS
// ══════════════════════════════════════════════════

// Mostra botão Limpar Dados apenas para Admin na tela de pedidos
(function _patchUpdateTopbar() {
  const _orig = window._updateTopbar;
  window._updateTopbar = function(screen) {
    if (typeof _orig === 'function') _orig(screen);
    const btn = document.getElementById('btn-limpar-dados');
    if (!btn) return;
    const isAdmin   = typeof currentUser !== 'undefined' && currentUser?.setor === 'Admin';
    const isPedidos = screen === 'pedidos';
    btn.style.display = (isAdmin && isPedidos) ? '' : 'none';
  };
})();

function _confirmarLimpeza() {
  // Modal de confirmação com dois passos (evita clique acidental)
  const existing = document.getElementById('modal-limpar');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.id = 'modal-limpar';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:360px;max-width:92vw;overflow:hidden;
                box-shadow:0 24px 60px rgba(0,0,0,.25);font-family:Inter,sans-serif;animation:upcIn .18s ease;">
      <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:20px 20px 16px;position:relative;">
        <div style="font-size:22px;margin-bottom:4px;">🗑️</div>
        <div style="font-size:17px;font-weight:800;color:#fff;">Limpar todos os dados</div>
        <div style="font-size:12px;color:rgba(255,255,255,.8);margin-top:4px;">
          Esta ação não pode ser desfeita.
        </div>
      </div>
      <div style="padding:20px;">
        <div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:12px;">
          <span style="font-size:11px;font-weight:700;color:#dc2626;letter-spacing:.5px;text-transform:uppercase;">Será removido:</span><br>
          <strong>• Todos os pedidos e cards do kanban</strong><br>
          <strong>• PDFs e etiquetas geradas</strong><br>
          <strong>• Dados do dashboard</strong><br>
          <strong>• Falta de estoque registrada</strong><br>
          <strong>• Componentes calculados</strong><br>
          <strong>• Cache local do navegador</strong>
        </div>
        <div style="font-size:12px;background:#f0fdf4;padding:10px 12px;
                    border-radius:8px;border:1px solid #86efac;margin-bottom:16px;
                    color:#166534;line-height:1.6;">
          ✅ <strong>Preservado:</strong> usuários, senhas e permissões.<br>
          ✅ Tabelas de crimpagem, terminais e descasque.
        </div>
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">
          Digite <strong>LIMPAR</strong> para confirmar:
        </div>
        <input id="limpar-confirm-input" type="text" placeholder="LIMPAR"
          style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #e5e7eb;
                 border-radius:8px;font-size:14px;font-weight:700;outline:none;
                 font-family:'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;"
          oninput="document.getElementById('btn-confirmar-limpar').disabled = this.value.toUpperCase() !== 'LIMPAR'">
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button onclick="document.getElementById('modal-limpar').remove()"
            style="flex:1;padding:11px;border:1.5px solid #e5e7eb;border-radius:10px;
                   background:#fff;color:#374151;font-size:13px;font-weight:700;
                   cursor:pointer;font-family:Inter,sans-serif;">
            Cancelar
          </button>
          <button id="btn-confirmar-limpar" onclick="_executarLimpeza()" disabled
            style="flex:1;padding:11px;border:none;border-radius:10px;
                   background:#dc2626;color:#fff;font-size:13px;font-weight:700;
                   cursor:pointer;font-family:Inter,sans-serif;opacity:.5;transition:opacity .15s;"
            onmouseover="if(!this.disabled)this.style.background='#b91c1c'"
            onmouseout="this.style.background='#dc2626'"
            >
            Limpar tudo
          </button>
        </div>
      </div>
    </div>`;

  // Habilitar botão ao digitar LIMPAR
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  setTimeout(() => {
    const inp = document.getElementById('limpar-confirm-input');
    const btn = document.getElementById('btn-confirmar-limpar');
    if (inp && btn) {
      inp.addEventListener('input', () => {
        const ok = inp.value.toUpperCase() === 'LIMPAR';
        btn.disabled = !ok;
        btn.style.opacity = ok ? '1' : '.5';
      });
    }
  }, 50);
}

async function _executarLimpeza() {
  const modal = document.getElementById('modal-limpar');
  if (modal) modal.remove();

  if (typeof _mostrarToast === 'function') _mostrarToast('🗑 Limpando dados...', '#6b7280');

  // ── Chaves do localStorage que NUNCA devem ser removidas ──
  const AUTH_KEYS = new Set([
    'oem_senhas',           // senhas customizadas por usuário
    'oem_audit',            // log de auditoria
    'oem_users_overrides',  // nomes/setores editados pelo admin (sobrenomes, etc.)
    'oem_users_extras',     // usuários adicionados pelo admin
    'oem_users_deleted',    // usuários desativados/removidos pelo admin
  ]);
  const _ehChaveAuth = k => AUTH_KEYS.has(k);

  // 1. Zerar estado em memória
  pedidos = [];
  if (typeof _compDados !== 'undefined')      window._compDados  = {};
  if (typeof window.ESTOQUE_DB !== 'undefined') window.ESTOQUE_DB = [];

  // 2. Limpar localStorage — preserva chaves de autenticação
  const keysParaRemover = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (_ehChaveAuth(k)) continue;  // ← PRESERVA usuários/senhas
    keysParaRemover.push(k);
  }
  keysParaRemover.forEach(k => localStorage.removeItem(k));
  console.log(`[limpar] localStorage: ${keysParaRemover.length} chave(s) removida(s)`);

  // 3. Salvar estado vazio no servidor
  try {
    await fetch('/salvar_estado', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ v: 2, ts: new Date().toISOString(), cal: [calYear, calMonth], peds: [] }),
    });
  } catch(e) { console.warn('[limpar] /salvar_estado indisponível:', e); }

  // 4. Limpar componentes
  try {
    await fetch('/salvar_components', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pedidos: {} }),
    });
  } catch(e) { console.warn('[limpar] /salvar_components indisponível:', e); }

  // 5. Limpar estoque
  try {
    await fetch('/salvar_estoque', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ registros: [] }),
    });
  } catch(e) { console.warn('[limpar] /salvar_estoque indisponível:', e); }

  // 6. Limpar PDFs físicos no servidor
  try {
    await fetch('/limpar_pdfs', { method: 'POST' });
  } catch(e) { console.warn('[limpar] /limpar_pdfs indisponível:', e); }

  // 7. Limpar dados do dashboard (report.json no servidor)
  try {
    await fetch('/limpar_dashboard', { method: 'POST' });
  } catch(e) { console.warn('[limpar] /limpar_dashboard indisponível:', e); }

  // 8. Recriar dashboard vazio se estiver aberto
  if (typeof renderDashboard === 'function') {
    const dashRoot = document.getElementById('dash-root');
    if (dashRoot) dashRoot.innerHTML = '';
  }

  // 9. Atualizar UI
  renderKanban();
  if (typeof _mostrarToast === 'function') _mostrarToast('✅ Dados limpos com sucesso', '#059669');
}

// ── Atualização em tempo real via SSE ────────────────────────────────────────
// O servidor dispara o evento "update" toda vez que o estado é salvo
// (novo pedido autorizado, card movido, etc.). Sem polling por tempo.
(function _iniciarAutoRefresh() {
  let _debounce = null;

  function _conectar() {
    const es = new EventSource('/eventos');

    es.onmessage = async (e) => {
      if (e.data !== 'update') return;
      // Não interfere enquanto o usuário estiver dentro de um pedido
      const detalhe = document.getElementById('screen-detalhe');
      if (detalhe?.classList.contains('active')) return;
      // Debounce: evita múltiplos recarregamentos em rajada (ex: vários saves seguidos)
      clearTimeout(_debounce);
      _debounce = setTimeout(async () => {
        try {
          await carregarEstado();
          renderKanban();
        } catch(err) { console.warn('[sse] falha ao atualizar:', err); }
      }, 800);
    };

    es.onerror = () => {
      es.close();
      // Reconecta após 5s em caso de queda de conexão
      setTimeout(_conectar, 5000);
    };
  }

  _conectar();
})();

// Habilitar botão ao digitar LIMPAR (oninput do HTML chama isso)
function _enableLimparBtn() {
  const inp = document.getElementById('limpar-confirm-input');
  const btn = document.getElementById('btn-confirmar-limpar');
  if (!inp || !btn) return;
  const ok = inp.value.toUpperCase() === 'LIMPAR';
  btn.disabled = !ok;
  btn.style.opacity = ok ? '1' : '.5';
}
