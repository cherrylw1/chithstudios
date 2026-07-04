import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// ==========================================
// 1. GLOBAL STATE & PERFORMANCE CONFIG
// ==========================================
const AppState = {
  assetsLoaded: false,
  mouse: { x: 0, y: 0 },
  mousePrev: { x: 0, y: 0 },
  mouseVelocity: { x: 0, y: 0, length: 0 },
  scrollVelocity: 0,
  perceptionState: 'sober', // sober | intoxicated | hangover
  time: 0
};

// Track mouse position and velocity
let lastMouseMoveTime = performance.now();
window.addEventListener('mousemove', (e) => {
  const now = performance.now();
  const dt = Math.max(now - lastMouseMoveTime, 1); // Avoid division by zero
  
  AppState.mouse.x = e.clientX;
  AppState.mouse.y = e.clientY;
  
  const dx = e.clientX - AppState.mousePrev.x;
  const dy = e.clientY - AppState.mousePrev.y;
  
  AppState.mouseVelocity.x = dx / dt;
  AppState.mouseVelocity.y = dy / dt;
  AppState.mouseVelocity.length = Math.sqrt(dx*dx + dy*dy) / dt;
  
  AppState.mousePrev.x = e.clientX;
  AppState.mousePrev.y = e.clientY;
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
// 4. GSAP PARALLAX HERO SCROLL TIMELINE
// ==========================================
const bgImage = document.getElementById('hero-cinematic-bg');
const monumentalHeader = document.getElementById('monumental-header-layer');
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

// Segment 1: Parallax zoom-out cinematic background image (0% -> 50% scroll)
heroTimeline.to(bgImage, { scale: 1.0, opacity: 0.85, ease: "none" }, 0);

// Segment 2: Monumental typography text fade in (40% -> 80% scroll)
heroTimeline.to(monumentalHeader, { opacity: 0.95, y: -20, ease: "power1.out" }, 0.4);

// Segment 3: Manifesto text reveal (80% -> 100% scroll)
heroTimeline.to(manifestoTrigger, { opacity: 1, y: 0, ease: "power2.out" }, 0.8);

// ==========================================
// 5. INTERACTIVE SVG WAVEFORM DRAWING
// ==========================================
const wavePath = document.getElementById('waveform-path');
const wavePointsCount = 60;
const waveWidth = 1000;
const waveHeight = 200;

function drawWaveform(time, speed) {
  let pathD = `M 0 100 `;
  // Amplitude linked directly to user velocity
  const amplitude = 12.0 + speed * 120.0;
  
  for (let i = 0; i <= wavePointsCount; i++) {
    const t = i / wavePointsCount;
    const x = t * waveWidth;
    
    // Waveform equation: sine wave with Gaussian envelope shaping
    const envelope = Math.exp(-Math.pow(t - 0.5, 2) / 0.05);
    const wave1 = Math.sin(t * 35.0 - time * 6.0) * cos(t * 12.0);
    const wave2 = Math.sin(t * 70.0 - time * 12.0) * 0.4;
    const y = 100 + (wave1 + wave2) * amplitude * envelope;
    
    pathD += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  
  wavePath.setAttribute('d', pathD);
}

// ==========================================
// 6. ALTERED PERCEPTION SVG TURBULENCE ENGINE
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
  const mouseSpeed = AppState.mouseVelocity.length;
  const scrollSpeed = Math.abs(AppState.scrollVelocity);
  
  // Intoxicated trigger (mouse speed > 0.6px/ms or scroll speed > 25)
  if (mouseSpeed > 0.6 || scrollSpeed > 25.0) {
    if (AppState.perceptionState !== 'intoxicated') {
      AppState.perceptionState = 'intoxicated';
      
      distortElements.forEach(el => {
        if (el) el.classList.add('glitch-flicker');
      });
    }
    
    targetShear = AppState.mouseVelocity.x * 12.0;
    targetScale = 1.05 + (scrollSpeed * 0.002);
    
    // Heavy SVG displacement liquid warp values
    targetMapScale = Math.min(15 + (mouseSpeed * 45), 75);
    targetBaseFreq = 0.02 + (mouseSpeed * 0.05);
    
  } else {
    // Recovery (Hangover state)
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

// Interpolate perception variables and bind to DOM SVG element attributes
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
  
  // Update displacement mapping SVG attributes directly
  if (displacementMap) {
    displacementMap.setAttribute('scale', String(Math.round(currentMapScale)));
    const filterTurbulence = displacementMap.previousElementSibling;
    if (filterTurbulence) {
      filterTurbulence.setAttribute('baseFrequency', String(currentBaseFreq.toFixed(4)));
    }
  }
}

// ==========================================
// 7. RIGHT COLUMN 2D CANVAS PIXEL-SHREDDER
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
  
  // Viewfinder circles
  ctx.strokeStyle = 'rgba(250, 249, 246, 0.2)';
  ctx.beginPath();
  ctx.arc(canvasSize / 2, canvasSize / 2, 100, 0, Math.PI * 2);
  ctx.arc(canvasSize / 2, canvasSize / 2, 150, 0, Math.PI * 2);
  ctx.stroke();
  
  // Camera bounds
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
  drawVectorArtwork(shredderCtx, AppState.mouseVelocity.length);
  applyPixelShredFilter(shredderCtx, AppState.mouseVelocity.length);
}

// ==========================================
// 8. FRAME 6: LIQUID FOOTER PHYSICS
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
  const pushMultiplier = Math.max(AppState.mouseVelocity.length * 1.5, 0.4);
  
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

// Window resizing
window.addEventListener('resize', () => {
  initFooterCanvas();
});

setTimeout(initFooterCanvas, 500);

// ==========================================
// 9. ANIMATION LOOP
// ==========================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  AppState.time += delta;
  
  // Render waveform and calculate velocity updates
  drawWaveform(AppState.time, AppState.mouseVelocity.length);
  
  checkPerceptionState();
  updatePerceptionDOM();
  
  updateShredderCanvas();
  drawFooterPhysics();
}

animate();
