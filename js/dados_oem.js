// ══════════════════════════════════════════════════
//  DADOS_OEM.JS — Extensões do OEM SYSTEM
//  NÃO substitui o dados.js original!
//  Carrega DEPOIS do auth.js
// ══════════════════════════════════════════════════

// Setores e permissões
window.SETORES = ['Admin', 'Gestão', 'Comercial', 'Produção', 'Expedição', 'Qualidade'];

window.SETOR_PERMISSOES = {
  'Admin':    { gestao: true,  pedidos: true,  producao: true,  all: true  },
  'Gestão':   { gestao: false, pedidos: false, producao: true,  all: false },
  'Comercial':{ gestao: false, pedidos: false, producao: false, all: false },
  'Produção': { gestao: false, pedidos: false, producao: true,  all: false },
  'Expedição':{ gestao: false, pedidos: false, producao: true,  all: false },
  'Qualidade':{ gestao: false, pedidos: false, producao: true,  all: false },
};

// Cor por setor
function sectorColor(setor) {
  const cores = {
    'Admin':    '#7c3aed',
    'Gestão':   '#1a56db',
    'Comercial':'#059669',
    'Produção': '#d97706',
    'Expedição':'#dc2626',
    'Qualidade':'#0891b2',
  };
  return cores[setor] || '#6b7280';
}

// Atualiza setor/permissões de usuários específicos no array existente
// Roda DEPOIS do dados.js original que define USUARIOS e GIOVANE
(function() {
  if (!window.USUARIOS) return;
  const overrides = [
    { usuario: 'GIOVANE', setor: 'Admin',
      permissoes: { gestao:true, pedidos:true, producao:true, all:true } },
  ];
  overrides.forEach(ov => {
    const u = window.USUARIOS.find(x =>
      (x.usuario||'').toUpperCase() === ov.usuario ||
      (x.nome||'').toUpperCase() === ov.usuario
    );
    if (u) Object.assign(u, { setor: ov.setor, permissoes: ov.permissoes });
  });
  // Atualiza currentUser se já logado
  if (window.currentUser) {
    const cu = window.USUARIOS.find(x =>
      x.usuario === window.currentUser.usuario
    );
    if (cu) Object.assign(window.currentUser, cu);
  }
})();

// Stubs de segurança — usados se o dados.js original não os definir
if (typeof window.CRIMP     === 'undefined') window.CRIMP     = [];
if (typeof window.DESCASQUE === 'undefined') window.DESCASQUE = [];
