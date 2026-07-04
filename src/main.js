import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Import Shaders as raw text via Vite raw queries
import distortionVert from './shaders/distortion.vert?raw';
import distortionFrag from './shaders/distortion.frag?raw';
import chromeWarpVert from './shaders/chromeWarp.vert?raw';
import chromeWarpFrag from './shaders/chromeWarp.frag?raw';
import fluidFlowFrag from './shaders/fluidFlow.frag?raw';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// ==========================================
// 1. GLOBAL STATE & PERFORMANCE CONFIG
// ==========================================
const AppState = {
  assetsLoaded: false,
  mouse: new THREE.Vector2(),
  mousePrev: new THREE.Vector2(),
  mouseVelocity: new THREE.Vector2(),
  scrollVelocity: 0,
  perceptionState: 'sober', // sober | intoxicated | hangover
  time: 0
};

// Track mouse position and velocity
let lastMouseMoveTime = performance.now();
window.addEventListener('mousemove', (e) => {
  const now = performance.now();
  const dt = Math.max(now - lastMouseMoveTime, 1); // Avoid division by zero
  
  // Normalize mouse: -1 to +1
  AppState.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  AppState.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  
  // Calculate pixel velocity for physics
  const dx = e.clientX - AppState.mousePrev.x;
  const dy = e.clientY - AppState.mousePrev.y;
  AppState.mouseVelocity.set(dx / dt, dy / dt);
  
  AppState.mousePrev.set(e.clientX, e.clientY);
  lastMouseMoveTime = now;
});

// ==========================================
// 2. SMOOTH SCROLL HIJACKING (LENIS)
// ==========================================
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  orientation: 'vertical',
  gestureOrientation: 'vertical'
});

function updateScroll(time) {
  lenis.raf(time);
  requestAnimationFrame(updateScroll);
}
requestAnimationFrame(updateScroll);

// Keep Camera Timecode rolling dynamically
const timecodeEl = document.getElementById('camera-timecode');
if (timecodeEl) {
  setInterval(() => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const frames = String(Math.floor(now.getMilliseconds() / 41)).padStart(2, '0'); // ~24 fps
    timecodeEl.textContent = `TC ${hrs}:${mins}:${secs}:${frames}`;
  }, 41);
}

// ==========================================
// 3. FRAME 1: PRELOADER LIFECYCLE
// ==========================================
const preloaderEl = document.getElementById('preloader');
const preloaderPercentageEl = document.getElementById('preloader-percentage');
const preloaderStatusStream = document.getElementById('preloader-status-stream');

const statusMessages = [
  "[SYS_INFO] CACHING HIGH-RES CINEMATIC VIDEO TILES... DONE",
  "[SYS_INFO] LOADING MONUMENTAL CHROMATIC MAPS... DONE",
  "[SYS_INFO] LINKING LENIS SCROLL HIJACK PIPELINE... DONE",
  "[SYS_INFO] ASSEMBLING BRUTALIST GRID FRAMEWORKS... DONE",
  "[SYS_INFO] INITIALIZING TURBULENCE DISPLACEMENT ENGINE... DONE",
  "[SYS_INFO] BOOTING ALTERED PERCEPTION STATE CONTROLLERS... ACTIVE",
  "[SYS_INFO] INITIALIZING AUDIO-VISUAL WAVEFORM... DONE",
  "[SYS_INFO] HEADING TO THE PARK BENCH..."
];

let progressVal = 0;
let statusIndex = 0;

function runPreloaderSimulation() {
  if (progressVal < 100) {
    progressVal += Math.floor(Math.random() * 12) + 4;
    if (progressVal > 100) progressVal = 100;
    
    preloaderPercentageEl.textContent = String(progressVal).padStart(3, '0');
    
    if (progressVal % 10 === 0 || Math.random() > 0.6) {
      statusIndex = (statusIndex + 1) % statusMessages.length;
      preloaderStatusStream.innerHTML = statusMessages[statusIndex] + `<br>[SYS_INFO] DOWNLOADING ASSETS: ${progressVal}%`;
    }
    
    setTimeout(runPreloaderSimulation, 45);
  } else {
    preloaderStatusStream.textContent = "[SYS_INFO] BOOT SEQUENCE COMPLETED.";
    
    gsap.to(preloaderEl, {
      opacity: 0,
      duration: 0.6,
      ease: "power3.out",
      onComplete: () => {
        preloaderEl.style.display = 'none';
        AppState.assetsLoaded = true;
      }
    });
  }
}

