// ══════════════════════════════════════════════════
//  DESCASQUE
// ══════════════════════════════════════════════════
function renderDescasque() {
  const tb = document.getElementById('desc-tbody');
  tb.innerHTML = DESCASQUE.map(r=>`
    <tr>
      <td class="td-code">${r.capa}</td>
      <td class="td-num">${r.ext??'—'}</td>
      <td class="td-num" style="color:#6b7280">${r.int??'—'}</td>
    </tr>
  `).join('');
}

