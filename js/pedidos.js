// ══════════════════════════════════════════════════
//  DETALHE DO PEDIDO
// ══════════════════════════════════════════════════

let _paginasOP   = [];
let _paginaAtual = 0;

let _pdfDoc      = null;
let _pdfPage     = 1;
let _pdfB64      = null;

async function abrirPedido(idx) {
  currentPedidoIdx = idx;
  const p = pedidos[idx];

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-detalhe').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('detalhe-title').textContent = `#${p.id} — ${p.cliente}`;
  document.getElementById('detalhe-date').textContent  = p.entrega ? `Entrega: ${p.entrega}` : '';

  const badge = document.getElementById('detalhe-status-badge');
  const colorMap = {
    separacao:  'background:#eff6ff;color:#1e40af',
    inspecao:   'background:#f0fdf4;color:#166534',
    corte:      'background:#fee2e2;color:#991b1b',
    prensagem:  'background:#fef9c3;color:#854d0e',
    embalagem:  'background:#dcfce7;color:#166534',
    finalizado: 'background:#f3f4f6;color:#374151'
  };
  badge.textContent = (p.etapa || '').toUpperCase();
  badge.style.cssText = `font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;${colorMap[p.etapa]||'background:#f3f4f6;color:#374151'}`;

  _paginasOP   = p.paginasOP || [];
  _paginaAtual = 0;
  _pdfDoc      = null;
  _pdfB64      = null;
  _mostrarConteudo('');

  if (!p.paginasOP && p.pdfB64) _extrairDadosPDF(p);
}

async function _extrairDadosPDF(p) {
  try {
    const b64 = p.pdfB64;
    if (!b64) return;
    const resp = await fetch('/extrair', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ data: b64, filename: 'op.pdf' }),
    });
    if (resp.ok) {
      const data = await resp.json();
      p.paginasOP = data.paginas || [];
      _paginasOP  = p.paginasOP;
    }
  } catch(e) { console.error('Extrair:', e); }
}

function _arrayBufferToB64(buf) {
  const uint8 = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < uint8.length; i += 8192)
    bin += String.fromCharCode(...uint8.subarray(i, i + 8192));
  return btoa(bin);
}

// ══════════════════════════════════════════════════
//  INICIAR PEDIDO
// ══════════════════════════════════════════════════
function abrirIniciarPedido() {
  _paginaAtual = 0;
  _fecharViewer();
  _mostrarPaginaOP();
}

const _amostrasDB = {};

function _getAmostras(pageIdx, pg) {
  if (!_amostrasDB[pageIdx]) {
    const qty = Math.max(1, Math.min(8, Math.round(pg.item_qty || 1)));
    _amostrasDB[pageIdx] = {
      amostras: Array.from({length: qty}, () => ({
        corte: '', prensagem: '', teste: '', conferencia: '', embalagem: ''
      })),
      operador:    '',
      visualizado: false,
      ts_inicio:   null,
    };
  }
  return _amostrasDB[pageIdx];
}

function _registrarAbertura(pageIdx, pg) {
  const db = _getAmostras(pageIdx, pg);
  if (db.visualizado) return;
  db.visualizado = true;
  db.ts_inicio   = new Date().toISOString();
  db.operador    = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.nome : '';
  const etapa = pedidos[currentPedidoIdx]?.etapa || 'separacao';
  if (etapa === 'corte' && pg.corte_mm && !pg.is_index) {
    const corteStr = pg.corte_mm.toLocaleString('pt-BR', {minimumFractionDigits:3, maximumFractionDigits:3});
    db.amostras.forEach(am => { am.corte = corteStr; });
  }
  if (etapa === 'prensagem') {
    const medidaPrensagem = _buscarMedidaPrensagem(pg);
    if (medidaPrensagem !== null) {
      const medStr = medidaPrensagem.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
      db.amostras.forEach(am => { am.prensagem = medStr; });
    }
  }
}

