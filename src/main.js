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

// Global shader uniforms for post-processing and logo shader
window.chithShaderUniforms = {
  uScrollVelocity: { value: 0 },
  uTime: { value: 0 }
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

// Hook into scroll velocity and pipe to shader uniforms
lenis.on('scroll', (e) => {
  AppState.scrollVelocity = e.velocity;
  
  gsap.to(window.chithShaderUniforms.uScrollVelocity, {
    value: Math.min(Math.abs(AppState.scrollVelocity) * 0.05, 0.4),
    duration: 0.3,
    ease: "power2.out"
  });
});

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

// Preloader 3D Canvas initialization
const preloaderScene = new THREE.Scene();
const preloaderCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
preloaderCamera.position.z = 2.5;

const preloaderRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
preloaderRenderer.setSize(200, 200);
preloaderRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('preloader-sphere-container').appendChild(preloaderRenderer.domElement);

// Create sphere geometry for preloader
const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
const preloaderUniforms = {
  uExplodeProgress: { value: 0.0 }
};

// Custom explosion shader
const preloaderMaterial = new THREE.ShaderMaterial({
  uniforms: preloaderUniforms,
  vertexShader: `
    uniform float uExplodeProgress;
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      // Explode vertices outwards along normals
      vec3 pos = position + normal * uExplodeProgress * 2.0;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      // Shading based on normal for a flat wireframe bulb look
      float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5;
      gl_FragColor = vec4(vec3(0.98, 0.978, 0.965) * intensity, 0.85); // Alabaster Bone
    }
  `,
  wireframe: true,
  transparent: true
});

const preloaderMesh = new THREE.Mesh(sphereGeo, preloaderMaterial);
preloaderScene.add(preloaderMesh);

// Simulated asset loading status stream
const statusMessages = [
  "[SYS_INFO] INJECTING TAILWIND CUSTOM TOKENS... DONE",
  "[SYS_INFO] COMPILING LIQUID GLASS LOGO SHADER... DONE",
  "[SYS_INFO] CACHING CHROMATIC ABERRATION BUFFER... DONE",
  "[SYS_INFO] LINKING LENIS SCROLL HIJACK PIPELINE... DONE",
  "[SYS_INFO] ASSEMBLING BRUTALIST GRID FRAMEWORKS... DONE",
  "[SYS_INFO] PARSING GLTF BENCH MODEL VECTOR MATRIX... DONE",
  "[SYS_INFO] DETECTING CORE GRAPHICS ACCELERATION... ACTIVE",
  "[SYS_INFO] INITIALIZING ALTERED PERCEPTION INTERPOLATORS... DONE",
  "[SYS_INFO] HEADING TO THE PARK BENCH..."
];

let progressVal = 0;
let statusIndex = 0;

function runPreloaderSimulation() {
  if (progressVal < 100) {
    progressVal += Math.floor(Math.random() * 8) + 2;
    if (progressVal > 100) progressVal = 100;
    
    preloaderPercentageEl.textContent = String(progressVal).padStart(3, '0');
    
    // Periodically update loading messages
    if (progressVal % 12 === 0 || Math.random() > 0.7) {
      statusIndex = (statusIndex + 1) % statusMessages.length;
      preloaderStatusStream.innerHTML = statusMessages[statusIndex] + `<br>[SYS_INFO] DOWNLOADING ASSETS: ${progressVal}%`;
    }
    
    // Rotate preloader sphere
    preloaderMesh.rotation.y += 0.02;
    preloaderMesh.rotation.x += 0.01;
    preloaderRenderer.render(preloaderScene, preloaderCamera);
    
    setTimeout(runPreloaderSimulation, 50);
  } else {
    // 100% Load Completed - Shatter / Explode
    preloaderStatusStream.textContent = "[SYS_INFO] DETONATING SPHERE MESH...";
    
    gsap.to(preloaderUniforms.uExplodeProgress, {
      value: 1.5,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate: () => {
        preloaderMesh.rotation.y += 0.05;
        preloaderRenderer.render(preloaderScene, preloaderCamera);
      },
      onComplete: () => {
        // Shatter completed - Fade out preloader overlay
        gsap.to(preloaderEl, {
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          onComplete: () => {
            preloaderEl.style.display = 'none';
            preloaderRenderer.dispose();
            AppState.assetsLoaded = true;
          }
        });
      }
    });
  }
}

// Start preloader sequence
runPreloaderSimulation();

// ==========================================
// 4. MAIN THREE.JS 3D PIPELINE
// ==========================================
const container3D = document.getElementById('webgl-canvas-container');
const scene = new THREE.Scene();

// Camera viewport tracking
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.2, 5); // Start camera position

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container3D.appendChild(renderer.domElement);

