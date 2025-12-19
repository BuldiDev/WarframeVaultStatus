import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, logo, loader;
let isDragging = false;
let autoRotate = true;
let dragTimeout = null;
let previousMouseX = 0;
let previousMouseY = 0;
let velocityX = 0;
let velocityY = 0;
let momentum = true;
let currentModelPath = 'logo.glb'; // Tiene traccia del modello attualmente caricato

export function init3DScene() {
    const container = document.getElementById('scene-container');
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    // Abilita il depth test per evitare glitch di rendering
    renderer.sortObjects = true;
    
    container.appendChild(renderer.domElement);
    
    // Lighting - Sistema triplanar con tre luci direzionali ortogonali
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    // Luce principale (dall'alto-destra-fronte)
    const keyLight = new THREE.DirectionalLight(0xffffff, 5.5);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);
    
    // Luce di riempimento (da sinistra)
    const fillLight = new THREE.DirectionalLight(0x6699ff, 3.5);
    fillLight.position.set(-5, 0, 3);
    scene.add(fillLight);
    
    // Luce posteriore/rim (da dietro)
    const rimLight = new THREE.DirectionalLight(0xff9966, 3.8);
    rimLight.position.set(0, -3, -5);
    scene.add(rimLight);
    
    camera.position.z = 10;
    
    // Mouse/touch events per controllare il drag e la rotazione
    container.addEventListener('mousedown', (event) => {
        // Controlla se il mouse è su elementi interattivi
        const target = event.target;
        const isOnInteractive = target.closest('.search-container') || 
                                target.closest('.left-panel') || 
                                target.closest('.right-panel') ||
                                target.closest('#music-player');
        
        if (!isOnInteractive) {
            isDragging = true;
            autoRotate = false;
            momentum = false;
            clearTimeout(dragTimeout);
            previousMouseX = event.clientX;
            previousMouseY = event.clientY;
            velocityX = 0;
            velocityY = 0;
        }
    });
    
    document.addEventListener('mousemove', (event) => {
        if (isDragging && logo) {
            const deltaX = event.clientX - previousMouseX;
            const deltaY = event.clientY - previousMouseY;
            
            // Calcola la velocità
            velocityX = deltaX * 0.01;
            velocityY = deltaY * 0.01;
            
            // Ruota il logo in base al movimento del mouse
            logo.rotation.y += velocityX;
            logo.rotation.x += velocityY;
            
            previousMouseX = event.clientX;
            previousMouseY = event.clientY;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            momentum = true;
            // Non più timeout, la convergenza avviene automaticamente
        }
    });
    
    // Touch events per mobile
    container.addEventListener('touchstart', (event) => {
        const target = event.target;
        const isOnInteractive = target.closest('.search-container') || 
                                target.closest('.left-panel') || 
                                target.closest('.right-panel') ||
                                target.closest('#music-player');
        
        if (!isOnInteractive && event.touches.length > 0) {
            isDragging = true;
            autoRotate = false;
            momentum = false;
            clearTimeout(dragTimeout);
            previousMouseX = event.touches[0].clientX;
            previousMouseY = event.touches[0].clientY;
            velocityX = 0;
            velocityY = 0;
        }
    });
    
    document.addEventListener('touchmove', (event) => {
        if (isDragging && logo && event.touches.length > 0) {
            const deltaX = event.touches[0].clientX - previousMouseX;
            const deltaY = event.touches[0].clientY - previousMouseY;
            
            velocityX = deltaX * 0.01;
            velocityY = deltaY * 0.01;
            
            logo.rotation.y += velocityX;
            logo.rotation.x += velocityY;
            
            previousMouseX = event.touches[0].clientX;
            previousMouseY = event.touches[0].clientY;
        }
    });
    
    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            momentum = true;
            // Non più timeout, la convergenza avviene automaticamente
        }
    });
    
    // Create circular texture for particles
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const circleTexture = new THREE.CanvasTexture(canvas);
    
    // ===== CONFIGURAZIONE PARTICELLE =====
    const PARTICLE_COLOR = 'rgba(163, 163, 163, 0.5)'; // Modifica questo valore
    // =====================================
    
    // Rileva se siamo su mobile per ottimizzare le prestazioni
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    // Estrai i valori RGBA
    const rgbaMatch = PARTICLE_COLOR.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    const r = parseInt(rgbaMatch[1]) / 255;
    const g = parseInt(rgbaMatch[2]) / 255;
    const b = parseInt(rgbaMatch[3]) / 255;
    const a = parseFloat(rgbaMatch[4] || 1);
    
    // Background particles - dust effect
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = isMobile ? 150 : 500; // Riduce le particelle su mobile
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);
    const randomArray = new Float32Array(particlesCount);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
        // Position - più concentrate vicino alla camera
        posArray[i] = (Math.random() - 0.5) * 25;
        posArray[i + 1] = (Math.random() - 0.5) * 25;
        posArray[i + 2] = (Math.random() - 0.5) * 25;
        
        // Colore uniforme
        colorArray[i] = r;
        colorArray[i + 1] = g;
        colorArray[i + 2] = b;
        
        // Random offset per timing diverso
        randomArray[i / 3] = Math.random() * Math.PI * 2;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    particlesGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randomArray, 1));
    
    const particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uTexture: { value: circleTexture },
            uBaseAlpha: { value: a }
        },
        vertexShader: `
            attribute float aRandom;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vRandom;
            uniform float uTime;
            
            void main() {
                vColor = color;
                vRandom = aRandom;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 0.4 * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            uniform float uTime;
            uniform float uBaseAlpha;
            varying vec3 vColor;
            varying float vRandom;
            
            void main() {
                vec2 uv = gl_PointCoord;
                vec4 texture = texture2D(uTexture, uv);
                
                float animatedOpacity = 0.4 + sin(uTime * 2.0 + vRandom) * 0.15;
                float finalOpacity = uBaseAlpha * animatedOpacity;
                
                gl_FragColor = vec4(vColor, finalOpacity * texture.a);
            }
        `,
        transparent: true,
        depthWrite: false
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    
    // Load logo
    loader = new GLTFLoader();
    
    // Carica il modello di default
    loadModel('logo.glb');
    
    // Animation loop
    const autoRotateSpeed = 0.005;
    
    function animate() {
        requestAnimationFrame(animate);
        
        if (logo) {
            if (autoRotate) {
                // Rotazione automatica solo sull'asse Y
                logo.rotation.y += autoRotateSpeed;
            } else if (momentum) {
                // Applica il momentum
                logo.rotation.y += velocityX;
                logo.rotation.x += velocityY;
                
                // Convergi gradualmente verso la velocità di autorotazione sull'asse Y
                const targetSpeed = autoRotateSpeed;
                const convergenceRate = 0.02;
                
                if (Math.abs(velocityX - targetSpeed) > 0.0001) {
                    // Convergi verso la velocità target
                    if (velocityX > targetSpeed) {
                        velocityX -= Math.abs(velocityX - targetSpeed) * convergenceRate;
                    } else {
                        velocityX += Math.abs(velocityX - targetSpeed) * convergenceRate;
                    }
                } else {
                    // Raggiunto il target, passa ad autoRotate
                    velocityX = targetSpeed;
                    autoRotate = true;
                    momentum = false;
                }
                
                // Rallenta la rotazione X fino a fermarla
                velocityY *= 0.95;
                if (Math.abs(velocityY) < 0.0001) {
                    velocityY = 0;
                }
            }
        }
        
        // Animate background particles
        particlesMesh.rotation.y += 0.0005;
        particlesMesh.rotation.x += 0.0003;
        
        // Aggiorna il tempo per lo shader
        particlesMaterial.uniforms.uTime.value = Date.now() * 0.001;
        
        const positions = particlesMesh.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001;
        }
        particlesMesh.geometry.attributes.position.needsUpdate = true;
        
        renderer.render(scene, camera);
    }
    animate();
    
    // Responsive
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Ottimizza le prestazioni su mobile quando si ridimensiona
        const isNowMobile = window.innerWidth < 768;
        if (isNowMobile && particlesMesh.geometry.attributes.position.count > 200) {
            // Riduci le particelle visibili su mobile
            particlesMaterial.uniforms.uBaseAlpha.value = a * 0.6;
        } else if (!isNowMobile && particlesMaterial.uniforms.uBaseAlpha.value !== a) {
            particlesMaterial.uniforms.uBaseAlpha.value = a;
        }
    });
}

