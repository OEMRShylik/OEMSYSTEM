// ══ PERFIL DE USUÁRIO ══
function openUserProfile() {
  if (!currentUser) return;
  const u = currentUser;

  document.getElementById('upc-avatar').textContent  = u.initials;
  document.getElementById('upc-avatar').style.background = sectorColor(u.setor);
  document.getElementById('upc-name').textContent    = u.nome;
  document.getElementById('upc-usuario').textContent = '@' + u.usuario;
  document.getElementById('upc-badge').textContent   = u.setor;
  document.getElementById('upc-badge').style.background = sectorColor(u.setor);
  document.getElementById('upc-setor').textContent   = u.setor;
  document.getElementById('upc-id').textContent      = u.id;
  document.getElementById('upc-acesso').textContent  = u.permissoes.gestao ? 'Total' : 'Restrito';

  document.getElementById('user-profile-overlay').classList.add('open');
}

function closeUserProfile(e) {
  if (e && e.target !== document.getElementById('user-profile-overlay')) return;
  document.getElementById('user-profile-overlay').classList.remove('open');
}

</script>
