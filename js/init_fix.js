// ══════════════════════════════════════════════════
//  INIT_FIX.JS — Corrige inicialização do OEM SYSTEM
//  Inclua este script APÓS todos os outros scripts
//  no final do <body> do index.html
// ══════════════════════════════════════════════════

// Chama init() quando o DOM estiver pronto
// (init() é definido em app.js mas nunca era chamado)
window.addEventListener('DOMContentLoaded', function () {
  if (typeof init === 'function') {
    init();
  }
});

// Fallback: se DOMContentLoaded já disparou (script carregado late)
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  if (typeof init === 'function') {
    init();
  }
}