runPreloaderSimulation();

// ==========================================
// 4. MAIN THREE.JS 3D TRANSPARENT PIPELINE
// ==========================================
const container3D = document.getElementById('webgl-canvas-container');
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.2, 5);

// WebGLRenderer with alpha transparent settings
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container3D.appendChild(renderer.domElement);

// Lights setup (Volt spotlight and point light reflections overlaying image)
const ambientLight = new THREE.AmbientLight(0xFAF9F6, 0.1);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xD4FF00, 15);
spotLight.position.set(1.5, 6.0, 3.5);
spotLight.angle = 0.22;
spotLight.penumbra = 0.9;
scene.add(spotLight);

const pointLight = new THREE.PointLight(0x1C162E, 8, 15);
pointLight.position.set(-2, -1.0, 1.5);
scene.add(pointLight);

// ==========================================
// 5. LIQUID CHROME TYPOGRAPHY ("CHITH STUDIOS")
// ==========================================
const logoGlassMesh = new THREE.Group();
const chromeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uMouseVelocity: { value: new THREE.Vector2(0, 0) },
    uSolidifyProgress: { value: 0.0 }
  },
  vertexShader: chromeWarpVert,
  fragmentShader: chromeWarpFrag,
  transparent: true,
  depthWrite: true
});

function createBrutalistLetters() {
  const blockGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  
  const lettersGrid = {
    'C': [
      [1,1,1],
      [1,0,0],
      [1,0,0],
      [1,0,0],
      [1,1,1]
    ],
    'H': [
      [1,0,1],
      [1,0,1],
      [1,1,1],
      [1,0,1],
      [1,0,1]
    ],
    'I': [
      [1,1,1],
      [0,1,0],
      [0,1,0],
      [0,1,0],
      [1,1,1]
    ],
    'T': [
      [1,1,1],
      [0,1,0],
      [0,1,0],
      [0,1,0],
      [0,1,0]
    ],
    'S': [
      [1,1,1],
      [1,0,0],
      [1,1,1],
      [0,0,1],
      [1,1,1]
    ],
    'U': [
      [1,0,1],
      [1,0,1],
      [1,0,1],
      [1,0,1],
      [1,1,1]
    ],
    'D': [
      [1,1,0],
      [1,0,1],
      [1,0,1],
      [1,0,1],
      [1,1,0]
    ],
    'O': [
      [1,1,1],
      [1,0,1],
      [1,0,1],
      [1,0,1],
      [1,1,1]
    ]
  };

  const word = ['C', 'H', 'I', 'T', 'H', 'space', 'S', 'T', 'U', 'D', 'I', 'O', 'S'];
  const letterSpacing = 0.23; // Tightly tracked
  const startX = -((word.length - 1) * letterSpacing) / 2;

  word.forEach((char, letterIdx) => {
    if (char === 'space') return;
    const grid = lettersGrid[char];
    const xOffset = startX + letterIdx * letterSpacing;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[r][c] === 1) {
          const block = new THREE.Mesh(blockGeo, chromeMaterial);
          block.scale.set(0.9, 0.9, 0.9);
          block.position.set(
            xOffset + (c - 1) * 0.04,
            0.55 - (r - 2) * 0.04, // center spacing offset
            0
          );
          logoGlassMesh.add(block);
        }
      }
    }
  });
}

createBrutalistLetters();
// Placed slightly above center height
logoGlassMesh.position.set(0, 0.65, 0.1);
logoGlassMesh.scale.set(0.001, 0.001, 0.001);
scene.add(logoGlassMesh);

// ==========================================
// 6. VISCOUS NEON FLUID RIBBONS (SPLINES)
// ==========================================
const fluidGroup = new THREE.Group();
const fluidMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: fluidFlowFrag,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide
});

