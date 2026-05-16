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

  // ── Verificar se pedido já existe ──────────────────
  if (info.pedido) {
    const existente = pedidos.find(p => p.id === info.pedido);
    if (existente) {
      _mostrarAvisoDuplicado(info.pedido, existente.cliente, existente.etapa);
      return;
    }
  }

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  let status = 'em-dia';
  if (info.entregaDate && info.entregaDate < hoje) status = 'atrasado';

  const pedido = {
    id:          info.pedido || Date.now().toString().slice(-6),
    cliente:     info.cliente || '(sem nome)',
    entrega:     info.entregaStr || '',
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

    // Registrar pedido no report.json (qtd calculada do PDF, fat=null para preencher depois)
    _registrarPedidoReport(pedido, b64);

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

// ── Registrar pedido no report.json ─────────────────
async function _registrarPedidoReport(pedido, b64) {
  try {
    const entrega = pedido.entrega || '';
    const parts   = entrega.split('/');
    const mes     = parts.length >= 3 ? parts[1].padStart(2,'0') : '';
    const ano     = parts.length >= 3 ? parseInt(parts[2]) : new Date().getFullYear();

    const MESES = {
      '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril',
      '05':'Maio','06':'Junho','07':'Julho','08':'Agosto',
      '09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro'
    };

    await fetch('/registrar_pedido_report', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        data:     b64,
        pedido:   pedido.id,
        cliente:  pedido.cliente,
        ano,
        mes,
        mes_nome: MESES[mes] || '',
      }),
    });
    console.log('[report] registrado #' + pedido.id);
  } catch(e) {
    console.warn('[report] erro ao registrar:', e);
  }
}

// ── Aviso de pedido duplicado ────────────────────────
function _mostrarAvisoDuplicado(numPedido, cliente, etapa) {
  // Remove aviso anterior se existir
  const old = document.getElementById('aviso-duplicado');
  if (old) old.remove();

  const ETAPA_LABEL = {
    separacao:  'Separação',
    inspecao:   'Inspeção',
    corte:      'Corte',
    prensagem:  'Prensagem',
    embalagem:  'Embalagem',
    finalizado: 'Finalizado',
  };

  const modal = document.createElement('div');
  modal.id = 'aviso-duplicado';
  modal.style.cssText = [
    'position:fixed', 'inset:0', 'background:rgba(0,0,0,.45)',
    'z-index:99999', 'display:flex', 'align-items:center', 'justify-content:center',
    'backdrop-filter:blur(3px)',
  ].join(';');

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:380px;max-width:92vw;
                overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.25);
                font-family:Inter,sans-serif;animation:upcIn .18s ease;">
      <!-- Header laranja (atenção, não erro crítico) -->
      <div style="background:linear-gradient(135deg,#f59e0b,#d97706);
                  padding:20px 20px 16px;display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:28px;line-height:1;">⚠️</span>
        <div>
          <div style="font-size:16px;font-weight:800;color:#fff;">Pedido já existe</div>
          <div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:3px;">
            O pedido #${numPedido} já está cadastrado no sistema.
          </div>
        </div>
      </div>
      <!-- Corpo -->
      <div style="padding:18px 20px 20px;">
        <div style="background:#fffbeb;border:1.5px solid #fde047;border-radius:10px;
                    padding:12px 14px;margin-bottom:16px;display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;font-weight:700;color:#92400e;
                         text-transform:uppercase;letter-spacing:.5px;">Pedido</span>
            <span style="font-family:'Courier New',monospace;font-size:14px;
                         font-weight:800;color:#111;">#${numPedido}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;font-weight:700;color:#92400e;
                         text-transform:uppercase;letter-spacing:.5px;">Cliente</span>
            <span style="font-size:13px;font-weight:700;color:#111;">${cliente || '—'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;font-weight:700;color:#92400e;
                         text-transform:uppercase;letter-spacing:.5px;">Etapa atual</span>
            <span style="font-size:12px;font-weight:700;color:#111;
                         background:#f3f4f6;padding:2px 10px;border-radius:8px;">
              ${ETAPA_LABEL[etapa] || etapa || '—'}
            </span>
          </div>
        </div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:16px;line-height:1.5;">
          Não é possível criar dois cards para o mesmo pedido.<br>
          Localize o pedido existente no kanban para continuar.
        </div>
        <div style="display:flex;gap:10px;">
          <button onclick="document.getElementById('aviso-duplicado').remove()"
            style="flex:1;padding:11px;border:1.5px solid #e5e7eb;border-radius:10px;
                   background:#fff;color:#374151;font-size:13px;font-weight:700;
                   cursor:pointer;font-family:Inter,sans-serif;">
            Fechar
          </button>
          <button onclick="_irParaPedidoExistente('${numPedido}')"
            style="flex:1;padding:11px;border:none;border-radius:10px;
                   background:#f59e0b;color:#fff;font-size:13px;font-weight:700;
                   cursor:pointer;font-family:Inter,sans-serif;">
            Ver pedido
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function _irParaPedidoExistente(numPedido) {
  document.getElementById('aviso-duplicado')?.remove();

  // Navega para a tela de pedidos
  const navPedidos = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (navPedidos && typeof navTo === 'function') navTo('pedidos', navPedidos);

  // Destaca o card no kanban após um instante
  setTimeout(() => {
    const cards = document.querySelectorAll('.pedido-card');
    cards.forEach(card => {
      const numEl = card.querySelector('.pedido-num');
      if (numEl && numEl.textContent.includes(numPedido)) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.outline = '3px solid #f59e0b';
        card.style.transition = 'outline .3s';
        setTimeout(() => { card.style.outline = ''; }, 2500);
      }
    });
  }, 150);
}
