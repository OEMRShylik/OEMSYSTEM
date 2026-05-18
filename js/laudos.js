// ══════════════════════════════════════════════════
//  LAUDOS DE TESTE
// ══════════════════════════════════════════════════

let _laudosUploadPedidoId = null;

function renderLaudos(filtro) {
  const root = document.getElementById('laudos-root');
  if (!root) return;

  const q = (filtro || '').toLowerCase().trim();

  // Coletar todos os laudos de todos os pedidos
  const linhas = [];
  (typeof pedidos !== 'undefined' ? pedidos : []).forEach(p => {
    const laudos = p.laudos || [];
    if (laudos.length === 0) {
      linhas.push({ p, laudo: null, li: -1 });
    } else {
      laudos.forEach((l, li) => linhas.push({ p, laudo: l, li }));
    }
  });

  // Filtro
  const filtradas = q
    ? linhas.filter(({ p }) =>
        p.id.toLowerCase().includes(q) ||
        (p.cliente || '').toLowerCase().includes(q))
    : linhas;

  const comLaudo    = filtradas.filter(r => r.laudo);
  const semLaudo    = filtradas.filter(r => !r.laudo);
  const exibir      = [...comLaudo, ...semLaudo];

  const totalLaudos = comLaudo.length;

  const linhasHTML = exibir.map(({ p, laudo, li }) => {
    const pidx = (typeof pedidos !== 'undefined') ? pedidos.indexOf(p) : -1;
    const temLaudo = !!laudo;
    const filename = laudo ? laudo.filename : '—';
    const etapaLabel = {
      separacao: 'Separação', inspecao: 'Inspeção', corte: 'Corte',
      prensagem: 'Prensagem', embalagem: 'Embalagem', finalizado: 'Finalizado',
    }[p.etapa] || p.etapa || '—';

    return `<tr style="border-bottom:1px solid #f3f4f6;${!temLaudo ? 'opacity:.55;' : ''}">
      <td style="padding:10px 12px;font-size:12px;font-weight:800;font-family:'Courier New',monospace;white-space:nowrap;color:#1a56db;">#${p.id}</td>
      <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#111;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.cliente || '—'}</td>
      <td style="padding:10px 12px;font-size:11px;color:#6b7280;white-space:nowrap;">${p.entrega || '—'}</td>
      <td style="padding:10px 12px;">
        <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;
          background:${temLaudo ? '#f0fdf4' : '#f9fafb'};color:${temLaudo ? '#059669' : '#9ca3af'};
          border:1px solid ${temLaudo ? '#86efac' : '#e5e7eb'};">
          ${etapaLabel}
        </span>
      </td>
      <td style="padding:10px 12px;font-size:11px;color:#374151;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Courier New',monospace;">
        ${temLaudo
          ? `<span title="${filename}">${filename}</span>`
          : '<span style="color:#d1d5db;">Sem laudo</span>'}
      </td>
      <td style="padding:10px 12px;white-space:nowrap;">
        <div style="display:flex;gap:6px;align-items:center;">
          ${temLaudo ? `
          <button onclick="_laudosVer(${pidx},${li})"
            style="padding:5px 12px;background:#eff6ff;color:#1a56db;border:1px solid #bfdbfe;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            Ver PDF
          </button>
          <button onclick="_laudosGerarRelatorio(${pidx})"
            style="padding:5px 12px;background:#f0fdf4;color:#059669;border:1px solid #86efac;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            Relatório
          </button>
          <button onclick="_laudosRemover(${pidx},${li})"
            style="padding:5px 8px;background:#fee2e2;color:#dc2626;border:1px solid #fecaca;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            ✕
          </button>` : ''}
          <button onclick="_laudosUpload('${p.id}')"
            style="padding:5px 12px;background:#fff;color:#6b7280;border:1px solid #d1d5db;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
            + Laudo
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  root.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#111;">Laudos de Teste</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">${totalLaudos} laudo${totalLaudos !== 1 ? 's' : ''} registrado${totalLaudos !== 1 ? 's' : ''}</div>
        </div>
        <input type="text" placeholder="Buscar por pedido ou cliente…" value="${filtro || ''}"
          oninput="renderLaudos(this.value)"
          style="padding:8px 14px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:13px;
                 font-family:Inter,sans-serif;outline:none;width:260px;color:#111;">
      </div>

      <!-- Tabela -->
      <div style="background:#fff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.05);">
        ${exibir.length === 0 ? `
          <div style="padding:60px;text-align:center;color:#9ca3af;">
            <div style="font-size:40px;margin-bottom:12px;"></div>
            <div style="font-size:15px;font-weight:700;color:#374151;">Nenhum pedido encontrado</div>
          </div>` : `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;white-space:nowrap;">PEDIDO</th>
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;">CLIENTE</th>
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;white-space:nowrap;">ENTREGA</th>
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;">ETAPA</th>
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;">ARQUIVO</th>
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;font-family:Inter,sans-serif;">AÇÕES</th>
              </tr>
            </thead>
            <tbody>${linhasHTML}</tbody>
          </table>
        </div>`}
      </div>
    </div>`;
}

async function _laudosVer(pidx, li) {
  const p = (typeof pedidos !== 'undefined') ? pedidos[pidx] : null;
  const l = p?.laudos?.[li];
  if (!l) return;
  if (typeof _mostrarToast === 'function') _mostrarToast('Carregando PDF…', '#1a56db');
  const data = l.data || (typeof getAnexoData === 'function' ? await getAnexoData(l) : null);
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
      const data = typeof getAnexoData === 'function' ? await getAnexoData(l) : null;
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
  renderLaudos(document.querySelector('#laudos-root input')?.value);
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
    renderLaudos(document.querySelector('#laudos-root input')?.value);
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