// Funzione per caricare un modello 3D
function loadModel(modelPath) {
    // Se c'è già un logo caricato, rimuovilo dalla scena
    if (logo) {
        scene.remove(logo);
        logo = null;
    }
    
    // Aggiorna il percorso del modello corrente
    currentModelPath = modelPath;
    
    loader.load(
        modelPath,
        (gltf) => {
            logo = gltf.scene;
            
            // Scala il modello: 10 per i modelli delle reliquie, 0.25 per il logo di default
            const isRelicModel = modelPath.includes('lith.glb') || 
                                 modelPath.includes('meso.glb') || 
                                 modelPath.includes('neo.glb') || 
                                 modelPath.includes('axi.glb');
            const scale = isRelicModel ? 2.5 : 0.25;
            logo.scale.set(scale, scale, scale);
            
            // Correggi i materiali per evitare glitch di rendering
            logo.traverse((child) => {
                if (child.isMesh) {
                    child.material.side = THREE.FrontSide;
                    child.material.depthWrite = true;
                    child.material.depthTest = true;
                }
            });
            
            scene.add(logo);
            
            // Centra il modello
            const box = new THREE.Box3().setFromObject(logo);
            const center = box.getCenter(new THREE.Vector3());
            logo.position.x = -center.x;
            logo.position.y = -center.y;
            logo.position.z = -center.z;
            
            // Ripristina la rotazione automatica
            autoRotate = true;
            momentum = false;
        },
        undefined,
        (error) => {
            console.error(`Errore caricamento modello ${modelPath}:`, error);
            // Se il modello specifico non esiste, prova a caricare il default
            if (modelPath !== 'logo.glb') {
                console.log('Caricamento modello di default...');
                loadModel('logo.glb');
            }
        }
    );
}

// Funzione esportata per cambiare il modello in base al tier della reliquia
export function changeModelByTier(tier) {
    if (!tier) {
        loadModel('logo.glb');
        return;
    }
    
    // Mappa il tier al nome del file del modello
    const tierToModel = {
        'Lith': 'lith.glb',
        'Meso': 'meso.glb',
        'Neo': 'neo.glb',
        'Axi': 'axi.glb'
    };
    
    const modelPath = tierToModel[tier] || 'logo.glb';
    
    // Carica il nuovo modello solo se è diverso da quello corrente
    if (modelPath !== currentModelPath) {
        loadModel(modelPath);
    }
}
