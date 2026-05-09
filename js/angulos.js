// ══════════════════════════════════════════════════
//  ÂNGULOS — Immersive 360 viewer + range slider
// ══════════════════════════════════════════════════
let currentAngulo = 0;
let angAnimFrame = null;
let angAnimTarget = 0;
let angAnimCurrent = 0;

function renderAngulos() {
  // init canvas
  resizeAngCanvas();
  drawAngCanvas(0);
  // init range track fill
  updateRangeTrack(0);
}

function updateRangeTrack(val) {
  const el = document.getElementById('ang-range');
  if (!el) return;
  const pct = (val / 355) * 100;
  el.style.setProperty('--pct', pct + '%');
  el.style.background = `linear-gradient(to right,#4a90ff 0%,#4a90ff ${pct}%,rgba(74,144,255,.18) ${pct}%,rgba(74,144,255,.18) 100%)`;
}

function selAngRange(val) {
  const deg = parseInt(val);
  currentAngulo = deg;
  document.getElementById('ang-deg-big').textContent = deg + '°';
  updateRangeTrack(deg);
  angAnimTarget = deg;
  if (angAnimFrame) cancelAnimationFrame(angAnimFrame);
  animateAng();
}

function resizeAngCanvas() {
  const screen = document.getElementById('screen-angulos');
  const canvas = document.getElementById('ang-canvas');
  if (!screen || !canvas) return;
  canvas.width = screen.clientWidth;
  canvas.height = screen.clientHeight;
}

function animateAng() {
  const diff = angAnimTarget - angAnimCurrent;
  if (Math.abs(diff) < 0.3) {
    angAnimCurrent = angAnimTarget;
    drawAngCanvas(angAnimCurrent);
    return;
  }
  angAnimCurrent += diff * 0.14;
  drawAngCanvas(angAnimCurrent);
  angAnimFrame = requestAnimationFrame(animateAng);
}

function drawAngCanvas(deg) {
  const canvas = document.getElementById('ang-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.40;

  // 0° = bottom, clockwise
  function toRad(d) { return Math.PI / 2 + d * Math.PI / 180; }

  // White disc
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.09, 0, Math.PI*2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 2; ctx.stroke();

  // Tick marks + labels — every 1°, labelled every 10°
  for (let t = 0; t < 360; t++) {
    const a = toRad(t);
    const maj10 = t % 10 === 0;
    const maj5  = t % 5 === 0 && !maj10;
    const tickLen = maj10 ? R*0.11 : maj5 ? R*0.065 : R*0.038;
    const lw = maj10 ? 1.3 : maj5 ? 0.9 : 0.55;
    const r1 = R, r2 = R - tickLen;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a)*r1, cy + Math.sin(a)*r1);
    ctx.lineTo(cx + Math.cos(a)*r2, cy + Math.sin(a)*r2);
    ctx.strokeStyle = '#111'; ctx.lineWidth = lw; ctx.stroke();

    if (maj10) {
      const lr = R - tickLen - (t % 30 === 0 ? 14 : 10);
      ctx.save();
      ctx.translate(cx + Math.cos(a)*lr, cy + Math.sin(a)*lr);
      ctx.rotate(a + Math.PI/2);
      ctx.font = `${t % 30 === 0 ? '700 12px' : '500 9px'} Inter,sans-serif`;
      ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t, 0, 0);
      ctx.restore();
    }
  }

  // Arc fill 0→deg
  if (deg !== 0) {
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R*0.48, toRad(0), toRad(deg), false);
    ctx.closePath();
    ctx.fillStyle = 'rgba(26,86,219,0.07)'; ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, R*0.48, toRad(0), toRad(deg), false);
    ctx.strokeStyle = 'rgba(26,86,219,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // Inner white circle
  ctx.beginPath(); ctx.arc(cx, cy, R*0.47, 0, Math.PI*2);
  ctx.fillStyle = '#f8f8f8'; ctx.fill();

  // Fixed pointer at 0° (black)
  drawPointer(ctx, cx, cy, toRad(0), R*0.44, '#222', false);

  // Moving pointer at deg (blue)
  drawPointer(ctx, cx, cy, toRad(deg), R*0.44, '#1a56db', true);

  // Center hub
  ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2);
  ctx.fillStyle = '#333'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2);
  ctx.fillStyle = '#fff'; ctx.fill();
}

function drawPointer(ctx, cx, cy, angle, len, color, isMoving) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle - Math.PI/2); // "up" direction = outward along angle

  const s = len;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;

  // Arch ring at tip
  const archY = -s * 0.76;
  const archR = s * 0.13;
  ctx.beginPath(); ctx.arc(0, archY, archR + s*0.04, 0, Math.PI*2);
  ctx.fillStyle = '#f8f8f8'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
  // inner hole
  ctx.beginPath(); ctx.arc(0, archY, archR - s*0.04, 0, Math.PI*2);
  ctx.fillStyle = '#f8f8f8'; ctx.fill();

  // Stem (tapered trapezoid)
  const tw = s * 0.09, bw = s * 0.22;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-tw/2, archY);
  ctx.lineTo( tw/2, archY);
  ctx.lineTo( bw/2, -s*0.05);
  ctx.lineTo(-bw/2, -s*0.05);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Upper block
  ctx.fillRect(-bw/2, -s*0.05, bw, s*0.09);
  ctx.strokeRect(-bw/2, -s*0.05, bw, s*0.09);

  // Lower block (wider)
  const lb = bw * 1.25;
  ctx.fillRect(-lb/2, s*0.04, lb, s*0.08);
  ctx.strokeRect(-lb/2, s*0.04, lb, s*0.08);

  // Serrated ribs on base
  const ribs = 6, rw = lb / ribs;
  ctx.fillStyle = isMoving ? '#1557b0' : '#111';
  for (let i = 0; i < ribs; i++) {
    ctx.fillRect(-lb/2 + i*rw + 0.8, s*0.12, rw - 1.6, s*0.11);
  }

  ctx.restore();
}

