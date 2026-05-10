// ═══════════════════════════════════════════════════
//  viewer3d.js integrado — 3 peças GLB + textura URL
// ═══════════════════════════════════════════════════

const PIVOT_A = -1.649;
const PIVOT_B = +1.649;
let _v3d = null;

function viewer3dInit(containerId) {
  const ct = document.getElementById(containerId);
  if (!ct) return;
  const loadChain = (scripts, cb) => {
    if (!scripts.length) { cb(); return; }
    const s = document.createElement('script');
    s.src = scripts[0]; s.onload = () => loadChain(scripts.slice(1), cb);
    s.onerror = () => loadChain(scripts.slice(1), cb);
    document.head.appendChild(s);
  };
  const needed = [];
  if (!window.THREE)                needed.push('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
  if (!window.THREE?.GLTFLoader)    needed.push('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
  if (!window.THREE?.OrbitControls) needed.push('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
  needed.length ? loadChain(needed, () => _viewer3dSetup(ct)) : _viewer3dSetup(ct);
}

function _viewer3dSetup(ct) {
  const T = window.THREE;
  if (!T) { console.error('Three.js não carregou'); return; }
  if (_v3d) { viewer3dSetAngle(currentAngulo); return; }
  if (!ct.clientWidth || !ct.clientHeight) { setTimeout(() => _viewer3dSetup(ct), 200); return; }
  if (!T.GLTFLoader) {
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
    s.onload=()=>_viewer3dSetup(ct); document.head.appendChild(s); return;
  }

  const W=ct.clientWidth, H=ct.clientHeight;
  const renderer = new T.WebGLRenderer({antialias:true});
  renderer.setSize(W,H); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1;
  renderer.setClearColor(0xe4e8f0,1);
  ct.style.position='relative';
  ct.innerHTML=''; ct.appendChild(renderer.domElement);

  // Hint rotação — aparece 3s e desaparece
  const _hint=document.createElement('div');
  _hint.style.cssText='position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:rgba(0,0,0,0.55);color:#fff;padding:6px 14px;border-radius:20px;font-family:Inter,sans-serif;font-size:12px;font-weight:600;pointer-events:none;z-index:10;transition:opacity 0.6s';
  _hint.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>&nbsp;Arraste para girar';
  ct.appendChild(_hint);
  // Hint permanente

  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(26, W/H, 0.1, 100);
  cam.position.set(-3.5, 1.8, 6.5);
  cam.lookAt(0, -0.3, 0);

  const controls = T.OrbitControls ? new T.OrbitControls(cam, renderer.domElement) : null;
  if (controls) {
    controls.enableDamping=true; controls.dampingFactor=0.07;
    controls.minDistance=2; controls.maxDistance=20;
    controls.target.set(0,-0.3,0); controls.update();
  }

  scene.add(new T.AmbientLight(0xddeeff, 0.70));
  const key = new T.DirectionalLight(0xffffff, 0.90);
  key.position.set(5,10,7); key.castShadow=true; key.shadow.mapSize.set(2048,2048); key.shadow.bias=-0.001; scene.add(key);
  const fill = new T.DirectionalLight(0xb0c8e0, 0.40); fill.position.set(-6,3,-5); scene.add(fill);
  const bot  = new T.DirectionalLight(0x8090a8, 0.20); bot.position.set(0,-8,3);  scene.add(bot);

  // Textura mangueira via URL
  const _hoseTex = new T.TextureLoader().load(
    'assets/hose_texture.png',
    (tex) => {
      // U=comprimento (ClampToEdge), V=ângulo (Repeat para cobrir volta)
      tex.wrapS = T.ClampToEdgeWrapping;  // horizontal: sem repeat
      tex.wrapT = T.ClampToEdgeWrapping;  // vertical: sem repeat
      tex.offset.set(0, 0.25);            // centraliza no lado visível da câmera
      tex.needsUpdate = true;
    }
  );
  const matHose = new T.MeshPhysicalMaterial({
    map: _hoseTex, color: 0xffffff, metalness:0.0, roughness:0.80, side: T.DoubleSide
  });

    const matMetal = new T.MeshPhysicalMaterial({
    color:0xb0bcc8, metalness:0.70, roughness:0.25,
    reflectivity:0.85, clearcoat:0.20, clearcoatRoughness:0.25
  });


  function loadModel(url, mat, parent) {
    const loader = new T.GLTFLoader();
    loader.load(url, (gltf) => {
      gltf.scene.traverse((ch) => {
        if (ch.isMesh) { ch.castShadow=ch.receiveShadow=true; ch.material=mat; }
      });
      parent.add(gltf.scene);
      console.log(url+' ✓');
    }, undefined, (e) => console.error(url, e));
  }

  // Mangueira com textura
  loadModel('models/hose.glb', matHose, scene);

  // Terminal A fixo (esquerda)
  const termAGroup = new T.Group();
  termAGroup.position.set(PIVOT_A, 0, 0);
  scene.add(termAGroup);
  loadModel('models/terminal_a.glb', matMetal, termAGroup);

  // Terminal B girante (direita)
  const termBGroup = new T.Group();
  termBGroup.position.set(PIVOT_B, 0, 0);
  scene.add(termBGroup);
  loadModel('models/terminal_b.glb', matMetal, termBGroup);

  _v3d = {renderer, scene, cam, controls, termBGroup};

  (function loop() {
    requestAnimationFrame(loop);
    if (controls) controls.update();
    renderer.render(scene, cam);
  })();
}

function viewer3dSetAngle(deg) {
  if (!_v3d) return;
  _v3d.termBGroup.rotation.x = -(deg * Math.PI) / 180;
}

function viewer3dResize() {
  if (!_v3d) return;
  const ct = document.getElementById('ang-hose-3d');
  if (!ct||!ct.clientWidth) return;
  _v3d.renderer.setSize(ct.clientWidth, ct.clientHeight);
  _v3d.cam.aspect = ct.clientWidth/ct.clientHeight;
  _v3d.cam.updateProjectionMatrix();
}