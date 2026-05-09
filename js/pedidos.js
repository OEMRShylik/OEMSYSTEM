// ══════════════════════════════════════════════════
//  DETALHE DO PEDIDO
// ══════════════════════════════════════════════════
async function abrirPedido(idx) {
  currentPedidoIdx = idx;
  const p = pedidos[idx];

  // Switch screen
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-detalhe').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('detalhe-title').textContent = `Pedido #${p.id} - ${p.cliente}`;
  document.getElementById('detalhe-date').textContent = `Entrega: ${p.entrega}`;

  // Atualiza label do botão avançar/capturar baseado na etapa
  const btnAv = document.getElementById('btn-avancar-evidencia');
  if (btnAv) {
    if (p.etapa === 'embalagem') {
      btnAv.innerHTML = '📷 CAPTURAR EVIDÊNCIA';
    } else {
      const proxEtapa = {corte:'Prensagem', prensagem:'Embalagem'}[p.etapa] || 'Avançar';
      btnAv.innerHTML = `▶ AVANÇAR PARA ${proxEtapa.toUpperCase()}`;
    }
  }

  // amostras state
  const iniciado = p.iniciado;
  document.getElementById('btn-iniciar-wrap').style.display = iniciado ? 'none' : 'flex';
  document.getElementById('amostras-section').style.display = iniciado ? 'block' : 'none';
  if (iniciado) renderAmostras(idx);
}

function voltarPedidos() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-pedidos').classList.add('active');
  document.querySelectorAll('.nav-item').forEach((n,i) => { if(i===0) n.classList.add('active'); });
  currentPedidoIdx = null;
  renderKanban();
}

// ── Amostras ──
function iniciarAmostras() {
  pedidos[currentPedidoIdx].iniciado = true;
  pedidos[currentPedidoIdx].amostrasVals = Array(pedidos[currentPedidoIdx].amostras).fill(0);
  document.getElementById('btn-iniciar-wrap').style.display = 'none';
  document.getElementById('amostras-section').style.display = 'block';
  renderAmostras(currentPedidoIdx);
}

function renderAmostras(idx) {
  const p = pedidos[idx];
  const total = p.amostras;
  const vals = p.amostrasVals;
  const edited = vals.filter(v => v > 0).length;
  const restantes = total - edited;
  document.getElementById('amostras-restantes').textContent = `${restantes} AMOSTRAS RESTANTES`;

  const grid = document.getElementById('amostras-grid');
  grid.innerHTML = Array.from({length: total}, (_,i) => {
    const val = vals[i] ?? 0;
    const isFilled = val > 0;
    return `
      <div class="amostra-card ${isFilled ? 'filled' : ''}" id="acard-${i}">
        <div class="amostra-label">AMOSTRA ${String(i+1).padStart(2,'0')}</div>
        ${isFilled ? '<span class="amostra-check">✓</span>' : ''}
        <div class="amostra-controls">
          <button class="amostra-btn" onclick="adjAmostra(${i}, -0.01)">−</button>
          <div>
            <input
              class="amostra-val"
              id="aval-${i}"
              type="number"
              step="0.01"
              min="0"
              value="${val.toFixed(2)}"
              style="
                width:48px;
                border:none;
                background:transparent;
                font-size:16px;
                font-weight:700;
                font-family:Inter,sans-serif;
                color:var(--text);
                text-align:center;
                outline:none;
                -moz-appearance:textfield;
              "
              oninput="setAmostra(${i}, this.value)"
              onfocus="this.select()"
            >
            <div class="amostra-unit">mm</div>
          </div>
          <button class="amostra-btn" onclick="adjAmostra(${i}, +0.01)">+</button>
        </div>
      </div>
    `;
  }).join('');
}

function adjAmostra(i, delta) {
  const p = pedidos[currentPedidoIdx];
  const cur = p.amostrasVals[i] ?? 0;
  const next = Math.max(0, Math.round((cur + delta) * 100) / 100);
  p.amostrasVals[i] = next;
  const input = document.getElementById('aval-'+i);
  if (input) input.value = next.toFixed(2);
  _updateAmostrasCard(i, next);
}

function setAmostra(i, rawVal) {
  const p = pedidos[currentPedidoIdx];
  const num = parseFloat(rawVal);
  p.amostrasVals[i] = isNaN(num) ? 0 : Math.max(0, Math.round(num * 100) / 100);
  _updateAmostrasCard(i, p.amostrasVals[i]);
}

function _updateAmostrasCard(i, val) {
  const p = pedidos[currentPedidoIdx];
  const card = document.getElementById('acard-'+i);
  if (!card) return;
  const isFilled = val > 0;
  card.classList.toggle('filled', isFilled);
  let check = card.querySelector('.amostra-check');
  if (isFilled && !check) {
    check = document.createElement('span');
    check.className = 'amostra-check'; check.textContent = '✓';
    card.insertBefore(check, card.children[1]);
  } else if (!isFilled && check) {
    check.remove();
  }
  const edited = p.amostrasVals.filter(v => v > 0).length;
  document.getElementById('amostras-restantes').textContent = `${p.amostras - edited} AMOSTRAS RESTANTES`;
}

