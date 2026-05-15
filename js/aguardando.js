// ══════════════════════════════════════════════════
//  AGUARDANDO.JS  ·  OEM RS
//  • Card amarelo no kanban
//  • Painel Falta de Estoque na aba Separação
//  • Sincroniza com db/estoque.json via Flask
//  • Empenhado → remove pendência do card
// ══════════════════════════════════════════════════

// ── Estado global de estoque ──
window.ESTOQUE_DB = [];  // espelho em memória do estoque.json

// ── Carregar estoque.json ao iniciar ──
(async function _carregarEstoque() {
  const LS_KEY = 'oem_estoque_db_v2'; // v2 = chave definitiva

  // 1. localStorage é a fonte primária (funciona offline e persiste)
  try {
    const local = localStorage.getItem(LS_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      window.ESTOQUE_DB = Array.isArray(parsed) ? parsed : [];
    }
  } catch(_) {}

  // 2. Tentar enriquecer com dados do servidor (se Flask disponível)
  try {
    const r = await fetch('db/estoque.json', { cache: 'no-store' });
    if (r.ok) {
      const d = await r.json();
      const serverRegs = Array.isArray(d.registros) ? d.registros : [];
      // Mesclar: servidor prevalece se tiver mais dados
      if (serverRegs.length > (window.ESTOQUE_DB||[]).length) {
        window.ESTOQUE_DB = serverRegs;
        // Sincronizar de volta pro localStorage
        try { localStorage.setItem(LS_KEY, JSON.stringify(window.ESTOQUE_DB)); } catch(_) {}
      }
    }
  } catch(_) { /* servidor indisponível — usa localStorage */ }

  if (!Array.isArray(window.ESTOQUE_DB)) window.ESTOQUE_DB = [];

  // 3. Sincronizar com pedidos quando estiverem carregados
  let t = 0;
  const loop = setInterval(() => {
    const prontos = typeof pedidos !== 'undefined' && pedidos !== null;
    if (prontos || t++ > 30) {
      clearInterval(loop);
      if (prontos && window.ESTOQUE_DB.length > 0) _sincronizarPendencias();
      _atualizarBotaoEstoque();
    }
  }, 200);
})();

/** Salva ESTOQUE_DB no servidor via Flask */
async function _salvarEstoque() {
  // Sempre salvar no localStorage primeiro (funciona offline)
  try { localStorage.setItem('oem_estoque_db_v2', JSON.stringify(window.ESTOQUE_DB)); } catch(_) {}
  // Depois tentar salvar no servidor Flask
  try {
    await fetch('/salvar_estoque', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ registros: window.ESTOQUE_DB })
    });
  } catch(e) {
    console.warn('[estoque] Servidor indisponível, dados salvos localmente.', e);
  }
}

/** Sincroniza pendencias[] dos pedidos com ESTOQUE_DB (fonte de verdade) */
function _sincronizarPendencias() {
  if (typeof pedidos === 'undefined') return;
  pedidos.forEach(p => {
    const regs = window.ESTOQUE_DB.filter(r => r.pedido === p.id);
    if (!regs.length) return;
    if (!Array.isArray(p.pendencias)) p.pendencias = [];
    regs.forEach(r => {
      // Só adiciona se ainda não existir
      const existe = p.pendencias.some(pend => pend._estoqueId === r.id);
      if (!existe) {
        p.pendencias.push({
          _estoqueId:     r.id,
          item:           r.item,
          qtd_solicitada: r.qtd_solicitada,
          qtd_faltante:   r.qtd_faltante,
          comentario:     r.observacao,
          registrado_por: r.registrado_por,
          data:           r.data_registro,
          resolvido:      r.status === 'Empenhado',
          concluido_por:  r.concluido_por,
          data_conclusao: r.data_conclusao,
          status:         r.status,
        });
      } else {
        // Atualiza estado
        const pend = p.pendencias.find(pend => pend._estoqueId === r.id);
        if (pend) {
          pend.resolvido     = r.status === 'Empenhado';
          pend.status        = r.status;
          pend.concluido_por = r.concluido_por;
          pend.data_conclusao= r.data_conclusao;
        }
      }
    });
  });
}

// ══════════════════════════════════════════════════
//  1. HELPERS
// ══════════════════════════════════════════════════

function _isAguardando(p) {
  return Array.isArray(p.pendencias) && p.pendencias.some(d => !d.resolvido);
}
function _primeiraPendencia(p) {
  if (!Array.isArray(p.pendencias)) return null;
  return p.pendencias.find(d => !d.resolvido) || null;
}
function _agora() {
  const d = new Date();
  return d.toLocaleDateString('pt-BR') + ' ' +
         d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
function _usuarioAtual() {
  return (typeof currentUser !== 'undefined' && currentUser?.nome) ? currentUser.nome : '';
}

// ══════════════════════════════════════════════════
//  2. PATCHES (aplicados após window.load)
// ══════════════════════════════════════════════════

window.addEventListener('load', function() {

  // ── renderCard: card amarelo, badge Aguardando ──
  if (typeof window.renderCard === 'function' && !window._agPatchedCard) {
    const _orig = window.renderCard;
    window.renderCard = function(p, etapaIdx) {
      let html;
      try { html = _orig(p, etapaIdx); } catch(e) { return ''; }
      if (!html || !_isAguardando(p)) return html || '';
      try {
        html = html.replace(/class="pedido-card([^"]*)"/, (_, r) =>
          `class="pedido-card${r} card-aguardando"`);
        html = html.replace(/<div class="status-badge[^"]*">[^<]*<\/div>/,
          `<div class="status-badge status-aguardando">⏳ AGUARDANDO</div>`);
      } catch(e) {}
      return html;
    };
    window._agPatchedCard = true;
  }

  // ── renderKanban: badge ⏳N no cabeçalho ──
  if (typeof window.renderKanban === 'function' && !window._agPatchedKanban) {
    const _origK = window.renderKanban;
    window.renderKanban = function(filter) {
      _origK(filter);
      document.querySelectorAll('.kanban-col').forEach(col => {
        const n = pedidos.filter(p => p.etapa===col.dataset.etapa && _isAguardando(p)).length;
        if (!n) return;
        const hdr = col.querySelector('.kanban-col-title');
        if (!hdr || hdr.querySelector('.kanban-aguard-count')) return;
        const b = document.createElement('span');
        b.className   = 'kanban-aguard-count';
        b.title       = `${n} aguardando componente`;
        b.textContent = `⏳ ${n}`;
        hdr.appendChild(b);
      });
    };
    window._agPatchedKanban = true;
  }

  // ── abrirPedido: injeta painel automaticamente + badge ──
  if (typeof window.abrirPedido === 'function' && !window._agPatchedAbrirPedido) {
    const _origAP = window.abrirPedido;
    window.abrirPedido = function(idx) {
      _origAP(idx);
      window._agCurrentIdx = idx;
      const p = pedidos[idx];
      if (!p) return;

      // Badge de status
      const b = document.getElementById('detalhe-status-badge');
      if (b && _isAguardando(p)) {
        b.textContent = '⏳ Aguardando';
        b.style.cssText += ';background:#fef9c3;color:#854d0e;border:1px solid #fde047;';
      }

      // Injeta painel após pedidos.js terminar de renderizar (timeout 0 = fim da fila)
      setTimeout(() => {
        // Remover qualquer botão fechar que o pedidos.js possa ter inserido
        document.querySelectorAll(
          '[data-pdf-close],[id*="fechar-pdf"],[id*="btn-fechar"],[data-action="close-pdf"]'
        ).forEach(el => el.remove());

        _injetarPainelNoDetalhe(idx);
      }, 0);
    };
    window._agPatchedAbrirPedido = true;
  }
});

// ══════════════════════════════════════════════════
//  3. BOTÃO SEPARAÇÃO → painel + PDF
// ══════════════════════════════════════════════════

