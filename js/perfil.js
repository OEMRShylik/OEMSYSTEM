// ══ PERFIL DE USUÁRIO ══
function openUserProfile() {
  if (!currentUser) return;
  const u = currentUser;

  const avatarEl = document.getElementById('upc-avatar');
  if (avatarEl) {
    avatarEl.textContent  = u.initials;
    avatarEl.style.background = sectorColor(u.setor);
  }

  const nameEl = document.getElementById('upc-name');
  if (nameEl) nameEl.textContent = u.nome;

  const userEl = document.getElementById('upc-usuario');
  if (userEl) userEl.textContent = '@' + u.usuario;

  const badgeEl = document.getElementById('upc-badge');
  if (badgeEl) {
    badgeEl.textContent = u.setor;
    badgeEl.style.background = 'rgba(255,255,255,0.20)';
  }

  const setorEl = document.getElementById('upc-setor');
  if (setorEl) setorEl.textContent = u.setor;

  const idEl = document.getElementById('upc-id');
  if (idEl) idEl.textContent = u.id;

  const acessoEl = document.getElementById('upc-acesso');
  if (acessoEl) acessoEl.textContent = u.permissoes.gestao ? 'Total' : 'Restrito';

  document.getElementById('user-profile-overlay').classList.add('open');
}

function closeUserProfile(e) {
  // fecha ao clicar no overlay (fora do card) ou direto
  if (e && e.target !== document.getElementById('user-profile-overlay')) return;
  document.getElementById('user-profile-overlay').classList.remove('open');
}
