// ══════════════════════════════════════════════════
//  ARCHIVE.JS — Pedidos Finalizados Arquivados
//  Exibe pedidos finalizados além dos 5 mais recentes
// ══════════════════════════════════════════════════

(function _archiveCss() {
  if (document.getElementById('archive-css')) return;
  const s = document.createElement('style');
  s.id = 'archive-css';
  s.textContent = `
    #arquivo-root {
      flex: 1;
      overflow-y: auto;
      background: var(--bg, #f9fafb);
      font-family: Inter, system-ui, sans-serif;
    }
    .arq-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      cursor: pointer;
      transition: background .12s, border-color .12s, box-shadow .12s;
    }
    .arq-card:hover {
      background: #f8fafc;
      border-color: #c7d2fe;
      box-shadow: 0 2px 8px rgba(26,86,219,.07);
    }
    .arq-icon {
      width: 38px;
      height: 38px;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .arq-id {
      font-size: 13px;
      font-weight: 800;
      color: #111;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
    }
    .arq-cliente {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
    .arq-meta {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 2px;
    }
    .arq-badge {
      font-size: 11px;
      font-weight: 700;
      color: #059669;
      background: #f0fdf4;
      padding: 3px 10px;
      border-radius: 20px;
      white-space: nowrap;
      border: 1px solid #86efac;
      flex-shrink: 0;
    }
    .arq-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 280px;
      gap: 10px;
      color: #9ca3af;
    }
    .arq-empty-icon { font-size: 48px; opacity: .3; }
    .arq-empty-title { font-size: 15px; font-weight: 700; color: #374151; }
    .arq-empty-sub   { font-size: 13px; color: #9ca3af; text-align: center; padding: 0 24px; }
  `;
  document.head.appendChild(s);
})();

// ── Retorna pedidos arquivados (finalizados além dos 5 mais recentes) ──────────
function _getArquivados() {
  const finalizados = pedidos.filter(p => p.etapa === 'finalizado');
  finalizados.sort((a, b) => {
    const ta = a.amostragens_ts ? new Date(a.amostragens_ts).getTime() : 0;
    const tb = b.amostragens_ts ? new Date(b.amostragens_ts).getTime() : 0;
    return tb - ta;
  });
  return finalizados.slice(typeof LIMITE_FINALIZADOS !== 'undefined' ? LIMITE_FINALIZADOS : 5);
}

// ── Renderizar lista de arquivados ─────────────────────────────────────────────
function _renderArquivo(filtro) {
  const root = document.getElementById('arquivo-root');
  if (!root) return;

  const arquivados = _getArquivados();
  const q = (filtro || '').toLowerCase().trim();

  const lista = q
    ? arquivados.filter(p =>
        p.id.includes(q) ||
        (p.cliente || '').toLowerCase().includes(q) ||
        (p.entrega  || '').includes(q)
      )
    : arquivados;

  // Contador no header da tela
  const totalEl = document.getElementById('arquivo-total');
  if (totalEl) totalEl.textContent = arquivados.length + ' pedido' + (arquivados.length !== 1 ? 's' : '');

  if (!lista.length) {
    root.innerHTML = `
      <div class="arq-empty">
        <div class="arq-empty-icon">📁</div>
        <div class="arq-empty-title">
          ${q ? 'Nenhum resultado para "' + filtro + '"' : 'Nenhum pedido arquivado'}
        </div>
        <div class="arq-empty-sub">
          ${q
            ? 'Tente buscar por número, cliente ou data.'
            : 'Pedidos finalizados além dos 5 mais recentes aparecem aqui.'}
        </div>
      </div>`;
    return;
  }

  root.innerHTML = `<div style="padding:16px;display:flex;flex-direction:column;gap:8px;">
    ${lista.map(p => {
      const idxReal = pedidos.indexOf(p);
      const dataFim = p.amostragens_ts
        ? new Date(p.amostragens_ts).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric'})
        : '—';
      return `
        <div class="arq-card" onclick="_voltarParaArquivo=true;abrirPedido(${idxReal})">
          <div class="arq-icon">✅</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="arq-id">#${p.id}</span>
              <span class="arq-cliente">${p.cliente || ''}</span>
            </div>
            <div class="arq-meta">
              ${p.entrega ? 'Entrega: ' + p.entrega + ' · ' : ''}Finalizado em ${dataFim}
            </div>
          </div>
          <div class="arq-badge">FINALIZADO</div>
        </div>`;
    }).join('')}
  </div>`;
}

// ── Expõe globalmente ──────────────────────────────────────────────────────────
window._renderArquivo  = _renderArquivo;
window._getArquivados  = _getArquivados;
