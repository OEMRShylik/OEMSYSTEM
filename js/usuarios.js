// ══════════════════════════════════════════════════
//  GESTÃO DE USUÁRIOS (Admin only)
// ══════════════════════════════════════════════════

const _SETORES = ['Admin', 'Gestão', 'Produção', 'Comercial', 'Expedição'];

function _renderUsuarios() {
  const root = document.getElementById('usuarios-root');
  if (!root) return;
  const lista = _getUsuariosRuntime();
  const extras = JSON.parse(localStorage.getItem('oem_users_extras') || '[]');

  root.innerHTML = `
    <div style="padding:16px;font-family:Inter,sans-serif;max-width:1000px;margin:0 auto;">
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
        <button onclick="_abrirModalUsuario(null)"
          style="padding:8px 20px;background:#1a56db;color:#fff;border:none;border-radius:9px;
                 font-size:13px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;">
          + Novo Usuário
        </button>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
        <table style="width:100%;border-collapse:collapse;min-width:700px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;">NOME</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;">LOGIN</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;">SETOR</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:700;">MATRÍCULA</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:700;">QR CODE</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:700;">STATUS</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:700;">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map((u, i) => {
              const cor     = sectorColor(u.setor);
              const isExtra = extras.some(e => e.id === u.id);
              const ativo   = u.status !== 'inativo';
              const mat     = u.matricula || '—';
              return `
                <tr style="border-top:1px solid #f3f4f6;${i%2===1?'background:#fafafa':''}">
                  <td style="padding:8px 10px;font-size:13px;font-weight:700;color:${ativo?'#111':'#9ca3af'};text-decoration:${ativo?'none':'line-through'};">${u.nome}</td>
                  <td style="padding:8px 10px;font-size:12px;color:${ativo?'#6b7280':'#d1d5db'};font-family:'Courier New',monospace;">${u.usuario}</td>
                  <td style="padding:8px 10px;">
                    <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;
                                 background:${cor}22;color:${cor};opacity:${ativo?1:0.5};">${u.setor}</span>
                  </td>
                  <td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:700;font-family:'Courier New',monospace;color:#374151;">${mat}</td>
                  <td style="padding:6px 10px;text-align:center;">
                    ${u.matricula ? `<button onclick="_mostrarQrUsuario('${u.id}')"
                      title="Ver QR Code de acesso"
                      style="padding:3px 10px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:7px;
                             font-size:12px;font-weight:700;color:#7c3aed;cursor:pointer;">
                      QR
                    </button>` : '<span style="font-size:11px;color:#d1d5db;">—</span>'}
                  </td>
                  <td style="padding:6px 10px;text-align:center;">
                    <button onclick="_toggleStatusUsuario('${u.id}')"
                      title="${ativo?'Clique para inativar':'Clique para ativar'}"
                      style="padding:3px 10px;border:none;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;
                             background:${ativo?'#dcfce7':'#fee2e2'};color:${ativo?'#166534':'#991b1b'};">
                      ${ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td style="padding:6px 10px;text-align:center;white-space:nowrap;">
                    <button onclick="_abrirModalUsuario('${u.id}')"
                      style="padding:3px 10px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:7px;
                             font-size:12px;font-weight:700;cursor:pointer;margin-right:4px;">
                      Editar
                    </button>
                    ${u.setor !== 'Admin' ? `<button onclick="_confirmarDeletarUsuario('${u.id}','${u.nome.replace(/'/g,"\\'")}')"
                      style="padding:3px 8px;background:#fee2e2;border:1px solid #fca5a5;border-radius:7px;
                             font-size:12px;font-weight:700;color:#dc2626;cursor:pointer;">✕</button>` : ''}
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
        </div>
      </div>
    </div>`;
}

// ── Toggle rápido de status na tabela ────────────────────────────────────────
function _toggleStatusUsuario(id) {
  const lista  = _getUsuariosRuntime();
  const u      = lista.find(x => x.id === id);
  if (!u) return;
  const novoStatus = u.status === 'inativo' ? 'ativo' : 'inativo';

  const overrides = JSON.parse(localStorage.getItem('oem_users_overrides') || '{}');
  overrides[id] = { ...(overrides[id] || {}), status: novoStatus };
  localStorage.setItem('oem_users_overrides', JSON.stringify(overrides));

  // Atualiza em extras se for extra
  const extras = JSON.parse(localStorage.getItem('oem_users_extras') || '[]');
  const extraIdx = extras.findIndex(e => e.id === id);
  if (extraIdx >= 0) {
    extras[extraIdx].status = novoStatus;
    localStorage.setItem('oem_users_extras', JSON.stringify(extras));
  }

  _renderUsuarios();
  _syncUsuariosServidor();
  if (typeof _mostrarToast === 'function')
    _mostrarToast(`${u.nome}: ${novoStatus === 'ativo' ? 'Ativado' : 'Inativado'}`, novoStatus === 'ativo' ? '#059669' : '#d97706');
}

// ── Modal de editar/criar ──────────────────────────────────────────────────────
function _abrirModalUsuario(id) {
  document.getElementById('modal-usuario')?.remove();
  const lista = _getUsuariosRuntime();
  const u = id ? lista.find(x => x.id === id) : null;
  const titulo = u ? 'Editar Usuário' : 'Novo Usuário';
  const isBase = u && (typeof USUARIOS !== 'undefined') && USUARIOS.some(x => x.id === id);
  const ativo  = u ? u.status !== 'inativo' : true;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-usuario" onclick="if(event.target===this)_fecharModalUsuario()"
      style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9100;display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:14px;padding:24px;width:380px;max-width:94vw;
                  display:flex;flex-direction:column;gap:14px;box-shadow:0 8px 32px rgba(0,0,0,.2);font-family:Inter,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:16px;font-weight:800;color:#111;">${titulo}</div>
          <button onclick="_fecharModalUsuario()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#6b7280;">✕</button>
        </div>

        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Nome</label>
          <input id="mu-nome" type="text" value="${u ? u.nome : ''}" placeholder="Nome completo"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none;">
        </div>

        ${!u ? `<div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Login (usuário)</label>
          <input id="mu-login" type="text" placeholder="LOGIN_SEM_ESPACO" maxlength="20"
            oninput="this.value=this.value.toUpperCase().replace(/\\s/g,'')"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-family:'Courier New',monospace;outline:none;">
        </div>` : `<div style="font-size:12px;color:#6b7280;">Login: <strong style="font-family:monospace;">${u.usuario}</strong>${isBase?' (fixo)':''}</div>`}

        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Matrícula</label>
          <input id="mu-matricula" type="text" value="${u ? (u.matricula || '') : ''}" placeholder="Ex: 001"
            maxlength="10" oninput="this.value=this.value.replace(/[^0-9]/g,'')"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-family:'Courier New',monospace;outline:none;">
        </div>

        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Setor</label>
          <select id="mu-setor"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none;">
            ${_SETORES.map(s => `<option value="${s}" ${u?.setor===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Status</label>
          <div style="display:flex;gap:8px;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;
                          padding:6px 14px;border-radius:8px;border:1px solid ${ativo?'#059669':'#e5e7eb'};
                          background:${ativo?'#dcfce7':'#f9fafb'};color:${ativo?'#166534':'#6b7280'};">
              <input type="radio" name="mu-status" value="ativo" ${ativo?'checked':''}
                onchange="document.getElementById('mu-status-ativo').style.cssText='display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:6px 14px;border-radius:8px;border:1px solid #059669;background:#dcfce7;color:#166534;';document.getElementById('mu-status-inativo').style.cssText='display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:6px 14px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;';">
              Ativo
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;
                          padding:6px 14px;border-radius:8px;border:1px solid ${!ativo?'#dc2626':'#e5e7eb'};
                          background:${!ativo?'#fee2e2':'#f9fafb'};color:${!ativo?'#991b1b':'#6b7280'};">
              <input type="radio" name="mu-status" value="inativo" ${!ativo?'checked':''}
                onchange="document.getElementById('mu-status-inativo').style.cssText='display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:6px 14px;border-radius:8px;border:1px solid #dc2626;background:#fee2e2;color:#991b1b;';document.getElementById('mu-status-ativo').style.cssText='display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:6px 14px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;';">
              Inativo
            </label>
          </div>
        </div>

        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">
            ${u ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
          </label>
          <input id="mu-senha" type="password" placeholder="${u?'Não alterar':'1234'}"
            style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none;">
        </div>

        <div id="mu-erro" style="font-size:12px;color:#dc2626;min-height:16px;"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button onclick="_fecharModalUsuario()"
            style="padding:9px 20px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
            Cancelar
          </button>
          <button onclick="_salvarUsuario('${id||''}')"
            style="padding:9px 20px;background:#1a56db;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
            Salvar
          </button>
        </div>
      </div>
    </div>`);

  // Atribui IDs aos labels para o onchange poder referenciá-los
  const modal = document.getElementById('modal-usuario');
  const labels = modal.querySelectorAll('label[style*="display:flex"]');
  if (labels[0]) labels[0].id = 'mu-status-ativo';
  if (labels[1]) labels[1].id = 'mu-status-inativo';

  setTimeout(() => document.getElementById('mu-nome')?.focus(), 50);
}

function _fecharModalUsuario() {
  document.getElementById('modal-usuario')?.remove();
}

function _salvarUsuario(id) {
  const nome      = (document.getElementById('mu-nome')?.value || '').trim();
  const setor     = document.getElementById('mu-setor')?.value || 'Produção';
  const senha     = (document.getElementById('mu-senha')?.value || '').trim();
  const status    = document.querySelector('input[name="mu-status"]:checked')?.value || 'ativo';
  const matricula = (document.getElementById('mu-matricula')?.value || '').trim();
  const errEl     = document.getElementById('mu-erro');

  if (!nome) { errEl.textContent = 'Nome é obrigatório.'; return; }

  if (id) {
    // Editar usuário existente
    const overrides = JSON.parse(localStorage.getItem('oem_users_overrides') || '{}');
    overrides[id] = { ...(overrides[id] || {}), nome, setor, status, matricula };
    localStorage.setItem('oem_users_overrides', JSON.stringify(overrides));

    // Atualizar em extras se for extra
    const extras = JSON.parse(localStorage.getItem('oem_users_extras') || '[]');
    const extraIdx = extras.findIndex(e => e.id === id);
    if (extraIdx >= 0) {
      extras[extraIdx].nome      = nome;
      extras[extraIdx].setor     = setor;
      extras[extraIdx].status    = status;
      extras[extraIdx].matricula = matricula;
      localStorage.setItem('oem_users_extras', JSON.stringify(extras));
    }

    if (senha) {
      const lista = _getUsuariosRuntime();
      const u = lista.find(x => x.id === id);
      if (u) saveSenha(u.usuario, senha);
    }
  } else {
    // Novo usuário
    const login = (document.getElementById('mu-login')?.value || '').trim().toUpperCase();
    if (!login) { errEl.textContent = 'Login é obrigatório.'; return; }
    const todos = _getUsuariosRuntime();
    if (todos.some(x => x.usuario.toUpperCase() === login)) {
      errEl.textContent = 'Login já existe.'; return;
    }
    const newId = 'U_' + Date.now();
    const extras = JSON.parse(localStorage.getItem('oem_users_extras') || '[]');
    extras.push({ id: newId, nome, usuario: login, setor, status, matricula });
    localStorage.setItem('oem_users_extras', JSON.stringify(extras));
    saveSenha(login, senha || '1234');
  }

  _fecharModalUsuario();
  _renderUsuarios();
  _syncUsuariosServidor();
  if (typeof _mostrarToast === 'function') _mostrarToast('Usuário salvo!', '#059669');
}

function _confirmarDeletarUsuario(id, nome) {
  if (!confirm(`Excluir o usuário "${nome}"?`)) return;
  _deletarUsuario(id);
}

function _deletarUsuario(id) {
  const extras = JSON.parse(localStorage.getItem('oem_users_extras') || '[]');
  localStorage.setItem('oem_users_extras', JSON.stringify(extras.filter(e => e.id !== id)));

  const deleted = JSON.parse(localStorage.getItem('oem_users_deleted') || '[]');
  if (!deleted.includes(id)) { deleted.push(id); localStorage.setItem('oem_users_deleted', JSON.stringify(deleted)); }

  const overrides = JSON.parse(localStorage.getItem('oem_users_overrides') || '{}');
  delete overrides[id];
  localStorage.setItem('oem_users_overrides', JSON.stringify(overrides));

  _renderUsuarios();
  _syncUsuariosServidor();
  if (typeof _mostrarToast === 'function') _mostrarToast('Usuário excluído.', '#d97706');
}

// ── Sincronização servidor ────────────────────────────────────────────────────

async function _syncUsuariosServidor() {
  try {
    const payload = {
      overrides: JSON.parse(localStorage.getItem('oem_users_overrides') || '{}'),
      extras:    JSON.parse(localStorage.getItem('oem_users_extras')    || '[]'),
      deleted:   JSON.parse(localStorage.getItem('oem_users_deleted')   || '[]'),
      senhas:    JSON.parse(localStorage.getItem('oem_senhas')          || '{}'),
    };
    await fetch('/salvar_usuarios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch(e) { console.warn('[usuarios] sync falhou:', e); }
}

async function _carregarUsuariosServidor() {
  try {
    const r = await fetch('/carregar_usuarios');
    if (!r.ok) return;
    const data = await r.json();
    if (data.overrides) localStorage.setItem('oem_users_overrides', JSON.stringify(data.overrides));
    if (data.extras)    localStorage.setItem('oem_users_extras',    JSON.stringify(data.extras));
    if (data.deleted)   localStorage.setItem('oem_users_deleted',   JSON.stringify(data.deleted));
    if (data.senhas)    localStorage.setItem('oem_senhas',          JSON.stringify(data.senhas));
  } catch(e) { console.warn('[usuarios] carregar falhou:', e); }
}

function _mostrarQrUsuario(id) {
  const u = _getUsuariosRuntime().find(x => x.id === id);
  if (!u || !u.matricula) return;

  document.getElementById('modal-qr-usuario')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-qr-usuario" onclick="if(event.target===this)document.getElementById('modal-qr-usuario').remove()"
      style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9200;display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:16px;padding:28px 32px;min-width:280px;text-align:center;
                  display:flex;flex-direction:column;align-items:center;gap:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:Inter,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
          <div style="font-size:15px;font-weight:800;color:#111;">QR Code — ${u.nome.split(' ')[0]}</div>
          <button onclick="document.getElementById('modal-qr-usuario').remove()"
            style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;line-height:1;">✕</button>
        </div>
        <div id="qr-div-usuario" style="border-radius:10px;border:1px solid #e5e7eb;padding:8px;line-height:0;"></div>
        <div style="font-size:11px;color:#6b7280;">Matrícula: <strong style="font-family:'Courier New',monospace;color:#111;">${u.matricula}</strong></div>
        <div style="font-size:11px;color:#9ca3af;">Aponte para a câmera na tela de login</div>
        <button onclick="_imprimirQrUsuario('${u.id}')"
          style="padding:8px 20px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
          Imprimir
        </button>
      </div>
    </div>`);

  if (typeof QRCode !== 'undefined') {
    new QRCode(document.getElementById('qr-div-usuario'), {
      text: u.matricula,
      width: 200,
      height: 200,
      colorDark: '#111111',
      colorLight: '#ffffff',
    });
  } else {
    document.getElementById('qr-div-usuario').textContent = 'QRCode lib não carregada';
  }
}

function _imprimirQrUsuario(id) {
  const u = _getUsuariosRuntime().find(x => x.id === id);
  if (!u || !u.matricula) return;
  const imgEl = document.querySelector('#qr-div-usuario img');
  const dataUrl = imgEl ? imgEl.src : '';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>QR ${u.nome}</title>
    <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Inter,sans-serif;}
    img{width:200px;height:200px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;}
    h2{margin:8px 0 4px;font-size:16px;color:#111;} p{margin:0;font-size:12px;color:#6b7280;font-family:monospace;}</style>
    </head><body>
    <img src="${dataUrl}">
    <h2>${u.nome}</h2>
    <p>Matrícula: ${u.matricula}</p>
    <script>window.onload=()=>{window.print();window.close();}<\/script>
    </body></html>`);
  win.document.close();
}

window._renderUsuarios            = _renderUsuarios;
window._abrirModalUsuario         = _abrirModalUsuario;
window._fecharModalUsuario        = _fecharModalUsuario;
window._salvarUsuario             = _salvarUsuario;
window._toggleStatusUsuario       = _toggleStatusUsuario;
window._confirmarDeletarUsuario   = _confirmarDeletarUsuario;
window._deletarUsuario            = _deletarUsuario;
window._carregarUsuariosServidor  = _carregarUsuariosServidor;
window._mostrarQrUsuario          = _mostrarQrUsuario;
window._imprimirQrUsuario         = _imprimirQrUsuario;
