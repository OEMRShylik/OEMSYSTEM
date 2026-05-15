// ══════════════════════════════════════════════════
//  NOVO PEDIDO — Upload PDF → card → backend → PDFs
// ══════════════════════════════════════════════════
const BACKEND = '';  // vazio = mesmo origin (Flask serve tudo)

async function handleNovoPedidoPDF(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';

  const fileBlob = file.slice(0);

  const b64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(fileBlob);
  });

  const info = await extractPedidoInfoFromB64(b64);

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  let status = 'em-dia';
  if (info.entregaDate && info.entregaDate < hoje) status = 'atrasado';

  const pedido = {
    id:          info.pedido || Date.now().toString().slice(-6),
    cliente:     info.cliente || '(sem nome)',
    entrega:     info.entregaStr || '',
    // ── CORREÇÃO: novo pedido entra em SEPARAÇÃO (não em corte) ──
    etapa:       'separacao',
    status,
    pdfB64:      b64,
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
  const bin  = atob(b64);
  const buf  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
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

function openModal()    {}
function closeModal()   {}
function salvarPedido() {}
