// ══════════════════════════════════════════════════
//  LAUDOS DE TESTE
// ══════════════════════════════════════════════════

let _laudosUploadPedidoId = null;

// Estado dos filtros
window._laudosFiltroTipo = window._laudosFiltroTipo ?? 'com'; // 'com' | 'sem'
window._laudosVisiveis   = window._laudosVisiveis   ?? 10;

const LAUDOS_POR_PAGINA = 10;

function renderLaudos(filtro) {
  const root = document.getElementById('laudos-root');
  if (!root) return;

  const q = (filtro !== undefined
    ? filtro
    : (document.getElementById('laudos-search')?.value || '')
  ).toLowerCase().trim();

  const tipoFiltro = window._laudosFiltroTipo;
  const maxVis     = window._laudosVisiveis;

  // ── Coletar todas as linhas ──────────────────────
  const linhas = [];
  (typeof pedidos !== 'undefined' ? pedidos : []).forEach(p => {
    const laudos = p.laudos || [];
    if (laudos.length === 0) {
      linhas.push({ p, laudo: null, li: -1 });
    } else {
      laudos.forEach((l, li) => linhas.push({ p, laudo: l, li }));
    }
  });

  // ── Filtro por busca ─────────────────────────────
  const buscadas = q
    ? linhas.filter(({ p }) =>
        p.id.toLowerCase().includes(q) ||
        (p.cliente || '').toLowerCase().includes(q))
    : linhas;

  const comLaudo = buscadas.filter(r =>  r.laudo);
  const semLaudo = buscadas.filter(r => !r.laudo);

  const cntCom = comLaudo.length;
  const cntSem = semLaudo.length;

  // ── Aplicar filtro de tipo ───────────────────────
  const exibirTodos = tipoFiltro === 'com' ? comLaudo : semLaudo;

  // ── Paginação ────────────────────────────────────
  const exibir   = exibirTodos.slice(0, maxVis);
  const temMais  = exibirTodos.length > maxVis;
  const restante = exibirTodos.length - maxVis;

  // ── Botão de filtro ──────────────────────────────
  const _btnFiltro = (label, valor, cnt, cor) => {
    const ativo = tipoFiltro === valor;
    return `<button onclick="window._laudosFiltroTipo='${valor}';window._laudosVisiveis=${LAUDOS_POR_PAGINA};renderLaudos()"
      style="padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;font-family:Inter,sans-serif;
             cursor:pointer;white-space:nowrap;transition:all .15s;
             border:1.5px solid ${ativo ? cor : '#e5e7eb'};
             background:${ativo ? cor + '22' : '#fff'};
             color:${ativo ? cor : '#6b7280'};">
      ${label}${cnt > 0 ? `<span style="margin-left:5px;background:${ativo ? cor : '#e5e7eb'};color:${ativo ? '#fff' : '#374151'};
        border-radius:10px;padding:0 6px;font-size:10px;">${cnt}</span>` : ''}
    </button>`;
  };

  // ── Linhas da tabela ─────────────────────────────
  const linhasHTML = exibir.map(({ p, laudo, li }) => {
    const pidx     = (typeof pedidos !== 'undefined') ? pedidos.indexOf(p) : -1;
    const temLaudo = !!laudo;
    const filename = laudo ? laudo.filename : '—';
    const etapaLabel = {
      separacao: 'Separação', inspecao: 'Inspeção', corte: 'Corte',
      prensagem: 'Prensagem', embalagem: 'Embalagem', finalizado: 'Finalizado',
    }[p.etapa] || p.etapa || '—';

    return `
    <tr style="border-bottom:1px solid rgba(0,0,0,.05);">
      <td style="padding:10px 12px;">
        <a onclick="irParaPedido('${p.id}')" style="font-size:12px;font-weight:800;
          font-family:'Courier New',monospace;color:#1a56db;cursor:pointer;">#${p.id}</a>
      </td>
      <td style="padding:10px 12px;font-size:12px;font-weight:700;color:#111;
        max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.cliente || '—'}</td>
      <td style="padding:10px 12px;font-size:11px;color:#6b7280;white-space:nowrap;">${p.entrega || '—'}</td>
      <td style="padding:10px 12px;">
        <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;
          background:${temLaudo ? '#f0fdf4' : '#f9fafb'};
          color:${temLaudo ? '#059669' : '#9ca3af'};
          border:1px solid ${temLaudo ? '#86efac' : '#e5e7eb'};">
          ${etapaLabel}
        </span>
      </td>
      <td style="padding:10px 12px;font-size:11px;color:#374151;
        max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        font-family:'Courier New',monospace;">
        ${temLaudo
          ? `<span title="${filename}">${filename}</span>`
          : '<span style="color:#d1d5db;">Sem laudo</span>'}
      </td>
      <td style="padding:10px 12px;white-space:nowrap;">
        <div style="display:flex;gap:6px;align-items:center;">
          ${temLaudo ? `
          <button onclick="_laudosVer(${pidx},${li})"
            style="padding:5px 11px;background:#eff6ff;color:#1a56db;border:1px solid #bfdbfe;
              border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            Ver PDF
          </button>
          <button onclick="_laudosGerarRelatorio(${pidx})"
            style="padding:5px 11px;background:#f0fdf4;color:#059669;border:1px solid #86efac;
              border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            Relatório
          </button>
          <button onclick="_laudosRemover(${pidx},${li})"
            style="padding:5px 8px;background:#fee2e2;color:#dc2626;border:1px solid #fecaca;
              border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            ✕
          </button>` : ''}
          <button onclick="_laudosUpload('${p.id}')"
            style="padding:5px 11px;background:#fff;color:#6b7280;border:1px solid #d1d5db;
              border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            + Laudo
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  root.innerHTML = `
  <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px;max-width:1100px;margin:0 auto;">

    <!-- Barra de filtros + busca -->
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      ${_btnFiltro('Com Laudo', 'com', cntCom, '#059669')}
      ${_btnFiltro('Sem Laudo', 'sem', cntSem, '#6b7280')}
      <div style="margin-left:auto;">
        <input id="laudos-search" type="text" placeholder="Buscar pedido ou cliente…" value="${q}"
          oninput="window._laudosVisiveis=${LAUDOS_POR_PAGINA};renderLaudos(this.value)"
          style="padding:6px 13px;border:1.5px solid #e5e7eb;border-radius:20px;font-size:12px;
                 font-family:Inter,sans-serif;outline:none;width:220px;color:#111;background:#fff;">
      </div>
    </div>

    <!-- Tabela -->
    <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
      ${exibir.length === 0 ? `
        <div style="padding:48px;text-align:center;color:#9ca3af;font-family:Inter,sans-serif;">
          <div style="font-size:36px;margin-bottom:10px;">${tipoFiltro === 'com' ? '📄' : '📭'}</div>
          <div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:4px;">
            ${q ? `Nenhum resultado para "${q}"` : tipoFiltro === 'com' ? 'Nenhum laudo registrado' : 'Todos os pedidos têm laudo'}
          </div>
          <div style="font-size:12px;color:#9ca3af;">
            ${!q && tipoFiltro === 'com' ? 'Faça upload de laudos dentro de cada pedido' : ''}
          </div>
        </div>` : `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Pedido</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;">Cliente</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">Entrega</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;">Etapa</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;">Arquivo</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;">Ações</th>
            </tr>
          </thead>
          <tbody>${linhasHTML}</tbody>
        </table>
      </div>

      ${temMais ? `
      <div style="padding:12px 16px;border-top:1px solid #f3f4f6;text-align:center;">
        <button onclick="window._laudosVisiveis=window._laudosVisiveis+${LAUDOS_POR_PAGINA};renderLaudos()"
          style="padding:8px 24px;background:#f8fafc;color:#374151;border:1.5px solid #e5e7eb;
            border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;
            transition:background .15s;"
          onmouseenter="this.style.background='#f0f2f5'" onmouseleave="this.style.background='#f8fafc'">
          Mostrar mais (${Math.min(restante, LAUDOS_POR_PAGINA)} de ${restante} restantes)
        </button>
      </div>` : ''}
      `}
    </div>

    <!-- Contador -->
    <div style="font-size:11px;color:#9ca3af;font-family:Inter,sans-serif;text-align:right;">
      Exibindo ${exibir.length} de ${exibirTodos.length} ${tipoFiltro === 'com' ? 'com laudo' : 'sem laudo'}
    </div>
  </div>`;

  // Restaura foco na busca sem travar a digitação
  if (filtro !== undefined) {
    const si = document.getElementById('laudos-search');
    if (si) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
  }
}

