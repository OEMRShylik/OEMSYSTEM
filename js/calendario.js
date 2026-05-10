// ══════════════════════════════════════════════════
init();
window.addEventListener('resize', () => {
  if (currentScreen === 'angulos') { _angDrawAll(); }
});

// ══ CALENDÁRIO / AGENDA ══
function renderCalendario() {
  const area = document.getElementById('kanban-area');
  const old = document.getElementById('kanban-calendar-col');
  if (old) old.remove();

  const col = document.createElement('div');
  col.className = 'kanban-col-calendar';
  col.id = 'kanban-calendar-col';

  const hoje = new Date();
  const mesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Mapa data → pedidos
  const dataMap = {};
  pedidos.filter(p => p.entrega).forEach(p => {
    if (!dataMap[p.entrega]) dataMap[p.entrega] = [];
    dataMap[p.entrega].push(p);
  });

  const primeiroDia = new Date(calYear, calMonth, 1);
  const ultimoDia  = new Date(calYear, calMonth + 1, 0);
  const diasNoMes  = ultimoDia.getDate();
  const inicioSemana = primeiroDia.getDay();

  col.innerHTML = `
    <div class="cal-header">
      <div class="cal-header-btn-group">
        <button class="cal-nav-btn" onclick="calNavegar(-1)">&#8249;</button>
        <button class="cal-nav-btn" onclick="calNavegar(1)">&#8250;</button>
      </div>
      <span class="cal-header-title">${mesNomes[calMonth]} ${calYear}</span>
      <button class="cal-today-btn" onclick="calIrHoje()">HOJE</button>
    </div>
    <div class="cal-weekdays">
      <div class="cal-weekday-label">Dom</div>
      <div class="cal-weekday-label">Seg</div>
      <div class="cal-weekday-label">Ter</div>
      <div class="cal-weekday-label">Qua</div>
      <div class="cal-weekday-label">Qui</div>
      <div class="cal-weekday-label">Sex</div>
      <div class="cal-weekday-label">Sáb</div>
    </div>
    <div class="cal-body" id="cal-body-grid">
      ${gerarGrade(calYear, calMonth, inicioSemana, diasNoMes, dataMap, hoje)}
    </div>
  `;

  area.appendChild(col);
}

function gerarGrade(year, month, inicioSemana, diasNoMes, dataMap, hoje) {
  const mesAnteriorDias = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = inicioSemana - 1; i >= 0; i--) {
    cells.push({ day: mesAnteriorDias - i, currentMonth: false, date: null });
  }
  for (let d = 1; d <= diasNoMes; d++) {
    const dd = String(d).padStart(2,'0');
    const mm = String(month+1).padStart(2,'0');
    cells.push({ day: d, currentMonth: true, date: `${dd}/${mm}/${year}` });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - (inicioSemana + diasNoMes) + 1, currentMonth: false, date: null });
  }

  const feriados = {
    '21/04':'Tiradentes','01/05':'Dia do Trabalho','07/09':'Independência',
    '12/10':'N.Sra.Aparecida','02/11':'Finados','15/11':'Proclamação',
    '25/12':'Natal','01/01':'Ano Novo',
  };

  let html = '';
  for (let r = 0; r < cells.length; r += 7) {
    html += '<div class="cal-week-row">';
    for (let i = r; i < r + 7; i++) {
      const cell = cells[i];
      const isHoje = cell.currentMonth &&
        cell.day === hoje.getDate() &&
        month === hoje.getMonth() &&
        year === hoje.getFullYear();
      const peds = cell.date ? (dataMap[cell.date] || []) : [];

      const feriadoKey = cell.date ? cell.date.substring(0,5) : null;
      const feriado = feriadoKey ? feriados[feriadoKey] : null;

      html += `<div class="cal-day-cell${cell.currentMonth ? '' : ' other-month'}${isHoje ? ' today' : ''}">`;
      html += `<div class="cal-day-num">${cell.day}</div>`;

      if (feriado) {
        html += `<div class="cal-event-chip feriado">${feriado}</div>`;
      }

      const MAX_VISIBLE = 3;
      peds.slice(0, MAX_VISIBLE).forEach(p => {
        // Mostra: CLIENTE completo (sem truncar no JS — o CSS faz ellipsis)
        const nomeCliente = (p.cliente || '—').toUpperCase();
        const idCurto = (p.id || '').replace('#','');
        const cls = p.etapa === 'finalizado' ? 'finalizado' : (p.status || '');
        html += `<div class="cal-event-chip ${cls}" title="#${idCurto} — ${nomeCliente}" onclick="abrirPedido(${pedidos.indexOf(p)})">
          <span class="chip-nome">#${idCurto} ${nomeCliente}</span>
        </div>`;
      });
      if (peds.length > MAX_VISIBLE) {
        html += `<div class="cal-more-link" onclick="calVerDia('${cell.date}')">+${peds.length - MAX_VISIBLE} mais</div>`;
      }

      html += '</div>';
    }
    html += '</div>';
  }
  return html;
}

function calNavegar(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendario();
}

function calIrHoje() {
  const h = new Date();
  calMonth = h.getMonth();
  calYear  = h.getFullYear();
  renderCalendario();
}

function calVerDia(dateStr) {
  alert('Pedidos em ' + dateStr);
}