const splinesCount = 3;
const ribbonMeshes = [];
for (let s = 0; s < splinesCount; s++) {
  const points = [];
  const pointsCount = 40;
  const radius = 0.055;
  
  for (let i = 0; i < pointsCount; i++) {
    const t = i / (pointsCount - 1);
    const angle = t * Math.PI * 4.5 + s * (Math.PI * 2.0 / 3.0);
    // Winding path rising upwards from melted slat center
    const px = Math.sin(angle) * (0.05 + t * 0.7);
    const py = -0.1 + t * 4.0;
    const pz = Math.cos(angle) * (0.05 + t * 0.7) + (t * 0.2);
    
    points.push(new THREE.Vector3(px, py, pz));
  }
  
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeo = new THREE.TubeGeometry(curve, 64, radius, 8, false);
  const tubeMesh = new THREE.Mesh(tubeGeo, fluidMaterial);
  tubeMesh.scale.set(0.001, 0.001, 0.001);
  fluidGroup.add(tubeMesh);
  ribbonMeshes.push(tubeMesh);
}
scene.add(fluidGroup);

// ==========================================
// 7. FLOATING NEON CURSORS
// ==========================================
const cursorGroup = new THREE.Group();
const cursorGeo = new THREE.BufferGeometry();
const cursorVertices = new Float32Array([
  0.0, 0.0, 0.0,
  0.08, -0.16, 0.0,
  0.02, -0.13, 0.0,
  0.02, -0.13, 0.0,
  0.08, -0.16, 0.0,
  0.0, -0.20, 0.0
]);
cursorGeo.setAttribute('position', new THREE.BufferAttribute(cursorVertices, 3));
const cursorMat = new THREE.MeshBasicMaterial({ color: 0xD4FF00, side: THREE.DoubleSide });

const cursorsList = [];
for (let i = 0; i < 4; i++) {
  const cMesh = new THREE.Mesh(cursorGeo, cursorMat);
  cMesh.scale.set(0.7, 0.7, 0.7);
  const rx = (Math.random() - 0.5) * 3.5;
  const ry = -0.2 + (Math.random() - 0.5) * 1.5;
  const rz = 0.5 + (Math.random() - 0.5) * 1.0;
  cMesh.position.set(rx, ry, rz);
  cMesh.rotation.z = -0.3 + Math.random() * 0.6;
  
  cursorGroup.add(cMesh);
  cursorsList.push({
    mesh: cMesh,
    baseX: rx,
    baseY: ry,
    baseZ: rz,
    speed: 0.6 + Math.random() * 0.8
  });
}
scene.add(cursorGroup);

// ==========================================
// 8. EFFECT COMPOSER (POST-PROCESSING)
// ==========================================
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Link post-processing to global velocity parameters
const distortionPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uScrollVelocity: { value: 0 },
    uTime: { value: 0 }
  },
  vertexShader: distortionVert,
  fragmentShader: distortionFrag
});
composer.addPass(distortionPass);

// ==========================================
// 9. GSAP SCROLL TIMELINE
// ==========================================
const bgImage = document.getElementById('hero-cinematic-bg');
const manifestoTrigger = document.getElementById('manifesto-trigger-layer');

const heroTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: "#hero-3d-pin-container",
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    pin: true
  }
});

// Segment 1: Parallax scale visual background + WebGL camera zoom & fluid ribbon growth (0% -> 40%)
heroTimeline.to(bgImage, { scale: 1.0, opacity: 0.85, ease: "none" }, 0)
            .to(camera.position, { x: 0.0, y: 1.8, z: 4.0, ease: "power1.inOut" }, 0)
            .to(ribbonMeshes.map(m => m.scale), { x: 1.0, y: 1.0, z: 1.0, ease: "power2.inOut" }, 0);

// Segment 2: Fluid loops converge, camera ascends, chrome logo solidifies (40% -> 80%)
heroTimeline.to(camera.position, { y: 4.2, z: 2.5, ease: "power1.inOut" }, 1)
            .to(chromeMaterial.uniforms.uSolidifyProgress, { value: 1.0, ease: "power2.out" }, 1)
            .to(logoGlassMesh.scale, { x: 1.35, y: 1.35, z: 1.35, ease: "power2.out" }, 1);

// Segment 3: Settle logo rotation & show scroll overlays (80% -> 100%)
heroTimeline.to(logoGlassMesh.rotation, { y: Math.PI * 2, ease: "power2.inOut" }, 2)
            .to(manifestoTrigger, { opacity: 1, y: 0, ease: "power2.out" }, 2);

