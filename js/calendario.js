// ══════════════════════════════════════════════════
//  CALENDARIO.JS  ·  OEM RS
//  Calendário de entregas em tela cheia
//  Sem conflitos de declaração com outros scripts
// ══════════════════════════════════════════════════

// Usar IIFE para encapsular e evitar conflitos de variáveis globais
(function() {

// Estado do calendário — no namespace window para acesso externo
window.CAL = window.CAL || {
  ano: new Date().getFullYear(),
  mes: new Date().getMonth(),
};

var _MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var _DIAS  = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

var _COR_ETAPA = {
  separacao : {bg:'#eff6ff', text:'#1d4ed8', border:'#bfdbfe'},
  inspecao  : {bg:'#f0fdf4', text:'#166534', border:'#bbf7d0'},
  corte     : {bg:'#fee2e2', text:'#991b1b', border:'#fca5a5'},
  prensagem : {bg:'#fef9c3', text:'#854d0e', border:'#fde047'},
  embalagem : {bg:'#fff7ed', text:'#9a3412', border:'#fdba74'},
  finalizado: {bg:'#f9fafb', text:'#6b7280', border:'#e5e7eb'},
  _default  : {bg:'#f3e8ff', text:'#6b21a8', border:'#d8b4fe'},
};

// ── Helpers ──
function _dateStr(ano, mes, dia) {
  return ano + '-' + String(mes + 1).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
}
function _qtdMangueiras(p) {
  if (!p.paginasOP || !p.paginasOP.length) return null;
  var total = 0, found = false;
  p.paginasOP.forEach(function(pg) {
    if ((pg.corte_mm || 0) > 0) { total += parseFloat(pg.item_qty) || 0; found = true; }
  });
  return found ? Math.round(total) : null;
}
function _celulaVazia() {
  var c = document.createElement('div');
  c.style.cssText = 'border-right:1px solid var(--border,#e5e7eb);border-bottom:1px solid var(--border,#e5e7eb);min-height:90px;background:#f8fafc;';
  return c;
}

// ── Navegação ──
window.calNavegar = function(delta) {
  if (delta === 0) {
    var h = new Date();
    window.CAL.ano = h.getFullYear();
    window.CAL.mes = h.getMonth();
  } else {
    window.CAL.mes += delta;
    if (window.CAL.mes > 11) { window.CAL.mes = 0;  window.CAL.ano++; }
    if (window.CAL.mes < 0)  { window.CAL.mes = 11; window.CAL.ano--; }
  }
  window.renderCalFull();
};

// ── Render principal ──
window.renderCalFull = function() {
  var root = document.getElementById('cal-root');
  if (!root) return;

  var ano = window.CAL.ano;
  var mes = window.CAL.mes;

  // Título
  var titulo = document.getElementById('cal-titulo');
  if (titulo) titulo.textContent = _MESES[mes] + ' ' + ano;

  var primeiroDia = new Date(ano, mes, 1).getDay();
  var diasNoMes   = new Date(ano, mes + 1, 0).getDate();
  var hoje        = new Date();
  var hojeStr     = _dateStr(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  // Mapear pedidos por data de entrega
  var pedidosPorDia = {};
  var mangueirasPorDia = {};
  var todosP = (typeof pedidos !== 'undefined') ? pedidos : [];
  todosP.forEach(function(p, idx) {
    if (!p.entrega) return;
    var partes = p.entrega.split('/');
    if (partes.length !== 3) return;
    var dataKey = partes[2] + '-' + partes[1].padStart(2,'0') + '-' + partes[0].padStart(2,'0');
    if (!pedidosPorDia[dataKey]) { pedidosPorDia[dataKey] = []; mangueirasPorDia[dataKey] = 0; }
    var qtd = _qtdMangueiras(p);
    pedidosPorDia[dataKey].push({p: p, idx: idx, qtdMang: qtd});
    if (qtd) mangueirasPorDia[dataKey] += qtd;
  });

  root.innerHTML = '';

  // Header dias da semana
  var header = document.createElement('div');
  header.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);border-bottom:2px solid var(--border,#e5e7eb);flex-shrink:0;background:var(--white,#fff);';
  _DIAS.forEach(function(d, i) {
    var cell = document.createElement('div');
    cell.style.cssText = 'padding:8px 4px;text-align:center;font-size:11px;font-weight:700;letter-spacing:.8px;font-family:Inter,sans-serif;color:' + (i===0||i===6 ? '#94a3b8' : '#6b7280') + ';';
    cell.textContent = d;
    header.appendChild(cell);
  });
  root.appendChild(header);

  // Grade de dias
  var grade = document.createElement('div');
  grade.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);align-content:start;';

  // Células vazias antes do primeiro dia
  for (var z = 0; z < primeiroDia; z++) grade.appendChild(_celulaVazia());

  // Dias do mês
  for (var dia = 1; dia <= diasNoMes; dia++) {
    var dataKey    = _dateStr(ano, mes, dia);
    var ehHoje     = dataKey === hojeStr;
    var ehPassado  = dataKey < hojeStr;
    var diaSemana  = (primeiroDia + dia - 1) % 7;
    var isWeekend  = diaSemana === 0 || diaSemana === 6;
    var psDoDia        = pedidosPorDia[dataKey] || [];
    var totalMangDia   = mangueirasPorDia[dataKey] || 0;
    var temPedidos     = psDoDia.length > 0;

    var cell = document.createElement('div');
    var bgCor = ehHoje ? '#eff6ff' : (ehPassado || isWeekend) ? '#fafafa' : 'var(--white,#fff)';
    cell.style.cssText = 'border-right:1px solid var(--border,#e5e7eb);border-bottom:1px solid var(--border,#e5e7eb);padding:4px 4px 6px;min-height:90px;display:flex;flex-direction:column;gap:2px;background:' + bgCor + ';' + (ehHoje ? 'outline:2px solid #1d4ed8;outline-offset:-1px;' : '');

    // Linha superior: número do dia + total de mangueiras do dia
    var topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:1px 2px 3px;';

    var numEl = document.createElement('div');
    var numCor = ehHoje ? '#fff' : ehPassado ? '#cbd5e1' : isWeekend ? '#94a3b8' : 'var(--text,#374151)';
    numEl.style.cssText = 'font-size:12px;font-weight:700;font-family:Inter,sans-serif;' + (ehHoje ? 'background:#1d4ed8;color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;' : 'color:' + numCor + ';');
    numEl.textContent = dia;
    topRow.appendChild(numEl);

    if (temPedidos && totalMangDia > 0) {
      var totalEl = document.createElement('div');
      totalEl.style.cssText = 'font-size:9px;font-weight:800;font-family:Inter,sans-serif;background:#1d4ed8;color:#fff;border-radius:4px;padding:1px 5px;white-space:nowrap;';
      totalEl.title = 'Total de mangueiras do dia';
      totalEl.textContent = totalMangDia + ' mang.';
      topRow.appendChild(totalEl);
    }
    cell.appendChild(topRow);

    // Chips de pedidos
    psDoDia.forEach(function(item) {
      var p   = item.p;
      var idx = item.idx;
      var cor = _COR_ETAPA[p.etapa] || _COR_ETAPA._default;

      var chip = document.createElement('div');
      chip.style.cssText = 'background:' + cor.bg + ';color:' + cor.text + ';border:1px solid ' + cor.border + ';border-radius:5px;padding:2px 5px;cursor:pointer;overflow:hidden;flex-shrink:0;';

      var clienteEl = document.createElement('div');
      clienteEl.style.cssText = 'font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:Inter,sans-serif;';
      clienteEl.textContent = p.cliente || '—';

      var infoRow = document.createElement('div');
      infoRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:4px;';

      var numPedido = document.createElement('div');
      numPedido.style.cssText = 'font-size:9px;font-weight:600;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:"JetBrains Mono",monospace;';
      numPedido.textContent = '#' + p.id;
      infoRow.appendChild(numPedido);

      if (item.qtdMang) {
        var qtdEl = document.createElement('div');
        qtdEl.style.cssText = 'font-size:9px;font-weight:700;flex-shrink:0;opacity:.85;';
        qtdEl.textContent = item.qtdMang + 'x';
        infoRow.appendChild(qtdEl);
      }

      chip.appendChild(clienteEl);
      chip.appendChild(infoRow);

      chip.onclick = (function(i) {
        return function(e) {
          e.stopPropagation();
          window.voltarDeCalendario();
          setTimeout(function() { if (typeof abrirPedido === 'function') abrirPedido(i); }, 100);
        };
      })(idx);

      cell.appendChild(chip);
    });

    grade.appendChild(cell);
  }

  // Células do próximo mês para completar última semana
  var total = primeiroDia + diasNoMes;
  var sobra = total % 7;
  if (sobra > 0) {
    for (var s = 0; s < 7 - sobra; s++) grade.appendChild(_celulaVazia());
  }

  root.appendChild(grade);
};

// ══════════════════════════════════════════════════
//  NAV: Abrir / Fechar tela de calendário
// ══════════════════════════════════════════════════

window.abrirTelaCalendario = function() {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  var sc = document.getElementById('screen-calendario');
  if (sc) sc.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  if (typeof currentScreen !== 'undefined') window.currentScreen = 'calendario';

  var titleEl = document.getElementById('topbar-screen-title');
  if (titleEl) { titleEl.textContent = 'Calendário'; titleEl.style.display = 'block'; }
  var btnNovo  = document.getElementById('btn-novo-pedido-top');
  var searchEl = document.getElementById('kanban-search-bar');
  if (btnNovo)  btnNovo.style.display  = 'none';
  if (searchEl) searchEl.style.display = 'none';

  window.renderCalFull();
};

window.voltarDeCalendario = function() {
  var navEl = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (navEl && typeof navTo === 'function') {
    navTo('pedidos', navEl);
  } else {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    var sc = document.getElementById('screen-pedidos');
    if (sc) sc.classList.add('active');
    if (typeof currentScreen !== 'undefined') window.currentScreen = 'pedidos';
    var titleEl = document.getElementById('topbar-screen-title');
    if (titleEl) titleEl.textContent = 'Gestão de Pedidos';
    var searchEl = document.getElementById('kanban-search-bar');
    if (searchEl) searchEl.style.display = '';
    var btnNovo = document.getElementById('btn-novo-pedido-top');
    if (btnNovo)  btnNovo.style.display  = '';
  }
};

  // Expor renderCalendario globalmente (chamado pelo app.js no renderKanban)
  window.renderCalendario = function() {
    // No modo tela cheia: atualiza se estiver aberta
    if (window.currentScreen === 'calendario') window.renderCalFull();
    // Não faz nada no modo kanban embutido (removemos a coluna de calendário do kanban)
  };

})(); // fim do IIFE
