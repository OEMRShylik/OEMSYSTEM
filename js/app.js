// ══════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════
let pedidos = [];

let novoPDF = null;
let currentPedidoIdx = null;
let pdfDoc = null;
let currentPage = 1;
let currentZoom = 1.0;
let currentScreen = 'pedidos';

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function init() {
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updatePrClock, 1000);
  updatePrClock();
  renderKanban();
  buildPrMang();
  renderDescasque();
  renderAngulos();
}

function updateClock() {
  const d = new Date();
  const fmt = d.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('date-left').textContent = fmt;
}

// ══════════════════════════════════════════════════
//  NAV
// ══════════════════════════════════════════════════
function navTo(name, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  currentScreen = name;
  if (name === 'angulos') {
    requestAnimationFrame(() => { resizeAngCanvas(); drawAngCanvas(angAnimCurrent); });
  }
}

// ══════════════════════════════════════════════════
//  KANBAN
// ══════════════════════════════════════════════════
const ETAPAS = [
  {key:'corte',label:'CORTE'},
  {key:'prensagem',label:'PRENSAGEM'},
  {key:'embalagem',label:'EMBALAGEM'},
  {key:'finalizado',label:'FINALIZADOS'},
];

let _dragSrcIdx = -1;
let _dragPedidoId = '';
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

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
    col.dataset.etapa = etapa.key;
    col.dataset.etapaIdx = etapaIdx;

    // Drop zone — aceita só da etapa anterior (usa variável global)
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
      if (p) { p.etapa = etapa.key; renderKanban(filter); }
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
        _dragSrcIdx = parseInt(cardEl.dataset.etapaIdx);
        _dragPedidoId = cardEl.dataset.pedidoId;
        e.dataTransfer.effectAllowed = 'move';
        cardEl.classList.add('dragging');
      });
      cardEl.addEventListener('dragend', () => {
        cardEl.classList.remove('dragging');
        document.querySelectorAll('.drop-target').forEach(c=>c.classList.remove('drop-target'));
      });
    });
  });

  // Chama o calendário após renderizar o kanban
  renderCalendario();
}

function renderCard(p, etapaIdx) {
  const idxReal = pedidos.indexOf(p);
  // Não arrasta finalizado nem processing
  const draggable = !p.processing && p.etapa !== 'finalizado';

  let topRight = '';
  if (p.processing) {
    topRight = `<div class="pedido-processing"><span class="spinner"></span> Processando</div>`;
  } else if (p.etapa === 'finalizado') {
    topRight = `<div class="status-finalizado">✅</div>`;
  } else {
    const statusMap = {'em-dia':'status-em-dia','atrasado':'status-atrasado','pronto':'status-pronto'};
    const statusLabel = {'em-dia':'EM DIA','atrasado':'ATRASADO','pronto':'PRONTO'};
    topRight = `<div class="status-badge ${statusMap[p.status]||''}">${statusLabel[p.status]||p.status}</div>`;
  }

  let annexesHtml = '';
  if (p.anexos && (p.anexos.op || p.anexos.kits?.length || p.anexos.embalagem || p.anexos.corte)) {
    const btns = [];
    if (p.anexos.op) btns.push(`<button class="annex-btn annex-op" onclick="event.stopPropagation();downloadAnexo(${idxReal},'op')">📄 OP</button>`);
    if (p.anexos.kits?.length) {
      p.anexos.kits.forEach((k,ki) => {
        btns.push(`<button class="annex-btn annex-kit" onclick="event.stopPropagation();downloadAnexo(${idxReal},'kit',${ki})">🏷️ ${k.filename.replace('KIT_','').replace('.pdf','').slice(0,12)}</button>`);
      });
    }
    if (p.anexos.embalagem) btns.push(`<button class="annex-btn annex-emb" onclick="event.stopPropagation();downloadAnexo(${idxReal},'embalagem')">📦 Embalagem</button>`);
    if (p.anexos.corte) btns.push(`<button class="annex-btn annex-crt" onclick="event.stopPropagation();downloadAnexo(${idxReal},'corte')">✂️ Corte</button>`);
    annexesHtml = `<div class="pedido-annexes">${btns.join('')}</div>`;
  }

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
    ${annexesHtml}
  </div>`;
}

function searchPedidos() {
  const q = document.getElementById('search-input').value.toLowerCase();
  renderKanban(q);
}