// ==========================================
// 10. INTERACTIVE SVG WAVEFORM DRAWING
// ==========================================
const wavePath = document.getElementById('waveform-path');
const wavePointsCount = 60;
const waveWidth = 1000;

lenis.on('scroll', (e) => {
  AppState.scrollVelocity = e.velocity;
  
  // Stretch post-processing aberration on velocity spikes
  gsap.to(distortionPass.uniforms.uScrollVelocity, {
    value: Math.min(Math.abs(AppState.scrollVelocity) * 0.05, 0.4),
    duration: 0.3,
    ease: "power2.out"
  });
});

function drawWaveform(time, speed) {
  let pathD = `M 0 100 `;
  const amplitude = 12.0 + speed * 120.0;
  
  for (let i = 0; i <= wavePointsCount; i++) {
    const t = i / wavePointsCount;
    const x = t * waveWidth;
    const envelope = Math.exp(-Math.pow(t - 0.5, 2) / 0.05);
    const wave1 = Math.sin(t * 35.0 - time * 6.0) * Math.cos(t * 12.0);
    const wave2 = Math.sin(t * 70.0 - time * 12.0) * 0.4;
    const y = 100 + (wave1 + wave2) * amplitude * envelope;
    
    pathD += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  
  wavePath.setAttribute('d', pathD);
}

// ==========================================
// 11. ALTERED PERCEPTION SVG TURBULENCE ENGINE
// ==========================================
const displacementMap = document.getElementById('displacement-map');
const distortElements = [
  document.getElementById('manifesto-distort'),
  document.getElementById('content-left-distort')
];

let targetShear = 0;
let targetScale = 1.0;
let targetMapScale = 0;
let targetBaseFreq = 0.01;

let currentShear = 0;
let currentScale = 1.0;
let currentMapScale = 0;
let currentBaseFreq = 0.01;

function checkPerceptionState() {
  const mouseSpeed = AppState.mouseVelocity.length();
  const scrollSpeed = Math.abs(AppState.scrollVelocity);
  
  if (mouseSpeed > 0.6 || scrollSpeed > 25.0) {
    if (AppState.perceptionState !== 'intoxicated') {
      AppState.perceptionState = 'intoxicated';
      
      distortElements.forEach(el => {
        if (el) el.classList.add('glitch-flicker');
      });
    }
    
    targetShear = AppState.mouseVelocity.x * 12.0;
    targetScale = 1.05 + (scrollSpeed * 0.002);
    targetMapScale = Math.min(15 + (mouseSpeed * 45), 75);
    targetBaseFreq = 0.02 + (mouseSpeed * 0.05);
    
  } else {
    if (AppState.perceptionState === 'intoxicated') {
      AppState.perceptionState = 'hangover';
      
      distortElements.forEach(el => {
        if (el) el.classList.remove('glitch-flicker');
      });
      
      gsap.to(window, {
        duration: 1.2,
        overwrite: "auto",
        onStart: () => {
          targetShear = 0;
          targetScale = 1.0;
          targetMapScale = 0;
          targetBaseFreq = 0.01;
        },
        onComplete: () => {
          AppState.perceptionState = 'sober';
        }
      });
    }
  }
}

function updatePerceptionDOM() {
  const lerpFactor = AppState.perceptionState === 'intoxicated' ? 0.35 : 0.08;
  
  currentShear += (targetShear - currentShear) * lerpFactor;
  currentScale += (targetScale - currentScale) * lerpFactor;
  currentMapScale += (targetMapScale - currentMapScale) * lerpFactor;
  currentBaseFreq += (targetBaseFreq - currentBaseFreq) * lerpFactor;
  
  distortElements.forEach(el => {
    if (el) {
      el.style.setProperty('--distortion-shear', `${currentShear}deg`);
      el.style.setProperty('--distortion-scale', `${currentScale}`);
      
      if (Math.abs(currentShear) > 0.1) {
        el.classList.add('is-intoxicated');
      } else {
        el.classList.remove('is-intoxicated');
      }
    }
  });
  
  if (displacementMap) {
    displacementMap.setAttribute('scale', String(Math.round(currentMapScale)));
    const filterTurbulence = displacementMap.previousElementSibling;
    if (filterTurbulence) {
      filterTurbulence.setAttribute('baseFrequency', String(currentBaseFreq.toFixed(4)));
    }
  }
}

// ==========================================
// 12. RIGHT COLUMN 2D CANVAS PIXEL-SHREDDER
// ==========================================
const shredderCanvas = document.getElementById('pixel-shredder-canvas');
const shredderCtx = shredderCanvas.getContext('2d', { willReadFrequently: true });
let canvasSize = 400;

function initShredderCanvas() {
  shredderCanvas.width = canvasSize;
  shredderCanvas.height = canvasSize;
}
initShredderCanvas();

function drawVectorArtwork(ctx, velocity) {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.fillStyle = '#0A0B0E';
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  
  ctx.strokeStyle = '#FAF9F6';
  ctx.lineWidth = 1;
  
  // Center crosshairs
  ctx.beginPath();
  ctx.moveTo(canvasSize / 2 - 20, canvasSize / 2);
  ctx.lineTo(canvasSize / 2 + 20, canvasSize / 2);
  ctx.moveTo(canvasSize / 2, canvasSize / 2 - 20);
  ctx.lineTo(canvasSize / 2, canvasSize / 2 + 20);
  ctx.stroke();
  
  ctx.strokeStyle = 'rgba(250, 249, 246, 0.2)';
  ctx.beginPath();
  ctx.arc(canvasSize / 2, canvasSize / 2, 100, 0, Math.PI * 2);
  ctx.arc(canvasSize / 2, canvasSize / 2, 150, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.strokeStyle = '#D4FF00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(30, 30);
  ctx.lineTo(60, 30);
  ctx.moveTo(30, 30);
  ctx.lineTo(30, 60);
  ctx.moveTo(canvasSize - 30, canvasSize - 30);
  ctx.lineTo(canvasSize - 60, canvasSize - 30);
  ctx.moveTo(canvasSize - 30, canvasSize - 30);
  ctx.lineTo(canvasSize - 30, canvasSize - 60);
  ctx.stroke();
  
  ctx.fillStyle = 'rgba(250, 249, 246, 0.4)';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText("MATRIX CORE SHIFT: " + velocity.toFixed(3), 35, canvasSize - 35);
}

function applyPixelShredFilter(ctx, velocity) {
  if (velocity < 0.5) return;
  
  const imgData = ctx.getImageData(0, 0, canvasSize, canvasSize);
  const data = imgData.data;
  const shredMagnitude = Math.min(velocity * 45, 120);
  
  for (let y = 0; y < canvasSize; y++) {
    if (Math.sin(y * 0.05 + AppState.time * 5.0) > 0.2) {
      const offsetX = Math.floor((Math.random() - 0.5) * shredMagnitude);
      const rowStart = y * canvasSize * 4;
      
      const rowBuffer = new Uint8Array(canvasSize * 4);
      for (let i = 0; i < canvasSize * 4; i++) {
        rowBuffer[i] = data[rowStart + i];
      }
      
      for (let x = 0; x < canvasSize; x++) {
        const targetX = (x + offsetX + canvasSize) % canvasSize;
        const sourceIdx = x * 4;
        const destIdx = targetX * 4;
        
        data[rowStart + destIdx] = rowBuffer[sourceIdx];
        data[rowStart + destIdx + 1] = rowBuffer[sourceIdx + 1];
        data[rowStart + destIdx + 2] = rowBuffer[sourceIdx + 2];
        
        if (Math.random() > 0.98) {
          data[rowStart + destIdx] = 212;
          data[rowStart + destIdx + 1] = 255;
          data[rowStart + destIdx + 2] = 0;
        }
      }
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
}

function updateShredderCanvas() {
  const speed = AppState.mouseVelocity.length();
  drawVectorArtwork(shredderCtx, speed);
  applyPixelShredFilter(shredderCtx, speed);
}

// ==========================================
// 13. FRAME 6: LIQUID FOOTER PHYSICS
// ==========================================
const footerCanvas = document.getElementById('footer-liquid-canvas');
const footerCtx = footerCanvas.getContext('2d');
let footerParticles = [];
const footerText = "HELLO@CHITHSTUDIOS.COM";

function initFooterCanvas() {
  const rect = footerCanvas.parentElement.getBoundingClientRect();
  footerCanvas.width = rect.width;
  footerCanvas.height = rect.height;
  
  const offscreen = document.createElement('canvas');
  offscreen.width = rect.width;
  offscreen.height = rect.height;
  const oCtx = offscreen.getContext('2d');
  
  const fontSize = Math.min(rect.width * 0.07, 72);
  oCtx.font = `900 ${fontSize}px "Inter", sans-serif`;
  oCtx.fillStyle = '#FFFFFF';
  oCtx.textAlign = 'center';
  oCtx.textBaseline = 'middle';
  oCtx.fillText(footerText, rect.width / 2, rect.height / 2);
  
  const imgData = oCtx.getImageData(0, 0, rect.width, rect.height);
  const data = imgData.data;
  footerParticles = [];
  
  const step = 4;
  for (let y = 0; y < rect.height; y += step) {
    for (let x = 0; x < rect.width; x += step) {
      const idx = (y * rect.width + x) * 4;
      if (data[idx] > 128) {
        footerParticles.push({
          x: x,
          y: y,
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
          size: Math.random() * 1.5 + 1.0
        });
      }
    }
  }
}

let footerMouse = { x: -1000, y: -1000 };
footerCanvas.addEventListener('mousemove', (e) => {
  const rect = footerCanvas.getBoundingClientRect();
  footerMouse.x = e.clientX - rect.left;
  footerMouse.y = e.clientY - rect.top;
});
footerCanvas.addEventListener('mouseleave', () => {
  footerMouse.x = -1000;
  footerMouse.y = -1000;
});

function drawFooterPhysics() {
  footerCtx.clearRect(0, 0, footerCanvas.width, footerCanvas.height);
  const pushMultiplier = Math.max(AppState.mouseVelocity.length() * 1.5, 0.4);
  
  footerCtx.fillStyle = '#D4FF00';
  
  for (let i = 0; i < footerParticles.length; i++) {
    const p = footerParticles[i];
    const dx = footerMouse.x - p.x;
    const dy = footerMouse.y - p.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 90.0;
    
    if (distance < maxDistance) {
      const force = (maxDistance - distance) * 0.90;
      const angle = Math.atan2(dy, dx);
      
      p.x -= Math.cos(angle) * force * pushMultiplier * 0.15;
      p.y -= Math.sin(angle) * force * pushMultiplier * 0.15;
      
      p.x += (Math.random() - 0.5) * 1.2;
      p.y += (Math.random() - 0.5) * 1.2;
    } else {
      const targetX = p.baseX + Math.sin(AppState.time * 2.0 + p.baseX * 0.01) * 1.5;
      p.x += (targetX - p.x) * 0.08;
      p.y += (p.baseY - p.y) * 0.08;
    }
    
    footerCtx.fillRect(p.x, p.y, p.size, p.size);
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  
  initFooterCanvas();
});

setTimeout(initFooterCanvas, 500);

// ==========================================
// 14. ANIMATION GRAPHICS LOOP
// ==========================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  AppState.time += delta;
  
  // Pipe parameters to shaders uniforms
  distortionPass.uniforms.uTime.value = AppState.time;
  chromeMaterial.uniforms.uTime.value = AppState.time;
  chromeMaterial.uniforms.uMouseVelocity.value.copy(AppState.mouseVelocity);
  fluidMaterial.uniforms.uTime.value = AppState.time;
  
  // Drift cursors slowly
  cursorsList.forEach((c) => {
    c.mesh.position.x = c.baseX + Math.sin(AppState.time * c.speed) * 0.15;
    c.mesh.position.y = c.baseY + Math.cos(AppState.time * c.speed) * 0.15;
  });
  
  // WebGL off-screen culling checks
  const heroPinHeight = window.innerHeight * 3;
  const currentScroll = lenis.scroll;
  
  if (currentScroll < heroPinHeight + window.innerHeight) {
    if (AppState.assetsLoaded) {
      // Slow float ribbons rotation
      fluidGroup.rotation.y = Math.sin(AppState.time * 0.3) * 0.03;
      composer.render();
    }
  }
  
  drawWaveform(AppState.time, AppState.mouseVelocity.length());
  
  checkPerceptionState();
  updatePerceptionDOM();
  
  updateShredderCanvas();
  drawFooterPhysics();
}

animate();

// ==========================================
// 15. GPU CONTEXT LOST FALLBACKS
// ==========================================
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  AppState.assetsLoaded = false;
  container3D.style.display = 'none';
}, false);
