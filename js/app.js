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
  // Tenta carregar estado salvo
  try {
    const carregou = await carregarEstado();
    if (carregou && pedidos.length > 0) {
      _mostrarToast('📂 ' + pedidos.length + ' pedido(s) carregado(s)', '#1a56db');
    }
  } catch(e) {
    console.warn('Erro ao carregar estado:', e);
  }
  renderKanban();
  _updateTopbar('pedidos');
  _aplicarPermissoes();
  // Ângulos só renderiza quando a tela estiver ativa (evita problemas de tamanho)
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
// Títulos das telas para o cabeçalho
const SCREEN_TITLES = {
  'dashboard':    'Dashboard de Produção',
  'pedidos':      'Gestão de Pedidos',
  'detalhe':      'Pedido',
  'prensagem':    'Medidas de Crimpagem',
  'descasque':    'Descasque',
  'angulos':      'Ângulos de Montagem',
  'medida-corte': 'Medida de Corte',
};

// ── Controle de acesso por setor ──
function _aplicarPermissoes() {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  const perm   = currentUser.permissoes || {};
  const setor  = currentUser.setor || '';
  const isAdmin = setor === 'Admin';

  // Nav Pedidos: só Admin vê
  const navPedidos = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (navPedidos) navPedidos.style.display = isAdmin ? '' : 'none';

  // Redirecionar se não Admin e estiver em pedidos
  if (!isAdmin && typeof currentScreen !== 'undefined' && currentScreen === 'pedidos') {
    const navPr = document.querySelector('.nav-item[onclick*="prensagem"]');
    if (navPr) navTo('prensagem', navPr);
  }

  // Nav Dashboard: Admin, Gestão ou Comercial
  const podeVerDash = ['Admin','Gestão','Comercial'].includes(setor);
  const navDash = document.getElementById('nav-dashboard');
  if (navDash) {
    navDash.style.display    = podeVerDash ? '' : 'none';
    navDash.style.visibility = podeVerDash ? 'visible' : 'hidden';
  }
}

// Garantir que _aplicarPermissoes roda quando auth.js define currentUser
// (auth.js pode chamar init() antes de setar currentUser)
(function _watchAuth() {
  let _lastUser = null;
  setInterval(() => {
    if (typeof currentUser !== 'undefined' && currentUser !== _lastUser) {
      _lastUser = currentUser;
      _aplicarPermissoes();
    }
  }, 500);
})();

// Sobrescreve navTo para verificar permissões
function navTo(name, el) {
  // Verifica permissão para tela de pedidos
  if (name === 'pedidos' && typeof currentUser !== 'undefined' && currentUser) {
    const perm = currentUser.permissoes || {};
    const isAdmin = currentUser.setor === 'Admin' || perm.pedidos === true;
    if (!isAdmin) return; // Bloqueia acesso
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  currentScreen = name;

  // Atualiza cabeçalho
  _updateTopbar(name);

  if (name === 'dashboard') {
    if (typeof renderDashboard === 'function') renderDashboard();
  }
  if (name === 'angulos') {
    requestAnimationFrame(() => { _angDrawAll(); });
  }
}

function _updateTopbar(screen) {
  const titleEl  = document.getElementById('topbar-screen-title');
  const btnNovo  = document.getElementById('btn-novo-pedido-top');
  const searchEl = document.getElementById('kanban-search-bar');
  const isPedidos = (screen === 'pedidos');
  const title = SCREEN_TITLES[screen] || '';

  // Título sempre visível
  if (titleEl) {
    titleEl.textContent = title;
    titleEl.style.display = title ? 'block' : 'none';
  }
  // Botão + Novo Pedido: só em pedidos
  if (btnNovo) btnNovo.style.display = isPedidos ? '' : 'none';
  // Barra de busca: só em pedidos
  if (searchEl) searchEl.style.display = isPedidos ? '' : 'none';
}

// ══════════════════════════════════════════════════
//  KANBAN
// ══════════════════════════════════════════════════
const ETAPAS = [
  {key:'corte',     label:'CORTE'},
  {key:'prensagem', label:'PRENSAGEM'},
  {key:'embalagem', label:'EMBALAGEM'},
  {key:'finalizado',label:'FINALIZADOS'},
];

let _dragSrcIdx  = -1;
let _dragPedidoId = '';

function renderKanban(filter='') {
  const area = document.getElementById('kanban-area');
  area.innerHTML = '';
  ETAPAS.forEach((etapa, etapaIdx) => {
    const cards = pedidos.filter(p =>
      p.etapa === etapa.key &&
      (!filter || p.cliente.toLowerCase().includes(filter) || p.id.includes(filter))
    );
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

    col.innerHTML = `
      <div class="kanban-col-header">
        <div class="kanban-col-title">${etapa.label} <span class="kanban-count">${cards.length}</span></div>
      </div>
      ${cards.map(p => renderCard(p, etapaIdx)).join('')}
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

function renderCard(p, etapaIdx) {
  const idxReal  = pedidos.indexOf(p);
  const draggable = !p.processing && p.etapa !== 'finalizado';

  let topRight = '';
  if (p.processing) {
    topRight = `<div class="pedido-processing"><span class="spinner"></span> Processando</div>`;
  } else if (p.etapa === 'finalizado') {
    topRight = `<div class="status-finalizado">✅</div>`;
  } else {
    const statusMap   = {'em-dia':'status-em-dia','atrasado':'status-atrasado','pronto':'status-pronto'};
    const statusLabel = {'em-dia':'EM DIA','atrasado':'ATRASADO','pronto':'PRONTO'};
    topRight = `<div class="status-badge ${statusMap[p.status]||''}">${statusLabel[p.status]||p.status}</div>`;
  }

  let filesHtml = '';

  return `<div class="pedido-card ${p.processing?'processing':''}"
    draggable="${draggable}"
    data-pedido-id="${p.id}"
    data-etapa-idx="${etapaIdx}"
    onclick="abrirPedido(${idxReal})">
    <div class="pedido-card-top">
      <div class="pedido-num">#${p.id}</div>
      ${topRight}
    </div>
    <div class="pedido-cliente">${p.cliente}</div>
    <div class="pedido-entrega">${p.entrega ? 'Entrega: '+p.entrega : ''}</div>
    ${filesHtml}
  </div>`;
}

function searchPedidos() {
  const q = document.getElementById('search-input').value.toLowerCase();
  renderKanban(q);
}