function _buscarMedidaPrensagem(pg) {
  if (!pg.lista_itens?.length || typeof CRIMP === 'undefined') return null;
  let codigoCapa  = null;
  let codigoMang  = null;
  pg.lista_itens.forEach(it => {
    const cod = (it.codigo || '').toUpperCase();
    const desc = (it.descricao || '').toUpperCase();
    if (/^H[CLG]?CP/.test(cod) || desc.includes('CAPA') || it.unidade === 'PC' && /^HCP/.test(cod)) {
      if (!codigoCapa) codigoCapa = cod;
    }
    if (it.unidade === 'MT' || desc.includes('MANG')) {
      if (!codigoMang) codigoMang = cod;
    }
  });
  if (!codigoCapa && !codigoMang) return null;
  const row = CRIMP.find(r => {
    const capMatch  = codigoCapa ? r.capa.toUpperCase() === codigoCapa : true;
    const mangMatch = codigoMang ? r.cod.toUpperCase().startsWith(codigoMang.substring(0,4)) : true;
    return capMatch && (codigoCapa ? true : mangMatch);
  }) || CRIMP.find(r => codigoCapa && r.capa.toUpperCase() === codigoCapa);
  return row ? row.medida : null;
}

function _amostraChange(pageIdx, rowIdx, campo, val) {
  if (_amostrasDB[pageIdx]) _amostrasDB[pageIdx].amostras[rowIdx][campo] = val;
}

function _amostraAdj(pageIdx, rowIdx, campo, delta) {
  const db = _amostrasDB[pageIdx];
  if (!db) return;
  const cur = parseFloat(String(db.amostras[rowIdx][campo]).replace(/\./g,'').replace(',','.')) || 0;
  const novo = Math.round((cur + delta) * 1000) / 1000;
  db.amostras[rowIdx][campo] = novo.toLocaleString('pt-BR', {minimumFractionDigits:3, maximumFractionDigits:3});
  const el = document.getElementById(`am_${pageIdx}_${rowIdx}_${campo}`);
  if (el) el.value = db.amostras[rowIdx][campo];
}

function _operadorChange(pageIdx, val) {
  if (_amostrasDB[pageIdx]) _amostrasDB[pageIdx].operador = val;
}

