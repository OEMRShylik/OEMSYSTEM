// ── QR Confirm: confirmar operador ao iniciar processo (full-screen, estilo login) ──
(function () {

  let _stream = null;
  let _raf    = null;

  function _stop() {
    if (_raf)    { cancelAnimationFrame(_raf); _raf = null; }
    if (_stream) { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
  }

  function _close() {
    _stop();
    const m = document.getElementById('qrc-modal');
    if (m) {
      m.style.opacity = '0';
      m.style.transition = 'opacity .18s ease';
      setTimeout(() => m.remove(), 180);
    }
  }

  window.mostrarConfirmacaoQR = function (onConfirm) {
    const m = document.getElementById('qrc-modal');
    if (m) m.remove();

    const nome  = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.nome  : '—';
    const setor = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.setor : '—';
    const inits = nome.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    const modal = document.createElement('div');
    modal.id = 'qrc-modal';
    modal.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9000', 'overflow:hidden',
      'font-family:Inter,sans-serif', 'opacity:0', 'transition:opacity .2s ease',
    ].join(';');

    modal.innerHTML = `
      <!-- Câmera full-screen -->
      <video id="qrc-video" playsinline autoplay muted
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;z-index:0;"></video>
      <canvas id="qrc-canvas" style="display:none;"></canvas>

      <!-- Fundo gradiente (placeholder enquanto câmera carrega) -->
      <div id="qrc-placeholder" style="position:absolute;inset:0;z-index:0;
        background:linear-gradient(160deg,#0f172a 0%,#1e293b 65%,#0c2340 100%);
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(100,140,255,.35)" stroke-width="1.4">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span style="font-size:12px;color:rgba(255,255,255,.25);">Iniciando câmera…</span>
      </div>

      <!-- Logo (topo) -->
      <div style="position:absolute;top:0;left:0;right:0;z-index:2;pointer-events:none;
        display:flex;justify-content:center;padding-top:44px;">
        <div style="display:flex;flex-direction:row;align-items:center;gap:12px;">
          <img src="assets/hylik_os.png" alt="HYLIK OS"
            style="height:58px;object-fit:contain;display:block;filter:brightness(0) invert(1);">
          <div style="color:#fff;font-size:16px;font-weight:800;letter-spacing:1.5px;white-space:nowrap;">
            | OEM SYSTEM
          </div>
        </div>
      </div>

      <!-- Título da operação -->
      <div style="position:absolute;top:130px;left:0;right:0;z-index:2;pointer-events:none;
        display:flex;justify-content:center;">
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:1.2px;
          text-transform:uppercase;background:rgba(0,0,0,.28);padding:4px 16px;border-radius:20px;
          backdrop-filter:blur(4px);">
          Confirmar Operador
        </div>
      </div>

      <!-- Frame de scan (igual ao login) -->
      <div style="position:absolute;inset:0;z-index:1;pointer-events:none;
        display:flex;align-items:center;justify-content:center;">
        <div style="position:relative;width:clamp(200px,58vmin,255px);height:clamp(200px,58vmin,255px);">
          <div style="position:absolute;inset:0;box-shadow:0 0 0 100vmax rgba(0,0,0,.58);border-radius:6px;"></div>
          <div style="position:absolute;top:-1px;left:-1px;width:28px;height:28px;
            border-top:3px solid rgba(255,255,255,.9);border-left:3px solid rgba(255,255,255,.9);border-radius:4px 0 0 0;"></div>
          <div style="position:absolute;top:-1px;right:-1px;width:28px;height:28px;
            border-top:3px solid rgba(255,255,255,.9);border-right:3px solid rgba(255,255,255,.9);border-radius:0 4px 0 0;"></div>
          <div style="position:absolute;bottom:-1px;left:-1px;width:28px;height:28px;
            border-bottom:3px solid rgba(255,255,255,.9);border-left:3px solid rgba(255,255,255,.9);border-radius:0 0 0 4px;"></div>
          <div style="position:absolute;bottom:-1px;right:-1px;width:28px;height:28px;
            border-bottom:3px solid rgba(255,255,255,.9);border-right:3px solid rgba(255,255,255,.9);border-radius:0 0 4px 0;"></div>
        </div>
      </div>

      <!-- Rodapé -->
      <div style="position:absolute;bottom:0;left:0;right:0;z-index:2;
        display:flex;flex-direction:column;align-items:center;gap:12px;padding:0 28px 52px;">

        <!-- Hint -->
        <div id="qrc-hint" style="font-size:13px;color:rgba(255,255,255,.8);text-align:center;
          font-weight:500;background:rgba(0,0,0,.32);padding:6px 18px;border-radius:20px;
          backdrop-filter:blur(4px);">
          Escaneie o crachá ou continue como operador atual
        </div>

        <!-- Card do operador atual -->
        <div style="display:flex;align-items:center;gap:12px;
          background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.18);
          border-radius:14px;padding:12px 16px;width:100%;max-width:380px;
          backdrop-filter:blur(10px);">
          <div id="qrc-avatar" style="width:40px;height:40px;border-radius:50%;background:#0891b2;
            display:flex;align-items:center;justify-content:center;
            font-size:14px;font-weight:700;color:#fff;flex-shrink:0;">${inits}</div>
          <div style="flex:1;min-width:0;">
            <div id="qrc-nome" style="font-size:13px;font-weight:700;color:#fff;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome}</div>
            <div id="qrc-setor" style="font-size:11px;color:rgba(255,255,255,.6);margin-top:1px;">${setor}</div>
          </div>
          <button id="qrc-btn-continuar"
            style="padding:9px 20px;background:#0891b2;color:#fff;border:none;border-radius:10px;
              font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;
              font-family:Inter,sans-serif;transition:background .15s;"
            onmouseenter="this.style.background='#0e7490'"
            onmouseleave="this.style.background='#0891b2'">
            Continuar
          </button>
        </div>

        <!-- Cancelar -->
        <button id="qrc-btn-cancelar"
          style="padding:10px 32px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.7);
            border:1.5px solid rgba(255,255,255,.2);border-radius:12px;font-size:13px;font-weight:600;
            cursor:pointer;font-family:Inter,sans-serif;backdrop-filter:blur(6px);
            transition:background .15s;"
          onmouseenter="this.style.background='rgba(255,255,255,.18)'"
          onmouseleave="this.style.background='rgba(255,255,255,.1)'">
          Cancelar
        </button>
      </div>`;

    document.body.appendChild(modal);
    // Fade-in
    requestAnimationFrame(() => { modal.style.opacity = '1'; });

    document.getElementById('qrc-btn-continuar').onclick = () => {
      _close();
      onConfirm(typeof currentUser !== 'undefined' ? currentUser : null);
    };
    document.getElementById('qrc-btn-cancelar').onclick = _close;

    // Inicia câmera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        _stream = stream;
        const v = document.getElementById('qrc-video');
        if (!v) { _stop(); return; }
        v.srcObject = stream;
        v.play();
        v.onloadedmetadata = () => {
          v.style.display = 'block';
          const ph = document.getElementById('qrc-placeholder');
          if (ph) ph.style.display = 'none';
        };
        _scanLoop();
      })
      .catch(() => {
        const h = document.getElementById('qrc-hint');
        if (h) h.textContent = 'Câmera indisponível — continue como operador atual';
      });
  };

  function _scanLoop() {
    if (!document.getElementById('qrc-modal')) { _stop(); return; }
    const v = document.getElementById('qrc-video');
    const c = document.getElementById('qrc-canvas');
    if (!v || !c) { _stop(); return; }
    if (v.readyState < 2) { _raf = requestAnimationFrame(_scanLoop); return; }

    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0);
    const img  = ctx.getImageData(0, 0, c.width, c.height);
    const code = typeof jsQR === 'function'
      ? jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })
      : null;

    if (code && code.data) {
      const raw = code.data.trim();
      let decoded = '';
      try { decoded = atob(raw); } catch (e) {}
      const digSeqs = [...new Set([
        ...(raw.match(/\d+/g) || []),
        ...(decoded.match(/\d+/g) || []),
      ])];

      const users = typeof _getUsuariosRuntime === 'function' ? _getUsuariosRuntime() : [];
      let found = users.find(x => x.id === raw || (decoded && x.id === decoded));
      if (!found) {
        found = users.find(x => {
          if (!x.matricula) return false;
          const mat = String(x.matricula);
          return mat === raw || mat === decoded || digSeqs.some(d => mat === d);
        });
      }

      if (found) {
        _stop();
        _aplicarOperador(found);
        _close();
        setTimeout(() => onConfirm(found), 60);
        return;
      }
      const h = document.getElementById('qrc-hint');
      if (h) h.textContent = 'QR não reconhecido';
    }

    _raf = requestAnimationFrame(_scanLoop);
  }

  function _aplicarOperador(u) {
    if (typeof currentUser === 'undefined' || u.id === currentUser?.id) return;
    currentUser = u;

    const txt = document.getElementById('topbar-user-text');
    if (txt) {
      const map = { Admin:'Administrador', Produção:'Produção', Comercial:'Comercial', Expedição:'Expedição', Gestão:'Gestão' };
      txt.textContent = u.nome + ' | ' + (map[u.setor] || u.setor);
    }
    const initEl = document.getElementById('user-initials');
    if (initEl) {
      initEl.innerHTML = `<span style="font-size:13px;font-weight:700;color:#fff;">${u.initials || u.nome.split(' ').map(w=>w[0]).join('').substring(0,2)}</span>`;
      if (typeof sectorColor === 'function') initEl.style.background = sectorColor(u.setor);
    }
    const nameEl = document.getElementById('user-name-label');
    if (nameEl) nameEl.textContent = u.nome.split(' ')[0];
    const badgeEl = document.getElementById('user-sector-badge');
    if (badgeEl) badgeEl.textContent = u.setor;

    if (typeof applyPermissions === 'function') applyPermissions(u);
    if (typeof _mostrarToast === 'function') _mostrarToast('Operador: ' + u.nome, '#0891b2');
  }

})();
