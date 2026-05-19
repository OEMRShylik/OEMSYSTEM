// ══════════════════════════════════════════════════
//  AGUARDANDO.JS  ·  OEM RS
//  • Card amarelo no kanban
//  • Painel Falta de Estoque na aba Separação
//  • Sincroniza com db/estoque.json via Flask
//  • Empenhado → remove pendência do card
// ══════════════════════════════════════════════════

// ── Estado global de estoque ──
window.ESTOQUE_DB = [];

// ── Carregar estoque.json ao iniciar ──
(async function _carregarEstoque() {
  const LS_KEY = 'oem_estoque_db_v2';

  try {
    const local = localStorage.getItem(LS_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      window.ESTOQUE_DB = Array.isArray(parsed) ? parsed : [];
    }
  } catch(_) {}

  try {
    const r = await fetch('db/estoque.json', { cache: 'no-store' });
    if (r.ok) {
      const d = await r.json();
      const serverRegs = Array.isArray(d.registros) ? d.registros : [];
      if (serverRegs.length > (window.ESTOQUE_DB||[]).length) {
        window.ESTOQUE_DB = serverRegs;
        try { localStorage.setItem(LS_KEY, JSON.stringify(window.ESTOQUE_DB)); } catch(_) {}
      }
    }
  } catch(_) {}

  if (!Array.isArray(window.ESTOQUE_DB)) window.ESTOQUE_DB = [];

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

async function _salvarEstoque() {
  try { localStorage.setItem('oem_estoque_db_v2', JSON.stringify(window.ESTOQUE_DB)); } catch(_) {}
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

function _sincronizarPendencias() {
  if (typeof pedidos === 'undefined') return;
  pedidos.forEach(p => {
    const regs = window.ESTOQUE_DB.filter(r => r.pedido === p.id);
    if (!regs.length) return;
    if (!Array.isArray(p.pendencias)) p.pendencias = [];
    regs.forEach(r => {
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

  if (typeof window.renderCard === 'function' && !window._agPatchedCard) {
    const _orig = window.renderCard;
    window.renderCard = function(p, etapaIdx) {
      let html;
      try { html = _orig(p, etapaIdx); } catch(e) { return ''; }
      if (!html || !_isAguardando(p)) return html || '';
      try {
        html = html.replace(/class="pedido-card([^"]*)"/, (_, r) =>
          `class="pedido-card${r} card-aguardando"`);
        // Insere badge no rodapé do card (antes do último </div>)
        const lastDiv = html.lastIndexOf('</div>');
        if (lastDiv !== -1) {
          html = html.substring(0, lastDiv) +
            `<div class="status-aguardando" style="margin-top:5px;text-align:center;border-radius:6px;padding:2px 6px;font-size:10px;font-weight:700;letter-spacing:.3px;">AGUARDANDO</div>` +
            html.substring(lastDiv);
        }
      } catch(e) {}
      return html;
    };
    window._agPatchedCard = true;
  }

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
        b.textContent = `${n}`;
        hdr.appendChild(b);
      });
    };
    window._agPatchedKanban = true;
  }

  if (typeof window.abrirPedido === 'function' && !window._agPatchedAbrirPedido) {
    const _origAP = window.abrirPedido;
    window.abrirPedido = function(idx) {
      _origAP(idx);
      window._agCurrentIdx = idx;
      const p = pedidos[idx];
      if (!p) return;

      const b = document.getElementById('detalhe-status-badge');
      if (b && _isAguardando(p)) {
        b.textContent = 'Aguardando';
        b.style.cssText += ';background:#fef9c3;color:#854d0e;border:1px solid #fde047;';
      }

      setTimeout(() => {
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

  document.querySelectorAll('[data-pdf-close],[id*="fechar-pdf"],[id*="btn-fechar"],[data-action="close-pdf"]')
    .forEach(el => el.remove());

  if (p.pdfSepData) {
    if (typeof abrirPdfViewer === 'function') {
      abrirPdfViewer('Separação — #' + p.id + '.pdf', p.pdfSepData);
    }
    return;
  }

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
        Anexar PDF de Separação
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
  const bloqueado   = p.etapa === 'finalizado' || p.etapa === 'corte' || p.etapa === 'prensagem';

  const bg     = aguardando ? '#fef9c3' : '#f0fdf4';
  const border = aguardando ? '#fde047' : '#bbf7d0';
  const hdrBg  = aguardando ? '#fef08a' : '#dcfce7';
  const cor    = aguardando ? '#854d0e' : '#166534';

  return `
  <div style="margin:12px 14px 0;border-radius:12px;border:1.5px solid ${border};background:${bg};overflow:hidden;font-family:Inter,sans-serif;">
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${hdrBg};border-bottom:1px solid ${border};">
      <span style="font-size:18px;">${aguardando?'':'✓'}</span>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:800;color:${cor};letter-spacing:.4px;text-transform:uppercase;">FALTA DE ESTOQUE</div>
        <div style="font-size:11px;color:${cor};opacity:.75;">${aguardando?'Aguardando componente(s)':'Sem pendências abertas'}</div>
      </div>
      ${(bloqueado || window._soLeitura) ? '' : `<button onclick="abrirModalAguardando(${idx})"
        style="padding:6px 13px;border:none;border-radius:8px;cursor:pointer;background:${aguardando?'#eab308':'#22c55e'};color:#fff;font-size:12px;font-weight:700;font-family:Inter,sans-serif;">
        + Registrar
      </button>`}
    </div>

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
              ${(()=>{const emp=parseFloat(d.qtd_empenhada)||0;const falt=parseFloat(d.qtd_faltante)||0;return emp>0?`<span style="font-size:11px;font-weight:700;color:#166534;background:#dcfce7;padding:2px 8px;border-radius:6px;">Empenhado: <strong>${emp}</strong></span>`:'';})()}
              <span style="font-size:11px;font-weight:700;color:#dc2626;background:#fee2e2;padding:2px 8px;border-radius:6px;">Faltam: <strong>${Math.max(0,(parseFloat(d.qtd_faltante)||0)-(parseFloat(d.qtd_empenhada)||0))}</strong></span>
            </div>
          </div>
          ${d.comentario ? `<div style="font-size:12px;color:#374151;padding:5px 8px;background:#fffbeb;border-radius:6px;border-left:3px solid #fbbf24;">${d.comentario}</div>` : ''}
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <div style="font-size:10px;color:#9ca3af;flex:1;">
              ${d.registrado_por?`Registrado por: ${d.registrado_por}${d.data?' · '+d.data:''}`:''}
              ${d.editado_por?`<br>Editado por: ${d.editado_por}${d.data_edicao?' · '+d.data_edicao:''}`:''}
            </div>
            <span style="padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700;background:${statusCor[statusAtual]||'#e5e7eb'}22;color:${statusCor[statusAtual]||'#374151'};border:1.5px solid ${statusCor[statusAtual]||'#e5e7eb'}44;">
              ${statusAtual}
            </span>
            ${(bloqueado || window._soLeitura) ? '' : `<button onclick="abrirModalEditarEstoque('${estoqueId||''}')"
              style="padding:4px 10px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:11px;font-weight:700;font-family:Inter,sans-serif;background:#fff;color:#374151;cursor:pointer;white-space:nowrap;">
              Editar
            </button>`}
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div style="padding:14px;font-size:12px;color:#6b7280;font-family:Inter,sans-serif;text-align:center;">Nenhuma pendência em aberto</div>`}

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
            <span style="font-size:10px;font-weight:700;color:#166534;margin-left:auto;">✓ Empenhado</span>
          </div>
          ${d.comentario?`<div style="font-size:11px;color:#9ca3af;">${d.comentario}</div>`:''}
        </div>`).join('')}
      </div>
    </div>` : ''}
  </div>

  <div id="modal-aguardando" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(3px);"
    onclick="if(event.target===this)fecharModalAguardando()">
    <div style="background:#fff;border-radius:16px;width:360px;max-width:94vw;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.22);animation:upcIn .18s ease;">
      <div style="background:linear-gradient(135deg,#f59e0b,#b45309);padding:20px 18px 14px;position:relative;">
        <button onclick="fecharModalAguardando()" style="position:absolute;top:10px;right:12px;background:rgba(255,255,255,.15);border:none;color:#fff;width:27px;height:27px;border-radius:50%;font-size:15px;cursor:pointer;line-height:1;">×</button>
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.75);letter-spacing:1px;text-transform:uppercase;">Falta de Estoque</div>
        <div style="font-size:18px;font-weight:800;color:#fff;margin-top:2px;">Registrar Pendência</div>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:11px;">
        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Item / Componente</label>
          <select id="ag-item-listbox"
            style="width:100%;box-sizing:border-box;margin-top:4px;border:1.5px solid #e5e7eb;border-radius:8px;
                   font-family:'JetBrains Mono','Courier New',monospace;font-size:12px;font-weight:700;
                   outline:none;background:#fafafa;padding:9px 10px;color:#111;cursor:pointer;"
            onchange="_agListboxChange(this)"
            onfocus="this.style.borderColor='#93c5fd'"
            onblur="this.style.borderColor='#e5e7eb'">
          </select>
          <input type="hidden" id="ag-item" value="">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Qtd. Solicitada</label>
            <input id="ag-qtd-sol" type="number" min="0.01" step="0.01" placeholder=""
              style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:14px;font-weight:700;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;font-family:Inter,sans-serif;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Qtd. Faltante</label>
            <input id="ag-qtd-falt" type="number" min="0.01" step="0.01" placeholder=""
              style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:14px;font-weight:700;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;font-family:Inter,sans-serif;">
          </div>
        </div>
        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Observação</label>
          <textarea id="ag-comentario" rows="2" placeholder=""
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:13px;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;resize:none;font-family:Inter,sans-serif;"></textarea>
        </div>
        <div id="ag-erro" style="display:none;font-size:12px;color:#dc2626;font-family:Inter,sans-serif;padding:6px 10px;background:#fee2e2;border-radius:6px;"></div>
        <button onclick="salvarPendenciaAguardando()"
          style="width:100%;padding:12px;border:none;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#f59e0b,#b45309);color:#fff;font-size:14px;font-weight:700;font-family:Inter,sans-serif;">
          Registrar Pendência
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
  const hiddenItem = document.getElementById('ag-item');
  if (hiddenItem) hiddenItem.value = '';

  // Popular listbox com componentes do pedido
  const lb = document.getElementById('ag-item-listbox');
  if (lb) {
    lb.innerHTML = '<option value="" disabled selected style="color:#9ca3af;">— selecione um componente —</option>';
    const catalogo = _catalogoPedido(idx);
    catalogo.forEach(it => {
      const opt = document.createElement('option');
      opt.value = it.cod;
      opt.dataset.qtd = it.quantidade != null ? it.quantidade : '';
      const qtdStr = it.quantidade ? ' (' + Math.round(it.quantidade) + ')' : '';
      const descStr = it.desc ? ' — ' + it.desc.substring(0, 35) : '';
      opt.textContent = it.cod + descStr + qtdStr;
      lb.appendChild(opt);
    });
    lb.selectedIndex = 0;
  }

  const err = document.getElementById('ag-erro'); if (err) err.style.display = 'none';
  const modal = document.getElementById('modal-aguardando');
  if (modal) modal.style.display = 'flex';
}

function _agListboxChange(sel) {
  const opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  document.getElementById('ag-item').value = opt.value;
  const el = document.getElementById('ag-qtd-sol');
  if (el) {
    const qtd = parseFloat(opt.dataset.qtd);
    el.value = (isNaN(qtd) || qtd <= 0) ? '' : Math.round(qtd);
  }
}
function fecharModalAguardando() {
  const m = document.getElementById('modal-aguardando'); if (m) m.style.display = 'none';
}

function salvarPendenciaAguardando() {
  const p = pedidos[_aguardIdx]; if (!p) return;

  const selEl   = document.getElementById('ag-item');
  const item    = (selEl?.value||'').trim().toUpperCase();
  const qtdSol  = parseFloat(document.getElementById('ag-qtd-sol').value)  || 0;
  const qtdFalt = parseFloat(document.getElementById('ag-qtd-falt').value) || 0;
  const coment  = (document.getElementById('ag-comentario').value||'').trim();

  const err  = document.getElementById('ag-erro');
  const erro = msg => { err.textContent = msg; err.style.display = 'block'; };
  if (!item)      return erro('Informe o código do item.');
  if (qtdSol <= 0) return erro('Informe a quantidade solicitada.');
  if (qtdFalt <= 0) return erro('Informe a quantidade faltante.');

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
  if (typeof _mostrarToast === 'function') _mostrarToast('Pendência registrada', '#f59e0b');
}

// ══════════════════════════════════════════════════
//  6. ALTERAR STATUS
// ══════════════════════════════════════════════════

function alterarStatusEstoque(estoqueId, pedidoIdx, pendIdx, novoStatus) {
  const p    = pedidos[pedidoIdx];
  const pend = p?.pendencias?.[pendIdx];
  const reg  = window.ESTOQUE_DB.find(r => r.id === estoqueId);

  const usuario = _usuarioAtual();
  const agora   = _agora();

  if (novoStatus === 'Empenhado') {
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
    if (typeof _mostrarToast=== 'function') _mostrarToast('Empenhado! Card normalizado.', '#22c55e');
  } else {
    if (pend)  { pend.status = novoStatus; pend.editado_por = usuario; pend.data_edicao = agora; }
    if (reg)   { reg.status  = novoStatus; reg.editado_por  = usuario; reg.data_edicao  = agora; }
  }

  _salvarEstoque();
  if (typeof renderEstoque === 'function') renderEstoque();
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
//  8. TELA FALTA DE ESTOQUE
// ══════════════════════════════════════════════════

// Estado do filtro de status na tela de estoque (null = todos os ativos, string = status específico)
window._estoqueStatusFiltro = window._estoqueStatusFiltro ?? null;

function renderEstoque(filtro) {
  const root = document.getElementById('estoque-root');
  if (!root) return;

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

  // Filtro por status: null = todos ativos (exceto Empenhado), string = status específico
  const statusFiltro = window._estoqueStatusFiltro;
  let regs = (window.ESTOQUE_DB || []).filter(r =>
    statusFiltro ? r.status === statusFiltro : r.status !== 'Empenhado'
  );
  if (q) regs = regs.filter(r =>
    r.pedido.toLowerCase().includes(q) ||
    r.cliente.toLowerCase().includes(q) ||
    r.item.toLowerCase().includes(q) ||
    (r.observacao||'').toLowerCase().includes(q)
  );

  regs = [...regs].sort((a,b) => {
    const dtA = (a.entrega||'').split('/').reverse().join('-') || '9999';
    const dtB = (b.entrega||'').split('/').reverse().join('-') || '9999';
    if (dtA !== dtB) return dtA.localeCompare(dtB);
    if (a.pedido !== b.pedido) return a.pedido.localeCompare(b.pedido);
    const empA = a.status === 'Empenhado' ? 1 : 0;
    const empB = b.status === 'Empenhado' ? 1 : 0;
    return empA - empB;
  });

  // Contagens por status para os badges dos botões de filtro
  const todos = window.ESTOQUE_DB || [];
  const _cnt = s => todos.filter(r => r.status === s).length;
  const cntAtivos   = todos.filter(r => r.status !== 'Empenhado').length;
  const cntFalta    = _cnt('Em Falta');
  const cntComprado = _cnt('Comprado/Transferido');
  const cntLancado  = _cnt('Lançado');
  const cntEmp      = _cnt('Empenhado');

  const _btnFiltro = (label, valor, cnt, cor) => {
    const ativo = statusFiltro === valor || (valor === null && statusFiltro === null);
    return `<button onclick="window._estoqueStatusFiltro=${valor===null?'null':`'${valor}'`};renderEstoque()"
      style="padding:6px 13px;border-radius:20px;font-size:11px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;white-space:nowrap;
             border:1.5px solid ${ativo?cor:'#e5e7eb'};
             background:${ativo?cor+'22':'#fff'};
             color:${ativo?cor:'#6b7280'};">
      ${label} ${cnt>0?`<span style="background:${ativo?cor:'#e5e7eb'};color:${ativo?'#fff':'#374151'};border-radius:10px;padding:0 6px;font-size:10px;">${cnt}</span>`:''}
    </button>`;
  };

  const _podeRegistrar = (() => {
    const s = typeof currentUser !== 'undefined' ? currentUser?.setor : null;
    return s === 'Admin' || s === 'Produção' || s === 'Comercial';
  })();

  root.innerHTML = `
  <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px;max-width:1400px;margin:0 auto;">

    <!-- Barra de filtros por status -->
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      ${_btnFiltro('Todos os ativos', null,          cntAtivos,   '#374151')}
      ${_btnFiltro('Em Falta',        'Em Falta',    cntFalta,    '#dc2626')}
      ${_btnFiltro('Comprado',        'Comprado/Transferido', cntComprado, '#ca8a04')}
      ${_btnFiltro('Lançado',         'Lançado',     cntLancado,  '#ea580c')}
      ${_btnFiltro('Completo',         'Empenhado',   cntEmp,      '#16a34a')}
      ${_podeRegistrar ? `<button onclick="_abrirModalRegistrarEstoque()"
        style="margin-left:auto;padding:6px 16px;background:#dc2626;color:#fff;border:none;border-radius:20px;font-size:11px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;white-space:nowrap;">
        + Registrar
      </button>` : ''}
    </div>

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
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;">Histórico</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${regs.length === 0 ? `
            <tr><td colspan="8" style="padding:32px;text-align:center;color:#9ca3af;font-size:13px;">
              ${q ? 'Nenhum resultado para "'+filtro+'"' : statusFiltro ? 'Nenhum item com status "'+statusFiltro+'"' : 'Nenhuma falta de estoque registrada'}
            </td></tr>` :
            regs.map(r => {
              const c  = STATUS_COR[r.status] || STATUS_COR['Em Falta'];
              const id = r.id;
              const empenhado = r.status === 'Empenhado';
              return `
              <tr style="border-bottom:1px solid rgba(0,0,0,.05);background:${c.row};${empenhado?'opacity:.85;':''}">
                <td style="padding:9px 12px;white-space:nowrap;">
                  <a onclick="irParaPedido('${r.pedido}')"
                    style="color:#1a56db;font-weight:700;cursor:pointer;font-family:'JetBrains Mono',monospace;">#${r.pedido}</a>
                </td>
                <td style="padding:9px 12px;font-weight:700;color:#111;white-space:nowrap;">${r.cliente}</td>
                <td style="padding:9px 12px;color:#374151;white-space:nowrap;">${r.entrega||'—'}</td>
                <td style="padding:9px 12px;">
                  <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;background:rgba(0,0,0,.06);padding:2px 8px;border-radius:5px;color:#111;">${r.item}</span>
                  ${r.observacao ? `<div style="font-size:11px;color:#374151;margin-top:2px;">${r.observacao}</div>` : ''}
                </td>
                <td style="padding:9px 12px;text-align:right;font-weight:700;color:#374151;">${r.qtd_solicitada}</td>
                <td style="padding:9px 12px;text-align:right;font-weight:700;color:${empenhado?'#22c55e':'#dc2626'};">
                  ${empenhado ? '✓' : r.qtd_faltante}
                </td>
                <td style="padding:9px 12px;max-width:200px;">
                  <div style="font-size:10px;color:#6b7280;line-height:1.6;">
                    ${r.registrado_por ? `<span>Registrado por: <strong>${r.registrado_por}</strong>${r.data_registro?' · '+r.data_registro:''}</span>` : ''}
                    ${r.editado_por    ? `<br><span style="color:#1a56db;">Editado por: <strong>${r.editado_por}</strong>${r.data_edicao?' · '+r.data_edicao:''}</span>` : ''}
                  </div>
                </td>
                <td style="padding:9px 12px;text-align:center;white-space:nowrap;">
                  <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                    <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:${c.bg};color:${c.color};border:1.5px solid ${c.border};border-radius:6px;font-size:11px;font-weight:700;">
                      ${r.status}
                    </span>
                    ${(empenhado || window._soLeitura) ? '' : `<button onclick="abrirModalEditarEstoque('${id}')"
                      style="padding:4px 9px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:11px;font-weight:700;font-family:Inter,sans-serif;background:#fff;color:#374151;cursor:pointer;white-space:nowrap;">
                      Editar
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

function irParaPedido(numPedido) {
  if (typeof pedidos === 'undefined') return;
  const idx = pedidos.findIndex(p => p.id === numPedido);
  if (idx < 0) return;
  const navEl = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (navEl && typeof navTo === 'function') navTo('pedidos', navEl);
  setTimeout(() => { abrirPedido(idx); abrirSeparacao(); }, 100);
}

// ══════════════════════════════════════════════════
//  9. CSS
// ══════════════════════════════════════════════════

(function _css() {
  if (document.getElementById('aguardando-css')) return;
  const s = document.createElement('style');
  s.id = 'aguardando-css';
  s.textContent = `
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

    .status-aguardando {
      background:#fef9c3 !important; color:#854d0e !important;
      border:1px solid #fde047 !important; font-size:10px !important;
      animation: pulseAguard 2.2s ease-in-out infinite;
    }
    @keyframes pulseAguard { 0%,100%{opacity:1} 50%{opacity:.6} }

    .kanban-aguard-count {
      margin-left:7px; font-size:10px; font-weight:700;
      background:#fef9c3; color:#854d0e; border:1px solid #fde047;
      padding:1px 7px; border-radius:10px; vertical-align:middle;
    }

    #btn-falta-estoque:hover { background:#fca5a5 !important; color:#7f1d1d !important; }
    #btn-falta-estoque.tem-falta {
      animation: pulseFalta 2s ease-in-out infinite;
    }
    @keyframes pulseFalta {
      0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.4); }
      50%      { box-shadow: 0 0 0 5px rgba(239,68,68,0); }
    }

    #screen-estoque.active { display:flex !important; flex-direction:column; }
    #estoque-root { flex:1; overflow-y:auto; background:var(--bg,#f9fafb); }

    @keyframes upcIn {
      from { opacity:0; transform:translateY(14px) scale(.97); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }

    #ag-item-search { transition: border-color .15s; }
    #ag-item-search:focus { border-color: #93c5fd !important; }
    #ag-ac-drop::-webkit-scrollbar { width: 4px; }
    #ag-ac-drop::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
    .ag-ac-item:hover { background: #f8fafc; }
    #modal-aguardando > div { max-height: 92vh; overflow-y: auto; }
  `;
  document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════
//  10. Botão Falta de Estoque
// ══════════════════════════════════════════════════

function _atualizarBotaoEstoque() {
  const btn = document.getElementById('btn-falta-estoque');
  if (!btn) return;
  const n = (window.ESTOQUE_DB||[]).filter(r => r.status !== 'Empenhado').length;
  if (n > 0) btn.classList.add('tem-falta');
  else       btn.classList.remove('tem-falta');
}

setInterval(_atualizarBotaoEstoque, 2000);
window.addEventListener('load', () => setTimeout(_atualizarBotaoEstoque, 500));

// ══════════════════════════════════════════════════
//  11. NAV tela de estoque
// ══════════════════════════════════════════════════

function abrirTelaEstoque() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const sc = document.getElementById('screen-estoque');
  if (sc) sc.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (typeof currentScreen !== 'undefined') window.currentScreen = 'estoque';
  const titleEl = document.getElementById('topbar-screen-title');
  if (titleEl) { titleEl.textContent = 'Falta de Estoque'; titleEl.style.display = 'block'; }
  const btnNovo  = document.getElementById('btn-novo-pedido-top');
  const searchEl = document.getElementById('kanban-search-bar');
  if (btnNovo)  btnNovo.style.display  = 'none';
  if (searchEl) searchEl.style.display = 'none';
  window._estoqueStatusFiltro = null;
  renderEstoque('');
}

function voltarDeEstoque() {
  const navEl = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (navEl && typeof navTo === 'function') navTo('pedidos', navEl);
  else {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const sc = document.getElementById('screen-pedidos');
    if (sc) sc.classList.add('active');
    if (typeof currentScreen !== 'undefined') window.currentScreen = 'pedidos';
    const searchEl = document.getElementById('kanban-search-bar');
    if (searchEl) searchEl.style.display = 'flex';
    const btnNovo = document.getElementById('btn-novo-pedido-top');
    if (btnNovo)  btnNovo.style.display  = '';
  }
}

// ══════════════════════════════════════════════════
//  AUTOCOMPLETE DE COMPONENTES
// ══════════════════════════════════════════════════

window._AG_CATALOGO = null;

// Catálogo restrito ao pedido: extrai componentes do próprio paginasOP
function _catalogoPedido(idx) {
  const p = (typeof pedidos !== 'undefined') ? pedidos[idx] : null;
  if (!p?.paginasOP?.length) return [];

  const pgIdx = p.paginasOP.find(pg => pg.is_index);

  // Total do pedido = soma de item_qty das páginas de mangueira (corte > 0)
  const totalPedido = p.paginasOP
    .filter(pg => pg !== pgIdx && pg.corte_mm > 0)
    .reduce((acc, pg) => acc + (parseFloat(pg.item_qty) || 0), 0) || (parseFloat(pgIdx?.item_qty) || 1);

  const map = {};

  p.paginasOP.forEach(pg => {
    let fator;
    if (pg === pgIdx) {
      fator = totalPedido;                    // índice principal: aplica ao pedido inteiro
    } else if (pg.is_index) {
      fator = parseFloat(pg.item_qty) || 1;  // índice secundário (outro kit): usa sua própria qty
    } else if (pg.corte_mm > 0) {
      fator = parseFloat(pg.item_qty) || 1;  // página de mangueira: qtd direta
    } else {
      fator = totalPedido;                    // páginas acessórias (corte=0): aplica ao pedido inteiro
    }

    (pg.lista_itens || []).forEach(it => {
      const cod = (it.codigo || '').trim().toUpperCase();
      if (!cod || /^\d/.test(cod)) return;
      const qtd = (parseFloat(it.quantidade) || 0) * fator;
      if (map[cod]) map[cod].quantidade += qtd;
      else map[cod] = { cod, tipo: 'Componente', desc: (it.descricao || '').trim(), quantidade: qtd };
    });
  });

  return Object.values(map).sort((a, b) => a.cod.localeCompare(b.cod));
}

function _agCatalogo() {
  if (window._AG_CATALOGO) return window._AG_CATALOGO;
  const items = [];
  const visto = new Set();
  function add(cod, tipo, desc) {
    if (!cod || visto.has(cod)) return;
    visto.add(cod);
    items.push({ cod, tipo, desc: (desc||'').trim() });
  }
  const crimp = window.CRIMP || [];
  for (const r of crimp) {
    const descMang = ((r.descricao || r.mangueira || '') + ' ' + (r.size||'')).trim();
    add(r.cod,  'Mangueira', descMang);
    add(r.capa, 'Capa',      'Capa ' + (r.size||''));
  }
  const terminais = window.TERMINAIS || [];
  for (const t of terminais) {
    const desc = t.medida != null ? `${t.medida} mm` : '';
    add(t.cod, 'Terminal', desc);
  }
  const ORDEM_TIPO = { 'Mangueira':0, 'Terminal':1, 'Capa':2 };
  items.sort((a,b) =>
    ((ORDEM_TIPO[a.tipo]??9) - (ORDEM_TIPO[b.tipo]??9)) ||
    a.cod.localeCompare(b.cod)
  );
  window._AG_CATALOGO = items;
  return items;
}

let _agAcSelecionado = null;
let _agAcIdxAtivo    = -1;

function _agAcInput(q) {
  _agAcSelecionado = null;
  document.getElementById('ag-item').value = '';
  const search   = (q||'').toUpperCase().trim();
  // Usa catálogo restrito ao pedido quando possível
  const catalogo = (_aguardIdx >= 0) ? _catalogoPedido(_aguardIdx) : _agCatalogo();
  const drop     = document.getElementById('ag-ac-drop');
  if (!drop) return;
  if (!search) { drop.style.display = 'none'; _agAcIdxAtivo = -1; return; }
  const inicia  = catalogo.filter(it => it.cod.startsWith(search));
  const contem  = catalogo.filter(it => !it.cod.startsWith(search) && it.cod.includes(search));
  const matches = [...inicia, ...contem].slice(0, 30);
  if (matches.length === 0) {
    drop.innerHTML = `<div style="padding:8px 12px;font-size:12px;color:#6b7280;font-family:Inter,sans-serif;">
      Item não encontrado. <span style="font-weight:700;color:#111;">Enter para usar "${search}"</span></div>`;
    drop.style.display = 'block'; _agAcIdxAtivo = -1; return;
  }
  const TIPO_COR = { 'Mangueira':'#3b82f6','Terminal':'#8b5cf6','Capa':'#10b981','Componente':'#6b7280' };
  drop.innerHTML = matches.map((it, i) => {
    const q2 = search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const destaque = it.cod.replace(new RegExp(q2,'i'), m => `<strong style="color:#1a56db">${m}</strong>`);
    const qtdAttr  = it.quantidade != null ? ` data-qtd="${it.quantidade}"` : '';
    return `<div class="ag-ac-item" data-idx="${i}" data-cod="${it.cod}"${qtdAttr}
      style="padding:7px 12px;cursor:pointer;border-top:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;"
      onmousedown="_agAcSelect('${it.cod}','${it.desc.replace(/'/g,"&#39;")}',${it.quantidade ?? ''})">
      <span style="font-size:10px;font-weight:700;color:${TIPO_COR[it.tipo]||'#6b7280'};background:${TIPO_COR[it.tipo]||'#6b7280'}18;padding:1px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0;">${it.tipo}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#111;">${destaque}</span>
      ${it.desc ? `<span style="font-size:11px;color:#9ca3af;margin-left:auto;white-space:nowrap;">${it.desc}</span>` : ''}
    </div>`;
  }).join('');
  _agAcIdxAtivo = -1;
  drop.style.display = 'block';
}

function _agAcSelect(cod, desc, qtd) {
  document.getElementById('ag-item').value       = cod;
  document.getElementById('ag-item-search').value = cod;
  const drop = document.getElementById('ag-ac-drop');
  if (drop) drop.style.display = 'none';
  _agAcIdxAtivo = -1;
  // Auto-preenche Qtd Solicitada com a quantidade total do componente no pedido
  if (qtd !== undefined && qtd !== '' && parseFloat(qtd) > 0) {
    const qtdSolEl = document.getElementById('ag-qtd-sol');
    if (qtdSolEl && !qtdSolEl.value) qtdSolEl.value = Math.round(parseFloat(qtd));
  }
}

function _agAcKey(e) {
  const drop  = document.getElementById('ag-ac-drop');
  const items = drop ? drop.querySelectorAll('.ag-ac-item') : [];
  if (e.key === 'Enter') {
    e.preventDefault();
    if (_agAcIdxAtivo >= 0 && items[_agAcIdxAtivo]) {
      items[_agAcIdxAtivo].dispatchEvent(new MouseEvent('mousedown'));
    } else {
      const val = (document.getElementById('ag-item-search').value||'').trim().toUpperCase();
      if (val) { document.getElementById('ag-item').value = val; const d = document.getElementById('ag-ac-drop'); if(d) d.style.display='none'; }
    }
    return;
  }
  if (e.key === 'Escape') { if (drop) drop.style.display = 'none'; return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); _agAcIdxAtivo = Math.min(_agAcIdxAtivo + 1, items.length - 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _agAcIdxAtivo = Math.max(_agAcIdxAtivo - 1, 0); }
  items.forEach((el, i) => { el.style.background = i === _agAcIdxAtivo ? '#eff6ff' : ''; });
}

function _agAcClear() {
  document.getElementById('ag-item').value        = '';
  document.getElementById('ag-item-search').value = '';
  _agAcSelecionado = null;
  const drop = document.getElementById('ag-ac-drop');
  if (drop) drop.style.display = 'none';
  document.getElementById('ag-item-search').focus();
}

document.addEventListener('mousedown', function(e) {
  const drop = document.getElementById('ag-ac-drop');
  const inp  = document.getElementById('ag-item-search');
  if (drop && !drop.contains(e.target) && e.target !== inp) {
    drop.style.display = 'none';
    const val = (inp?.value||'').trim().toUpperCase();
    const hiddenVal = document.getElementById('ag-item')?.value || '';
    if (val && !hiddenVal) { document.getElementById('ag-item').value = val; }
  }
});

// ══════════════════════════════════════════════════
//  _injetarPainelNoDetalhe
// ══════════════════════════════════════════════════

function _injetarPainelNoDetalhe(idx) {
  const p        = pedidos[idx];
  const conteudo = document.getElementById('detalhe-conteudo');
  if (!p || !conteudo) return;

  // Em aprovação: recarrega o painel inteiro (que já inclui a seção de estoque)
  if (p.subEtapa === 'aprovacao' && typeof _mostrarPainelAprovacao === 'function') {
    _mostrarPainelAprovacao(idx);
    return;
  }

  const antigo = document.getElementById('painel-aguardando');
  if (antigo) antigo.remove();

  if (!Array.isArray(window.ESTOQUE_DB) || window.ESTOQUE_DB.length === 0) {
    try {
      const local = localStorage.getItem('oem_estoque_db_v2');
      if (local) { window.ESTOQUE_DB = JSON.parse(local); _sincronizarPendencias(); }
    } catch(_) {}
  }

  const wrap = document.createElement('div');
  wrap.id    = 'painel-aguardando';
  wrap.innerHTML = _htmlPainel(p, idx);
  conteudo.insertBefore(wrap, conteudo.firstChild);
}

// ══════════════════════════════════════════════════
//  MODAL DE EDIÇÃO DE REGISTRO DE ESTOQUE
// ══════════════════════════════════════════════════

function _abrirModalRegistrarEstoque() {
  document.getElementById('modal-registrar-estoque')?.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-registrar-estoque';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const listaPedidos = (typeof pedidos !== 'undefined' ? pedidos : [])
    .filter(p => p.etapa !== 'finalizado');
  const pedidosOpts = listaPedidos
    .map((p, i) => `<option value="${i}">#${p.id} — ${p.cliente}</option>`)
    .join('');

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:400px;max-width:95vw;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.22);animation:upcIn .18s ease;">
      <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:18px 18px 14px;position:relative;">
        <button onclick="document.getElementById('modal-registrar-estoque').remove()"
          style="position:absolute;top:10px;right:12px;background:rgba(255,255,255,.15);border:none;color:#fff;width:27px;height:27px;border-radius:50%;font-size:15px;cursor:pointer;line-height:1;">×</button>
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:1px;text-transform:uppercase;">Falta de Estoque</div>
        <div style="font-size:17px;font-weight:800;color:#fff;margin-top:3px;">Novo Registro</div>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px;max-height:75vh;overflow-y:auto;">

        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Pedido</label>
          <select id="nre-pedido" onchange="_nrePedidoChange(this)"
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:13px;font-family:Inter,sans-serif;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;cursor:pointer;">
            <option value="">— Selecionar pedido —</option>
            ${pedidosOpts}
          </select>
        </div>

        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Item / Componente</label>
          <select id="nre-item-listbox" onchange="_nreItemChange(this)"
            disabled
            style="width:100%;box-sizing:border-box;margin-top:4px;border:1.5px solid #e5e7eb;border-radius:8px;
                   font-family:'JetBrains Mono','Courier New',monospace;font-size:12px;font-weight:700;
                   outline:none;background:#f8fafc;padding:9px 10px;color:#9ca3af;cursor:not-allowed;">
            <option value="">— Selecione um pedido primeiro —</option>
          </select>
          <input type="hidden" id="nre-item" value="">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Qtd. Solicitada</label>
            <input id="nre-qtd-sol" type="number" min="0.01" step="0.01" placeholder="0"
              style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:14px;font-weight:700;font-family:Inter,sans-serif;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;">
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;color:#dc2626;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Qtd. Faltante</label>
            <input id="nre-qtd-falt" type="number" min="0.01" step="0.01" placeholder="0"
              style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:14px;font-weight:700;font-family:Inter,sans-serif;border:1.5px solid #fca5a5;border-radius:8px;outline:none;background:#fff5f5;color:#dc2626;">
          </div>
        </div>

        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Observação</label>
          <textarea id="nre-obs" rows="2" placeholder="Informações adicionais..."
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:13px;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;resize:none;font-family:Inter,sans-serif;"></textarea>
        </div>

        <div id="nre-erro" style="display:none;font-size:12px;color:#dc2626;font-family:Inter,sans-serif;padding:6px 10px;background:#fee2e2;border-radius:6px;"></div>
        <button onclick="_salvarNovoRegistroEstoque()"
          style="width:100%;padding:11px;border:none;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;font-size:14px;font-weight:700;font-family:Inter,sans-serif;">
          Registrar Falta
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}
window._abrirModalRegistrarEstoque = _abrirModalRegistrarEstoque;

function _nrePedidoChange(sel) {
  const lb       = document.getElementById('nre-item-listbox');
  const hidItem  = document.getElementById('nre-item');
  const qtdSolEl = document.getElementById('nre-qtd-sol');
  if (!lb) return;

  if (!sel.value) {
    lb.innerHTML = '<option value="">— Selecione um pedido primeiro —</option>';
    lb.disabled = true;
    lb.style.background = '#f8fafc';
    lb.style.color = '#9ca3af';
    lb.style.cursor = 'not-allowed';
    if (hidItem) hidItem.value = '';
    if (qtdSolEl) qtdSolEl.value = '';
    return;
  }

  // idx relativo à lista filtrada (não finalizados)
  const listaPedidos = (typeof pedidos !== 'undefined' ? pedidos : [])
    .filter(p => p.etapa !== 'finalizado');
  const relIdx  = parseInt(sel.value);
  const pedido  = listaPedidos[relIdx];
  // índice real no array global pedidos
  const realIdx = (typeof pedidos !== 'undefined') ? pedidos.indexOf(pedido) : -1;

  lb.innerHTML = '<option value="" disabled selected style="color:#9ca3af;">— selecione um componente —</option>';
  if (realIdx >= 0 && typeof _catalogoPedido === 'function') {
    const catalogo = _catalogoPedido(realIdx);
    catalogo.forEach(it => {
      const opt = document.createElement('option');
      opt.value = it.cod;
      opt.dataset.qtd = it.quantidade != null ? it.quantidade : '';
      const qtdStr  = it.quantidade ? ' (' + Math.round(it.quantidade) + ')' : '';
      const descStr = it.desc ? ' — ' + it.desc.substring(0, 35) : '';
      opt.textContent = it.cod + descStr + qtdStr;
      lb.appendChild(opt);
    });
  }
  lb.disabled = false;
  lb.style.background = '#fafafa';
  lb.style.color = '#111';
  lb.style.cursor = 'pointer';
  lb.selectedIndex = 0;
  if (hidItem) hidItem.value = '';
  if (qtdSolEl) qtdSolEl.value = '';
}
window._nrePedidoChange = _nrePedidoChange;

function _nreItemChange(sel) {
  const opt = sel.options[sel.selectedIndex];
  const hidItem  = document.getElementById('nre-item');
  const qtdSolEl = document.getElementById('nre-qtd-sol');
  if (!opt || !opt.value) return;
  if (hidItem) hidItem.value = opt.value;
  if (qtdSolEl) {
    const qtd = parseFloat(opt.dataset.qtd);
    qtdSolEl.value = (isNaN(qtd) || qtd <= 0) ? '' : Math.round(qtd);
  }
}
window._nreItemChange = _nreItemChange;

function _salvarNovoRegistroEstoque() {
  const erroEl = document.getElementById('nre-erro');
  const mostrarErro = msg => { if (erroEl) { erroEl.textContent = msg; erroEl.style.display = ''; } };

  const selPedidoVal = document.getElementById('nre-pedido')?.value || '';
  let pedidoNum, cliente, entrega;

  if (selPedidoVal !== '') {
    const listaPedidos = (typeof pedidos !== 'undefined' ? pedidos : [])
      .filter(p => p.etapa !== 'finalizado');
    const p = listaPedidos[parseInt(selPedidoVal)];
    if (p) { pedidoNum = p.id; cliente = p.cliente; entrega = p.entrega || ''; }
  }

  if (!pedidoNum) return mostrarErro('Selecione ou informe o pedido.');
  if (!cliente)   return mostrarErro('Informe o cliente.');

  const item     = (document.getElementById('nre-item')?.value || '').trim();
  const qtdSol   = parseFloat(document.getElementById('nre-qtd-sol')?.value)  || 0;
  const qtdFalt  = parseFloat(document.getElementById('nre-qtd-falt')?.value) || 0;
  const obs      = (document.getElementById('nre-obs')?.value || '').trim();

  if (!item)       return mostrarErro('Informe o componente/item.');
  if (qtdSol <= 0) return mostrarErro('Informe a quantidade solicitada.');
  if (qtdFalt <= 0)return mostrarErro('Informe a quantidade faltante.');

  const agora    = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const usuario  = (typeof currentUser !== 'undefined' && currentUser?.nome) ? currentUser.nome : '—';
  const estoqueId = 'EST_' + Date.now() + '_' + Math.random().toString(36).slice(2,6).toUpperCase();

  if (!Array.isArray(window.ESTOQUE_DB)) window.ESTOQUE_DB = [];
  window.ESTOQUE_DB.push({
    id:             estoqueId,
    pedido:         pedidoNum,
    cliente:        cliente,
    entrega:        entrega,
    item:           item,
    qtd_solicitada: qtdSol,
    qtd_faltante:   qtdFalt,
    observacao:     obs,
    status:         'Em Falta',
    registrado_por: usuario,
    data_registro:  agora,
    concluido_por:  null,
    data_conclusao: null,
  });

  // Sincronizar com p.pendencias para que o painel do pedido exiba o registro
  if (typeof pedidos !== 'undefined') {
    const pedidoObj = pedidos.find(x => x.id === pedidoNum);
    if (pedidoObj) {
      if (!Array.isArray(pedidoObj.pendencias)) pedidoObj.pendencias = [];
      pedidoObj.pendencias.push({
        _estoqueId:     estoqueId,
        item:           item,
        qtd_solicitada: qtdSol,
        qtd_faltante:   qtdFalt,
        qtd_empenhada:  0,
        comentario:     obs,
        status:         'Em Falta',
        resolvido:      false,
        registrado_por: usuario,
        data:           agora,
      });
    }
  }

  _salvarEstoque();
  if (typeof salvarEstado === 'function') salvarEstado();
  if (typeof renderKanban === 'function') renderKanban();
  document.getElementById('modal-registrar-estoque')?.remove();
  renderEstoque('');
  if (typeof _mostrarToast === 'function') _mostrarToast('Falta de estoque registrada', '#dc2626');
}
window._salvarNovoRegistroEstoque = _salvarNovoRegistroEstoque;

function abrirModalEditarEstoque(estoqueId) {
  const reg = (window.ESTOQUE_DB||[]).find(r => r.id === estoqueId);
  if (!reg) return;
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

  const _qtdFalt = parseInt(reg.qtd_faltante) || 0;

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
        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Status</label>
          <select id="eed-status"
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;cursor:pointer;"
            onchange="_eedAtualizarCorStatus(this)">
            <option value="Em Falta"             ${reg.status==='Em Falta'            ?'selected':''}>Em Falta</option>
            <option value="Comprado/Transferido"  ${reg.status==='Comprado/Transferido' ?'selected':''}>Comprado/Transferido</option>
            <option value="Lançado"               ${reg.status==='Lançado'              ?'selected':''}>Lançado</option>
            <option value="Empenhado"             ${reg.status==='Empenhado'            ?'selected':''}>Empenhado</option>
          </select>
        </div>

        <!-- Quantidade Faltante: somente leitura -->
        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Quantidade Faltante</label>
          <div id="eed-qtd-falt-display"
            style="padding:9px 11px;margin-top:4px;font-size:14px;font-weight:700;border:1.5px solid #e5e7eb;border-radius:8px;background:#f8fafc;color:#374151;font-family:Inter,sans-serif;">
            ${_qtdFalt}
          </div>
        </div>

        <!-- Quantidade Empenhada: editável, max = qtd_faltante -->
        <div>
          <label style="font-size:10px;font-weight:700;color:#166534;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Quantidade Empenhada</label>
          <input id="eed-qtd-emp" type="number" min="0" step="0.01" max="${_qtdFalt}" placeholder="0"
            oninput="_eedRecalcularFaltando(${_qtdFalt})"
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:14px;font-weight:700;border:1.5px solid #86efac;border-radius:8px;outline:none;font-family:Inter,sans-serif;background:#f0fdf4;color:#166534;">
          <div id="eed-hint" style="font-size:10px;color:#6b7280;margin-top:3px;font-family:Inter,sans-serif;">
            Máximo: ${_qtdFalt} · Ao empenhar o total, o registro será finalizado automaticamente.
          </div>
        </div>

        <div>
          <label style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:Inter,sans-serif;">Observação</label>
          <textarea id="eed-obs" rows="2"
            style="width:100%;box-sizing:border-box;padding:9px 11px;margin-top:4px;font-size:13px;border:1.5px solid #e5e7eb;border-radius:8px;outline:none;resize:none;font-family:Inter,sans-serif;">${reg.observacao||''}</textarea>
        </div>
        <div id="eed-erro" style="display:none;font-size:12px;color:#dc2626;font-family:Inter,sans-serif;padding:6px 10px;background:#fee2e2;border-radius:6px;"></div>
        <button onclick="_salvarEdicaoEstoque('${estoqueId}')"
          style="width:100%;padding:11px;border:none;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#1a56db,#0e3fa8);color:#fff;font-size:14px;font-weight:700;font-family:Inter,sans-serif;">
          Salvar Alterações
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  _eedAtualizarCorStatus(modal.querySelector('#eed-status'));
}

function _eedRecalcularFaltando(qtdFalt) {
  const empInput  = document.getElementById('eed-qtd-emp');
  const faltDisp  = document.getElementById('eed-qtd-falt-display');
  const hint      = document.getElementById('eed-hint');
  if (!empInput) return;
  let emp = parseFloat(empInput.value) || 0;
  if (emp < 0)       { emp = 0; empInput.value = ''; }
  if (emp > qtdFalt) { emp = qtdFalt; empInput.value = qtdFalt; }
  const faltando = Math.round((qtdFalt - emp) * 1000) / 1000;
  const completo = faltando === 0 && emp > 0;
  if (faltDisp) {
    faltDisp.textContent = faltando;
    faltDisp.style.color = completo ? '#166534' : '#374151';
    faltDisp.style.background = completo ? '#dcfce7' : '#f8fafc';
    faltDisp.style.borderColor = completo ? '#86efac' : '#e5e7eb';
  }
  if (hint) {
    hint.textContent = completo
      ? 'Total empenhado — o registro será finalizado ao salvar.'
      : emp > 0
        ? `Máximo: ${qtdFalt} · Restará: ${faltando}`
        : `Máximo: ${qtdFalt} · Ao empenhar o total, o registro será finalizado automaticamente.`;
  }
  const sel = document.getElementById('eed-status');
  if (sel && completo)  sel.value = 'Empenhado';
  else if (sel && !completo && sel.value === 'Empenhado') sel.value = 'Em Falta';
  if (sel) _eedAtualizarCorStatus(sel);
}

function _eedAtualizarCorStatus(sel) {
  const STATUS_COR = {
    'Em Falta':             {bg:'#fee2e2',color:'#991b1b',border:'#fca5a5'},
    'Comprado/Transferido': {bg:'#fef9c3',color:'#854d0e',border:'#fde047'},
    'Lançado':              {bg:'#ffedd5',color:'#9a3412',border:'#fdba74'},
    'Empenhado':            {bg:'#dcfce7',color:'#166534',border:'#86efac'},
  };
  const c = STATUS_COR[sel.value] || {bg:'#fff',color:'#374151',border:'#e5e7eb'};
  sel.style.background  = c.bg;
  sel.style.color       = c.color;
  sel.style.borderColor = c.border;
}

function _salvarEdicaoEstoque(estoqueId) {
  const reg = (window.ESTOQUE_DB||[]).find(r => r.id === estoqueId);
  if (!reg) return;

  const novaObs    = (document.getElementById('eed-obs').value||'').trim();
  const usuario    = _usuarioAtual();
  const agora      = _agora();

  const qtdFalt    = parseFloat(reg.qtd_faltante) || 0;
  const qtdEmp     = Math.min(Math.max(parseFloat(document.getElementById('eed-qtd-emp')?.value) || 0, 0), qtdFalt);
  const autoEmpenh = qtdEmp >= qtdFalt && qtdFalt > 0;
  const novoStatus = autoEmpenh ? 'Empenhado' : document.getElementById('eed-status').value;
  const novaFalt   = qtdFalt - qtdEmp;

  reg.qtd_faltante  = novaFalt;
  reg.qtd_empenhada = 0;
  reg.observacao    = novaObs;
  reg.editado_por   = usuario;
  reg.data_edicao   = agora;
  reg.status        = novoStatus;

  if (novoStatus === 'Empenhado') {
    reg.concluido_por  = usuario;
    reg.data_conclusao = agora;
    if (typeof pedidos !== 'undefined') {
      const p = pedidos.find(p => p.id === reg.pedido);
      if (p && Array.isArray(p.pendencias)) {
        const pend = p.pendencias.find(d => d._estoqueId === estoqueId);
        if (pend) {
          pend.resolvido = true; pend.status = 'Empenhado';
          pend.concluido_por = usuario; pend.data_conclusao = agora;
        }
      }
    }
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof renderKanban === 'function') renderKanban();
    if (typeof _mostrarToast === 'function') _mostrarToast('Empenhado!', '#22c55e');
  } else {
    if (typeof pedidos !== 'undefined') {
      const p = pedidos.find(p => p.id === reg.pedido);
      if (p && Array.isArray(p.pendencias)) {
        const pend = p.pendencias.find(d => d._estoqueId === estoqueId);
        if (pend) { pend.status = novoStatus; pend.qtd_faltante = novaFalt; pend.qtd_empenhada = 0; pend.comentario = novaObs; pend.editado_por = usuario; pend.data_edicao = agora; }
      }
    }
    if (typeof _mostrarToast === 'function') _mostrarToast('Registro atualizado', '#1a56db');
  }

  _salvarEstoque();
  renderEstoque();
  document.getElementById('modal-editar-estoque')?.remove();
  const cidx = window._agCurrentIdx;
  if (cidx != null) _injetarPainelNoDetalhe(cidx);
}

// ══════════════════════════════════════════════════
//  PATCH CALENDÁRIO
// ══════════════════════════════════════════════════

window.addEventListener('load', function() {
  if (typeof window.renderCalendario === 'function' && !window._calPatchado) {
    const _origCal = window.renderCalendario;
    window.renderCalendario = function() {
      _origCal.apply(this, arguments);
      _reordenarChipsCalendario();
    };
    window._calPatchado = true;
  }
});

function _reordenarChipsCalendario() {
  if (typeof pedidos === 'undefined') return;
  const mapaCliente = {};
  pedidos.forEach(p => { mapaCliente[p.id] = p.cliente; });
  document.querySelectorAll('.cal-event-chip').forEach(chip => {
    if (chip.dataset.calPatched) return;
    const texto = chip.textContent || '';
    const mNum = texto.match(/#?(\d{6})/);
    if (!mNum) return;
    const numPedido = mNum[1];
    const cliente = mapaCliente[numPedido] || mapaCliente[numPedido.replace(/^0+/, '')] || '';
    if (!cliente) return;
    const nomeEl = chip.querySelector('.chip-nome');
    if (nomeEl) {
      nomeEl.textContent = cliente;
      if (!chip.querySelector('.chip-num')) {
        const numEl = document.createElement('span');
        numEl.className = 'chip-num';
        numEl.textContent = '#' + numPedido;
        numEl.style.cssText = 'display:block;font-size:9px;font-weight:600;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        chip.appendChild(numEl);
      }
    }
    chip.dataset.calPatched = '1';
  });
}

// ══════════════════════════════════════════════════
//  CONTROLES DE ESTADO DO PEDIDO (Iniciar/Retomar)
// ══════════════════════════════════════════════════

window._pedidoEmAndamento = false;
window._proximaAcao       = null;


// ── Labels dinâmicos por etapa ────────────────────
const _ETAPA_ACAO_LABEL = {
  separacao:  'Inspeção',
  inspecao:   'Inspeção',
  corte:      'Corte',
  prensagem:  'Prensagem',
  embalagem:  'Embalagem',
  finalizado: 'Finalizado',
};

function _labelIniciar(p) {
  const _vizEtapa      = window._etapaVizualizacao;
  const _emModoFantasma = _vizEtapa && _vizEtapa !== p?.etapa;
  const etapa = _emModoFantasma ? _vizEtapa : (p?.etapa || 'separacao');
  const nome  = _ETAPA_ACAO_LABEL[etapa] || etapa;
  // Em modo fantasma, nunca é "Retomar" — são pendências de uma etapa anterior
  const foiIniciado = !_emModoFantasma && p?._iniciado;
  if (foiIniciado) return `Retomar ${nome}`;
  return `Iniciar ${nome}`;
}

function _labelConcluir(etapa) {
  const nome = _ETAPA_ACAO_LABEL[etapa] || etapa;
  return `✓ Concluir ${nome}`;
}

function _btnIniciar() {
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  // Pedido em aprovação: não permite iniciar
  if (p.subEtapa === 'aprovacao') return;

  // Pedido finalizado: não permite ação
  if (p.etapa === 'finalizado') {
    if (typeof _mostrarToast === 'function') _mostrarToast('Este pedido já está concluído.', '#6b7280');
    return;
  }

  // Pede confirmação via QR antes de iniciar
  if (typeof mostrarConfirmacaoQR === 'function') {
    mostrarConfirmacaoQR(function (operador) {
      // Registra operador responsável por esta etapa
      if (!p._operadores_etapa) p._operadores_etapa = {};
      const etapaKey = window._etapaVizualizacao || p.etapa;
      p._operadores_etapa[etapaKey] = operador ? operador.nome : (typeof currentUser !== 'undefined' ? currentUser?.nome : '—');

      _executarIniciarPedido(idx, p);
    });
  } else {
    _executarIniciarPedido(idx, p);
  }
}

function _executarIniciarPedido(idx, p) {
  const _emModoFantasma = window._etapaVizualizacao && window._etapaVizualizacao !== p.etapa;

  // Ao iniciar pela primeira vez (Separação), mover para INSPEÇÃO — mas não em modo fantasma
  if (!_emModoFantasma && p.etapa === 'separacao') {
    p.etapa = 'inspecao';
    window._etapaVizualizacao = 'inspecao';
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof renderKanban  === 'function') renderKanban();
  }

  _setModoAndamento(true, idx);

  if (typeof abrirIniciarPedido === 'function') {
    abrirIniciarPedido();
  } else {
    if (typeof abrirOP === 'function') abrirOP();
  }
}

function _btnSair(acao) {
  if (window._pedidoEmAndamento) {
    window._proximaAcao = acao;
    _mostrarAvisoSaida();
    return;
  }
  _executarAcao(acao);
}

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

function _mostrarAvisoSaida() {
  let modal = document.getElementById('modal-aviso-saida');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'modal-aviso-saida';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:340px;max-width:92vw;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.25);animation:upcIn .18s ease;font-family:Inter,sans-serif;">
      <div style="background:linear-gradient(135deg,#f59e0b,#b45309);padding:20px 18px 16px;">
        <div style="font-size:18px;font-weight:800;color:#fff;">Pedido em andamento</div>
        <div style="font-size:13px;color:rgba(255,255,255,.85);margin-top:4px;">Você está com um pedido iniciado. Deseja realmente sair?</div>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="font-size:13px;color:#374151;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
          O progresso do item atual será salvo automaticamente.
        </div>
        <div style="display:flex;gap:10px;">
          <button onclick="_confirmarSaida(true)"
            style="flex:1;padding:11px;border:none;border-radius:10px;cursor:pointer;background:#ef4444;color:#fff;font-size:14px;font-weight:700;">
            Sim, sair
          </button>
          <button onclick="_confirmarSaida(false)"
            style="flex:1;padding:11px;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;background:#fff;color:#374151;font-size:14px;font-weight:700;">
            Não, continuar
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function _confirmarSaida(sair) {
  const modal = document.getElementById('modal-aviso-saida');
  if (modal) modal.remove();
  if (!sair) return;
  if (typeof salvarEstado === 'function') salvarEstado();
  _setModoAndamento(false, window._agCurrentIdx ?? window.currentPedidoIdx);
  if (window._proximaAcao) {
    _executarAcao(window._proximaAcao);
    window._proximaAcao = null;
  }
}

function _setModoAndamento(emAndamento, idx) {
  window._pedidoEmAndamento = emAndamento;
  const p = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  const btnIniciar   = document.getElementById('btn-iniciar-pedido');
  const btnBaixarOP  = document.getElementById('btn-baixar-op');
  const btnLaudo     = document.getElementById('btn-laudo');
  const btnRelatorio = document.getElementById('btn-relatorio-pedido');
  const btnOP        = document.getElementById('btn-op');
  const btnSep       = document.getElementById('btn-separacao');
  const btnEtiq      = document.getElementById('btn-etiq-pedido');
  const btnEmb       = document.getElementById('btn-etiq-embalagem');
  const btnComp      = document.getElementById('btn-componentes');

  const finalizado = p?.etapa === 'finalizado';

  if (finalizado) {
    [btnSep, btnEtiq, btnEmb, btnComp].forEach(b => { if (b) b.style.display = ''; });
    if (btnOP)        btnOP.style.display        = 'none';
    if (btnBaixarOP)  btnBaixarOP.style.display  = '';
    if (btnLaudo)     btnLaudo.style.display      = '';
    if (btnRelatorio) btnRelatorio.style.display  = '';
    if (btnIniciar)   btnIniciar.style.display    = 'none';
    return;
  }

  if (btnRelatorio) btnRelatorio.style.display = 'none';
  if (btnOP)        btnOP.style.display        = 'none';

  if (emAndamento) {
    [btnSep, btnEtiq, btnEmb, btnComp].forEach(b => { if (b) b.style.display = 'none'; });
    if (btnBaixarOP) btnBaixarOP.style.display = 'none';
    if (btnLaudo)    btnLaudo.style.display    = 'none';
    if (btnIniciar)  btnIniciar.style.display  = 'none';
    // Marcar iniciado só fora do modo fantasma, para não corromper o label ao retornar
    const _emModoFantasma = window._etapaVizualizacao && window._etapaVizualizacao !== p?.etapa;
    if (p && !_emModoFantasma) { p._iniciado = true; if (typeof salvarEstado === 'function') salvarEstado(); }
  } else {
    // Desativar marcador ao sair de etapa que não o usa
    const _etapaMarcador = ['separacao', 'inspecao', 'corte'].includes(p?.etapa);
    if (!_etapaMarcador && typeof _marcadorAtivo !== 'undefined' && _marcadorAtivo && typeof _toggleMarcador === 'function') _toggleMarcador();
    [btnSep, btnEtiq, btnEmb, btnComp].forEach(b => { if (b) b.style.display = ''; });
    if (btnBaixarOP) btnBaixarOP.style.display = '';
    if (btnLaudo)    btnLaudo.style.display    = '';
    if (btnIniciar && p) {
      btnIniciar.style.display = '';
      btnIniciar.innerHTML = _labelIniciar(p);
      btnIniciar.style.background = p._iniciado ? '#f59e0b' : '#1a56db';
      btnIniciar.style.color      = p._iniciado ? '#1c1917'  : '#fff';
      btnIniciar.style.borderColor= p._iniciado ? '#f59e0b' : '#1a56db';
    }
  }
}

(function _patchAbrirPedidoBotoes() {
  const _check = setInterval(() => {
    if (!window._agPatchedAbrirPedido) return;
    clearInterval(_check);
    const _apOrig = window.abrirPedido;
    window.abrirPedido = function(idx) {
      _apOrig(idx);
      window._pedidoEmAndamento = false;
      window._proximaAcao = null;
      setTimeout(() => {
        _setModoAndamento(false, idx);
        // Atualiza label do botão conforme etapa atual do pedido
        const p = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
        const btnIniciar = document.getElementById('btn-iniciar-pedido');
        if (btnIniciar && p) {
          btnIniciar.innerHTML = _labelIniciar(p);
          btnIniciar.style.background = p._iniciado ? '#f59e0b' : '#1a56db';
      btnIniciar.style.color      = p._iniciado ? '#1c1917'  : '#fff';
      btnIniciar.style.borderColor= p._iniciado ? '#f59e0b' : '#1a56db';
        }
      }, 50);
    };
  }, 200);
})();

// ══════════════════════════════════════════════════
//  FIX: _updateTopbar — restaurar display:flex na search bar
// ══════════════════════════════════════════════════
window.addEventListener('load', function() {
  if (typeof window._updateTopbar === 'function' && !window._topbarPatched) {
    var _origTopbar = window._updateTopbar;
    window._updateTopbar = function(screen) {
      _origTopbar(screen);
      var searchEl = document.getElementById('kanban-search-bar');
      if (searchEl && screen === 'pedidos') {
        searchEl.style.display = 'flex';
      }
    };
    window._topbarPatched = true;
  }
});
