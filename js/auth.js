// ══════════════════════════════════════════════════
//  LOGIN — Usuários, permissões e autenticação
// ══════════════════════════════════════════════════

const USUARIOS_DEFAULT = {
  'GIOVANE':'261193','JEREMIAS':'1234',
  'NAIARA':'1234','JOAO':'1234','ISRRAEL':'1234','ANGELYS':'1234','ALEJANDRA':'1234',
  'JOSAFA':'1234','LUCAS':'1234','ISABELLE':'1234',
  'AUGUSTO':'1234','GUSTAVO':'1234'
};

// Carrega senhas customizadas do localStorage
function loadSenhas() {
  try { return JSON.parse(localStorage.getItem('oem_senhas') || '{}'); } catch(e) { return {}; }
}
function saveSenha(usuario, novaSenha) {
  const s = loadSenhas(); s[usuario] = novaSenha;
  localStorage.setItem('oem_senhas', JSON.stringify(s));
}
function getSenha(usuario) {
  const custom = loadSenhas();
  return custom[usuario] !== undefined ? custom[usuario] : USUARIOS_DEFAULT[usuario];
}
function isPrimeiraSenha(usuario) {
  const custom = loadSenhas();
  return custom[usuario] === undefined; // nunca trocou
}

const USUARIOS = [
  // Gestão
  { id:'U001', nome:'Giovane Felipeli', usuario:'GIOVANE', matricula:'000064', get senha(){ return getSenha('GIOVANE'); }, setor:'Admin',     cor:'sector-admin',     initials:'GI', permissoes:{ pedidos:'total', prensagem:'total', descasque:'total', angulos:'total', gestao:true, all:true } },
  { id:'U002', nome:'Jeremias',  usuario:'JEREMIAS',  matricula:'002', get senha(){ return getSenha('JEREMIAS');  }, setor:'Gestão',    cor:'sector-gestao',    initials:'JE', permissoes:{ pedidos:'total', prensagem:'total', descasque:'total', angulos:'total', gestao:true } },
  // Produção
  { id:'U003', nome:'Naiara',    usuario:'NAIARA',    matricula:'003', get senha(){ return getSenha('NAIARA');    }, setor:'Produção',  cor:'sector-producao',  initials:'NA', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  { id:'U004', nome:'Joao',      usuario:'JOAO',      matricula:'004', get senha(){ return getSenha('JOAO');      }, setor:'Produção',  cor:'sector-producao',  initials:'JO', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  { id:'U005', nome:'Isrrael',   usuario:'ISRRAEL',   matricula:'005', get senha(){ return getSenha('ISRRAEL');   }, setor:'Produção',  cor:'sector-producao',  initials:'IS', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  { id:'U006', nome:'Angelys',   usuario:'ANGELYS',   matricula:'006', get senha(){ return getSenha('ANGELYS');   }, setor:'Produção',  cor:'sector-producao',  initials:'AN', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  { id:'U007', nome:'Alejandra', usuario:'ALEJANDRA', matricula:'007', get senha(){ return getSenha('ALEJANDRA'); }, setor:'Produção',  cor:'sector-producao',  initials:'AL', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  // Comercial
  { id:'U008', nome:'Josafa',    usuario:'JOSAFA',    matricula:'008', get senha(){ return getSenha('JOSAFA');    }, setor:'Comercial', cor:'sector-comercial', initials:'JS', permissoes:{ pedidos:'total', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
  { id:'U009', nome:'Lucas',     usuario:'LUCAS',     matricula:'009', get senha(){ return getSenha('LUCAS');     }, setor:'Comercial', cor:'sector-comercial', initials:'LU', permissoes:{ pedidos:'total', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
  { id:'U010', nome:'Isabelle',  usuario:'ISABELLE',  matricula:'010', get senha(){ return getSenha('ISABELLE');  }, setor:'Comercial', cor:'sector-comercial', initials:'IB', permissoes:{ pedidos:'total', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
  // Expedição
  { id:'U011', nome:'Augusto',   usuario:'AUGUSTO',   matricula:'011', get senha(){ return getSenha('AUGUSTO');   }, setor:'Expedição', cor:'sector-expedicao', initials:'AU', permissoes:{ pedidos:'expedicao', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
  { id:'U012', nome:'Gustavo',   usuario:'GUSTAVO',   matricula:'012', get senha(){ return getSenha('GUSTAVO');   }, setor:'Expedição', cor:'sector-expedicao', initials:'GU', permissoes:{ pedidos:'expedicao', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
];

let currentUser = null;

// ── Audit log (futuro relatório) ──
let auditLog = JSON.parse(localStorage.getItem('oem_audit') || '[]');
function auditRecord(acao, detalhe='') {
  const entry = {
    ts: new Date().toISOString(),
    userId: currentUser?.id,
    nome: currentUser?.nome,
    setor: currentUser?.setor,
    acao,
    detalhe
  };
  auditLog.push(entry);
  localStorage.setItem('oem_audit', JSON.stringify(auditLog.slice(-500))); // keep last 500
}

// ── Painel de login por senha ──
function abrirLoginForm() {
  const overlay = document.getElementById('login-form-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  setTimeout(() => document.getElementById('login-user-input')?.focus(), 80);
}

function fecharLoginForm() {
  const overlay = document.getElementById('login-form-overlay');
  if (overlay) overlay.style.display = 'none';
  const errEl = document.getElementById('login-error-form');
  if (errEl) errEl.textContent = '';
}

// ── Switch tabs (mantido para compatibilidade com doLogout) ──
function loginSwitchTab(tab) {
  fecharLoginForm();
  if (tab === 'qr') qrStart(); else qrStop();
}

// ── Login by username+password ──
function doLogin() {
  const user  = (document.getElementById('login-user-input')?.value || '').trim();
  const pass  = document.getElementById('login-pass-input')?.value || '';
  const errEl = document.getElementById('login-error-form');
  const u = _getUsuariosRuntime().find(x => x.usuario.toLowerCase() === user.toLowerCase() && x.senha === pass);
  if (!u) {
    if (errEl) errEl.textContent = 'Usuário ou senha inválidos.';
    const pi = document.getElementById('login-pass-input');
    if (pi) { pi.value = ''; pi.focus(); }
    return;
  }
  if (u.status === 'inativo') {
    if (errEl) errEl.textContent = 'Usuário inativo. Contate o administrador.';
    const pi = document.getElementById('login-pass-input');
    if (pi) pi.value = '';
    return;
  }
  if (errEl) errEl.textContent = '';
  fecharLoginForm();
  performLogin(u);
}

// ── Core login ──
function performLogin(u) {
  // Verifica primeiro acesso
  if (isPrimeiraSenha(u.usuario)) {
    openChangeSenha(u);
    return;
  }
  finalizarLogin(u);
}

// ══ TROCA DE SENHA ══
let _pendingLoginUser = null;

function openChangeSenha(u) {
  _pendingLoginUser = u;
  document.getElementById('cpc-nova').value = '';
  document.getElementById('cpc-confirma').value = '';
  document.getElementById('cpc-error').textContent = '';
  document.getElementById('change-pass-overlay').classList.add('open');
  setTimeout(() => document.getElementById('cpc-nova').focus(), 100);
}

function confirmarTrocaSenha() {
  const nova     = document.getElementById('cpc-nova').value;
  const confirma = document.getElementById('cpc-confirma').value;
  const errEl    = document.getElementById('cpc-error');
  if (nova.length < 4) { errEl.textContent = 'Senha deve ter ao menos 4 caracteres.'; return; }
  if (nova !== confirma) { errEl.textContent = 'As senhas não coincidem.'; return; }
  saveSenha(_pendingLoginUser.usuario, nova);
  auditRecord('troca-senha');
  document.getElementById('change-pass-overlay').classList.remove('open');
  finalizarLogin(_pendingLoginUser);
}

function skipTrocaSenha() {
  document.getElementById('change-pass-overlay').classList.remove('open');
  finalizarLogin(_pendingLoginUser);
}

function finalizarLogin(u) {
  currentUser = u;
  auditRecord('login');

  // Update sidebar
  const initEl = document.getElementById('user-initials');
  const tooltipEl = document.getElementById('user-tooltip');
  const nameEl = document.getElementById('user-name-label');
  const badgeEl = document.getElementById('user-sector-badge');

  if (initEl) {
    initEl.innerHTML = `<span style="font-size:13px;font-weight:700;color:#fff;">${u.initials}</span>`;
    initEl.style.background = sectorColor(u.setor);
  }
  if (tooltipEl) tooltipEl.textContent = u.nome + ' · ' + u.setor;
  if (nameEl)  nameEl.textContent = u.nome.split(' ')[0];
  if (badgeEl) { badgeEl.textContent = u.setor; badgeEl.className = ''; badgeEl.classList.add(...['sector-badge-small', u.cor]); }

  const topbarUserText = document.getElementById('topbar-user-text');
  if (topbarUserText) {
    const setorDisplay = { 'Admin':'Administrador', 'Produção':'Produção', 'Comercial':'Comercial', 'Expedição':'Expedição', 'Gestão':'Gestão' };
    topbarUserText.textContent = u.nome + ' | ' + (setorDisplay[u.setor] || u.setor);
  }

  applyPermissions(u);

  // Stop camera and hide login screen
  qrStop();
  const ls = document.getElementById('login-screen');
  ls.classList.add('hide');
  setTimeout(() => ls.style.display = 'none', 420);
}

function sectorColor(setor) {
  const map = { 'Admin':'#7c3aed', 'Produção':'#1a56db', 'Comercial':'#059669', 'Expedição':'#d97706', 'Gestão':'#6b7280' };
  return map[setor] || '#6b7280';
}

// ── Apply permissions to nav items ──
function applyPermissions(u) {
  const p = u.permissoes;
  const isAdmin = u.setor === 'Admin';

  // Global read-only flag (Gestão e Comercial só visualizam pedidos)
  window._soLeitura = !!p.soLeitura;

  // Drag: apenas Admin pode arrastar cards no kanban
  window._pedidosDragEnabled = isAdmin;

  // Botão + Novo Pedido: apenas Admin
  const btnNovo = document.querySelector('.btn-novo');
  if (btnNovo) btnNovo.style.display = isAdmin ? '' : 'none';

  // Nav Pedidos: todos os setores
  const navPedidos = document.querySelector('.nav-item[onclick*="pedidos"]');
  if (navPedidos) navPedidos.style.display = '';

  // Nav Dashboard: Admin, Gestão, Comercial
  const navDash = document.getElementById('nav-dashboard');
  if (navDash) navDash.style.display = p.dashboard ? '' : 'none';

  // Nav Usuários: apenas Admin
  const navUsuarios = document.getElementById('nav-usuarios');
  if (navUsuarios) navUsuarios.style.display = isAdmin ? '' : 'none';
}

// ── Logout ──
function doLogout() {
  auditRecord('logout');
  currentUser = null;
  document.getElementById('change-pass-overlay').classList.remove('open');
  const ls = document.getElementById('login-screen');
  ls.style.display = 'block';
  ls.classList.remove('hide');
  fecharLoginForm();
  const pi = document.getElementById('login-pass-input');
  if (pi) pi.value = '';
  const ui = document.getElementById('login-user-input');
  if (ui) ui.value = '';
  const err = document.getElementById('login-error');
  if (err) err.textContent = '';
  qrStart();
}

// ── QR Camera ──
let _qrStream = null;
let _qrRafId = null;

function qrStart() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    document.getElementById('qr-hint').textContent = 'Câmera não suportada. Use usuário/senha.';
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      _qrStream = stream;
      const video = document.getElementById('qr-video');
      const placeholder = document.getElementById('qr-placeholder');
      video.srcObject = stream;
      video.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      const hint = document.getElementById('qr-hint');
      if (hint) hint.textContent = 'Aponte para o QR Code do crachá';
      video.onloadedmetadata = () => { video.play(); qrLoop(); };
    })
    .catch(() => {
      const hint = document.getElementById('qr-hint');
      if (hint) hint.textContent = 'Câmera não disponível — use o botão abaixo.';
    });
}

function qrStop() {
  if (_qrStream) { _qrStream.getTracks().forEach(t => t.stop()); _qrStream = null; }
  if (_qrRafId)  { cancelAnimationFrame(_qrRafId); _qrRafId = null; }
}

function qrLoop() {
  const video  = document.getElementById('qr-video');
  const canvas = document.getElementById('qr-canvas');
  if (!video || !canvas || !_qrStream) return;
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
    if (code && code.data) {
      const raw = code.data.trim();
      const users = _getUsuariosRuntime();
      // Tenta decodificar Base64 (apps de QR costumam encapsular em base64)
      let decoded = '';
      try { decoded = atob(raw); } catch(e) {}
      // Sequências de dígitos do raw E do texto decodificado
      const digSeqs = [...new Set([
        ...(raw.match(/\d+/g) || []),
        ...(decoded.match(/\d+/g) || []),
      ])];
      let u = users.find(x => x.id === raw || (decoded && x.id === decoded));
      if (!u) {
        u = users.find(x => {
          if (!x.matricula) return false;
          const mat = String(x.matricula);
          return mat === raw || mat === decoded || digSeqs.some(d => mat === d);
        });
      }
      // Debug: mostra o que foi lido quando não há match
      if (!u) {
        const hint = document.getElementById('qr-hint');
        if (hint) hint.textContent = '🔍 ' + (decoded || raw).substring(0, 40);
      }
      if (u) {
        qrStop();
        if (u.status === 'inativo') {
          const hint = document.getElementById('qr-hint');
          if (hint) hint.textContent = 'Usuário inativo. Contate o administrador.';
          return;
        }
        performLogin(u);
        return;
      }
    }
  }
  _qrRafId = requestAnimationFrame(qrLoop);
}

// Init: start camera on load
window.addEventListener('DOMContentLoaded', () => {
  qrStart();
});


const ANGULOS = Array.from({length:72}, (_,i) => i*5); // 0, 5, 10 ... 355

// ── Runtime user list (base USUARIOS + localStorage overrides/extras/deletes) ──
function _setorPermissoes(setor) {
  const map = {
    'Admin':    { pedidos:'total',    dashboard:true,  soLeitura:false, gestao:true,  all:true },
    'Gestão':   { pedidos:'leitura',  dashboard:true,  soLeitura:true,  gestao:false },
    'Produção': { pedidos:'leitura',  dashboard:false, soLeitura:false, gestao:false },
    'Comercial':{ pedidos:'leitura',  dashboard:true,  soLeitura:true,  gestao:false },
    'Expedição':{ pedidos:'expedicao',dashboard:false, soLeitura:false, gestao:false },
  };
  return map[setor] || { pedidos:'leitura', dashboard:false, soLeitura:true, gestao:false };
}

function _setorCor(setor) {
  const map = { 'Admin':'sector-admin','Gestão':'sector-gestao','Produção':'sector-producao','Comercial':'sector-comercial','Expedição':'sector-expedicao' };
  return map[setor] || 'sector-gestao';
}

function _getUsuariosRuntime() {
  try {
    const overrides = JSON.parse(localStorage.getItem('oem_users_overrides') || '{}');
    const extras    = JSON.parse(localStorage.getItem('oem_users_extras')    || '[]');
    const deleted   = JSON.parse(localStorage.getItem('oem_users_deleted')   || '[]');
    const senhas    = loadSenhas();

    const base = USUARIOS
      .filter(u => !deleted.includes(u.id))
      .map(u => {
        const ovr   = overrides[u.id] || {};
        const setor = ovr.setor  || u.setor;
        const nome  = ovr.nome   || u.nome;
        const status = ovr.status || 'ativo';
        return {
          ...u,
          nome,
          setor,
          status,
          matricula:  ovr.matricula ?? u.matricula ?? '',
          cor:        _setorCor(setor),
          permissoes: _setorPermissoes(setor),
          initials:   nome.slice(0,2).toUpperCase(),
          senha:      senhas[u.usuario] !== undefined ? senhas[u.usuario] : (USUARIOS_DEFAULT[u.usuario] || '1234'),
        };
      });

    const extraUsers = extras.map(e => ({
      ...e,
      status:     e.status || 'ativo',
      matricula:  e.matricula ?? '',
      cor:        _setorCor(e.setor),
      permissoes: _setorPermissoes(e.setor),
      initials:   (e.nome || '').slice(0,2).toUpperCase(),
      senha:      senhas[e.usuario] !== undefined ? senhas[e.usuario] : '1234',
    }));

    return [...base, ...extraUsers];
  } catch(e) { return [...USUARIOS]; }
}

