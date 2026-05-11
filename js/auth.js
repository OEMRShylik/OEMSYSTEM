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
  { id:'U001', nome:'Giovane',   usuario:'GIOVANE',   get senha(){ return getSenha('GIOVANE');   }, setor:'Admin',     cor:'sector-admin',     initials:'GI', permissoes:{ pedidos:'total', prensagem:'total', descasque:'total', angulos:'total', gestao:true, all:true } },
  { id:'U002', nome:'Jeremias',  usuario:'JEREMIAS',  get senha(){ return getSenha('JEREMIAS');  }, setor:'Gestão',    cor:'sector-gestao',    initials:'JE', permissoes:{ pedidos:'total', prensagem:'total', descasque:'total', angulos:'total', gestao:true } },
  // Produção
  { id:'U003', nome:'Naiara',    usuario:'NAIARA',    get senha(){ return getSenha('NAIARA');    }, setor:'Produção',  cor:'sector-producao',  initials:'NA', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  { id:'U004', nome:'Joao',      usuario:'JOAO',      get senha(){ return getSenha('JOAO');      }, setor:'Produção',  cor:'sector-producao',  initials:'JO', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  { id:'U005', nome:'Isrrael',   usuario:'ISRRAEL',   get senha(){ return getSenha('ISRRAEL');   }, setor:'Produção',  cor:'sector-producao',  initials:'IS', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  { id:'U006', nome:'Angelys',   usuario:'ANGELYS',   get senha(){ return getSenha('ANGELYS');   }, setor:'Produção',  cor:'sector-producao',  initials:'AN', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  { id:'U007', nome:'Alejandra', usuario:'ALEJANDRA', get senha(){ return getSenha('ALEJANDRA'); }, setor:'Produção',  cor:'sector-producao',  initials:'AL', permissoes:{ pedidos:'leitura', prensagem:'total', descasque:'total', angulos:'total', gestao:false } },
  // Comercial
  { id:'U008', nome:'Josafa',    usuario:'JOSAFA',    get senha(){ return getSenha('JOSAFA');    }, setor:'Comercial', cor:'sector-comercial', initials:'JS', permissoes:{ pedidos:'total', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
  { id:'U009', nome:'Lucas',     usuario:'LUCAS',     get senha(){ return getSenha('LUCAS');     }, setor:'Comercial', cor:'sector-comercial', initials:'LU', permissoes:{ pedidos:'total', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
  { id:'U010', nome:'Isabelle',  usuario:'ISABELLE',  get senha(){ return getSenha('ISABELLE');  }, setor:'Comercial', cor:'sector-comercial', initials:'IB', permissoes:{ pedidos:'total', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
  // Expedição
  { id:'U011', nome:'Augusto',   usuario:'AUGUSTO',   get senha(){ return getSenha('AUGUSTO');   }, setor:'Expedição', cor:'sector-expedicao', initials:'AU', permissoes:{ pedidos:'expedicao', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
  { id:'U012', nome:'Gustavo',   usuario:'GUSTAVO',   get senha(){ return getSenha('GUSTAVO');   }, setor:'Expedição', cor:'sector-expedicao', initials:'GU', permissoes:{ pedidos:'expedicao', prensagem:'leitura', descasque:'leitura', angulos:'leitura', gestao:false } },
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

// ── Switch tabs ──
function loginSwitchTab(tab) {
  document.getElementById('tab-qr').classList.toggle('active', tab==='qr');
  document.getElementById('tab-pass').classList.toggle('active', tab==='pass');
  document.getElementById('login-qr-panel').style.display  = tab==='qr'   ? 'flex' : 'none';
  document.getElementById('login-pass-panel').style.display = tab==='pass' ? 'flex' : 'none';
  if (tab === 'qr') qrStart(); else qrStop();
}

// ── Login by username+password ──
function doLogin() {
  const user = document.getElementById('login-user-input').value.trim();
  const pass = document.getElementById('login-pass-input').value;
  const errEl = document.getElementById('login-error');
  const u = USUARIOS.find(x => x.usuario.toLowerCase() === user.toLowerCase() && x.senha === pass);
  if (!u) {
    errEl.textContent = 'Usuário ou senha inválidos.';
    document.getElementById('login-pass-input').value = '';
    document.getElementById('login-pass-input').focus();
    return;
  }
  errEl.textContent = '';
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
  // Nav items visibility
  const navPrensagem = document.querySelector('[onclick*="prensagem"]');
  const navDescasque = document.querySelector('[onclick*="descasque"]');
  const navAngulos   = document.querySelector('[onclick*="angulos"]');

  // Produção: mostra tudo mas pedidos só leitura (sem botão + Novo Pedido, sem arrastar)
  // Comercial: tudo visível, pedidos total
  // Expedição: pedidos expedicao, resto leitura
  // Gestão: tudo total

  const isAdmin = u.setor === 'Admin';

  // Botão + Novo Pedido
  const btnNovo = document.querySelector('.btn-novo');
  if (btnNovo) btnNovo.style.display = (isAdmin || p.pedidos === 'total' || p.gestao) ? '' : 'none';

  // Nav Pedidos: só Admin vê
  const navPedidos = document.querySelector('.nav-item[onclick*=\"pedidos\"]');
  if (navPedidos) navPedidos.style.display = isAdmin ? '' : 'none';

  // Disable drag for read-only pedidos
  window._pedidosDragEnabled = p.pedidos !== 'leitura';
}

// ── Logout ──
function doLogout() {
  auditRecord('logout');
  currentUser = null;
  document.getElementById('change-pass-overlay').classList.remove('open');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-screen').classList.remove('hide');
  // Clear password field
  const pi = document.getElementById('login-pass-input');
  if (pi) pi.value = '';
  const ui = document.getElementById('login-user-input');
  if (ui) ui.value = '';
  loginSwitchTab('qr');
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
      document.getElementById('qr-hint').textContent = 'Aponte para o QR Code do crachá';
      video.onloadedmetadata = () => { video.play(); qrLoop(); };
    })
    .catch(() => {
      document.getElementById('qr-hint').textContent = 'Câmera não autorizada. Use usuário/senha.';
      const placeholder = document.getElementById('qr-placeholder');
      if (placeholder) {
        placeholder.querySelector('span').textContent = 'Sem acesso à câmera';
        placeholder.style.display = 'flex';
      }
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
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      const u = USUARIOS.find(x => x.id === code.data);
      if (u) {
        qrStop();
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

