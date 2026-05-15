// ══════════════════════════════════════════════════
//  MEDIDA DE CORTE — autocomplete campo único
//  Fórmula: Comprimento Final - Terminal A - Terminal B - 10
// ══════════════════════════════════════════════════

// TERMINAIS vem de dados.js via window.TERMINAIS

// ── Estado ──
const _mcState = { a: null, b: null, activeIdx: { a: -1, b: -1 } };

// ── Autocomplete ──

function mcAcInput(lado) {
  const q = document.getElementById('mc-input-' + lado).value.toUpperCase().trim();
  _mcState[lado] = null;
  document.getElementById('mc-input-' + lado).classList.remove('selected');
  _mcShowDrop(lado, q);
  calcularMedidaCorte();
}

function mcAcOpen(lado) {
  const inp = document.getElementById('mc-input-' + lado);
  if (_mcState[lado]) {
    inp.value = '';
    inp.classList.remove('selected');
    _mcState[lado] = null;
    calcularMedidaCorte();
  }
  const q = inp.value.toUpperCase().trim();
  _mcShowDrop(lado, q);
}

function _mcGetBitola(cod) {
  const m = cod && cod.match(/(\d{2})[A-Z]*$/);
  return m ? m[1] : null;
}

function _mcShowDrop(lado, q) {
  const drop = document.getElementById('mc-drop-' + lado);
  let base = TERMINAIS;
  if (lado === 'b' && _mcState.a) {
    const bitA = _mcGetBitola(_mcState.a.cod);
    if (bitA) base = TERMINAIS.filter(t => _mcGetBitola(t.cod) === bitA);
  }
  const resultados = q.length === 0
    ? base.slice(0, 40)
    : base.filter(t => t.cod.toUpperCase().includes(q));

  if (resultados.length === 0) {
    drop.innerHTML = '<div class="mc-ac-empty">Nenhum terminal encontrado</div>';
  } else {
    drop.innerHTML = resultados.map((t, i) => {
      const medStr = t.medida != null ? `${t.medida} mm` : 'sem medida';
      const semCls = t.medida == null ? ' sem-medida' : '';
      const destaque = q
        ? t.cod.replace(new RegExp(q, 'i'), m => `<strong>${m}</strong>`)
        : t.cod;
      return `<div class="mc-ac-item${semCls}" data-idx="${i}" data-cod="${t.cod}"
                onmousedown="mcAcSelect('${lado}','${t.cod}')">
                <span class="cod">${destaque}</span>
                <span class="med">${medStr}</span>
              </div>`;
    }).join('');
  }

  _mcState.activeIdx[lado] = -1;
  drop.classList.add('open');
}

function mcAcSelect(lado, cod) {
  const t = TERMINAIS.find(x => x.cod === cod);
  if (!t) return;
  _mcState[lado] = t;

  const inp = document.getElementById('mc-input-' + lado);
  const medStr = t.medida != null ? '  (' + t.medida + ' mm)' : '  (sem medida)';
  inp.value = t.cod + medStr;
  inp.classList.add('selected');

  const drop = document.getElementById('mc-drop-' + lado);
  if (drop) drop.classList.remove('open');

  // Se selecionou Terminal A → habilita e limpa Terminal B
  if (lado === 'a') {
    const inpB = document.getElementById('mc-input-b');
    if (inpB) {
      inpB.disabled = false;
      inpB.style.opacity = '1';
      inpB.style.cursor = 'text';
      inpB.style.background = '';
      inpB.placeholder = 'Digite o código do terminal...';
      inpB.value = '';
      inpB.classList.remove('selected');
      _mcState.b = null;
    }
    const dropB = document.getElementById('mc-drop-b');
    if (dropB) dropB.classList.remove('open');
  }

  calcularMedidaCorte();
}

