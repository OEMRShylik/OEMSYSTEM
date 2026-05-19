// ══════════════════════════════════════════════════
//  DASHBOARD — FATURAMENTO MANUAL
//  Permite editar o fat de cada pedido no report.json
//  diretamente do dashboard, sem precisar editar o JSON
// ══════════════════════════════════════════════════

// ── CSS ──────────────────────────────────────────────
(function _fatCss() {
  if (document.getElementById('fat-css')) return;
  const s = document.createElement('style');
  s.id = 'fat-css';
  s.textContent = `
    /* Botão de editar faturamento nas tabelas do dashboard */
    .btn-fat-edit {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 9px;
      font-size: 11px;
      font-weight: 700;
      font-family: Inter, sans-serif;
      border-radius: 6px;
      border: 1.5px solid #e5e7eb;
      background: #fff;
      color: #6b7280;
      cursor: pointer;
      transition: all .15s;
      white-space: nowrap;
    }
    .btn-fat-edit:hover {
      background: #eff6ff;
      border-color: var(--blue, #1a56db);
      color: var(--blue, #1a56db);
    }
    .btn-fat-edit.tem-fat {
      background: #f0fdf4;
      border-color: #86efac;
      color: #166534;
    }

    /* Modal de faturamento */
    #modal-fat-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 99999;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(3px);
    }
    #modal-fat-overlay.open { display: flex; }
    #modal-fat-card {
      background: #fff;
      border-radius: 16px;
      width: 360px;
      max-width: 92vw;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,.22);
      font-family: Inter, sans-serif;
      animation: upcIn .18s ease;
    }
    #modal-fat-header {
      background: linear-gradient(135deg, #059669, #047857);
      padding: 18px 20px 14px;
    }
    #modal-fat-title {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
    }
    #modal-fat-sub {
      font-size: 12px;
      color: rgba(255,255,255,.8);
      margin-top: 3px;
    }
    #modal-fat-body {
      padding: 18px 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    #fat-input-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 10px;
      padding: 2px 14px 2px 8px;
    }
    #fat-prefix {
      font-size: 15px;
      font-weight: 800;
      color: #059669;
      flex-shrink: 0;
    }
    #fat-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 22px;
      font-weight: 800;
      color: #111;
      font-family: Inter, sans-serif;
      outline: none;
      padding: 10px 0;
      font-variant-numeric: tabular-nums;
    }
    #fat-input::placeholder { color: #d1fae5; }
    #fat-hint {
      font-size: 11px;
      color: #6b7280;
      text-align: center;
    }
    #fat-btns {
      display: flex;
      gap: 10px;
    }
    #btn-fat-cancelar {
      flex: 1; padding: 11px;
      border: 1.5px solid #e5e7eb; border-radius: 10px;
      background: #fff; color: #374151;
      font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: Inter, sans-serif;
    }
    #btn-fat-salvar {
      flex: 1; padding: 11px;
      border: none; border-radius: 10px;
      background: #059669; color: #fff;
      font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: Inter, sans-serif;
      transition: background .15s;
    }
    #btn-fat-salvar:hover { background: #047857; }
    #btn-fat-limpar {
      width: 100%; padding: 8px;
      border: 1.5px dashed #fca5a5; border-radius: 8px;
      background: #fff; color: #dc2626;
      font-size: 12px; font-weight: 700;
      cursor: pointer; font-family: Inter, sans-serif;
    }
  `;
  document.head.appendChild(s);
})();

// Criar overlay uma vez
(function _criarModalFat() {
  if (document.getElementById('modal-fat-overlay')) return;
  const el = document.createElement('div');
  el.id = 'modal-fat-overlay';
  el.innerHTML = `
    <div id="modal-fat-card">
      <div id="modal-fat-header">
        <div id="modal-fat-title">💰 Lançar Faturamento</div>
        <div id="modal-fat-sub"></div>
      </div>
      <div id="modal-fat-body">
        <div id="fat-input-wrap">
          <span id="fat-prefix">R$</span>
          <input id="fat-input" type="number" step="0.01" min="0"
            placeholder="0,00"
            onkeydown="if(event.key==='Enter') _fatSalvar()">
        </div>
        <div id="fat-hint">Digite o valor faturado para este pedido.<br>Deixe em branco para marcar como não faturado.</div>
        <div id="fat-btns">
          <button id="btn-fat-cancelar" onclick="_fatFechar()">Cancelar</button>
          <button id="btn-fat-salvar"   onclick="_fatSalvar()">💾 Salvar</button>
        </div>
        <button id="btn-fat-limpar" onclick="_fatLimpar()">× Remover faturamento deste pedido</button>
      </div>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) _fatFechar(); });
  document.body.appendChild(el);
})();

// ── Estado do modal ──
let _fatPedidoAtual = null;

function abrirModalFaturamento(numPedido, cliente, fatAtual) {
  const _isAdmin = typeof currentUser !== 'undefined' &&
    (currentUser?.setor === 'Admin' || currentUser?.permissoes?.all === true);
  if (!_isAdmin) return;

  _fatPedidoAtual = numPedido;

  const sub   = document.getElementById('modal-fat-sub');
  const input = document.getElementById('fat-input');
  const limpar = document.getElementById('btn-fat-limpar');

  if (sub)   sub.textContent  = `#${numPedido} — ${cliente || ''}`;
  if (input) {
    input.value = fatAtual != null ? Number(fatAtual).toFixed(2) : '';
    setTimeout(() => { input.focus(); input.select(); }, 80);
  }
  if (limpar) limpar.style.display = fatAtual != null ? '' : 'none';

  document.getElementById('modal-fat-overlay').classList.add('open');
}

function _fatFechar() {
  document.getElementById('modal-fat-overlay').classList.remove('open');
  _fatPedidoAtual = null;
}

async function _fatSalvar() {
  if (!_fatPedidoAtual) return;
  const input = document.getElementById('fat-input');
  const rawVal = (input?.value || '').replace(',', '.').trim();
  const fat    = rawVal !== '' ? parseFloat(rawVal) : null;

  if (rawVal !== '' && isNaN(fat)) {
    input.style.borderColor = '#fca5a5';
    setTimeout(() => input.style.borderColor = '', 1500);
    return;
  }

  try {
    const r = await fetch('/atualizar_faturamento', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pedido: _fatPedidoAtual, fat }),
    });
    const j = await r.json();
    if (j.ok) {
      _fatFechar();
      if (typeof _mostrarToast === 'function')
        _mostrarToast(fat != null ? `💰 Faturamento salvo: R$ ${fat.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '✅ Faturamento removido', '#059669');
      // Recarrega dashboard
      if (typeof renderDashboard === 'function') renderDashboard();
    } else {
      alert('Erro: ' + (j.erro || 'desconhecido'));
    }
  } catch(e) {
    alert('Erro de conexão: ' + e.message);
  }
}

async function _fatLimpar() {
  if (!_fatPedidoAtual) return;
  document.getElementById('fat-input').value = '';
  await _fatSalvar();
}

// Expõe globalmente
window.abrirModalFaturamento = abrirModalFaturamento;