// Lights setup
const ambientLight = new THREE.AmbientLight(0xFAF9F6, 0.05); // Subdued Alabaster Bone ambient
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xD4FF00, 12); // High-voltage Volt spotlight beam
spotLight.position.set(1.5, 6.0, 3.5);
spotLight.angle = 0.20; // Tight focused spotlight cone
spotLight.penumbra = 0.9;
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 2048;
spotLight.shadow.mapSize.height = 2048;
spotLight.shadow.bias = -0.0001;
spotLight.shadow.radius = 4;
scene.add(spotLight);

const pointLight = new THREE.PointLight(0x1C162E, 8, 15); // Bruised Indigo shadow fill
pointLight.position.set(-2, -1.0, 1.5);
scene.add(pointLight);

// ==========================================
// 5. LIQUID CHROME LOGO TYPOGRAPHY
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

// Helper to build brutalist block letters for "CHITH STUDIOS"
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
  const letterSpacing = 0.23; // Tight tracking
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
            0.55 - (r - 2) * 0.04, // Offset center y
            0
          );
          block.castShadow = true;
          block.receiveShadow = true;
          logoGlassMesh.add(block);
        }
      }
    }
  });
}

createBrutalistLetters();
logoGlassMesh.position.set(0, 0.65, 0.1);
logoGlassMesh.scale.set(0.001, 0.001, 0.001); // Hidden initially, scaled on scroll
scene.add(logoGlassMesh);

// ==========================================
// 6. DEFORMED WOOD BENCH & SHADOW FLOOR
// ==========================================
const benchGroup = new THREE.Group();

const concreteLegMat = new THREE.MeshStandardMaterial({
  color: 0x050508, // Cast iron ebonized supports
  roughness: 0.95,
  metalness: 0.8
});

const woodSlatMat = new THREE.MeshStandardMaterial({
  color: 0xFAF9F6, // Alabaster Bone painted slats
  roughness: 0.70,
  metalness: 0.1
});

// Concrete support legs
const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.8), concreteLegMat);
legL.position.set(-1.0, 0, 0);
legL.castShadow = true;
legL.receiveShadow = true;

const legR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.8), concreteLegMat);
legR.position.set(1.0, 0, 0);
legR.castShadow = true;
legR.receiveShadow = true;

benchGroup.add(legL, legR);

// Wood seat and backrest slats (Warped/Deformed in center)
const slatsCount = 5;
const slatW = 2.4;
const slatH = 0.04;
const slatD = 0.08;

// Create deforming geometries using Gaussian profiles
const seatSlatGeo = new THREE.BoxGeometry(slatW, slatH, slatD, 40, 1, 1);
const seatPos = seatSlatGeo.attributes.position;
for (let v = 0; v < seatPos.count; v++) {
  const vx = seatPos.getX(v);
  const vy = seatPos.getY(v);
  // Deform top and bottom vertices in center smoothly
  const sag = -0.15 * Math.exp(-Math.pow(vx, 2) / 0.12);
  seatPos.setY(v, vy + sag);
}
seatSlatGeo.computeVertexNormals();

