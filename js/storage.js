// ══════════════════════════════════════════════════
//  STORAGE v2  OEM RS
//
//  ANTES: 1 pedido = ~2 MB no JSON (PDFs em base64)
//         10 pedidos = ~20 MB  → localStorage quebra
//
//  DEPOIS: 1 pedido = ~300 bytes no JSON
//          PDFs salvos como arquivos físicos no servidor
//          Reducao: ~99% no tamanho do estado
// ══════════════════════════════════════════════════

const STORAGE_KEY = 'oem_v2';  // chave nova (limpa o legado)
const _PDF_CACHE  = {};         // cache em memória: filename → base64

// ──────────────────────────────────────────────────
//  API DE PDFs (servidor)
// ──────────────────────────────────────────────────

async function _salvarPdfFisico(filename, b64) {
  if (!filename || !b64) return false;
  try {
    const r = await fetch('/salvar_pdf', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ filename, data: b64 }),
    });
    if (r.ok) { _PDF_CACHE[filename] = b64; return true; }
  } catch (e) { console.warn('[pdf] salvar', filename, e); }
  return false;
}

async function carregarPdf(filename) {
  if (!filename)             return null;
  if (_PDF_CACHE[filename])  return _PDF_CACHE[filename];
  try {
    const r = await fetch('/pdf/' + encodeURIComponent(filename));
    if (r.ok) {
      const j = await r.json();
      if (j.data) { _PDF_CACHE[filename] = j.data; return j.data; }
    }
  } catch (e) { console.warn('[pdf] carregar', filename, e); }
  return null;
}

// Acesso lazy ao PDF de um pedido
async function getPdfB64(p) {
  if (p.pdfB64)       return p.pdfB64;
  if (!p._pdfFilename) return null;
  const b64 = await carregarPdf(p._pdfFilename);
  if (b64) p.pdfB64 = b64;
  return b64;
}

// Acesso lazy a qualquer anexo
async function getAnexoData(anexo) {
  if (!anexo)          return null;
  if (anexo.data)      return anexo.data;
  if (!anexo.filename) return null;
  const b64 = await carregarPdf(anexo.filename);
  if (b64) anexo.data = b64;
  return b64;
}

// Expõe globalmente
window.carregarPdf   = carregarPdf;
window.getPdfB64     = getPdfB64;
window.getAnexoData  = getAnexoData;

// ──────────────────────────────────────────────────
//  SERIALIZAR — monta JSON compacto sem base64
// ──────────────────────────────────────────────────

function _serializar(p) {
  const refs = {};
  if (p._pdfFilename)              refs.op   = p._pdfFilename;
  else if (p.id)                   refs.op   = p.id + '.pdf';
  if (p.anexos?.op?.filename)      refs.op   = p.anexos.op.filename;
  if (p.anexos?.kits?.length)      refs.kits = p.anexos.kits.map(k => k.filename).filter(Boolean);
  if (p.anexos?.embalagem?.filename) refs.emb = p.anexos.embalagem.filename;
  if (p.anexos?.corte?.filename)   refs.crt  = p.anexos.corte.filename;
  if (p._sepFilename)              refs.sep  = p._sepFilename;

  const o = {
    id: p.id,
    c:  p.cliente,
    e:  p.entrega  || '',
    et: p.etapa    || 'separacao',
    s:  p.status   || 'em-dia',
  };
  if (Object.keys(refs).length)   o.refs   = refs;
  if (p.pendencias?.length)       o.pend   = p.pendencias;
  if (p.amostragens)              o.amst   = p.amostragens;
  if (p.amostragens_operador)     o.amst_o = p.amostragens_operador;
  if (p.amostragens_ts)           o.amst_t = p.amostragens_ts;
  if (p._iniciado)                o.ini    = 1;
  if (p.paginasOP?.length)        o.pags   = p.paginasOP;
  return o;
}