function _renderAmostragens(pageIdx, pg) {
  const db     = _getAmostras(pageIdx, pg);
  const etapa  = pedidos[currentPedidoIdx]?.etapa || 'separacao';
  const colunas = ['corte','prensagem','teste','conferencia','embalagem'];
  const labels  = ['Corte','Prensagem','Teste','Conf.','Embalagem'];
  const etapaColuna = { corte:'corte', prensagem:'prensagem', embalagem:'embalagem', finalizado:null };
  const colunaAtiva = etapaColuna[etapa] || null;

  let thead = `<tr style="background:#f3f4f6;">
    <th style="padding:5px 8px;font-size:11px;color:#6b7280;font-weight:700;text-align:center;">#</th>
    ${colunas.map((c,i)=>{
      const isAtiva = c === colunaAtiva;
      return `<th style="padding:5px 8px;font-size:11px;font-weight:700;text-align:center;white-space:nowrap;color:${isAtiva?'#1a56db':'#6b7280'};">${labels[i]}${isAtiva?' ✎':''}</th>`;
    }).join('')}
  </tr>`;

  let rows = db.amostras.map((am, ri) => {
    const cells = colunas.map(campo => {
      const val = am[campo] || '';
      const isAtiva = campo === colunaAtiva;
      if (isAtiva) {
        return `<td style="padding:3px 4px;text-align:center;">
          <div style="display:flex;align-items:center;gap:2px;justify-content:center;">
            <button onclick="_amostraAdj(${pageIdx},${ri},'${campo}',-0.001)"
              style="width:22px;height:24px;background:#e5e7eb;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:900;color:#374151;padding:0;line-height:1;">−</button>
            <input id="am_${pageIdx}_${ri}_${campo}" type="text" value="${val}"
              onchange="_amostraChange(${pageIdx},${ri},'${campo}',this.value)"
              onfocus="this.select()"
              style="width:58px;text-align:center;border:1.5px solid #1a56db;border-radius:4px;padding:2px 3px;font-size:12px;font-weight:700;font-family:'Courier New',monospace;outline:none;background:#fff;">
            <button onclick="_amostraAdj(${pageIdx},${ri},'${campo}',0.001)"
              style="width:22px;height:24px;background:#e5e7eb;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:900;color:#374151;padding:0;line-height:1;">+</button>
          </div>
        </td>`;
      } else {
        const hasVal = val && val !== '';
        return `<td style="padding:3px 6px;text-align:center;">
          <span style="display:inline-block;width:56px;text-align:center;font-size:12px;font-family:'Courier New',monospace;color:${hasVal?'#111':'#d1d5db'};font-weight:${hasVal?700:400};">
            ${hasVal ? val : '—'}
          </span>
        </td>`;
      }
    }).join('');
    return `<tr style="border-top:1px solid #f3f4f6;">
      <td style="padding:3px 8px;text-align:center;font-size:11px;color:#9ca3af;font-weight:600;">${ri+1}</td>
      ${cells}
    </tr>`;
  }).join('');

  const opAtual = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.nome : '';
  let operadorHtml = `<div style="margin-top:8px;font-family:Inter,sans-serif;display:flex;flex-direction:column;gap:3px;">`;
  if (opAtual && colunaAtiva) {
    operadorHtml += `<div style="font-size:11px;color:#059669;font-weight:700;">👤 ${opAtual}</div>`;
  }
  operadorHtml += `</div>`;

  return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-top:0;">
    <div style="font-size:12px;font-weight:700;color:#374151;font-family:Inter,sans-serif;margin-bottom:6px;text-align:center;">Amostragens</div>
    <div style="overflow-x:auto;">
      <table style="border-collapse:collapse;width:100%;">
        <thead>${thead}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${operadorHtml}
  </div>`;
}

function _mostrarPaginaOP() {
  if (!_paginasOP.length) {
    _mostrarConteudo(`<div style="padding:40px;text-align:center;color:#9ca3af;font-family:'Courier New',monospace;">
      <div style="font-size:32px;margin-bottom:8px;">⏳</div>
      <div>Extraindo dados do PDF...</div>
    </div>`); return;
  }

  const pg    = _paginasOP[_paginaAtual];
  const total = _paginasOP.length;

  _registrarAbertura(_paginaAtual, pg);

  let listaHTML = '';
  if (pg.lista_itens?.length) {
    listaHTML = `
      <div style="margin:12px 0 0;">
        <table style="width:100%;border-collapse:collapse;font-family:'Courier New',monospace;font-size:13px;">
          <tbody>
            ${pg.lista_itens.map(it=>`
              <tr>
                <td style="padding:1px 12px 1px 0;white-space:nowrap;color:#333;">${String(it.quantidade.toFixed ? it.quantidade.toFixed(6) : it.quantidade).padStart(10)}</td>
                <td style="padding:1px 12px 1px 0;white-space:nowrap;font-weight:700;">${it.unidade}</td>
                <td style="padding:1px 12px 1px 0;white-space:nowrap;font-weight:700;">${it.codigo}</td>
                <td style="padding:1px 0;color:#333;">${it.descricao}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  const infoRows = [
    ['Tipo de Corte',         pg.tipo_corte],
    ['Angulo de Montagem',    pg.angulo],
    ['Embalagem Individual',  pg.embalagem],
    ['Forma de Embalagem',    pg.forma_emb],
    ['Gravação Capa',         pg.gravacao],
    ['ID Extra',              pg.id_extra],
    ['OBS',                   pg.obs],
  ];
  const infoHTML = `
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid #ccc;">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px;font-family:'Courier New',monospace;">INFORMAÇÃO PRODUTO (REGISTRO MESTRE):</div>
      ${infoRows.map(([label, val])=>`
        <div style="font-family:'Courier New',monospace;font-size:13px;margin-bottom:3px;">
          ${label} : ${val||''}
        </div>`).join('')}
    </div>`;

  const corteVal = pg.is_index
    ? '0,0000000'
    : (pg.corte_mm != null ? pg.corte_mm.toLocaleString('pt-BR',{minimumFractionDigits:7}) : '');

  const amostrasHTML = _renderAmostragens(_paginaAtual, pg);

  _mostrarConteudo(`
    <div style="display:flex;gap:0;min-height:400px;">
      <div style="flex:0.8;min-width:0;background:#fff;border-right:1px solid #e5e7eb;padding:14px 16px;font-family:'Courier New',monospace;overflow-x:auto;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
          <div style="font-size:12px;"><span>ITEM A PRODUZIR: </span><strong>${pg.item_codigo||'—'}</strong></div>
          <div style="font-size:12px;"><span>QUANTIDADE: </span><strong>${pg.item_qty!=null?Number(pg.item_qty).toFixed(2):''}</strong></div>
        </div>
        ${pg.descricao?`<div style="font-weight:700;font-size:13px;margin-bottom:10px;">${pg.descricao}</div>`:''}
        <div style="font-weight:700;font-size:12px;margin-bottom:10px;">
          TAMANHO DE CORTE (Em Milímetros): ${corteVal}
        </div>
        ${listaHTML}
        <div style="border-top:1px solid #999;margin:16px 0;"></div>
        ${infoHTML}
      </div>
      <div style="width:420px;flex-shrink:0;padding:14px 12px;background:#f9fafb;overflow-x:auto;" id="painel-amostras-${_paginaAtual}">
        ${amostrasHTML}
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:#fff;border-top:1px solid #e5e7eb;position:sticky;bottom:0;">
      <button onclick="_pgAnterior()" ${_paginaAtual===0?'disabled':''}
        style="padding:9px 20px;background:${_paginaAtual===0?'#e5e7eb':'#1a56db'};color:${_paginaAtual===0?'#9ca3af':'#fff'};border:none;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:${_paginaAtual===0?'default':'pointer'};">
        ← Anterior
      </button>
      <span style="font-size:12px;color:#6b7280;font-family:Inter,sans-serif;">${_paginaAtual+1} / ${total}</span>
      ${_paginaAtual===total-1
        ? `<button onclick="_concluirPedido()"
            style="padding:9px 20px;background:#059669;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;">
            ✓ Concluir
          </button>`
        : `<button onclick="_pgProxima()"
            style="padding:9px 20px;background:#1a56db;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;">
            Próxima →
          </button>`
      }
    </div>`);
}

function _pgAnterior() { if(_paginaAtual>0){_paginaAtual--;_mostrarPaginaOP();} }
function _pgProxima()  { if(_paginaAtual<_paginasOP.length-1){_paginaAtual++;_mostrarPaginaOP();} }

function _concluirPedido() {
  const p = pedidos[currentPedidoIdx];
  if (!p) return;
  p.etapa = 'prensagem';
  p.amostragens = JSON.parse(JSON.stringify(_amostrasDB));
  p.amostragens_operador = typeof currentUser !== 'undefined' && currentUser ? currentUser.nome : '';
  p.amostragens_ts = new Date().toISOString();
  salvarEstado();
  renderKanban();
  _mostrarConteudo(`<div style="padding:48px;text-align:center;font-family:Inter,sans-serif;">
    <div style="font-size:48px;margin-bottom:12px;">✅</div>
    <div style="font-size:18px;font-weight:800;color:#059669;margin-bottom:6px;">Pedido Concluído!</div>
    <div style="font-size:14px;color:#6b7280;">Movido para PRENSAGEM</div>
  </div>`);
  setTimeout(() => voltarPedidos(), 1800);
}

// ══════════════════════════════════════════════════
//  SEPARAÇÃO
// ══════════════════════════════════════════════════
function abrirSeparacao() {
  _fecharViewer();
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  const conteudo = document.getElementById('detalhe-conteudo');
  if (!conteudo) return;
  conteudo.innerHTML = '';

  if (p.pdfSepData) {
    abrirPdfViewer('Separação — #' + p.id + '.pdf', p.pdfSepData);
    return;
  }

  // Sem PDF: área para anexar
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
//  ETIQUETAS DO PEDIDO (kits)
// ══════════════════════════════════════════════════
function abrirEtiqPedido() {
  _fecharViewer();
  const p    = pedidos[currentPedidoIdx];
  const kits = p.anexos?.kits;
  if (p.processing) { _mostrarConteudo(_msgAguardando('Etiquetas do Pedido','Processando PDF...')); return; }
  if (!kits?.length) { _mostrarConteudo(_msgAguardando('Etiquetas do Pedido','Nenhuma etiqueta gerada.')); return; }
  _mostrarConteudo('');
  abrirPdfViewer(kits[0].filename, kits[0].data);
}

// ══════════════════════════════════════════════════
//  ETIQUETA DE EMBALAGEM
// ══════════════════════════════════════════════════
function abrirEtiqEmbalagem() {
  _fecharViewer();
  const p   = pedidos[currentPedidoIdx];
  const emb = p.anexos?.embalagem;
  if (p.processing) { _mostrarConteudo(_msgAguardando('Etiqueta de Embalagem','Processando PDF...')); return; }
  if (!emb)         { _mostrarConteudo(_msgAguardando('Etiqueta de Embalagem','Nenhuma etiqueta gerada.')); return; }
  _mostrarConteudo('');
  abrirPdfViewer(emb.filename, emb.data);
}

// ══════════════════════════════════════════════════
//  ORDEM DE PRODUÇÃO
// ══════════════════════════════════════════════════
function abrirOP() {
  _fecharViewer();
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;

  const conteudo = document.getElementById('detalhe-conteudo');
  if (!conteudo) return;
  conteudo.innerHTML = '';

  // Apenas o visualizador de PDF — sem painel de falta de estoque
  const pdfB64 = _getPdfOp(p);
  abrirPdfViewer(
    (p.anexos?.op?.filename || ('OP_' + p.id + '.pdf')),
    pdfB64
  );
}

// ══════════════════════════════════════════════════
//  VISUALIZADOR DE PDF UNIFICADO
//  Fundo cinza escuro (#525659), botões Imprimir / Baixar,
//  contador de páginas — igual ao visualizador de etiquetas
// ══════════════════════════════════════════════════
async function abrirPdfViewer(filename, b64) {
  _pdfB64  = b64;
  _pdfPage = 1;

  // Mobile: tela cheia
  if (window.innerWidth < 768) {
    _abrirPdfMobile(filename, b64);
    return;
  }

  const area = document.getElementById('detalhe-conteudo');
  const existingViewer = document.getElementById('inline-pdf-viewer');
  if (existingViewer) existingViewer.remove();

  const viewer = document.createElement('div');
  viewer.id = 'inline-pdf-viewer';
  viewer.style.cssText = 'background:#525659;padding:0;display:flex;flex-direction:column;flex:1;min-height:0;';

  // ── Header idêntico ao das etiquetas (Imprimir + Baixar + ×) ──
  viewer.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,0,0,.35);flex-shrink:0;gap:8px;">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
        <span style="font-size:12px;font-weight:600;color:#fff;font-family:Inter,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${filename}</span>
        <span id="ipdf-page-count" style="background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:700;padding:2px 9px;border-radius:10px;font-family:Inter,sans-serif;white-space:nowrap;flex-shrink:0;">…</span>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button id="ipdf-print-btn"
          style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:none;color:#fff;padding:6px 13px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.25)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">
          🖨️ Imprimir
        </button>
        <button onclick="_dlB64('${filename.replace(/'/g,"\\'")}',_pdfB64)"
          style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:none;color:#fff;padding:6px 13px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.25)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">
          ⬇ Baixar
        </button>
        <button onclick="_fecharViewer()"
          style="background:rgba(220,50,50,.45);border:none;color:#fff;width:30px;height:30px;border-radius:50%;font-size:17px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .15s;"
          onmouseover="this.style.background='rgba(220,50,50,.7)'" onmouseout="this.style.background='rgba(220,50,50,.45)'">×</button>
      </div>
    </div>
    <div id="ipdf-pages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;align-items:center;padding:14px;"></div>`;

  area.appendChild(viewer);
  viewer.scrollIntoView({ behavior:'smooth' });

  if (!b64) {
    document.getElementById('ipdf-pages').innerHTML = `
      <div style="padding:48px;text-align:center;color:rgba(255,255,255,.5);font-family:Inter,sans-serif;">
        <div style="font-size:40px;margin-bottom:8px;">📄</div>
        <div>Nenhum PDF disponível</div>
      </div>`;
    document.getElementById('ipdf-page-count').textContent = '0 páginas';
    return;
  }

  try {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    _pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
    _pdfDoc._b64 = b64;

    const pagesEl = document.getElementById('ipdf-pages');
    const countEl = document.getElementById('ipdf-page-count');
    const total   = _pdfDoc.numPages;
    if (countEl) countEl.textContent = `${total} ${total === 1 ? 'página' : 'páginas'}`;

    // Botão imprimir
    const printBtn = document.getElementById('ipdf-print-btn');
    if (printBtn) {
      printBtn.onclick = () => _imprimirTodasPaginas('#ipdf-pages canvas');
    }

    const maxW = (viewer.clientWidth || 800) - 28;
    const frag = document.createDocumentFragment();

    for (let pg = 1; pg <= total; pg++) {
      const page    = await _pdfDoc.getPage(pg);
      const vp0     = page.getViewport({ scale: 1 });
      const scale   = Math.min(maxW / vp0.width, 2.0);
      const vp      = page.getViewport({ scale });
      const canvas  = document.createElement('canvas');
      canvas.width  = vp.width;
      canvas.height = vp.height;
      canvas.style.cssText = 'max-width:100%;display:block;border-radius:4px;box-shadow:0 4px 16px rgba(0,0,0,.5);';

      // Contador por página
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:100%;display:flex;justify-content:center;';
      const lbl = document.createElement('div');
      lbl.style.cssText = 'position:absolute;top:6px;right:6px;background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;font-family:Inter,sans-serif;';
      lbl.textContent = `${pg} / ${total}`;
      wrap.appendChild(canvas);
      wrap.appendChild(lbl);
      frag.appendChild(wrap);

      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    }
    pagesEl.appendChild(frag);

  } catch(e) {
    console.error('PDF render:', e);
    const pagesEl = document.getElementById('ipdf-pages');
    if (pagesEl) pagesEl.innerHTML = `<div style="padding:24px;color:#f87171;font-family:Inter,sans-serif;font-size:13px;">Erro ao renderizar PDF.</div>`;
  }
}

// ── Impressão: todas as páginas renderizadas ──
function _imprimirTodasPaginas(selector) {
  const canvases = document.querySelectorAll(selector);
  if (!canvases.length) return;
  let ifr = document.getElementById('print-iframe');
  if (!ifr) {
    ifr = document.createElement('iframe');
    ifr.id = 'print-iframe';
    ifr.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(ifr);
  }
  const doc = ifr.contentDocument || ifr.contentWindow.document;
  doc.open();
  doc.write('<html><head><style>*{margin:0;padding:0;}body{background:#fff;}img{display:block;width:100%;page-break-after:always;}</style></head><body>');
  canvases.forEach(c => doc.write(`<img src="${c.toDataURL()}">`));
  doc.write('</body></html>');
  doc.close();
  setTimeout(() => { ifr.contentWindow.focus(); ifr.contentWindow.print(); }, 300);
}

// ── Mobile: tela cheia ──
async function _abrirPdfMobile(filename, b64) {
  let overlay = document.getElementById('pdf-mobile-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pdf-mobile-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#525659;display:flex;flex-direction:column;';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(0,0,0,.4);flex-shrink:0;">
      <button onclick="document.getElementById('pdf-mobile-overlay').remove()"
        style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:0 6px;">←</button>
      <div style="flex:1;font-size:13px;font-weight:600;color:#fff;font-family:Inter,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${filename}</div>
      <button id="ipdf-print-btn-mob"
        style="background:rgba(255,255,255,.15);border:none;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">🖨️</button>
      <button onclick="_dlB64('${filename.replace(/'/g,"\\'")}',_pdfB64)"
        style="background:rgba(255,255,255,.15);border:none;color:#fff;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">⬇</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:8px;background:rgba(0,0,0,.3);flex-shrink:0;">
      <button onclick="_pdfPrev()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">‹</button>
      <span id="ipdf-info" style="color:#fff;font-size:13px;font-family:Inter,sans-serif;white-space:nowrap;background:rgba(255,255,255,.15);padding:3px 12px;border-radius:12px;">1/1</span>
      <button onclick="_pdfNext()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">›</button>
    </div>
    <div style="flex:1;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:10px;">
      <canvas id="ipdf-canvas" style="max-width:100%;display:block;border-radius:4px;"></canvas>
    </div>`;

  _pdfB64  = b64;
  _pdfPage = 1;
  await _renderPdfPage();

  const printBtnM = document.getElementById('ipdf-print-btn-mob');
  if (printBtnM) {
    printBtnM.onclick = () => {
      const canvas = document.getElementById('ipdf-canvas');
      if (!canvas) return;
      _imprimirTodasPaginas('#ipdf-canvas');
    };
  }
}

async function _renderPdfPage() {
  try {
    if (!_pdfDoc || _pdfDoc._b64 !== _pdfB64) {
      const bin = atob(_pdfB64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      _pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      _pdfDoc._b64 = _pdfB64;
    }
    const page   = await _pdfDoc.getPage(_pdfPage);
    const canvas = document.getElementById('ipdf-canvas');
    if (!canvas) return;
    const maxW  = canvas.parentElement.clientWidth - 20 || 600;
    const vp0   = page.getViewport({ scale: 1 });
    const scale = Math.min(maxW / vp0.width, 2.5);
    const vp    = page.getViewport({ scale });
    canvas.width  = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const info = document.getElementById('ipdf-info');
    if (info) info.textContent = `${_pdfPage} / ${_pdfDoc.numPages}`;
  } catch(e) { console.error('PDF render:', e); }
}

function _pdfPrev() { if (_pdfPage > 1) { _pdfPage--; _renderPdfPage(); } }
function _pdfNext() { if (_pdfDoc && _pdfPage < _pdfDoc.numPages) { _pdfPage++; _renderPdfPage(); } }

function _fecharViewer() {
  const v = document.getElementById('inline-pdf-viewer');
  if (v) v.remove();
  const m = document.getElementById('pdf-mobile-overlay');
  if (m) m.remove();
}

function _dlB64(filename, b64) {
  if (!b64) return;
  const bin  = atob(b64);
  const buf  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const blob = new Blob([buf], {type:'application/pdf'});
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ── Helpers ──
function _msgAguardando(titulo, sub) {
  return `<div style="padding:32px;text-align:center;font-family:Inter,sans-serif;">
    <div style="font-size:32px;margin-bottom:8px;">⏳</div>
    <div style="font-size:15px;font-weight:700;color:#111;">${titulo}</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px;">${sub}</div>
  </div>`;
}

function _mostrarConteudo(html) {
  _fecharViewer();
  const el = document.getElementById('detalhe-conteudo');
  if (el) el.innerHTML = html;
}

function _getPdfOp(p) {
  if (!p) return null;
  if (p.anexos?.op?.data) return p.anexos.op.data;
  const campos = ['pdfB64','pdf_b64','pdf','base64','pdfBase64','arquivo','file'];
  for (const c of campos) {
    if (p[c] && typeof p[c] === 'string' && p[c].length > 200) return p[c];
  }
  for (const [key, val] of Object.entries(p)) {
    if (typeof val === 'string' && val.length > 1000 &&
        !['id','cliente','entrega','status','etapa'].includes(key) &&
        /^[A-Za-z0-9+/=]{100,}$/.test(val.slice(0, 100))) {
      return val;
    }
  }
  return null;
}

// ── Voltar ──
function voltarPedidos() {
  _fecharViewer();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-pedidos').classList.add('active');
  document.querySelectorAll('.nav-item').forEach((n,i)=>{ if(i===0) n.classList.add('active'); });
  currentPedidoIdx = null;
  renderKanban();
}

// ── Stubs ──
function iniciarAmostras()           {}
function renderAmostras(idx)         {}
function adjAmostra(i,d)             {}
function setAmostra(i,v)             {}
function _updateAmostrasCard(i,v)    {}
function avancarOuCapturar()         {}
function detalhePagePrev()           {}
function detalhePageNext()           {}
function _renderBotoesGerados(p)     {}

function anexarPdfSeparacao(event) {
  const file = event.target.files[0];
  if (!file) return;
  const idx = window._agCurrentIdx ?? window.currentPedidoIdx;
  const p   = typeof pedidos !== 'undefined' ? pedidos[idx] : null;
  if (!p) return;
  const reader = new FileReader();
  reader.onload = e => {
    p.pdfSepData = e.target.result.split(',')[1];
    if (typeof salvarEstado === 'function') salvarEstado();
    if (typeof _mostrarToast === 'function') _mostrarToast('📎 PDF de separação anexado!', '#1a56db');
    abrirSeparacao();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
