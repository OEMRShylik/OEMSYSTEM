// ══════════════════════════════════════════════════
//  NOVO PEDIDO — Upload direto de PDF + backend
// ══════════════════════════════════════════════════
const BACKEND = 'http://localhost:5050';

async function handleNovoPedidoPDF(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  // Lê o arquivo como ArrayBuffer
  const arrayBuf = await file.arrayBuffer();

  // Extrai metadados via PDF.js para criar o card imediatamente
  const info = await extractPedidoInfo(arrayBuf.slice(0));

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  let status = 'em-dia';
  if (info.entregaDate && info.entregaDate < hoje) status = 'atrasado';

  const pedido = {
    id: info.pedido || file.name.replace(/\.pdf$/i,'').slice(-6).padStart(6,'0'),
    cliente: info.cliente || '(sem nome)',
    entrega: info.entregaStr || '',
    etapa: 'corte',
    status,
    amostras: 8,
    amostrasVals: [],
    pdfData: arrayBuf,
    iniciado: false,
    entregaDate: info.entregaDate,
    processing: true,
    anexos: {},
  };
  pedidos.unshift(pedido);
  renderKanban();

  // Envia ao backend como base64 JSON (evita problema de ArrayBuffer vazio no FormData)
  try {
    // ArrayBuffer → base64 em chunks para não travar em arquivos grandes
    const uint8 = new Uint8Array(arrayBuf);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < uint8.length; i += chunk) {
      binary += String.fromCharCode(...uint8.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);

    const resp = await fetch(`${BACKEND}/processar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: b64, filename: file.name }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${txt}`);
    }

    const data = await resp.json();
    console.log('[backend]', data);

    // Atualiza metadados do backend (mais precisos que PDF.js)
    if (data.meta?.pedido) pedido.id = data.meta.pedido;
    if (data.meta?.cliente) {
      const nomeCompleto = data.meta.cliente.replace(/\s*-?\s*[\d.\/\-]+\s*$/, "").trim();
      pedido.cliente = nomeCompleto.split(/\s+/)[0];
    }
    if (data.meta?.data) pedido.entrega = data.meta.data;

    // OP organizada → vira o PDF principal do visualizador
    if (data.op_organizado) {
      pedido.pdfData = _b64toArrayBuffer(data.op_organizado.data);
      pedido.anexos.op = { filename: data.op_organizado.filename, data: data.op_organizado.data };
    }

    if (data.etiquetas_modulo?.length) pedido.anexos.kits = data.etiquetas_modulo;
    if (data.etiqueta_embalagem)       pedido.anexos.embalagem = data.etiqueta_embalagem;
    if (data.etiqueta_corte)           pedido.anexos.corte = data.etiqueta_corte;

    const erros = [data.op_error, data.modulo_error, data.embalagem_error, data.corte_error].filter(Boolean);
    if (erros.length) console.warn('Avisos backend:', erros);

  } catch(e) {
    console.error('Backend erro:', e);
    pedido._backendErr = e.message;
  } finally {
    pedido.processing = false;
    renderKanban();
    if (currentPedidoIdx === 0) abrirPedido(0);
  }
}

function _b64toArrayBuffer(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function downloadAnexo(idx, tipo, kitIdx) {
  const p = pedidos[idx];
  if (!p?.anexos) return;
  let filename, b64;
  if (tipo === 'op' && p.anexos.op) {
    filename = p.anexos.op.filename; b64 = p.anexos.op.data;
  } else if (tipo === 'kit' && p.anexos.kits?.[kitIdx]) {
    filename = p.anexos.kits[kitIdx].filename; b64 = p.anexos.kits[kitIdx].data;
  } else if (tipo === 'embalagem' && p.anexos.embalagem) {
    filename = p.anexos.embalagem.filename; b64 = p.anexos.embalagem.data;
  } else if (tipo === 'corte' && p.anexos.corte) {
    filename = p.anexos.corte.filename; b64 = p.anexos.corte.data;
  } else { return; }

  const blob = new Blob([_b64toArrayBuffer(b64)], {type:'application/pdf'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

async function extractPedidoInfo(arrayBuf) {
  const info = { pedido:'', cliente:'', entregaStr:'', entregaDate:null };
  if (typeof pdfjsLib === 'undefined') return info;
  try {
    const pdf = await pdfjsLib.getDocument({data: arrayBuf}).promise;
    const maxPages = Math.min(pdf.numPages, 5);
    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = content.items.map(i => i.str).join(' ');

      if (!info.pedido) {
        const m = text.match(/NRO\s+PEDIDO\s*:\s*(\d{6})/i);
        if (m) info.pedido = m[1];
      }
      if (!info.cliente) {
        const m = text.match(/Nome\s+Cliente\s*:\s*(.+?)(?:\s{2,}|\s*-\s*[\d.\/]+|$)/i);
        if (m) {
          // strip CNPJ tail, take first word(s)
          let nome = m[1].replace(/\s*-?\s*[\d.\/\-]+\s*$/, '').trim();
          // take up to 3 words
          info.cliente = nome.split(/\s+/)[0];
        }
      }
      if (!info.entregaStr) {
        const m = text.match(/Data\s+Entrega\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (m) {
          info.entregaStr = m[1];
          const [d,mo,y] = m[1].split('/');
          info.entregaDate = new Date(`${y}-${mo}-${d}T12:00`);
        }
      }
      if (info.pedido && info.cliente && info.entregaStr) break;
    }
  } catch(e) { console.warn('PDF extract error', e); }
  return info;
}

// ══════════════════════════════════════════════════
//  MODAL — removido, mantido vazio para compatibilidade
// ══════════════════════════════════════════════════
function openModal() {}
function closeModal() {}
function modalDragOver() {}
function modalDragLeave() {}
function modalDropPDF() {}
function modalSelectPDF() {}
function processPDFFile() {}
function salvarPedido() {}

function avancarOuCapturar() {
  const p = pedidos[currentPedidoIdx];
  const ORDEM = ['corte','prensagem','embalagem','finalizado'];
  const idxAtual = ORDEM.indexOf(p.etapa);

  if (p.etapa === 'embalagem') {
    // Capturar evidência e finalizar
    const media = p.amostrasVals.length
      ? (p.amostrasVals.reduce((a,b)=>a+b,0)/p.amostrasVals.length).toFixed(2)
      : '—';
    const txt = [
      `EVIDÊNCIA — Pedido #${p.id} - ${p.cliente}`,
      `Data: ${new Date().toLocaleString('pt-BR')}`,
      `Média: ${media} mm`,
      `Amostras: ${p.amostrasVals.map((v,i)=>`A${i+1}:${v.toFixed(2)}`).join(', ')}`,
    ].join('\n');
    const blob = new Blob([txt],{type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `evidencia_${p.id}.txt`;
    a.click();
    p.etapa = 'finalizado';
    p.status = 'finalizado';
    alert(`✅ Evidência registrada!\nPedido #${p.id} finalizado.`);
    voltarPedidos();
  } else if (idxAtual >= 0 && idxAtual < ORDEM.length - 1) {
    // Avança para próxima etapa
    p.etapa = ORDEM[idxAtual + 1];
    p.iniciado = false;
    p.amostrasVals = [];
    alert(`✅ Pedido #${p.id} avançado para ${p.etapa.toUpperCase()}.`);
    voltarPedidos();
  }
}