// ──────────────────────────────────────────────────
//  DESSERIALIZAR — reconstrói pedido a partir do JSON
// ──────────────────────────────────────────────────

function _desserializar(raw) {
  const p = {
    id:                  raw.id,
    cliente:             raw.c,
    entrega:             raw.e          || '',
    etapa:               raw.et         || 'separacao',
    status:              raw.s          || 'em-dia',
    processing:          false,
    entregaDate:         raw.e ? _parseBR(raw.e) : null,
    pendencias:          raw.pend       || [],
    amostragens:         raw.amst       || null,
    amostragens_operador: raw.amst_o   || '',
    amostragens_ts:      raw.amst_t    || null,
    _iniciado:           !!raw.ini,
    paginasOP:           raw.pags       || null,
    anexos:              {},
  };

  const refs = raw.refs || {};
  if (refs.op) {
    p._pdfFilename  = refs.op;
    p.anexos.op     = { filename: refs.op,  data: null, _lazy: true };
  }
  if (refs.kits?.length) {
    p.anexos.kits = refs.kits.map(f => ({ filename: f, data: null, _lazy: true }));
  }
  if (refs.emb) {
    p.anexos.embalagem = { filename: refs.emb, data: null, _lazy: true };
  }
  if (refs.crt) {
    p.anexos.corte = { filename: refs.crt, data: null, _lazy: true };
  }
  if (refs.sep) {
    p._sepFilename = refs.sep;
  }
  return p;
}

function _parseBR(str) {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  return (d && m && y) ? new Date(`${y}-${m}-${d}T12:00`) : null;
}

// ──────────────────────────────────────────────────
//  SALVAR ESTADO
// ──────────────────────────────────────────────────

async function salvarEstado() {
  // 1. Persiste PDFs novos como arquivos fisicos
  await Promise.all(pedidos.map(async p => {
    // PDF original
    if (p.pdfB64 && !p._pdfSalvo) {
      const fn = p.id + '.pdf';
      if (await _salvarPdfFisico(fn, p.pdfB64)) {
        p._pdfFilename = fn;
        p._pdfSalvo    = true;
      }
    }
    // OP reorganizada
    const op = p.anexos?.op;
    if (op?.data && !op._salvo)
      if (await _salvarPdfFisico(op.filename, op.data)) op._salvo = true;

    // Kits
    for (const k of (p.anexos?.kits || []))
      if (k.data && !k._salvo)
        if (await _salvarPdfFisico(k.filename, k.data)) k._salvo = true;

    // Embalagem
    const emb = p.anexos?.embalagem;
    if (emb?.data && !emb._salvo)
      if (await _salvarPdfFisico(emb.filename, emb.data)) emb._salvo = true;

    // Corte
    const crt = p.anexos?.corte;
    if (crt?.data && !crt._salvo)
      if (await _salvarPdfFisico(crt.filename, crt.data)) crt._salvo = true;

    // Separacao
    if (p.pdfSepData && !p._sepSalvo) {
      const fn = p.id + '_sep.pdf';
      if (await _salvarPdfFisico(fn, p.pdfSepData)) {
        p._sepFilename = fn;
        p._sepSalvo    = true;
      }
    }
  }));

  // 2. Estado compacto (sem nenhum base64)
  const estado = {
    v:    2,
    ts:   new Date().toISOString(),
    cal:  [calYear, calMonth],
    peds: pedidos.map(_serializar),
  };

  const json = JSON.stringify(estado);
  console.debug('[storage] ' + (json.length / 1024).toFixed(1) + ' KB, ' + pedidos.length + ' pedidos');

  // 3. Servidor
  let ok = false;
  try {
    const r = await fetch('/salvar_estado', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    json,
    });
    ok = r.ok;
  } catch (e) { console.warn('[storage] servidor:', e); }

  // 4. Fallback local (agora cabe facilmente, sem PDFs)
  if (!ok) {
    try {
      localStorage.setItem(STORAGE_KEY, json);
      _toast('Salvo localmente', '#d97706');
    } catch (e) {
      console.error('[storage] localStorage:', e);
      _toast('Erro ao salvar', '#dc2626');
    }
  }

  return ok;
}

