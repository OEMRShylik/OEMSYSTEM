// ══════════════════════════════════════════════════
//  STORAGE — Salva e carrega todo o estado do app
//  Persiste no servidor via /estado (arquivo JSON)
//  Fallback: localStorage
// ══════════════════════════════════════════════════

const STORAGE_KEY = 'index_estado';

// ── Serializa pedido para salvar (converte ArrayBuffer para b64) ──
function _serializarPedido(p) {
  return {
    id:           p.id,
    cliente:      p.cliente,
    entrega:      p.entrega,
    etapa:        p.etapa,
    status:       p.status,
    pdfB64:       p.pdfB64 || null,
    amostragens:  p.amostragens || null,
    amostragens_operador: p.amostragens_operador || '',
    amostragens_ts: p.amostragens_ts || null,
    anexos: {
      op:         p.anexos?.op        ? { filename: p.anexos.op.filename,        data: p.anexos.op.data }        : null,
      kits:       p.anexos?.kits?.map(k => ({ filename: k.filename, data: k.data })) || [],
      embalagem:  p.anexos?.embalagem ? { filename: p.anexos.embalagem.filename, data: p.anexos.embalagem.data } : null,
      corte:      p.anexos?.corte     ? { filename: p.anexos.corte.filename,     data: p.anexos.corte.data }     : null,
      separacao:  p.anexos?.separacao ? { filename: p.anexos.separacao.filename, data: p.anexos.separacao.data } : null,
    },
    paginasOP: p.paginasOP || null,
    processing: false, // nunca salvar como processing
  };
}

// ── Desserializa pedido carregado ──
function _desserializarPedido(raw) {
  return {
    ...raw,
    processing:  false,
    entregaDate: raw.entrega ? _parseDateBR(raw.entrega) : null,
    anexos:      raw.anexos || {},
  };
}

function _parseDateBR(str) {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  if (!d || !m || !y) return null;
  return new Date(`${y}-${m}-${d}T12:00`);
}

// ── Monta estado completo ──
function _montarEstado() {
  return {
    versao:   '1.0',
    ts:       new Date().toISOString(),
    pedidos:  pedidos.map(_serializarPedido),
    calYear,
    calMonth,
    amostrasDB: typeof _amostrasDB !== 'undefined' ? _amostrasDB : {},
  };
}

// ── Salva no servidor ──
async function salvarEstado() {
  const estado = _montarEstado();
  const json   = JSON.stringify(estado);

  // Tenta salvar no servidor
  try {
    const resp = await fetch('/salvar_estado', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    json,
    });
    if (resp.ok) {
      _mostrarToast('💾 Salvo', '#059669');
      return true;
    }
  } catch(e) {
    console.warn('Servidor indisponível, salvando localmente:', e);
  }

  // Fallback: localStorage
  try {
    localStorage.setItem(STORAGE_KEY, json);
    _mostrarToast('💾 Salvo localmente', '#d97706');
    return true;
  } catch(e) {
    console.error('Erro ao salvar:', e);
    _mostrarToast('❌ Erro ao salvar', '#dc2626');
    return false;
  }
}

// ── Carrega do servidor ou localStorage ──
async function carregarEstado() {
  let estado = null;

  // Tenta carregar do servidor primeiro
  try {
    const resp = await fetch('/carregar_estado');
    if (resp.ok) {
      estado = await resp.json();
    }
  } catch(e) {
    console.warn('Servidor indisponível, carregando local:', e);
  }

  // Fallback: localStorage
  if (!estado) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) estado = JSON.parse(raw);
    } catch(e) {}
  }

  if (!estado) return false;

  // Restaura pedidos
  if (Array.isArray(estado.pedidos)) {
    pedidos = estado.pedidos.map(_desserializarPedido);
  }

  // Restaura calendário
  if (estado.calYear)  calYear  = estado.calYear;
  if (estado.calMonth !== undefined) calMonth = estado.calMonth;

  // Restaura amostragens
  if (estado.amostrasDB && typeof _amostrasDB !== 'undefined') {
    Object.assign(_amostrasDB, estado.amostrasDB);
  }

  return true;
}

// ── Toast de feedback ──
function _mostrarToast(msg, cor) {
  let t = document.getElementById('save-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'save-toast';
    t.style.cssText = `
      position:fixed; bottom:20px; right:20px; z-index:99999;
      padding:10px 18px; border-radius:10px; font-size:13px;
      font-weight:700; font-family:Inter,sans-serif; color:#fff;
      box-shadow:0 4px 16px rgba(0,0,0,.2);
      transition:opacity .3s; pointer-events:none;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = cor;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
}

// ── Auto-save a cada 2 minutos ──
setInterval(() => {
  if (pedidos.length > 0) salvarEstado();
}, 2 * 60 * 1000);