async function _laudosVer(pidx, li) {
  const p = (typeof pedidos !== 'undefined') ? pedidos[pidx] : null;
  const l = p?.laudos?.[li];
  if (!l) return;
  if (typeof _mostrarToast === 'function') _mostrarToast('Carregando PDF…', '#1a56db');
  const data = l.data || (typeof getAnexoData === 'function' ? await getAnexoData(l, p?.id) : null);
  if (!data) { if (typeof _mostrarToast === 'function') _mostrarToast('PDF não encontrado.', '#ef4444'); return; }
  _laudosAbrirViewer(l.filename, data);
}

function _laudosAbrirViewer(filename, b64) {
  document.getElementById('modal-laudo-viewer')?.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-laudo-viewer';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:860px;max-width:97vw;height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35);">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e5e7eb;flex-shrink:0;">
        <div style="font-size:13px;font-weight:700;color:#111;font-family:Inter,sans-serif;">${filename}</div>
        <div style="display:flex;gap:8px;">
          <button onclick="_laudosDownload('${filename}')"
            style="padding:6px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            Baixar
          </button>
          <button onclick="document.getElementById('modal-laudo-viewer').remove()"
            style="padding:6px 12px;background:#fee2e2;color:#dc2626;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;">×</button>
        </div>
      </div>
      <iframe id="laudo-iframe" style="flex:1;border:none;"></iframe>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const iframe = document.getElementById('laudo-iframe');
  const blob = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'application/pdf' });
  iframe.src = URL.createObjectURL(blob);
  window._laudosCurrentB64 = { filename, b64 };
}