const backSlatGeo = new THREE.BoxGeometry(slatW, slatD, slatH, 40, 1, 1);
const backPos = backSlatGeo.attributes.position;
for (let v = 0; v < backPos.count; v++) {
  const vx = backPos.getX(v);
  const vy = backPos.getY(v);
  const sag = -0.12 * Math.exp(-Math.pow(vx, 2) / 0.12);
  backPos.setY(v, vy + sag);
}
backSlatGeo.computeVertexNormals();

for (let i = 0; i < slatsCount; i++) {
  // Seat Slats
  const seatSlat = new THREE.Mesh(seatSlatGeo, woodSlatMat);
  seatSlat.position.set(0, 0.2, -0.2 + i * 0.11);
  seatSlat.castShadow = true;
  seatSlat.receiveShadow = true;
  benchGroup.add(seatSlat);

  // Backrest Slats
  const backSlat = new THREE.Mesh(backSlatGeo, woodSlatMat);
  backSlat.position.set(0, 0.4 + i * 0.10, -0.38);
  backSlat.castShadow = true;
  backSlat.receiveShadow = true;
  benchGroup.add(backSlat);
}

benchGroup.position.set(0, -0.3, 0);
scene.add(benchGroup);

// Shadow plane
const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.ShadowMaterial({ color: 0x1C162E, opacity: 0.90 }); // Bruised Indigo shadows
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.7;
floor.receiveShadow = true;
scene.add(floor);

// ==========================================
// 7. VISCOUS NEON FLUID RIBBONS (SPLINES)
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

// Generate 3 splines winding up from the bench center
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
  tubeMesh.scale.set(0.001, 0.001, 0.001); // Hidden initially
  fluidGroup.add(tubeMesh);
  ribbonMeshes.push(tubeMesh);
}
scene.add(fluidGroup);