function mcAcKey(e, lado) {
  const drop = document.getElementById('mc-drop-' + lado);
  const items = drop.querySelectorAll('.mc-ac-item');
  let idx = _mcState.activeIdx[lado];

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    idx = Math.min(idx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    idx = Math.max(idx - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (idx >= 0 && items[idx]) {
      mcAcSelect(lado, items[idx].dataset.cod);
    } else if (items.length === 1) {
      mcAcSelect(lado, items[0].dataset.cod);
    }
    return;
  } else if (e.key === 'Escape') {
    drop.classList.remove('open');
    return;
  } else { return; }

  _mcState.activeIdx[lado] = idx;
  items.forEach((el, i) => el.classList.toggle('active', i === idx));
  if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
}

// ── Cálculo ──
function calcularMedidaCorte() {
  const compEl = document.getElementById('mc-comprimento');
  const resultBox   = document.getElementById('mc-result');
  const resultValue = document.getElementById('mc-result-value');
  const formula     = document.getElementById('mc-formula');

  const comp = compEl ? parseFloat(compEl.value) : NaN;
  const tA = _mcState.a;
  const tB = _mcState.b;

  // Esconde resultado se dados incompletos
  if (!tA || !tB || isNaN(comp) || comp <= 0) {
    if (resultBox) resultBox.classList.add('hidden');
    return;
  }

  // Mostra resultado mesmo sem medida cadastrada
  if (resultBox) resultBox.classList.remove('hidden');

  if (tA.medida == null || tB.medida == null) {
    resultValue.textContent = '— mm';
    resultValue.style.color = '#ef4444';
    formula.textContent = 'Terminal sem medida cadastrada';
    return;
  }

  const resultado = comp - tA.medida - tB.medida - 10;

  function fmtMm(val) {
    const neg = val < 0;
    const abs = Math.abs(val);
    const intPart = Math.floor(abs);
    const dec = (abs - intPart);
    const intFmt = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (Math.round(dec * 10) === 0) return (neg ? '-' : '') + intFmt;
    return (neg ? '-' : '') + intFmt + (dec.toFixed(1).slice(1));
  }

  const fmt = fmtMm(resultado);

  resultValue.textContent = fmt + ' mm';
  resultValue.style.color = resultado > 0 ? '' : '#ef4444';
  formula.textContent = `${comp} − ${tA.medida} − ${tB.medida} − 10 = ${fmt} mm`;
}

// Fecha dropdown ao clicar fora
document.addEventListener('click', e => {
  ['a','b'].forEach(lado => {
    const wrap = document.getElementById('mc-wrap-' + lado);
    if (wrap && !wrap.contains(e.target)) {
      const drop = document.getElementById('mc-drop-' + lado);
      if (drop) drop.classList.remove('open');
    }
  });
});

function resetMedidaCorte() {
  ['a','b'].forEach(lado => {
    _mcState[lado] = null;
    const inp = document.getElementById('mc-input-' + lado);
    if (inp) {
      inp.value = '';
      inp.classList.remove('selected');
      inp.disabled = false;
      inp.style.opacity = '1';
      inp.style.cursor = 'text';
      inp.style.background = '';
      inp.placeholder = 'Digite o código do terminal...';
    }
    const drop = document.getElementById('mc-drop-' + lado);
    if (drop) drop.classList.remove('open');
  });
  const c = document.getElementById('mc-comprimento');
  if (c) c.value = '';
  const r = document.getElementById('mc-result');
  if (r) r.classList.add('hidden');
}

// ── Inicializa: campo B começa visualmente desabilitado mas NÃO com disabled ──
// (disabled impede onmousedown no dropdown, quebrando a seleção)
(function _initMC() {
  function tryInit() {
    const inpB = document.getElementById('mc-input-b');
    if (!inpB) { setTimeout(tryInit, 100); return; }
    // Aparência de desabilitado via CSS, sem usar disabled
    inpB.style.opacity = '0.45';
    inpB.style.cursor = 'not-allowed';
    inpB.style.pointerEvents = 'none';
    inpB.placeholder = 'Selecione Terminal A primeiro...';
    // Quando Terminal A for selecionado, mcAcSelect('a',...) remove essas propriedades
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();

// Sobrescreve mcAcSelect para habilitar B via pointer-events (não disabled)
const _origSelect = mcAcSelect;
// Patch: ao selecionar A, restaura pointer-events do B
const _patchedSelect = function(lado, cod) {
  _origSelect(lado, cod);
  if (lado === 'a') {
    const inpB = document.getElementById('mc-input-b');
    if (inpB) {
      inpB.style.pointerEvents = '';
      inpB.style.opacity = '1';
      inpB.style.cursor = 'text';
    }
  }
};
// Substitui a função global
if (typeof window !== 'undefined') window.mcAcSelect = _patchedSelect;
