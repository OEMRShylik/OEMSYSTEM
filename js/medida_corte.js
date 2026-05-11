// ══════════════════════════════════════════════════
//  MEDIDA DE CORTE — autocomplete campo único
//  Fórmula: Comprimento Final - Terminal A - Terminal B - 10
// ══════════════════════════════════════════════════

// TERMINAIS carregados de dados.js
const TERMINAIS = window.TERMINAIS || [];

// ── Estado ──
const _mcState = { a: null, b: null, activeIdx: { a: -1, b: -1 } };

// ── Autocomplete ──

function mcAcInput(lado) {
  const q = document.getElementById('mc-input-' + lado).value.toUpperCase().trim();
  _mcState[lado] = null;                    // limpa seleção ao editar
  document.getElementById('mc-input-' + lado).classList.remove('selected');
  _mcShowDrop(lado, q);
  calcularMedidaCorte();
}

function mcAcOpen(lado) {
  const inp = document.getElementById('mc-input-' + lado);
  // Se já tem seleção, limpa o campo para digitar novo
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
  // HFJ[traço][bitola][sufixo] — pega os 2 últimos dígitos antes de letras finais
  // HFJ0606→"06", HFJ0616→"16", HFJ0606SS→"06", HFJ0808SD→"08"
  const m = cod && cod.match(/(\d{2})[A-Z]*$/);
  return m ? m[1] : null;
}

function _mcShowDrop(lado, q) {
  const drop = document.getElementById('mc-drop-' + lado);
  // Terminal B: filtra apenas terminais com mesma bitola do A
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
      // destaca o trecho digitado
      const destaque = q
        ? t.cod.replace(q, `<strong>${q}</strong>`)
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

  // Preenche o input
  const inp = document.getElementById('mc-input-' + lado);
  const medStr = t.medida != null ? '  (' + t.medida + ' mm)' : '  (sem medida)';
  inp.value = t.cod + medStr;
  inp.classList.add('selected');

  // Fecha o dropdown atual
  const drop = document.getElementById('mc-drop-' + lado);
  if (drop) drop.classList.remove('open');

  // Se selecionou Terminal A → desbloqueia e limpa Terminal B
  if (lado === 'a') {
    const inpB = document.getElementById('mc-input-b');
    if (inpB) {
      inpB.disabled = false;
      inpB.style.opacity = '1';
      inpB.style.cursor = 'text';
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

function _mcRenderTag(lado) {
  // mantido por compatibilidade — lógica migrada para mcAcSelect
}

function mcAcClear(lado) {
  _mcState[lado] = null;
  const inp = document.getElementById('mc-input-' + lado);
  inp.value = '';
  inp.classList.remove('selected');

}

// Fecha dropdown ao clicar fora
document.addEventListener('click', e => {
  ['a','b'].forEach(lado => {
    const wrap = document.getElementById('mc-wrap-' + lado);
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('mc-drop-' + lado)?.classList.remove('open');
    }
  });
});

// ── Cálculo ──
function calcularMedidaCorte() {
  const comp = parseFloat(document.getElementById('mc-comprimento')?.value);
  const tA = _mcState.a;
  const tB = _mcState.b;
  const resultBox   = document.getElementById('mc-result');
  const resultValue = document.getElementById('mc-result-value');
  const formula     = document.getElementById('mc-formula');

  if (!tA || !tB || isNaN(comp) || comp <= 0) {
    resultBox?.classList.add('hidden');
    return;
  }

  if (tA.medida == null || tB.medida == null) {
    resultBox?.classList.remove('hidden');
    resultValue.textContent = '— mm';
    resultValue.style.color = '#ef4444';
    formula.textContent = 'Terminal sem medida cadastrada';
    return;
  }

  const resultado = comp - tA.medida - tB.medida - 10;

  // Formato: vírgula como separador de milhar (ex: 2,940 mm)
  function fmtMm(val) {
    const intPart = Math.floor(Math.abs(val));
    const decPart = Math.abs(val) % 1;
    const sign = val < 0 ? '-' : '';
    // formata inteiro com vírgula a cada 3 dígitos
    const intFmt = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (decPart === 0) return sign + intFmt;
    const decStr = decPart.toFixed(1).slice(1); // ".X"
    return sign + intFmt + decStr;
  }
  const fmt = fmtMm(resultado);

  resultValue.textContent = fmt + ' mm';
  resultValue.style.color = resultado > 0 ? '#ffffff' : '#ef4444';
  formula.textContent = `${comp} − ${tA.medida} − ${tB.medida} − 10 = ${fmt} mm`;
  resultBox?.classList.remove('hidden');
}

function _mcInitLockB() {
  const inpB = document.getElementById('mc-input-b');
  if (!inpB) return;
  inpB.disabled = true;
  inpB.style.opacity = '0.4';
  inpB.style.cursor = 'not-allowed';
  inpB.placeholder = 'Selecione Terminal A primeiro...';
}

function resetMedidaCorte() {
  ['a','b'].forEach(lado => {
    _mcState[lado] = null;
    const inp = document.getElementById('mc-input-' + lado);
    if (inp) { inp.value = ''; inp.classList.remove('selected'); inp.placeholder = 'Digite o código do terminal...'; }
    document.getElementById('mc-drop-' + lado)?.classList.remove('open');
  });
  _mcInitLockB(); // Re-trava campo B
  const c = document.getElementById('mc-comprimento');
  if (c) c.value = '';
  document.getElementById('mc-result')?.classList.add('hidden');
}

// Inicializa trava do campo B
setTimeout(() => { if (typeof _mcInitLockB === 'function') _mcInitLockB(); }, 100);