function _laudosDownload(filename) {
  const cur = window._laudosCurrentB64;
  if (!cur) return;
  if (typeof _dlB64 === 'function') { _dlB64(cur.filename, cur.b64); return; }
  const a = document.createElement('a');
  a.href = 'data:application/pdf;base64,' + cur.b64;
  a.download = cur.filename;
  a.click();
}

async function _laudosGerarRelatorio(pidx) {
  const p = (typeof pedidos !== 'undefined') ? pedidos[pidx] : null;
  if (!p) return;
  if (typeof _mostrarToast === 'function') _mostrarToast('Gerando relatório…', '#1a56db');
  try {
    const laudosPayload = [];
    for (const l of (p.laudos || [])) {
      const data = typeof getAnexoData === 'function' ? await getAnexoData(l, p.id) : null;
      if (data) laudosPayload.push({ filename: l.filename || '', data });
    }
    const _checklist = p.checklist_inspecao ? { ...p.checklist_inspecao } : null;
    const payload = {
      pedido:    p.id,
      cliente:   p.cliente,
      entrega:   p.entrega,
      paginas:   p.paginasOP || [],
      amostragens: p.amostragens || {},
      operador:  p.amostragens_operador || '—',
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
    if (typeof _dlB64 === 'function') _dlB64(`RELATORIO_${p.id}.pdf`, pdf);
    if (typeof _mostrarToast === 'function') _mostrarToast('Relatório gerado!', '#059669');
  } catch(e) {
    console.error('Relatório:', e);
    if (typeof _mostrarToast === 'function') _mostrarToast('Erro ao gerar relatório.', '#ef4444');
  }
}

function _laudosRemover(pidx, li) {
  const p = (typeof pedidos !== 'undefined') ? pedidos[pidx] : null;
  if (!p?.laudos) return;
  p.laudos.splice(li, 1);
  p.laudos.forEach((l, n) => { l.filename = 'LAUDO_' + (n + 1) + '_' + p.id + '.pdf'; });
  if (typeof salvarEstado === 'function') salvarEstado();
  if (typeof _mostrarToast === 'function') _mostrarToast('Laudo removido.', '#6b7280');
  renderLaudos();
}

function _laudosUpload(pedidoId) {
  _laudosUploadPedidoId = pedidoId;
  document.getElementById('upload-laudo-global')?.click();
}

function _laudosUploadChange(event) {
  const file = event.target.files[0];
  if (!file || !_laudosUploadPedidoId) return;
  const p = (typeof pedidos !== 'undefined')
    ? pedidos.find(x => x.id === _laudosUploadPedidoId)
    : null;
  if (!p) return;
  if (!p.laudos) p.laudos = [];
  const MAX_LAUDOS = 3;
  if (p.laudos.length >= MAX_LAUDOS) {
    if (typeof _mostrarToast === 'function') _mostrarToast('Limite de ' + MAX_LAUDOS + ' laudos atingido.', '#ef4444');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const n  = p.laudos.length + 1;
    const fn = 'LAUDO_' + n + '_' + p.id + '.pdf';
    p.laudos.push({ filename: fn, data: e.target.result.split(',')[1], _salvo: false });
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof _mostrarToast === 'function') _mostrarToast('Laudo ' + n + ' anexado!', '#1a56db');
    _laudosUploadPedidoId = null;
    renderLaudos();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

window.renderLaudos          = renderLaudos;
window._laudosVer            = _laudosVer;
window._laudosGerarRelatorio = _laudosGerarRelatorio;
window._laudosRemover        = _laudosRemover;
window._laudosUpload         = _laudosUpload;
window._laudosUploadChange   = _laudosUploadChange;
window._laudosDownload       = _laudosDownload;