// ==========================================
// 8. WAVEFORM LINE PLANE
// ==========================================
const waveGeo = new THREE.PlaneGeometry(8, 2.5);
const waveMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uScrollVelocity: window.chithShaderUniforms.uScrollVelocity
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uScrollVelocity;
    varying vec2 vUv;
    
    void main() {
      float x = vUv.x;
      float y = vUv.y - 0.5;
      
      // Amplitude increases with scroll velocity
      float amp = 0.15 + uScrollVelocity * 0.7;
      float waveVal = sin(x * 38.0 - uTime * 4.0) * cos(x * 14.0) * amp;
      
      // Fade edges
      float edgeFade = smoothstep(0.0, 0.25, x) * smoothstep(1.0, 0.75, x);
      
      // Draw thin glowing line
      float lineDist = abs(y - waveVal);
      float glow = exp(-lineDist * 35.0);
      
      gl_FragColor = vec4(0.831, 1.000, 0.000, glow * edgeFade * 0.85); // Volt Lime
    }
  `,
  transparent: true,
  depthWrite: false
});
const waveMesh = new THREE.Mesh(waveGeo, waveMaterial);
waveMesh.position.set(0, 0.05, -0.6); // Behind bench
scene.add(waveMesh);

// ==========================================
// 9. FLOATING VOLT LIME CURSORS
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
  // Random coordinates
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
// 10. PARTICLE SYSTEM (CURL-NOISE EMISSION FALLBACK)
// ==========================================
const particleCount = 600;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleSeeds = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 2.2;
  particlePositions[i * 3 + 1] = 0.1 - 0.3; // Slat cracks
  particlePositions[i * 3 + 2] = -0.2 + Math.random() * 0.4;
  particleSeeds[i] = Math.random() * 100.0;
}
particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particleGeometry.setAttribute('aSeed', new THREE.BufferAttribute(particleSeeds, 1));

const particleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uEruptionProgress: { value: 0.0 },
    uTime: { value: 0.0 }
  },
  vertexShader: `
    uniform float uEruptionProgress;
    uniform float uTime;
    attribute float aSeed;
    varying float vOpacity;
    
    void main() {
      vec3 pos = position;
      float t = uTime * 0.8 + aSeed;
      pos.x += sin(pos.y * 3.0 + t) * uEruptionProgress * 0.3;
      pos.y += uEruptionProgress * (1.5 + fract(aSeed * 0.2) * 2.0);
      pos.z += cos(pos.x * 3.0 + t) * uEruptionProgress * 0.3;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = (10.0 / -mvPosition.z);
      vOpacity = (1.0 - uEruptionProgress * 0.7);
    }
  `,
  fragmentShader: `
    varying float vOpacity;
    void main() {
      float dist = distance(gl_PointCoord, vec2(0.5));
      if (dist > 0.5) discard;
      gl_FragColor = vec4(0.831, 1.000, 0.000, vOpacity * 0.5);
    }
  `,
  transparent: true,
  depthWrite: false
});
const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleSystem);

// ==========================================
// 11. EFFECT COMPOSER (POST-PROCESSING)
// ==========================================
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const distortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    uScrollVelocity: window.chithShaderUniforms.uScrollVelocity,
    uTime: window.chithShaderUniforms.uTime
  },
  vertexShader: distortionVert,
  fragmentShader: distortionFrag
};

const distortionPass = new ShaderPass(distortionShader);
composer.addPass(distortionPass);

// ==========================================
// 12. GSAP SCROLL HERO PIN TIMELINE
// ==========================================
const heroTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: "#hero-3d-pin-container",
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    pin: true,
  }
});

// Segment 1: Camera pan, fluid ribbons grow scale, and particles erupt (0% -> 40%)
heroTimeline.to(camera.position, { x: 0.0, y: 2.2, z: 4.0, ease: "power1.inOut" }, 0)
            .to(particleMaterial.uniforms.uEruptionProgress, { value: 1.0, ease: "power1.inOut" }, 0)
            .to(ribbonMeshes.map(m => m.scale), { x: 1.0, y: 1.0, z: 1.0, ease: "power2.inOut" }, 0);

// Segment 2: Fluid loops converge, camera ascends, chrome logo solidifies and header fades in (40% -> 80%)
heroTimeline.to(camera.position, { y: 4.2, z: 2.5, ease: "power1.inOut" }, 1)
            .to(chromeMaterial.uniforms.uSolidifyProgress, { value: 1.0, ease: "power2.out" }, 1)
            .to(logoGlassMesh.scale, { x: 1.35, y: 1.35, z: 1.35, ease: "power2.out" }, 1)
            .to("#monumental-header-layer", { opacity: 0.9, ease: "power2.out" }, 1);

// Segment 3: Chrome logo spins in final focus and content sections show (80% -> 100%)
heroTimeline.to(logoGlassMesh.rotation, { y: Math.PI * 2, ease: "power2.inOut" }, 2)
            .to("#manifesto-trigger-layer", { opacity: 1, y: 0, ease: "power2.out" }, 2);

// ==========================================
// 10. ALTERED PERCEPTION STATE ENGINE
const distortElements = [
  document.getElementById('manifesto-distort'),
  document.getElementById('content-left-distort')
];

let targetShear = 0;
let targetScale = 1.0;
let targetBlur = 0;
let currentShear = 0;
let currentScale = 1.0;
let currentBlur = 0;
let isFlickering = false;

// Check velocity to toggle Intoxicated state
function checkPerceptionState() {
  const mouseSpeed = AppState.mouseVelocity.length(); // speed in px/ms
  const scrollSpeed = Math.abs(AppState.scrollVelocity);
  
  // Intoxicate if mouse velocity crosses threshold (~500px/s => 0.5px/ms) or rapid scroll
  if (mouseSpeed > 0.6 || scrollSpeed > 25.0) {
    if (AppState.perceptionState !== 'intoxicated') {
      AppState.perceptionState = 'intoxicated';
      isFlickering = true;
      
      // Select random text character glitches
      distortElements.forEach(el => {
        if (el) el.classList.add('glitch-flicker');
      });
    }
    
    // Set extreme parameters matching Intoxication sensations (sheared, blurred, heavy)
    targetShear = AppState.mouseVelocity.x * 12.0; // max 12 deg
    targetScale = 1.05 + (scrollSpeed * 0.002);
    targetBlur = Math.min(2.5 + (mouseSpeed * 1.5), 6.0); // max 6px blur
    
  } else {
    // Trigger recovery (Hangover state)
    if (AppState.perceptionState === 'intoxicated') {
      AppState.perceptionState = 'hangover';
      isFlickering = false;
      
      // Stop text flickering
      distortElements.forEach(el => {
        if (el) el.classList.remove('glitch-flicker');
      });
      
      // Smoothly transition parameters back to 0 over 1.2s using GSAP
      gsap.to(window, {
        duration: 1.2,
        overwrite: "auto",
        onStart: () => {
          targetShear = 0;
          targetScale = 1.0;
          targetBlur = 0;
        },
        onComplete: () => {
          AppState.perceptionState = 'sober';
        }
      });
    }
  }
}

// Interpolate perception values (Lerping logic for structural return)
function updatePerceptionDOM() {
  // If intoxicated, parameters change instantly. In hangover/sober, they glide back
  const lerpFactor = AppState.perceptionState === 'intoxicated' ? 0.35 : 0.08;
  
  currentShear += (targetShear - currentShear) * lerpFactor;
  currentScale += (targetScale - currentScale) * lerpFactor;
  currentBlur += (targetBlur - currentBlur) * lerpFactor;
  
  distortElements.forEach(el => {
    if (el) {
      el.style.setProperty('--distortion-shear', `${currentShear}deg`);
      el.style.setProperty('--distortion-scale', `${currentScale}`);
      el.style.setProperty('--distortion-blur', `${currentBlur}px`);
      
      if (Math.abs(currentShear) > 0.1 || currentBlur > 0.1) {
        el.classList.add('is-intoxicated');
      } else {
        el.classList.remove('is-intoxicated');
      }
    }
  });
}

// ==========================================
// 11. RIGHT COLUMN 2D CANVAS PIXEL-SHREDDER
// ==========================================
const shredderCanvas = document.getElementById('pixel-shredder-canvas');
const shredderCtx = shredderCanvas.getContext('2d', { willReadFrequently: true });
let canvasSize = 400;

function initShredderCanvas() {
  shredderCanvas.width = canvasSize;
  shredderCanvas.height = canvasSize;
}
initShredderCanvas();

// Draw premium procedural vector graphics (camera viewfinder layout)
function drawVectorArtwork(ctx, velocity) {
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.fillStyle = '#0A0B0E'; // chithVoid
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  
  ctx.strokeStyle = '#FAF9F6'; // chithBone
  ctx.lineWidth = 1;
  
  // Center crosshairs
  ctx.beginPath();
  ctx.moveTo(canvasSize / 2 - 20, canvasSize / 2);
  ctx.lineTo(canvasSize / 2 + 20, canvasSize / 2);
  ctx.moveTo(canvasSize / 2, canvasSize / 2 - 20);
  ctx.lineTo(canvasSize / 2, canvasSize / 2 + 20);
  ctx.stroke();
  
  // Lens outer circles
  ctx.strokeStyle = 'rgba(250, 249, 246, 0.2)';
  ctx.beginPath();
  ctx.arc(canvasSize / 2, canvasSize / 2, 100, 0, Math.PI * 2);
  ctx.arc(canvasSize / 2, canvasSize / 2, 150, 0, Math.PI * 2);
  ctx.stroke();
  
  // Asymmetric framing lines
  ctx.strokeStyle = '#D4FF00'; // chithVolt
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
  
  // Text readout
  ctx.fillStyle = 'rgba(250, 249, 246, 0.4)';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText("MATRIX CORE SHIFT: " + velocity.toFixed(3), 35, canvasSize - 35);
}

// Algorithmic Pixel Shredder filter applied based on velocity
function applyPixelShredFilter(ctx, velocity) {
  if (velocity < 0.5) return; // Only shred at higher velocities
  
  const imgData = ctx.getImageData(0, 0, canvasSize, canvasSize);
  const data = imgData.data;
  const shredMagnitude = Math.min(velocity * 45, 120); // Scale shred intensity
  
  // Shred row-by-row
  for (let y = 0; y < canvasSize; y++) {
    // Create organic displacement bands using math sine waves
    if (Math.sin(y * 0.05 + AppState.time * 5.0) > 0.2) {
      const offsetX = Math.floor((Math.random() - 0.5) * shredMagnitude);
      const rowStart = y * canvasSize * 4;
      
      // Temporary buffer for row shifting
      const rowBuffer = new Uint8Array(canvasSize * 4);
      for (let i = 0; i < canvasSize * 4; i++) {
        rowBuffer[i] = data[rowStart + i];
      }
      
      for (let x = 0; x < canvasSize; x++) {
        // Shift pixel X coordinates wrapping around canvas boundaries
        const targetX = (x + offsetX + canvasSize) % canvasSize;
        const sourceIdx = x * 4;
        const destIdx = targetX * 4;
        
        data[rowStart + destIdx] = rowBuffer[sourceIdx];         // R
        data[rowStart + destIdx + 1] = rowBuffer[sourceIdx + 1]; // G
        data[rowStart + destIdx + 2] = rowBuffer[sourceIdx + 2]; // B
        
        // Visual bleed color overlay (ethanol volt effect)
        if (Math.random() > 0.98) {
          data[rowStart + destIdx] = 212;   // R (#D4FF00)
          data[rowStart + destIdx + 1] = 255; // G
          data[rowStart + destIdx + 2] = 0;   // B
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
// 12. FRAME 6: LIQUID FOOTER PHYSICS
// ==========================================
const footerCanvas = document.getElementById('footer-liquid-canvas');
const footerCtx = footerCanvas.getContext('2d');
let footerParticles = [];
const footerText = "HELLO@CHITHSTUDIOS.COM";

function initFooterCanvas() {
  const rect = footerCanvas.parentElement.getBoundingClientRect();
  footerCanvas.width = rect.width;
  footerCanvas.height = rect.height;
  
  // Render text offscreen to sample points
  const offscreen = document.createElement('canvas');
  offscreen.width = rect.width;
  offscreen.height = rect.height;
  const oCtx = offscreen.getContext('2d');
  
  // Stylize text font sizing based on viewport width
  const fontSize = Math.min(rect.width * 0.07, 72);
  oCtx.font = `900 ${fontSize}px "Inter", sans-serif`;
  oCtx.fillStyle = '#FFFFFF';
  oCtx.textAlign = 'center';
  oCtx.textBaseline = 'middle';
  oCtx.fillText(footerText, rect.width / 2, rect.height / 2);
  
  const imgData = oCtx.getImageData(0, 0, rect.width, rect.height);
  const data = imgData.data;
  footerParticles = [];
  
  // Sample text coordinates (scanning every 4th pixel for high efficiency)
  const step = 4;
  for (let y = 0; y < rect.height; y += step) {
    for (let x = 0; x < rect.width; x += step) {
      const idx = (y * rect.width + x) * 4;
      if (data[idx] > 128) { // White pixel threshold
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

// Track mouse local offset relative to the footer canvas bounding client rect
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
  
  const mouseSpeed = AppState.mouseVelocity.length();
  const pushMultiplier = Math.max(mouseSpeed * 1.5, 0.4);
  
  footerCtx.fillStyle = '#D4FF00'; // volt lime pixels
  
  for (let i = 0; i < footerParticles.length; i++) {
    const p = footerParticles[i];
    
    // Melt Math Physics
    const dx = footerMouse.x - p.x;
    const dy = footerMouse.y - p.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 90.0;
    
    if (distance < maxDistance) {
      // Exponential force push
      const force = (maxDistance - distance) * 0.90;
      const angle = Math.atan2(dy, dx);
      
      // Push particles away
      p.x -= Math.cos(angle) * force * pushMultiplier * 0.15;
      p.y -= Math.sin(angle) * force * pushMultiplier * 0.15;
      
      // Add slight jitter / chaotic fluid weight
      p.x += (Math.random() - 0.5) * 1.2;
      p.y += (Math.random() - 0.5) * 1.2;
    } else {
      // Linear interpolation back to original text position (Hangover recovery)
      const targetX = p.baseX + Math.sin(AppState.time * 2.0 + p.baseX * 0.01) * 1.5;
      p.x += (targetX - p.x) * 0.08;
      p.y += (p.baseY - p.y) * 0.08;
    }
    
    // Draw particle
    footerCtx.fillRect(p.x, p.y, p.size, p.size);
  }
}

// Initialize canvases on resize
window.addEventListener('resize', () => {
  // Resize Three.js Camera & Renderer
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  
  initFooterCanvas();
});

// Delay footer initialization slightly to ensure fonts loaded
setTimeout(initFooterCanvas, 500);

// ==========================================
// 13. GLOBAL GRAPHICS LOOP & SCENE CONTROL
// ==========================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  AppState.time += delta;
  
  // Pipe parameters to shaders uniforms
  window.chithShaderUniforms.uTime.value = AppState.time;
  chromeMaterial.uniforms.uTime.value = AppState.time;
  chromeMaterial.uniforms.uMouseVelocity.value.copy(AppState.mouseVelocity);
  particleMaterial.uniforms.uTime.value = AppState.time;
  fluidMaterial.uniforms.uTime.value = AppState.time;
  waveMaterial.uniforms.uTime.value = AppState.time;
  
  // Drift cursors slowly
  cursorsList.forEach((c) => {
    c.mesh.position.x = c.baseX + Math.sin(AppState.time * c.speed) * 0.15;
    c.mesh.position.y = c.baseY + Math.cos(AppState.time * c.speed) * 0.15;
  });
  
  // WebGL off-screen culling checks
  // If hero container is completely scrolled past, turn off 3D updates to save GPU cycles
  const heroPinHeight = window.innerHeight * 3;
  const currentScroll = lenis.scroll;
  
  if (currentScroll < heroPinHeight + window.innerHeight) {
    // 3D Scene is in view, render it
    if (AppState.assetsLoaded) {
      // Bench subtle breathing animation
      benchGroup.rotation.y = Math.sin(AppState.time * 0.5) * 0.05;
      
      // Particles slow drift
      particleSystem.rotation.y += 0.002;
      
      composer.render();
    }
  }
  
  // Run altered perception loop calculations
  checkPerceptionState();
  updatePerceptionDOM();
  
  // Render active 2D Canvas components
  updateShredderCanvas();
  drawFooterPhysics();
}

animate();

// ==========================================
// 14. WEBGL CONTEXT LOST CONTEXT DEFENSES
// ==========================================
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  console.warn('[SYS_WARNING] WebGL Context Lost! Initiating static fallback layouts.');
  
  // Stop Three.js rendering loops
  AppState.assetsLoaded = false;
  
  // Force clean typographic overlays by removing background canvas layers
  container3D.style.display = 'none';
  
  // Set fallback borders and color styling to maintain Brutalist contrast
  const heroPin = document.getElementById('hero-3d-pin-container');
  if (heroPin) {
    heroPin.style.backgroundColor = '#0A0B0E';
    heroPin.classList.add('flex', 'items-center', 'justify-center', 'min-h-screen');
  }
  
  const manifestoTrigger = document.getElementById('manifesto-trigger-layer');
  if (manifestoTrigger) {
    manifestoTrigger.style.opacity = '1';
    manifestoTrigger.style.transform = 'translateY(0)';
  }
  
  // Notify status metrics
  const statusStream = document.getElementById('preloader-status-stream');
  if (statusStream) {
    statusStream.textContent = '[SYS_ERROR] GPU CRASH DETECTED. STATIC FALLBACK LOADED.';
  }
}, false);

renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.log('[SYS_INFO] WebGL Context Restored. Restarting engine...');
  window.location.reload();
}, false);
