// ══════════════════════════════════════════════════
//  NOVO PEDIDO — Upload PDF → card → backend → PDFs
// ══════════════════════════════════════════════════
const BACKEND = '';  // vazio = mesmo origin (Flask serve tudo)

async function handleNovoPedidoPDF(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  // Lê o arquivo como Blob — evita problemas de ArrayBuffer detached
  const fileBlob = file.slice(0);

  // Converte para base64 via FileReader (mais confiável que btoa+ArrayBuffer)
  const b64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(fileBlob);
  });

  // Extrai info do PDF via PDF.js usando o b64 já gerado
  const info = await extractPedidoInfoFromB64(b64);

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  let status = 'em-dia';
  if (info.entregaDate && info.entregaDate < hoje) status = 'atrasado';

  const pedido = {
    id:          info.pedido || Date.now().toString().slice(-6),
    cliente:     info.cliente || '(sem nome)',
    entrega:     info.entregaStr || '',
    etapa:       'corte',
    status,
    pdfB64:      b64,          // guarda b64 para reusar
    entregaDate: info.entregaDate,
    processing:  true,
    anexos:      {},
  };

  pedidos.unshift(pedido);
  renderKanban();

  try {
    const resp = await fetch('/processar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ data: b64, filename: file.name }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();

    // Atualiza metadados com dados do backend (mais precisos)
    if (data.meta?.pedido)  pedido.id      = data.meta.pedido;
    if (data.meta?.cliente) pedido.cliente = data.meta.cliente
      .replace(/\s*-?\s*[\d.\/\-]{8,}\s*$/, '').trim().split(/\s+/)[0];
    if (data.meta?.data)    pedido.entrega = data.meta.data;

    if (data.op_organizado) {
      pedido.pdfB64    = data.op_organizado.data;
      pedido.anexos.op = { filename: data.op_organizado.filename, data: data.op_organizado.data };
    }
    if (data.etiquetas_modulo?.length) pedido.anexos.kits     = data.etiquetas_modulo;
    if (data.etiqueta_embalagem)       pedido.anexos.embalagem = data.etiqueta_embalagem;
    if (data.etiqueta_corte)           pedido.anexos.corte     = data.etiqueta_corte;

    if (data.op_error)        console.warn('[backend] op_error:',        data.op_error);
    if (data.modulo_error)    console.warn('[backend] modulo_error:',    data.modulo_error);
    if (data.embalagem_error) console.warn('[backend] embalagem_error:', data.embalagem_error);
    if (data.corte_error)     console.warn('[backend] corte_error:',     data.corte_error);

  } catch(e) {
    console.error('Backend erro:', e);
    pedido._backendErr = e.message;
  } finally {
    pedido.processing = false;
    renderKanban();
    if (currentPedidoIdx !== null && pedidos[currentPedidoIdx] === pedido) {
      _renderBotoesGerados(pedido);
    }
  }
}

// Extrai info usando b64 já gerado — evita múltiplas leituras do arquivo
async function extractPedidoInfoFromB64(b64) {
  const info = { pedido:'', cliente:'', entregaStr:'', entregaDate:null };
  if (typeof pdfjsLib === 'undefined') return info;
  try {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const maxPages = Math.min(pdf.numPages, 5);
    for (let p = 1; p <= maxPages; p++) {
      const page    = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text    = content.items.map(i => i.str).join(' ');
      if (!info.pedido) {
        const m = text.match(/NRO\s+PEDIDO\s*:\s*(\d{6})/i);
        if (m) info.pedido = m[1];
      }
      if (!info.cliente) {
        const m = text.match(/Nome\s+Cliente\s*:\s*(.+?)(?:\s{2,}|\s*-\s*[\d.\/]+|$)/i);
        if (m) info.cliente = m[1].replace(/\s*-?\s*[\d.\/\-]+\s*$/, '').trim().split(/\s+/)[0];
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
  } catch(e) { console.warn('extractPedidoInfoFromB64:', e); }
  return info;
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
  if (tipo === 'op' && p.anexos.op)               { filename = p.anexos.op.filename;              b64 = p.anexos.op.data; }
  else if (tipo === 'kit' && p.anexos.kits?.[kitIdx]) { filename = p.anexos.kits[kitIdx].filename; b64 = p.anexos.kits[kitIdx].data; }
  else if (tipo === 'embalagem' && p.anexos.embalagem) { filename = p.anexos.embalagem.filename;   b64 = p.anexos.embalagem.data; }
  else if (tipo === 'corte' && p.anexos.corte)    { filename = p.anexos.corte.filename;             b64 = p.anexos.corte.data; }
  else return;

  const blob = new Blob([_b64toArrayBuffer(b64)], {type:'application/pdf'});
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

async function extractPedidoInfo(arrayBuf) {
  const info = { pedido:'', cliente:'', entregaStr:'', entregaDate:null };
  if (typeof pdfjsLib === 'undefined') return info;
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
    const maxPages = Math.min(pdf.numPages, 5);
    for (let p = 1; p <= maxPages; p++) {
      const page    = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text    = content.items.map(i => i.str).join(' ');

      if (!info.pedido) {
        const m = text.match(/NRO\s+PEDIDO\s*:\s*(\d{6})/i);
        if (m) info.pedido = m[1];
      }
      if (!info.cliente) {
        const m = text.match(/Nome\s+Cliente\s*:\s*(.+?)(?:\s{2,}|\s*-\s*[\d.\/]+|$)/i);
        if (m) info.cliente = m[1].replace(/\s*-?\s*[\d.\/\-]+\s*$/, '').trim().split(/\s+/)[0];
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

// Stubs para compatibilidade
function openModal()       {}
function closeModal()      {}
function salvarPedido()    {}