// ──────────────────────────────────────────────────
//  CARREGAR ESTADO
// ──────────────────────────────────────────────────

async function carregarEstado() {
  let estado = null;

  // 1. Servidor
  try {
    const r = await fetch('/carregar_estado');
    if (r.ok) estado = await r.json();
  } catch (e) { console.warn('[storage] servidor offline, tentando local'); }

  // 2. localStorage
  if (!estado) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) estado = JSON.parse(raw);
    } catch (e) {}
  }

  // 3. Migra estado legado (v1 com base64 embutido)
  if (!estado) estado = _lerLegado();

  if (!estado) return false;

  const rawPeds = estado.peds || estado.pedidos || [];
  if (!rawPeds.length) return false;

  if (estado.v >= 2) {
    // v2: desserializa normalmente
    pedidos = rawPeds.map(_desserializar);
    if (estado.cal?.length === 2) {
      calYear  = estado.cal[0];
      calMonth = estado.cal[1];
    }
  } else {
    // v1 legado: mantém base64 em memória, mas já coloca no cache de PDF
    pedidos = rawPeds.map(raw => {
      const p = {
        ...raw,
        processing:  false,
        entregaDate: raw.entrega ? _parseBR(raw.entrega) : null,
        anexos:      raw.anexos || {},
        pendencias:  raw.pendencias || [],
      };
      // Popula cache de PDF para que lazy-load funcione
      if (raw.pdfB64) {
        const fn = raw.id + '.pdf';
        _PDF_CACHE[fn] = raw.pdfB64;
        p._pdfFilename  = fn;
      }
      if (raw.anexos?.op?.data)
        _PDF_CACHE[raw.anexos.op.filename] = raw.anexos.op.data;
      (raw.anexos?.kits || []).forEach(k => {
        if (k.data) _PDF_CACHE[k.filename] = k.data;
      });
      if (raw.anexos?.embalagem?.data)
        _PDF_CACHE[raw.anexos.embalagem.filename] = raw.anexos.embalagem.data;
      return p;
    });
    if (estado.calYear !== undefined)  calYear  = estado.calYear;
    if (estado.calMonth !== undefined) calMonth = estado.calMonth;

    // Agenda migração para v2 (salva na próxima oportunidade)
    setTimeout(() => salvarEstado(), 2000);
  }

  return true;
}

function _lerLegado() {
  for (const key of ['index_estado', 'oem_estado', 'oem_estado_v1']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      if (obj?.pedidos?.length) {
        console.log('[storage] Migrando legado:', key);
        return obj;
      }
    } catch (e) {}
  }
  return null;
}

// ──────────────────────────────────────────────────
//  TOAST
// ──────────────────────────────────────────────────

function _toast(msg, bg) {
  let el = document.getElementById('_storage_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '_storage_toast';
    Object.assign(el.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: '99999',
      padding: '10px 18px', borderRadius: '10px', fontSize: '13px',
      fontWeight: '700', fontFamily: 'Inter,sans-serif', color: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,.22)',
      transition: 'opacity .3s', pointerEvents: 'none',
    });
    document.body.appendChild(el);
  }
  el.textContent      = msg;
  el.style.background = bg;
  el.style.opacity    = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

// Compat: _mostrarToast usado em outros arquivos
function _mostrarToast(msg, cor) { _toast(msg, cor); }

// ──────────────────────────────────────────────────
//  AUTO-SAVE (a cada 3 minutos)
// ──────────────────────────────────────────────────

setInterval(() => { if (typeof pedidos !== 'undefined' && pedidos.length > 0) salvarEstado(); }, 180_000);