function abrirSeparacao() {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  const conteudo = document.getElementById('detalhe-conteudo');
  if (!conteudo) return;
  conteudo.innerHTML = '';

  // Remover qualquer botão fechar que o pedidos.js possa ter criado
  document.querySelectorAll('[data-pdf-close],[id*="fechar-pdf"],[id*="btn-fechar"],[data-action="close-pdf"]')
    .forEach(el => el.remove());

  // Se já tem PDF de separação: exibe visualizador sem botão fechar
  if (p.pdfSepData) {
    const pdfWrap = document.createElement('div');
    pdfWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:200px;overflow-y:auto;';
    conteudo.appendChild(pdfWrap);
    _exibirPdfNoConteudo(p.pdfSepData, pdfWrap);
    return;
  }

  // Sem PDF: exibe área para anexar
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
      <button onclick="document.getElementById('upload-pdf-sep').click()"
        style="padding:10px 24px;background:#1a56db;color:#fff;border:none;border-radius:10px;
               font-size:14px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;
               display:flex;align-items:center;gap:8px;">
        📎 Anexar PDF de Separação
      </button>
      <input type="file" id="upload-pdf-sep" accept=".pdf" style="display:none"
        onchange="anexarPdfSeparacao(event)">
    </div>`;
}

// ══════════════════════════════════════════════════
//  4. HTML DO PAINEL (na tela de Separação)
// ══════════════════════════════════════════════════

function _htmlPainel(p, idx) {
  const pendencias  = Array.isArray(p.pendencias) ? p.pendencias : [];
  const abertas     = pendencias.filter(d => !d.resolvido);
  const resolvidas  = pendencias.filter(d => d.resolvido);
  const aguardando  = abertas.length > 0;

  const bg     = aguardando ? '#fef9c3' : '#f0fdf4';
  const border = aguardando ? '#fde047' : '#bbf7d0';
  const hdrBg  = aguardando ? '#fef08a' : '#dcfce7';
  const cor    = aguardando ? '#854d0e' : '#166534';

  return `
  <div style="margin:12px 14px 0;border-radius:12px;border:1.5px solid ${border};background:${bg};overflow:hidden;font-family:Inter,sans-serif;">

    <!-- Cabeçalho -->
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${hdrBg};border-bottom:1px solid ${border};">
      <span style="font-size:18px;">${aguardando?'⏳':'✅'}</span>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:800;color:${cor};letter-spacing:.4px;text-transform:uppercase;">FALTA DE ESTOQUE</div>
        <div style="font-size:11px;color:${cor};opacity:.75;">${aguardando?'Aguardando componente(s)':'Sem pendências abertas'}</div>
      </div>
      <button onclick="abrirModalAguardando(${idx})"
        style="padding:6px 13px;border:none;border-radius:8px;cursor:pointer;background:${aguardando?'#eab308':'#22c55e'};color:#fff;font-size:12px;font-weight:700;font-family:Inter,sans-serif;">
        + Registrar
      </button>
    </div>

    <!-- Em aberto -->
    ${abertas.length > 0 ? `
    <div style="padding:10px 14px;display:flex;flex-direction:column;gap:8px;">
      <div style="font-size:10px;font-weight:700;color:#92400e;letter-spacing:1px;text-transform:uppercase;">EM ABERTO (${abertas.length})</div>
      ${abertas.map(d => {
        const gi = pendencias.indexOf(d);
        const estoqueId = d._estoqueId;
        const statusCor = {'Em Falta':'#ef4444','Comprado/Transferido':'#eab308','Lançado':'#f97316','Empenhado':'#22c55e'};
        const statusAtual = d.status || 'Em Falta';
        return `
        <div style="background:#fff;border:1.5px solid #fde68a;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:12px;font-weight:800;color:#111;background:#fef9c3;border:1px solid #fde047;padding:2px 9px;border-radius:6px;font-family:'JetBrains Mono',monospace;letter-spacing:.5px;">${d.item}</span>
            <div style="display:flex;gap:6px;margin-left:auto;align-items:center;">
              <span style="font-size:11px;font-weight:600;color:#374151;background:#f1f5f9;padding:2px 8px;border-radius:6px;">Solicitado: <strong>${d.qtd_solicitada}</strong></span>
              <span style="font-size:11px;font-weight:700;color:#dc2626;background:#fee2e2;padding:2px 8px;border-radius:6px;">Faltam: <strong>${d.qtd_faltante}</strong></span>
            </div>
          </div>
          ${d.comentario ? `<div style="font-size:12px;color:#374151;padding:5px 8px;background:#fffbeb;border-radius:6px;border-left:3px solid #fbbf24;">💬 ${d.comentario}</div>` : ''}
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <div style="font-size:10px;color:#9ca3af;flex:1;">
              ${d.registrado_por?`Registrado por: ${d.registrado_por}`:''}${d.data?` · ${d.data}`:''}
            </div>
            <!-- Status listbox -->
            <select onchange="alterarStatusEstoque('${estoqueId||''}',${idx},${gi},this.value)"
              style="padding:4px 8px;border:1.5px solid ${statusCor[statusAtual]||'#e5e7eb'};border-radius:6px;font-size:11px;font-weight:700;font-family:Inter,sans-serif;color:${statusCor[statusAtual]||'#374151'};background:#fff;cursor:pointer;outline:none;">
              <option value="Em Falta"             ${statusAtual==='Em Falta'            ?'selected':''}>🔴 Em Falta</option>
              <option value="Comprado/Transferido"  ${statusAtual==='Comprado/Transferido' ?'selected':''}>🟡 Comprado/Transferido</option>
              <option value="Lançado"               ${statusAtual==='Lançado'              ?'selected':''}>🟠 Lançado</option>
              <option value="Empenhado"             ${statusAtual==='Empenhado'            ?'selected':''}>🟢 Empenhado</option>
            </select>
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div style="padding:14px;font-size:12px;color:#6b7280;font-family:Inter,sans-serif;text-align:center;">Nenhuma pendência em aberto</div>`}

    <!-- Resolvidos -->
    ${resolvidas.length > 0 ? `
    <div style="padding:0 14px 10px;">
      <button id="btn-res-${idx}" onclick="_toggleResolvidas(${idx})"
        style="font-size:11px;color:#6b7280;background:none;border:none;cursor:pointer;font-family:Inter,sans-serif;font-weight:600;padding:4px 0;">
        ▼ Empenhados (${resolvidas.length})
      </button>
      <div id="res-list-${idx}" style="display:block;">
        ${resolvidas.map(d => `
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:10px 12px;margin-top:6px;display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:12px;font-weight:800;font-family:monospace;color:#166534;background:#dcfce7;border:1px solid #86efac;padding:2px 8px;border-radius:6px;">${d.item}</span>
            <span style="font-size:10px;font-weight:700;color:#166534;margin-left:auto;">✅ Empenhado</span>
          </div>
          <div style="font-size:10px;color:#6b7280;">
            ${d.registrado_por?`Registrado por: ${d.registrado_por}${d.data?' · '+d.data:''}`:''}</div>
          <div style="font-size:10px;color:#166534;font-weight:600;">
            ${d.concluido_por?`Concluído por: ${d.concluido_por}${d.data_conclusao?' · '+d.data_conclusao:''}`:''}</div>
          ${d.comentario?`<div style="font-size:11px;color:#9ca3af;">💬 ${d.comentario}</div>`:''}
        </div>`).join('')}
      </div>
    </div>` : ''}
  </div>

  <!-- Modal de Registro -->
  <div id="modal-aguardando" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(3px);"
    onclick="if(event.target===this)fecharModalAguardando()">
    <div style="background:#fff;border-radius:16px;width:360px;max-width:94vw;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.22);animation:upcIn .18s ease;">
      <div style="background:linear-gradient(135deg,#f59e0b,#b45309);padding:20px 18px 14px;position:relative;">
        <button onclick="fecharModalAguardando()" style="position:absolute;top:10px;right:12px;background:rgba(255,255,255,.15);border:none;color:#fff;width:27px;height:27px;border-radius:50%;font-size:15px;cursor:pointer;line-height:1;">×</button>
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.75);letter-spacing:1px;text-transform:uppercase;">Falta de Estoque</div>
        <div style="font-size:18px;font-weight:800;color:#fff;margin-top:2px;">Registrar Pendência</div>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:11px;">
        <div style="position:relative;">
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Item / Componente</label>
          <!-- Campo de digitação + autocomplete -->
          <div style="position:relative;margin-top:4px;">
            <input id="ag-item-search" type="text" placeholder="Digite ou busque o componente..." autocomplete="off" spellcheck="false"
              style="width:100%;box-sizing:border-box;padding:9px 36px 9px 11px;font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace;text-transform:uppercase;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;"
              oninput="_agAcInput(this.value)"
              onkeydown="_agAcKey(event)"
              onfocus="_agAcInput(this.value)">
            <button onclick="_agAcClear()" title="Limpar"
              style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9ca3af;font-size:15px;line-height:1;padding:2px;">×</button>
          </div>
          <!-- Dropdown de autocomplete -->
          <div id="ag-ac-drop" style="display:none;position:absolute;left:0;right:0;background:#fff;border:1.5px solid #93c5fd;border-top:none;border-radius:0 0 8px 8px;max-height:180px;overflow-y:auto;z-index:10000;box-shadow:0 4px 16px rgba(0,0,0,.12);"></div>
          <!-- Item selecionado (hidden) -->
          <input type="hidden" id="ag-item" value="">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Qtd. Solicitada</label>
            <input id="ag-qtd-sol" type="number" min="1" placeholder=""
              style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:14px;font-weight:700;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;font-family:Inter,sans-serif;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Qtd. Faltante</label>
            <input id="ag-qtd-falt" type="number" min="1" placeholder=""
              style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:14px;font-weight:700;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;font-family:Inter,sans-serif;">
          </div>
        </div>
        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Observação (vendedor / produção)</label>
          <textarea id="ag-comentario" rows="2" placeholder=""
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:13px;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;resize:none;font-family:Inter,sans-serif;"></textarea>
        </div>
        <div id="ag-erro" style="display:none;font-size:12px;color:#dc2626;font-family:Inter,sans-serif;padding:6px 10px;background:#fee2e2;border-radius:6px;"></div>
        <button onclick="salvarPendenciaAguardando()"
          style="width:100%;padding:12px;border:none;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#f59e0b,#b45309);color:#fff;font-size:14px;font-weight:700;font-family:Inter,sans-serif;">
          ⏳ Registrar Pendência
        </button>
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════
//  5. MODAL: abrir / fechar / salvar
// ══════════════════════════════════════════════════

let _aguardIdx = -1;

function abrirModalAguardando(idx) {
  _aguardIdx = idx;
  ['ag-qtd-sol','ag-qtd-falt','ag-comentario'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  // Resetar autocomplete
  _agAcClear();

  const err = document.getElementById('ag-erro'); if (err) err.style.display = 'none';
  const modal = document.getElementById('modal-aguardando');
  if (modal) modal.style.display = 'flex';
  setTimeout(() => {
    const el = document.getElementById('ag-item-search'); if (el) el.focus();
  }, 80);
}
function fecharModalAguardando() {
  const m = document.getElementById('modal-aguardando'); if (m) m.style.display = 'none';
}

function salvarPendenciaAguardando() {
  const p = pedidos[_aguardIdx]; if (!p) return;

  const selEl   = document.getElementById('ag-item');
  const item    = (selEl?.value||'').trim().toUpperCase();
  const qtdSol  = parseInt(document.getElementById('ag-qtd-sol').value)  || 0;
  const qtdFalt = parseInt(document.getElementById('ag-qtd-falt').value) || 0;
  const coment  = (document.getElementById('ag-comentario').value||'').trim();

  const err  = document.getElementById('ag-erro');
  const erro = msg => { err.textContent = msg; err.style.display = 'block'; };
  if (!item)      return erro('Informe o código do item.');
  if (qtdSol < 1) return erro('Informe a quantidade solicitada.');
  if (qtdFalt<1)  return erro('Informe a quantidade faltante.');

  if (!Array.isArray(p.pendencias)) p.pendencias = [];

  const agora   = _agora();
  const usuario = _usuarioAtual();
  const estoqueId = `${p.id}_${item}_${Date.now()}`;

  const pend = {
    _estoqueId:     estoqueId,
    item, qtd_solicitada:qtdSol, qtd_faltante:qtdFalt,
    comentario:     coment,
    registrado_por: usuario,
    data:           agora,
    resolvido:      false,
    status:         'Em Falta',
    concluido_por:  null,
    data_conclusao: null,
  };
  p.pendencias.push(pend);

  // Adiciona ao ESTOQUE_DB
  window.ESTOQUE_DB.push({
    id:             estoqueId,
    pedido:         p.id,
    cliente:        p.cliente,
    entrega:        p.entrega || '',
    item,
    qtd_solicitada: qtdSol,
    qtd_faltante:   qtdFalt,
    observacao:     coment,
    status:         'Em Falta',
    registrado_por: usuario,
    data_registro:  agora,
    concluido_por:  null,
    data_conclusao: null,
  });

  fecharModalAguardando();
  _salvarEstoque();
  if (typeof salvarEstado  === 'function') salvarEstado();
  if (typeof renderKanban  === 'function') renderKanban();
  if (typeof renderEstoque === 'function') renderEstoque();
  _injetarPainelNoDetalhe(_aguardIdx);
  if (typeof _mostrarToast === 'function') _mostrarToast('⏳ Pendência registrada', '#f59e0b');
}

// ══════════════════════════════════════════════════
//  6. ALTERAR STATUS (listbox no painel)
// ══════════════════════════════════════════════════

function alterarStatusEstoque(estoqueId, pedidoIdx, pendIdx, novoStatus) {
  const p    = pedidos[pedidoIdx];
  const pend = p?.pendencias?.[pendIdx];
  const reg  = window.ESTOQUE_DB.find(r => r.id === estoqueId);

  const usuario = _usuarioAtual();
  const agora   = _agora();

  if (novoStatus === 'Empenhado') {
    // ── Empenhar: resolve a pendência do pedido ──
    if (pend) {
      pend.resolvido      = true;
      pend.status         = 'Empenhado';
      pend.concluido_por  = usuario;
      pend.data_conclusao = agora;
    }
    if (reg) {
      reg.status         = 'Empenhado';
      reg.concluido_por  = usuario;
      reg.data_conclusao = agora;
    }
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof renderKanban === 'function') renderKanban();
    if (typeof _mostrarToast=== 'function') _mostrarToast('✅ Empenhado! Card normalizado.', '#22c55e');
  } else {
    // ── Apenas atualiza status — registra edição ──
    if (pend)  { pend.status = novoStatus; pend.editado_por = usuario; pend.data_edicao = agora; }
    if (reg)   { reg.status  = novoStatus; reg.editado_por  = usuario; reg.data_edicao  = agora; }
  }

  _salvarEstoque();
  if (typeof renderEstoque === 'function') renderEstoque();
  // Re-renderiza painel no detalhe
  const _cidx = window._agCurrentIdx ?? 0;
  _injetarPainelNoDetalhe(_cidx);
}

// ══════════════════════════════════════════════════
//  7. TOGGLE RESOLVIDOS
// ══════════════════════════════════════════════════

function _toggleResolvidas(idx) {
  const list = document.getElementById(`res-list-${idx}`);
  const btn  = document.getElementById(`btn-res-${idx}`);
  if (!list) return;
  const aberto = list.style.display !== 'none';
  list.style.display = aberto ? 'none' : 'block';
  if (btn) btn.textContent = btn.textContent.replace(aberto?'▼':'▶', aberto?'▶':'▼');
}

// ══════════════════════════════════════════════════
//  8. PDF NO PAINEL
// ══════════════════════════════════════════════════

async function _renderPdfSep(pdfData, container) {
  if (typeof pdfjsLib === 'undefined') return;
  container.innerHTML = '<div style="padding:16px;text-align:center;color:#9ca3af;font-family:Inter,sans-serif;font-size:13px;">Carregando PDF…</div>';
  try {
    const pdf = await pdfjsLib.getDocument({ data: _b64ToBytes(pdfData) }).promise;
    container.innerHTML = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp   = page.getViewport({ scale:1.5 });
      const c    = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      c.style.cssText = 'width:100%;display:block;margin-bottom:4px;';
      container.appendChild(c);
      await page.render({ canvasContext:c.getContext('2d'), viewport:vp }).promise;
    }
  } catch(e) {
    container.innerHTML = '<div style="padding:16px;color:#dc2626;font-family:Inter,sans-serif;font-size:13px;">Erro ao renderizar PDF.</div>';
  }
}
function _b64ToBytes(b64) {
  const bin=atob(b64), b=new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) b[i]=bin.charCodeAt(i);
  return b.buffer;
}

// ══════════════════════════════════════════════════
//  9. TELA FALTA DE ESTOQUE (screen-estoque)
// ══════════════════════════════════════════════════

function renderEstoque(filtro) {
  const root = document.getElementById('estoque-root');
  if (!root) return;

  // Garantir ESTOQUE_DB do localStorage antes de renderizar
  if (!Array.isArray(window.ESTOQUE_DB) || window.ESTOQUE_DB.length === 0) {
    try {
      const local = localStorage.getItem('oem_estoque_db_v2');
      if (local) window.ESTOQUE_DB = JSON.parse(local);
    } catch(_) {}
  }

  filtro = filtro ?? (document.getElementById('estoque-search')?.value || '');
  const q = filtro.toLowerCase();

  const STATUS_COR = {
    'Em Falta':             {bg:'#fee2e2', color:'#991b1b', border:'#fca5a5', row:'#fecaca'},
    'Comprado/Transferido': {bg:'#fef9c3', color:'#854d0e', border:'#fde047', row:'#fde047'},
    'Lançado':              {bg:'#ffedd5', color:'#9a3412', border:'#fdba74', row:'#fdba74'},
    'Empenhado':            {bg:'#dcfce7', color:'#166534', border:'#86efac', row:'#f0fdf4'},
  };

  // Excluir Empenhados da tela global — ficam visíveis só no próprio pedido
  let regs = (window.ESTOQUE_DB || []).filter(r => r.status !== 'Empenhado');
  if (q) regs = regs.filter(r =>
    r.pedido.toLowerCase().includes(q) ||
    r.cliente.toLowerCase().includes(q) ||
    r.item.toLowerCase().includes(q) ||
    (r.observacao||'').toLowerCase().includes(q)
  );

  // Ordenar: por data de entrega, linhas do mesmo pedido juntas
  regs = [...regs].sort((a,b) => {
    // 1º: data de entrega (formato DD/MM/YYYY → YYYY-MM-DD para comparar)
    const dtA = (a.entrega||'').split('/').reverse().join('-') || '9999';
    const dtB = (b.entrega||'').split('/').reverse().join('-') || '9999';
    if (dtA !== dtB) return dtA.localeCompare(dtB);
    // 2º: mesmo pedido agrupado
    if (a.pedido !== b.pedido) return a.pedido.localeCompare(b.pedido);
    // 3º: empenhados por último dentro do mesmo pedido
    const empA = a.status === 'Empenhado' ? 1 : 0;
    const empB = b.status === 'Empenhado' ? 1 : 0;
    return empA - empB;
  });

  root.innerHTML = `
  <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px;max-width:1400px;margin:0 auto;">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Pedido</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Cliente</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Entrega</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Componente</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Solicitado</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Faltante</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;">Observação</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${regs.length === 0 ? `
            <tr><td colspan="8" style="padding:32px;text-align:center;color:#9ca3af;font-size:13px;">
              ${q ? 'Nenhum resultado para "'+filtro+'"' : 'Nenhuma falta de estoque registrada'}
            </td></tr>` :
            regs.map(r => {
              const c  = STATUS_COR[r.status] || STATUS_COR['Em Falta'];
              const id = r.id;
              const empenhado = r.status === 'Empenhado';
              const rowBg = c.row;
              return `
              <tr style="border-bottom:1px solid rgba(0,0,0,.05);background:${rowBg};${empenhado?'opacity:.85;':''}"
                  id="erow-${id.replace(/[^a-z0-9]/gi,'_')}">
                <td style="padding:9px 12px;white-space:nowrap;">
                  <a onclick="irParaPedido('${r.pedido}')"
                    style="color:#1a56db;font-weight:700;cursor:pointer;font-family:'JetBrains Mono',monospace;">#${r.pedido}</a>
                </td>
                <td style="padding:9px 12px;font-weight:700;color:#111;white-space:nowrap;">${r.cliente}</td>
                <td style="padding:9px 12px;color:#374151;white-space:nowrap;">${r.entrega||'—'}</td>
                <td style="padding:9px 12px;">
                  <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;
                               background:rgba(0,0,0,.06);padding:2px 8px;border-radius:5px;color:#111;">
                    ${r.item}
                  </span>
                </td>
                <td style="padding:9px 12px;text-align:right;font-weight:700;color:#374151;">${r.qtd_solicitada}</td>
                <td style="padding:9px 12px;text-align:right;font-weight:700;color:${empenhado?'#22c55e':'#dc2626'};">
                  ${empenhado ? '✅' : r.qtd_faltante}
                </td>
                <td style="padding:9px 12px;max-width:220px;">
                  <div style="font-size:12px;color:#374151;">${r.observacao||'—'}</div>
                  <div style="font-size:10px;color:#6b7280;margin-top:2px;">
                    ${r.registrado_por ? `Por: ${r.registrado_por}${r.data_registro?' · '+r.data_registro:''}` : ''}
                  </div>
                  ${r.editado_por && !empenhado ? `
                  <div style="font-size:10px;color:#6b7280;font-style:italic;margin-top:1px;">
                    Editado por: ${r.editado_por}${r.data_edicao?' · '+r.data_edicao:''}
                  </div>` : ''}
                  ${empenhado && r.concluido_por ? `
                  <div style="font-size:10px;font-weight:700;color:#166534;margin-top:2px;">
                    Concluído por: ${r.concluido_por}${r.data_conclusao?' · '+r.data_conclusao:''}
                  </div>` : ''}
                </td>
                <td style="padding:9px 12px;text-align:center;white-space:nowrap;">
                  <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                    <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
                      background:${c.bg};color:${c.color};border:1.5px solid ${c.border};
                      border-radius:6px;font-size:11px;font-weight:700;font-family:Inter,sans-serif;">
                      ${r.status==='Em Falta'?'🔴':r.status==='Comprado/Transferido'?'🟡':r.status==='Lançado'?'🟠':'🟢'}
                      ${r.status}
                    </span>
                    ${empenhado ? '' : `<button onclick="abrirModalEditarEstoque('${id}')"
                      style="padding:4px 9px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:11px;font-weight:700;
                             font-family:Inter,sans-serif;background:#fff;color:#374151;cursor:pointer;white-space:nowrap;">
                      ✏️ Editar
                    </button>`}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

// Alterar status direto da tela global de estoque
function alterarStatusEstoqueGlobal(estoqueId, novoStatus, selectEl) {
  const reg = window.ESTOQUE_DB.find(r => r.id === estoqueId);
  if (!reg) return;

  const usuario = _usuarioAtual();
  const agora   = _agora();
  reg.status      = novoStatus;
  if (novoStatus !== 'Empenhado') {
    reg.editado_por  = usuario;
    reg.data_edicao  = agora;
    // Sincronizar nos pedidos
    if (typeof pedidos !== 'undefined') {
      const p2 = pedidos.find(p => p.id === reg.pedido);
      if (p2 && Array.isArray(p2.pendencias)) {
        const pend2 = p2.pendencias.find(d => d._estoqueId === estoqueId);
        if (pend2) { pend2.status = novoStatus; pend2.editado_por = usuario; pend2.data_edicao = agora; }
      }
    }
  }

  if (novoStatus === 'Empenhado') {
    reg.concluido_por  = usuario;
    reg.data_conclusao = agora;

    // Sincronizar no pedido correspondente
    if (typeof pedidos !== 'undefined') {
      const p = pedidos.find(p => p.id === reg.pedido);
      if (p && Array.isArray(p.pendencias)) {
        const pend = p.pendencias.find(d => d._estoqueId === estoqueId);
        if (pend) {
          pend.resolvido      = true;
          pend.status         = 'Empenhado';
          pend.concluido_por  = usuario;
          pend.data_conclusao = agora;
        }
      }
    }
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof renderKanban === 'function') renderKanban();
    if (typeof _mostrarToast=== 'function') _mostrarToast('✅ Empenhado! Card normalizado.', '#22c55e');
  }

  // Atualiza cor do select inline
  const STATUS_COR = {
    'Em Falta':             {bg:'#fee2e2',color:'#991b1b',border:'#fca5a5'},
    'Comprado/Transferido': {bg:'#fef9c3',color:'#854d0e',border:'#fde047'},
    'Lançado':              {bg:'#ffedd5',color:'#9a3412',border:'#fdba74'},
    'Empenhado':            {bg:'#dcfce7',color:'#166534',border:'#86efac'},
  };
  const c = STATUS_COR[novoStatus];
  if (selectEl && c) {
    selectEl.style.borderColor = c.border;
    selectEl.style.color       = c.color;
    selectEl.style.background  = c.bg;
  }

  _salvarEstoque();
  renderEstoque();
}

// Ir para pedido a partir da tela de estoque
function irParaPedido(numPedido) {
  if (typeof pedidos === 'undefined') return;
  const idx = pedidos.findIndex(p => p.id === numPedido);
  if (idx < 0) return;
  // Navegar para pedidos → abrir detalhe
  const navEl = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (navEl && typeof navTo === 'function') navTo('pedidos', navEl);
  setTimeout(() => { abrirPedido(idx); abrirSeparacao(); }, 100);
}

// ══════════════════════════════════════════════════
//  10. CSS
// ══════════════════════════════════════════════════

(function _css() {
  if (document.getElementById('aguardando-css')) return;
  const s = document.createElement('style');
  s.id = 'aguardando-css';
  s.textContent = `
    /* Card amarelo sólido */
    .pedido-card.card-aguardando {
      background: #fef08a !important;
      border: 1.5px solid #facc15 !important;
      box-shadow: 0 0 0 2px rgba(234,179,8,.18) !important;
    }
    .pedido-card.card-aguardando:hover {
      box-shadow: 0 4px 16px rgba(234,179,8,.35) !important;
    }
    .pedido-card.card-aguardando .pedido-num     { color:#78350f !important; }
    .pedido-card.card-aguardando .pedido-cliente { color:#451a03 !important; }
    .pedido-card.card-aguardando .pedido-entrega { color:#92400e !important; }

    /* Badge AGUARDANDO */
    .status-aguardando {
      background:#fef9c3 !important; color:#854d0e !important;
      border:1px solid #fde047 !important; font-size:10px !important;
      animation: pulseAguard 2.2s ease-in-out infinite;
    }
    @keyframes pulseAguard { 0%,100%{opacity:1} 50%{opacity:.6} }

    /* Badge coluna */
    .kanban-aguard-count {
      margin-left:7px; font-size:10px; font-weight:700;
      background:#fef9c3; color:#854d0e; border:1px solid #fde047;
      padding:1px 7px; border-radius:10px; vertical-align:middle;
    }

    /* Botão Falta de Estoque na topbar */
    #btn-falta-estoque:hover { background:#fca5a5 !important; color:#7f1d1d !important; }
    #btn-falta-estoque.tem-falta {
      animation: pulseFalta 2s ease-in-out infinite;
    }
    @keyframes pulseFalta {
      0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.4); }
      50%      { box-shadow: 0 0 0 5px rgba(239,68,68,0); }
    }

    /* Screen estoque */
    #screen-estoque.active { display:flex !important; flex-direction:column; }
    #estoque-root { flex:1; overflow-y:auto; background:var(--bg,#f9fafb); }

    @keyframes upcIn {
      from { opacity:0; transform:translateY(14px) scale(.97); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }

    /* Autocomplete de componentes */
    #ag-item-search { transition: border-color .15s; }
    #ag-item-search:focus { border-color: #93c5fd !important; }
    #ag-ac-drop::-webkit-scrollbar { width: 4px; }
    #ag-ac-drop::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
    .ag-ac-item:hover { background: #f8fafc; }
    #modal-aguardando > div { max-height: 92vh; overflow-y: auto; }

    /* Ocultar barra/toolbar do PDF gerada pelo pedidos.js */
    #detalhe-conteudo [id*="pdf-toolbar"],
    #detalhe-conteudo [class*="pdf-toolbar"],
    #detalhe-conteudo [id*="pdf-header"],
    #detalhe-conteudo [class*="pdf-header"],
    #detalhe-conteudo [class*="viewer-bar"],
    #detalhe-conteudo [class*="pdf-bar"] { display:none !important; }
  `;
  document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════
//  11. Atualizar badge do botão Falta de Estoque
// ══════════════════════════════════════════════════

function _atualizarBotaoEstoque() {
  const btn = document.getElementById('btn-falta-estoque');
  if (!btn) return;
  // Visibilidade gerenciada pela kanban-search-bar
  const n = (window.ESTOQUE_DB||[]).filter(r => r.status !== 'Empenhado').length;
  if (n > 0) btn.classList.add('tem-falta');
  else       btn.classList.remove('tem-falta');
}

// Chamar sempre que estado mudar
const _origSalvarEstoque = _salvarEstoque;
setInterval(_atualizarBotaoEstoque, 2000);
window.addEventListener('load', () => setTimeout(_atualizarBotaoEstoque, 500));

// ══════════════════════════════════════════════════
//  12. NAV para tela de estoque
// ══════════════════════════════════════════════════

function abrirTelaEstoque() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const sc = document.getElementById('screen-estoque');
  if (sc) sc.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (typeof currentScreen !== 'undefined') window.currentScreen = 'estoque';
  // Atualizar topbar
  const titleEl = document.getElementById('topbar-screen-title');
  if (titleEl) { titleEl.textContent = 'Falta de Estoque'; titleEl.style.display = 'block'; }
  const btnNovo  = document.getElementById('btn-novo-pedido-top');
  const searchEl = document.getElementById('kanban-search-bar');
  if (btnNovo)  btnNovo.style.display  = 'none';
  if (searchEl) searchEl.style.display = 'none';
  renderEstoque('');
}

function voltarDeEstoque() {
  const navEl = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (navEl && typeof navTo === 'function') navTo('pedidos', navEl);
  else {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const sc = document.getElementById('screen-pedidos');
    if (sc) sc.classList.add('active');
    if (navEl) navEl.classList.add('active');
    if (typeof currentScreen !== 'undefined') window.currentScreen = 'pedidos';
    const titleEl = document.getElementById('topbar-screen-title');
    if (titleEl) titleEl.textContent = 'Gestão de Pedidos';
    const searchEl = document.getElementById('kanban-search-bar');
    if (searchEl) searchEl.style.display = '';
    const btnNovo = document.getElementById('btn-novo-pedido-top');
    if (btnNovo)  btnNovo.style.display  = '';
  }
}

// ══════════════════════════════════════════════════
//  AUTOCOMPLETE DE COMPONENTES
//  Catálogo global: crimp.json (mangueiras+capas) + fittings.json (terminais)
//  Digitação livre permitida se item não estiver no catálogo
// ══════════════════════════════════════════════════

/** Catálogo global em memória, montado na primeira chamada */
window._AG_CATALOGO = null;

function _agCatalogo() {
  if (window._AG_CATALOGO) return window._AG_CATALOGO;

  const items = [];
  const visto = new Set();

  function add(cod, tipo, desc) {
    if (!cod || visto.has(cod)) return;
    visto.add(cod);
    items.push({ cod, tipo, desc: (desc||'').trim() });
  }

  // ── Mangueiras e Capas do CRIMP ──
  const crimp = window.CRIMP || [];
  for (const r of crimp) {
    const descMang = ((r.descricao || r.mangueira || '') + ' ' + (r.size||'')).trim();
    add(r.cod,  'Mangueira', descMang);
    add(r.capa, 'Capa',      'Capa ' + (r.size||''));
  }

  // ── Terminais do TERMINAIS (fittings.json via dados.js) ──
  const terminais = window.TERMINAIS || [];
  for (const t of terminais) {
    const desc = t.medida != null ? `${t.medida} mm` : '';
    add(t.cod, 'Terminal', desc);
  }

  // Ordenar: Mangueira → Terminal → Capa → resto, e dentro por código
  const ORDEM_TIPO = { 'Mangueira':0, 'Terminal':1, 'Capa':2 };
  items.sort((a,b) =>
    ((ORDEM_TIPO[a.tipo]??9) - (ORDEM_TIPO[b.tipo]??9)) ||
    a.cod.localeCompare(b.cod)
  );

  window._AG_CATALOGO = items;
  return items;
}

// ── Estado do autocomplete ──
let _agAcSelecionado  = null;  // { cod, tipo, desc } ou null (digitação livre)
let _agAcIdxAtivo     = -1;

/** Input do campo de busca */
function _agAcInput(q) {
  _agAcSelecionado = null;
  document.getElementById('ag-item').value = '';
  const selDiv = document.getElementById('ag-item-selecionado');
  if (selDiv) selDiv.style.display = 'none';

  const search  = (q||'').toUpperCase().trim();
  const catalogo = _agCatalogo();
  const drop    = document.getElementById('ag-ac-drop');
  if (!drop) return;

  if (!search) { drop.style.display = 'none'; _agAcIdxAtivo = -1; return; }

  // Filtrar: prioridade a quem começa com a query, depois contém
  const inicia  = catalogo.filter(it => it.cod.startsWith(search));
  const contem  = catalogo.filter(it => !it.cod.startsWith(search) && it.cod.includes(search));
  const matches = [...inicia, ...contem].slice(0, 30);

  if (matches.length === 0) {
    // Nenhum encontrado — permite digitação livre
    drop.innerHTML = `
      <div style="padding:8px 12px;font-size:12px;color:#6b7280;font-family:Inter,sans-serif;border-top:1px solid #f1f5f9;">
        Item não encontrado no catálogo.<br>
        <span style="font-weight:700;color:#111;">Pressione Enter para usar "${search}"</span>
      </div>`;
    drop.style.display = 'block';
    _agAcIdxAtivo = -1;
    return;
  }

  const TIPO_COR = { 'Mangueira':'#3b82f6','Terminal':'#8b5cf6','Capa':'#10b981' };
  drop.innerHTML = matches.map((it, i) => {
    const q2 = search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const destaque = it.cod.replace(new RegExp(q2,'i'), m => `<strong style="color:#1a56db">${m}</strong>`);
    return `<div class="ag-ac-item" data-idx="${i}" data-cod="${it.cod}"
      style="padding:7px 12px;cursor:pointer;border-top:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;"
      onmousedown="_agAcSelect('${it.cod}','${it.desc.replace(/'/g,"&#39;")}')">
      <span style="font-size:10px;font-weight:700;color:${TIPO_COR[it.tipo]||'#6b7280'};background:${TIPO_COR[it.tipo]||'#6b7280'}18;padding:1px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0;">${it.tipo}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#111;">${destaque}</span>
      ${it.desc ? `<span style="font-size:11px;color:#9ca3af;margin-left:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">${it.desc}</span>` : ''}
    </div>`;
  }).join('');

  _agAcIdxAtivo = -1;
  drop.style.display = 'block';
}

/** Selecionar item do dropdown */
function _agAcSelect(cod, desc) {
  _agAcSelecionado = { cod, desc };
  document.getElementById('ag-item').value       = cod;
  document.getElementById('ag-item-search').value = cod;
  const selDiv = document.getElementById('ag-item-selecionado');
  if (selDiv) {
    selDiv.textContent = cod + (desc ? ' · ' + desc : '');
    selDiv.style.display = 'block';
  }
  const drop = document.getElementById('ag-ac-drop');
  if (drop) drop.style.display = 'none';
  _agAcIdxAtivo = -1;
}

/** Teclado: Enter confirma digitação livre, Esc fecha, ↑↓ navega */
function _agAcKey(e) {
  const drop  = document.getElementById('ag-ac-drop');
  const items = drop ? drop.querySelectorAll('.ag-ac-item') : [];

  if (e.key === 'Enter') {
    e.preventDefault();
    if (_agAcIdxAtivo >= 0 && items[_agAcIdxAtivo]) {
      items[_agAcIdxAtivo].dispatchEvent(new MouseEvent('mousedown'));
    } else {
      // Confirmar digitação livre
      const val = (document.getElementById('ag-item-search').value||'').trim().toUpperCase();
      if (val) _agAcSelectLivre(val);
    }
    return;
  }
  if (e.key === 'Escape') {
    if (drop) drop.style.display = 'none'; return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _agAcIdxAtivo = Math.min(_agAcIdxAtivo + 1, items.length - 1);
    _agAcHighlight(items);
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    _agAcIdxAtivo = Math.max(_agAcIdxAtivo - 1, 0);
    _agAcHighlight(items);
    return;
  }
}

function _agAcHighlight(items) {
  items.forEach((el, i) => {
    el.style.background = i === _agAcIdxAtivo ? '#eff6ff' : '';
  });
}

/** Confirmar item digitado livremente (não estava no catálogo) */
function _agAcSelectLivre(cod) {
  document.getElementById('ag-item').value       = cod;
  document.getElementById('ag-item-search').value = cod;
  const selDiv = document.getElementById('ag-item-selecionado');
  if (selDiv) {
    selDiv.textContent = cod + ' · (digitado manualmente)';
    selDiv.style.display = 'block';
    selDiv.style.background = '#fff7ed';
    selDiv.style.borderColor = '#fed7aa';
    selDiv.style.color = '#9a3412';
  }
  const drop = document.getElementById('ag-ac-drop');
  if (drop) drop.style.display = 'none';
}

/** Botão × limpa o campo */
function _agAcClear() {
  document.getElementById('ag-item').value        = '';
  document.getElementById('ag-item-search').value = '';
  _agAcSelecionado = null;
  const selDiv = document.getElementById('ag-item-selecionado');
  if (selDiv) selDiv.style.display = 'none';
  const drop = document.getElementById('ag-ac-drop');
  if (drop) drop.style.display = 'none';
  document.getElementById('ag-item-search').focus();
}

/** Fechar dropdown ao clicar fora */
document.addEventListener('mousedown', function(e) {
  const drop = document.getElementById('ag-ac-drop');
  const inp  = document.getElementById('ag-item-search');
  if (drop && !drop.contains(e.target) && e.target !== inp) {
    drop.style.display = 'none';
    // Se havia texto mas não selecionou: usar como digitação livre
    const val = (inp?.value||'').trim().toUpperCase();
    const hiddenVal = document.getElementById('ag-item')?.value || '';
    if (val && !hiddenVal) _agAcSelectLivre(val);
  }
});

// ══════════════════════════════════════════════════
//  _injetarPainelNoDetalhe — injeta ao abrir pedido
//  (sem precisar clicar em Separação)
// ══════════════════════════════════════════════════

function _injetarPainelNoDetalhe(idx) {
  const p        = pedidos[idx];
  const conteudo = document.getElementById('detalhe-conteudo');
  if (!p || !conteudo) return;

  // Garantir ESTOQUE_DB carregado (fallback localStorage)
  if (!Array.isArray(window.ESTOQUE_DB) || window.ESTOQUE_DB.length === 0) {
    try {
      const local = localStorage.getItem('oem_estoque_db_v2');
      if (local) {
        window.ESTOQUE_DB = JSON.parse(local);
        _sincronizarPendencias();
      }
    } catch(_) {}
  }

  // Remover painel anterior se existir (evita duplicata)
  const antigo = document.getElementById('painel-aguardando');
  if (antigo) antigo.remove();

  // Só injeta se houver pendências (abertas ou resolvidas) ou sempre (para poder registrar)
  const wrap = document.createElement('div');
  wrap.id    = 'painel-aguardando';
  wrap.innerHTML = _htmlPainel(p, idx);

  // Inserir NO TOPO do conteudo (antes de qualquer PDF já renderizado)
  conteudo.insertBefore(wrap, conteudo.firstChild);
}

// ══════════════════════════════════════════════════
//  MODAL DE EDIÇÃO DE REGISTRO DE ESTOQUE
// ══════════════════════════════════════════════════

function abrirModalEditarEstoque(estoqueId) {
  const reg = (window.ESTOQUE_DB||[]).find(r => r.id === estoqueId);
  if (!reg) return;

  // Remover modal anterior
  const antigo = document.getElementById('modal-editar-estoque');
  if (antigo) antigo.remove();

  const STATUS_COR = {
    'Em Falta':             {bg:'#fee2e2',color:'#991b1b',border:'#fca5a5'},
    'Comprado/Transferido': {bg:'#fef9c3',color:'#854d0e',border:'#fde047'},
    'Lançado':              {bg:'#ffedd5',color:'#9a3412',border:'#fdba74'},
    'Empenhado':            {bg:'#dcfce7',color:'#166534',border:'#86efac'},
  };

  const modal = document.createElement('div');
  modal.id = 'modal-editar-estoque';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:380px;max-width:95vw;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.22);animation:upcIn .18s ease;">
      <div style="background:linear-gradient(135deg,#1a56db,#0e3fa8);padding:18px 18px 14px;position:relative;">
        <button onclick="document.getElementById('modal-editar-estoque').remove()"
          style="position:absolute;top:10px;right:12px;background:rgba(255,255,255,.15);border:none;color:#fff;width:27px;height:27px;border-radius:50%;font-size:15px;cursor:pointer;line-height:1;">×</button>
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:1px;text-transform:uppercase;">Falta de Estoque</div>
        <div style="font-size:17px;font-weight:800;color:#fff;margin-top:3px;">#${reg.pedido} — ${reg.cliente}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;">
          <span style="font-family:'JetBrains Mono',monospace;font-weight:700;">${reg.item}</span>
          ${reg.entrega ? ' · Entrega: '+reg.entrega : ''}
        </div>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">

        <!-- Status -->
        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Status</label>
          <select id="eed-status"
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;cursor:pointer;"
            onchange="_eedAtualizarCorStatus(this)">
            <option value="Em Falta"             ${reg.status==='Em Falta'            ?'selected':''}>🔴 Em Falta</option>
            <option value="Comprado/Transferido"  ${reg.status==='Comprado/Transferido' ?'selected':''}>🟡 Comprado/Transferido</option>
            <option value="Lançado"               ${reg.status==='Lançado'              ?'selected':''}>🟠 Lançado</option>
            <option value="Empenhado"             ${reg.status==='Empenhado'            ?'selected':''}>🟢 Empenhado</option>
          </select>
        </div>

        <!-- Qtd Faltante -->
        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Quantidade Faltante</label>
          <input id="eed-qtd-falt" type="number" min="0" value="${reg.qtd_faltante||0}"
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:14px;font-weight:700;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;font-family:Inter,sans-serif;">
        </div>

        <!-- Observação -->
        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Observação</label>
          <textarea id="eed-obs" rows="2"
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:13px;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;resize:none;font-family:Inter,sans-serif;">${reg.observacao||''}</textarea>
        </div>

        <div id="eed-erro" style="display:none;font-size:12px;color:#dc2626;font-family:Inter,sans-serif;padding:6px 10px;background:#fee2e2;border-radius:6px;"></div>

        <button onclick="_salvarEdicaoEstoque('${estoqueId}')"
          style="width:100%;padding:11px;border:none;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#1a56db,#0e3fa8);color:#fff;font-size:14px;font-weight:700;font-family:Inter,sans-serif;">
          💾 Salvar Alterações
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Aplicar cor inicial no select de status
  _eedAtualizarCorStatus(modal.querySelector('#eed-status'));
}

function _eedAtualizarCorStatus(sel) {
  const STATUS_COR = {
    'Em Falta':             {bg:'#fee2e2',color:'#991b1b',border:'#fca5a5'},
    'Comprado/Transferido': {bg:'#fef9c3',color:'#854d0e',border:'#fde047'},
    'Lançado':              {bg:'#ffedd5',color:'#9a3412',border:'#fdba74'},
    'Empenhado':            {bg:'#dcfce7',color:'#166534',border:'#86efac'},
  };
  const c = STATUS_COR[sel.value] || {bg:'#fff',color:'#374151',border:'#e5e7eb'};
  sel.style.background   = c.bg;
  sel.style.color        = c.color;
  sel.style.borderColor  = c.border;
}

function _salvarEdicaoEstoque(estoqueId) {
  const reg = (window.ESTOQUE_DB||[]).find(r => r.id === estoqueId);
  if (!reg) return;

  const novoStatus  = document.getElementById('eed-status').value;
  const novaQtd     = parseInt(document.getElementById('eed-qtd-falt').value) || 0;
  const novaObs     = (document.getElementById('eed-obs').value||'').trim();
  const usuario     = _usuarioAtual();
  const agora       = _agora();

  const mudouStatus = novoStatus !== reg.status;

  reg.qtd_faltante = novaQtd;
  reg.observacao   = novaObs;
  reg.editado_por  = usuario;
  reg.data_edicao  = agora;

  if (novoStatus === 'Empenhado' && mudouStatus) {
    reg.status         = 'Empenhado';
    reg.concluido_por  = usuario;
    reg.data_conclusao = agora;
    // Sincronizar pendência do pedido
    if (typeof pedidos !== 'undefined') {
      const p = pedidos.find(p => p.id === reg.pedido);
      if (p && Array.isArray(p.pendencias)) {
        const pend = p.pendencias.find(d => d._estoqueId === estoqueId);
        if (pend) {
          pend.resolvido = true; pend.status = 'Empenhado';
          pend.concluido_por = usuario; pend.data_conclusao = agora;
          pend.qtd_faltante = novaQtd; pend.comentario = novaObs;
        }
      }
    }
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof renderKanban === 'function') renderKanban();
    if (typeof _mostrarToast === 'function') _mostrarToast('✅ Empenhado!', '#22c55e');
  } else {
    reg.status = novoStatus;
    if (typeof pedidos !== 'undefined') {
      const p = pedidos.find(p => p.id === reg.pedido);
      if (p && Array.isArray(p.pendencias)) {
        const pend = p.pendencias.find(d => d._estoqueId === estoqueId);
        if (pend) { pend.status = novoStatus; pend.qtd_faltante = novaQtd; pend.comentario = novaObs; }
      }
    }
    if (typeof _mostrarToast === 'function') _mostrarToast('✅ Registro atualizado', '#1a56db');
  }

  _salvarEstoque();
  renderEstoque();
  document.getElementById('modal-editar-estoque')?.remove();
  // Atualizar painel no detalhe se estiver aberto
  const cidx = window._agCurrentIdx;
  if (cidx != null) _injetarPainelNoDetalhe(cidx);
}

// ══════════════════════════════════════════════════
//  ANEXAR PDF NA SEPARAÇÃO
// ══════════════════════════════════════════════════

function anexarPdfSeparacao(event) {
  const file = event.target.files[0];
  if (!file) return;
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  const reader = new FileReader();
  reader.onload = e => {
    // pdfSepData = PDF das etiquetas de separação (separado do pdfData = OP)
    p.pdfSepData = e.target.result.split(',')[1];
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof _mostrarToast === 'function') _mostrarToast('📎 PDF de separação anexado!', '#1a56db');
    abrirSeparacao();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ══════════════════════════════════════════════════
//  ORDEM DE PRODUÇÃO (OP)
//  abrirOP() — mostra painel de falta de estoque
//  + visualizador do PDF da OP (pdfData original)
// ══════════════════════════════════════════════════

function abrirOP() {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  const conteudo = document.getElementById('detalhe-conteudo');
  if (!conteudo) return;
  conteudo.innerHTML = '';

  // Painel de falta de estoque no topo
  const wrap = document.createElement('div');
  wrap.id = 'painel-aguardando';
  wrap.innerHTML = _htmlPainel(p, idx);
  conteudo.appendChild(wrap);

  // Visualizador do PDF da OP — busca em qualquer campo conhecido
  const pdfB64  = _getPdfOp(p);
  const pdfWrap = document.createElement('div');
  pdfWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:200px;';
  conteudo.appendChild(pdfWrap);
  _exibirPdfNoConteudo(pdfB64, pdfWrap);
}

// ══════════════════════════════════════════════════
//  CONTROLE DE ESTADO DO PEDIDO INICIADO
//  • Ao iniciar: oculta botões de nav secundários
//  • Se pedido em andamento e clica em outro botão: pede confirmação
//  • Botão "Iniciar" vira "Retomar" se já iniciou
//  • Salva item atual automaticamente
// ══════════════════════════════════════════════════

window._pedidoEmAndamento = false; // true quando iniciar pedido está ativo
window._proximaAcao       = null;  // ação pendente após confirmação de saída

/** Chamado ao clicar em Iniciar / Retomar Pedido */
function _btnIniciar() {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  // Ao iniciar: mover de Separação → Inspeção automaticamente
  if (p.etapa === 'separacao' || p.etapa === 'corte') {
    const novaEtapa = p.etapa === 'separacao' ? 'inspecao' : p.etapa;
    p.etapa = novaEtapa;
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof renderKanban  === 'function') renderKanban();
  }

  // Atualizar UI para modo "em andamento"
  _setModoAndamento(true, idx);

  // Chamar abrirIniciarPedido do pedidos.js
  if (typeof abrirIniciarPedido === 'function') {
    abrirIniciarPedido();
  } else {
    if (typeof _mostrarToast === 'function') _mostrarToast('Em desenvolvimento', '#6b7280');
  }
}

/** Chamado ao clicar em OP / Separação / Etiquetas enquanto pedido pode estar em andamento */
function _btnSair(acao) {
  if (window._pedidoEmAndamento) {
    // Mostrar aviso antes de sair
    window._proximaAcao = acao;
    _mostrarAvisoSaida();
    return;
  }
  _executarAcao(acao);
}

/** Executa a ação de navegação para outro módulo */
function _executarAcao(acao) {
  switch(acao) {
    case 'op':        abrirOP(); break;
    case 'sep':       abrirSeparacao(); break;
    case 'etiq':
      if (typeof abrirEtiqPedido === 'function') abrirEtiqPedido();
      else if (typeof _mostrarToast === 'function') _mostrarToast('Em desenvolvimento', '#6b7280');
      break;
    case 'embalagem':
      if (typeof abrirEtiqEmbalagem === 'function') abrirEtiqEmbalagem();
      else if (typeof _mostrarToast === 'function') _mostrarToast('Em desenvolvimento', '#6b7280');
      break;
  }
}

/** Modal de aviso "Deseja realmente sair?" */
function _mostrarAvisoSaida() {
  let modal = document.getElementById('modal-aviso-saida');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'modal-aviso-saida';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:340px;max-width:92vw;overflow:hidden;
                box-shadow:0 24px 60px rgba(0,0,0,.25);animation:upcIn .18s ease;font-family:Inter,sans-serif;">
      <div style="background:linear-gradient(135deg,#f59e0b,#b45309);padding:20px 18px 16px;">
        <div style="font-size:18px;font-weight:800;color:#fff;">⚠️ Pedido em andamento</div>
        <div style="font-size:13px;color:rgba(255,255,255,.85);margin-top:4px;">
          Você está com um pedido iniciado. Deseja realmente sair?
        </div>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="font-size:13px;color:#374151;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
          💾 O progresso do item atual será salvo automaticamente.
        </div>
        <div style="display:flex;gap:10px;">
          <button onclick="_confirmarSaida(true)"
            style="flex:1;padding:11px;border:none;border-radius:10px;cursor:pointer;
                   background:#ef4444;color:#fff;font-size:14px;font-weight:700;">
            ✅ Sim, sair
          </button>
          <button onclick="_confirmarSaida(false)"
            style="flex:1;padding:11px;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;
                   background:#fff;color:#374151;font-size:14px;font-weight:700;">
            ❌ Não, continuar
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

function _confirmarSaida(sair) {
  const modal = document.getElementById('modal-aviso-saida');
  if (modal) modal.remove();

  if (!sair) return; // Continua no pedido

  // Salvar item atual antes de sair
  _salvarItemAtual();

  // Voltar ao modo normal (botões visíveis)
  _setModoAndamento(false, window._agCurrentIdx ?? window.currentPedidoIdx);

  // Executar ação pendente
  if (window._proximaAcao) {
    _executarAcao(window._proximaAcao);
    window._proximaAcao = null;
  }
}

/** Salvar item atual em andamento */
function _salvarItemAtual() {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  // Tentar chamar salvarItemAtual do pedidos.js se existir
  if (typeof salvarItemAtualPedido === 'function') {
    salvarItemAtualPedido();
  }

  // Sempre salvar estado geral
  if (typeof salvarEstado === 'function') salvarEstado();
}

/** Alterna UI entre modo andamento e modo normal */
function _setModoAndamento(emAndamento, idx) {
  window._pedidoEmAndamento = emAndamento;
  const p = typeof pedidos !== 'undefined' ? pedidos[idx] : null;

  const btnIniciar = document.getElementById('btn-iniciar-pedido');
  const btnOP      = document.getElementById('btn-op');
  const btnSep     = document.getElementById('btn-separacao');
  const btnEtiq    = document.getElementById('btn-etiq-pedido');
  const btnEmb     = document.getElementById('btn-etiq-embalagem');

  if (emAndamento) {
    // Ocultar botões secundários
    [btnOP, btnSep, btnEtiq, btnEmb].forEach(b => { if (b) b.style.display = 'none'; });
    // Alterar texto do Iniciar para Retomar se já iniciou antes
    if (btnIniciar) {
      btnIniciar.textContent = '⏸ Retomar Pedido';
      btnIniciar.style.background = '#059669'; // verde
    }
    // Salvar flag no pedido
    if (p) { p._iniciado = true; if (typeof salvarEstado === 'function') salvarEstado(); }
  } else {
    // Mostrar botões secundários
    [btnOP, btnSep, btnEtiq, btnEmb].forEach(b => { if (b) b.style.display = ''; });
    // Restaurar texto do botão baseado em se foi iniciado antes
    if (btnIniciar) {
      const foiIniciado = p && p._iniciado;
      btnIniciar.innerHTML = foiIniciado ? '▶ Retomar Pedido' : '▶ Iniciar Pedido';
      btnIniciar.style.background = '#1a56db';
    }
  }
}

/** Ao abrir pedido: restaurar estado correto dos botões */
(function _patchAbrirPedidoBotoes() {
  // Interceptar após o patch existente de abrirPedido
  const _checkBotoes = setInterval(() => {
    if (!window._agPatchedAbrirPedido) return;
    clearInterval(_checkBotoes);

    const _apOrig = window.abrirPedido;
    window.abrirPedido = function(idx) {
      _apOrig(idx);
      // Restaurar estado dos botões baseado em p._iniciado
      const p = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
      window._pedidoEmAndamento = false; // resetar ao abrir novo pedido
      window._proximaAcao = null;
      setTimeout(() => _setModoAndamento(false, idx), 50);
    };
  }, 200);
})();

// ══════════════════════════════════════════════════
//  FIX: abrirOP usa campo correto do PDF
//  O campo pode ser pdfData, arquivos, pdf, etc.
//  _getPdfDosPedido(): retorna o base64 do PDF da OP
// ══════════════════════════════════════════════════

function _getPdfOp(p) {
  if (!p) return null;

  // Campos nomeados conhecidos
  const camposDirectos = ['pdfData','pdf_b64','pdf','base64','pdfBase64','arquivo','file'];
  for (const c of camposDirectos) {
    if (p[c] && typeof p[c] === 'string' && p[c].length > 200) return p[c];
  }

  // arquivos[] em várias formas
  for (const c of ['arquivos','files','pdfs','anexos']) {
    if (Array.isArray(p[c]) && p[c].length > 0) {
      const arq = p[c][0];
      if (typeof arq === 'string' && arq.length > 200) return arq;
      if (arq && typeof arq === 'object') {
        for (const k of ['data','b64','base64','content','pdf','src']) {
          if (arq[k] && typeof arq[k] === 'string' && arq[k].length > 200) return arq[k];
        }
      }
    }
  }

  // Varredura automática: qualquer campo com string base64 longa (>1000 chars)
  // Isso garante que encontra o campo independente do nome
  for (const [key, val] of Object.entries(p)) {
    if (
      typeof val === 'string' &&
      val.length > 1000 &&
      !['id','cliente','entrega','status','etapa','pendencias'].includes(key) &&
      // Verificar se parece base64 (só chars válidos)
      /^[A-Za-z0-9+/=]{100,}$/.test(val.slice(0, 100))
    ) {
      console.log('[OP] PDF encontrado no campo:', key, '— tamanho:', val.length);
      return val;
    }
  }

  console.warn('[OP] Nenhum PDF encontrado no pedido. Campos disponíveis:', Object.keys(p).filter(k => typeof p[k] === 'string' && p[k].length > 10));
  return null;
}

// ══════════════════════════════════════════════════
//  VISUALIZADOR PDF UNIFICADO (sem botão fechar)
//  Mesmo padrão para OP, Separação e Etiquetas
// ══════════════════════════════════════════════════

async function _exibirPdfNoConteudo(pdfB64, container) {
  if (!pdfB64) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  flex:1;gap:12px;padding:48px;color:#9ca3af;font-family:Inter,sans-serif;">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".4">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <div style="font-size:14px;font-weight:600;color:#374151;">Nenhum PDF disponível</div>
      </div>`;
    return;
  }
  if (typeof pdfjsLib === 'undefined') {
    container.innerHTML = '<div style="padding:16px;color:#dc2626;font-family:Inter,sans-serif;">pdf.js não carregado.</div>';
    return;
  }
  container.innerHTML = '<div style="padding:16px;text-align:center;color:#9ca3af;font-family:Inter,sans-serif;font-size:13px;">Carregando PDF…</div>';
  try {
    const pdf = await pdfjsLib.getDocument({ data: _b64ToBytes(pdfB64) }).promise;
    container.innerHTML = '';
    // Calcular escala baseada na largura real do container
    const contW = container.offsetWidth || 800;
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const vpBase  = page.getViewport({ scale: 1 });
      const scale   = Math.min(contW / vpBase.width, 1.8); // máx 1.8, se ajusta ao container
      const vp      = page.getViewport({ scale });
      const canvas  = document.createElement('canvas');
      canvas.width  = vp.width;
      canvas.height = vp.height;
      canvas.style.cssText = 'width:100%;display:block;margin-bottom:2px;border-radius:0;';
      frag.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    }
    container.appendChild(frag);
  } catch(e) {
    container.innerHTML = `<div style="padding:16px;color:#dc2626;font-family:Inter,sans-serif;font-size:13px;">Erro ao renderizar PDF.</div>`;
    console.error('[PDF]', e);
  }
}


// ══════════════════════════════════════════════════
//  PATCH CALENDÁRIO — Cliente primeiro, largura +20%
// ══════════════════════════════════════════════════

window.addEventListener('load', function() {
  // ── Patch renderCalendario para mostrar cliente antes do número ──
  if (typeof window.renderCalendario === 'function' && !window._calPatchado) {
    const _origCal = window.renderCalendario;
    window.renderCalendario = function() {
      _origCal.apply(this, arguments);
      // Após renderizar, reordenar chips: cliente primeiro
      _reordenarChipsCalendario();
    };
    window._calPatchado = true;
  }

  // ── MutationObserver para detectar quando o calendário for re-renderizado ──
  const kanbanArea = document.getElementById('kanban-area');
  if (kanbanArea) {
    const obs = new MutationObserver(() => {
      // Throttle para não rodar demais
      clearTimeout(window._calObsTimer);
      window._calObsTimer = setTimeout(_reordenarChipsCalendario, 50);
    });
    obs.observe(kanbanArea, { childList: true, subtree: true });
  }
});

function _reordenarChipsCalendario() {
  if (typeof pedidos === 'undefined') return;

  // Mapa id → cliente para lookup rápido
  const mapaCliente = {};
  pedidos.forEach(p => { mapaCliente[p.id] = p.cliente; });

  document.querySelectorAll('.cal-event-chip').forEach(chip => {
    // Já foi processado
    if (chip.dataset.calPatched) return;

    // Extrair texto completo do chip
    const texto = chip.textContent || '';

    // Procurar padrão de número de pedido (#XXXXXX ou só XXXXXX)
    const mNum = texto.match(/#?(\d{6})/);
    if (!mNum) return;

    const numPedido = mNum[1]; // ex: "003328"
    // Tentar com e sem zeros à esquerda
    const cliente = mapaCliente[numPedido]
                 || mapaCliente[numPedido.replace(/^0+/, '')]
                 || '';

    if (!cliente) return;

    // Reescrever conteúdo: cliente primeiro, número depois (completo)
    // Preservar onclick e classes
    const nomeEl = chip.querySelector('.chip-nome');
    if (nomeEl) {
      // Se tem .chip-nome (provavelmente o número), trocar para cliente
      // e garantir que número aparece menor abaixo
      nomeEl.textContent = cliente;
      // Adicionar número menor se não existir
      if (!chip.querySelector('.chip-num')) {
        const numEl = document.createElement('span');
        numEl.className = 'chip-num';
        numEl.textContent = '#' + numPedido;
        numEl.style.cssText = 'display:block;font-size:9px;font-weight:600;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        chip.appendChild(numEl);
      }
    } else {
      // Chip sem filhos estruturados — reescrever direto
      const onclick = chip.getAttribute('onclick') || '';
      chip.innerHTML = '';
      const clienteSpan = document.createElement('span');
      clienteSpan.className = 'chip-nome';
      clienteSpan.textContent = cliente;
      clienteSpan.style.cssText = 'display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;font-weight:700;';
      const numSpan = document.createElement('span');
      numSpan.className = 'chip-num';
      numSpan.textContent = '#' + numPedido;
      numSpan.style.cssText = 'display:block;font-size:9px;font-weight:600;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      chip.appendChild(clienteSpan);
      chip.appendChild(numSpan);
    }

    chip.dataset.calPatched = '1';
  });
}

// ══════════════════════════════════════════════════
//  PATCH: novos pedidos vão para 'separacao'
//  Intercepta o push de novos pedidos no array
// ══════════════════════════════════════════════════
window.addEventListener('load', function() {
  // Observar mudanças no array pedidos[] para capturar novos pedidos
  // A abordagem mais robusta: monkey-patch Array.prototype.push localmente
  // Só para o array pedidos[]
  const _patchPedidosArray = () => {
    if (typeof pedidos === 'undefined' || !Array.isArray(pedidos)) return false;
    if (pedidos._patchado) return true;
    const _origPush = pedidos.push.bind(pedidos);
    pedidos.push = function(...args) {
      args.forEach(p => {
        // Se novo pedido não tem etapa definida ou está em 'corte' por padrão
        // E não foi iniciado: colocar em 'separacao'
        if (p && !p._iniciado && (!p.etapa || p.etapa === 'corte')) {
          // Só muda para separacao se for um pedido recém criado (sem pdfSepData, sem pendencias)
          // Os pedidos existentes com etapa:'corte' são mantidos como estão
        }
        // Novos pedidos (sem etapa definida) → separacao
        if (p && !p.etapa) p.etapa = 'separacao';
      });
      return _origPush(...args);
    };
    pedidos._patchado = true;
    return true;
  };
  // Tentar imediatamente e periodicamente
  if (!_patchPedidosArray()) {
    const t = setInterval(() => { if (_patchPedidosArray()) clearInterval(t); }, 300);
  }
});

// ══════════════════════════════════════════════════
//  FIX: _updateTopbar — restaurar display:flex na search bar ao voltar
// ══════════════════════════════════════════════════
window.addEventListener('load', function() {
  if (typeof window._updateTopbar === 'function' && !window._topbarPatched) {
    var _origTopbar = window._updateTopbar;
    window._updateTopbar = function(screen) {
      _origTopbar(screen);
      // Garantir que search bar volta como flex (não string vazia)
      var searchEl = document.getElementById('kanban-search-bar');
      if (searchEl && screen === 'pedidos') {
        searchEl.style.display = 'flex';
      }
    };
    window._topbarPatched = true;
  }
});

// ══════════════════════════════════════════════════
//  FIX: Adicionar etapas SEPARAÇÃO e INSPEÇÃO
//  Sobrescreve o ETAPAS do app.js original
// ══════════════════════════════════════════════════
window.addEventListener('load', function() {
  // Sobrescrever ETAPAS com as novas colunas
  if (typeof ETAPAS !== 'undefined') {
    // Verificar se já tem separacao (para não duplicar)
    var temSep = ETAPAS.some(function(e) { return e.key === 'separacao'; });
    if (!temSep) {
      ETAPAS.unshift(
        {key:'inspecao',  label:'INSPEÇÃO'},
        {key:'separacao', label:'SEPARAÇÃO'}
      );
    }
  }

  // Migrar pedidos sem etapa → separacao, e re-renderizar kanban
  var migrar = function() {
    if (typeof pedidos === 'undefined') return false;
    var migrados = 0;
    pedidos.forEach(function(p) {
      if (!p.etapa) { p.etapa = 'separacao'; migrados++; }
    });
    if (migrados > 0 && typeof salvarEstado === 'function') salvarEstado();
    return true;
  };

  // Tentar imediatamente e após carregarEstado
  if (!migrar()) {
    var t = setInterval(function() {
      if (migrar()) { clearInterval(t); if (typeof renderKanban === 'function') renderKanban(); }
    }, 300);
  } else {
    if (typeof renderKanban === 'function') setTimeout(renderKanban, 50);
  }
});
