// ══════════════════════════════════════════════════
//  DESCASQUE
// ══════════════════════════════════════════════════
function renderDescasque() {
  const tb = document.getElementById('desc-tbody');
  tb.innerHTML = DESCASQUE.map(r=>`
    <tr>
      <td style="white-space:nowrap;padding:6px 14px;font-weight:700;">${r.capa}</td>
      <td style="white-space:nowrap;padding:6px 14px;text-align:center;">${r.ext??'—'}</td>
      <td style="white-space:nowrap;padding:6px 14px;text-align:center;color:#6b7280;">${r.int??'—'}</td>
    </tr>
  `).join('');
}
