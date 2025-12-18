import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function init3DScene() {
    const container = document.getElementById('scene-container');
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    camera.position.z = 10;
    
    // Mouse tracking
    let mouseX = 0;
    let mouseY = 0;
    let shouldRotateAuto = true;
    let wasAutoRotating = true;
    const baseRotation = { x: 0, z: 0, y: 0 }; // Rotazione di base per ritornare
    
    document.addEventListener('mousemove', (event) => {
        // Normalizza le coordinate del mouse tra -1 e 1
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Controlla se il mouse è su search-container, left-panel o right-panel
        const target = event.target;
        const isOnInteractive = target.closest('.search-container') || 
                                target.closest('.left-panel') || 
                                target.closest('.right-panel');
        
        shouldRotateAuto = !isOnInteractive;
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
    
    // Estrai i valori RGBA
    const rgbaMatch = PARTICLE_COLOR.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    const r = parseInt(rgbaMatch[1]) / 255;
    const g = parseInt(rgbaMatch[2]) / 255;
    const b = parseInt(rgbaMatch[3]) / 255;
    const a = parseFloat(rgbaMatch[4] || 1);
    
    // Background particles - dust effect
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 500;
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
    const loader = new GLTFLoader();
    let logo;
    
    loader.load(
        'logo.glb',
        (gltf) => {
            logo = gltf.scene;
            
            // Scala il logo ancora più piccolo
            logo.scale.set(0.25, 0.25, 0.25);
            
            scene.add(logo);
            
            // Centra il logo
            const box = new THREE.Box3().setFromObject(logo);
            const center = box.getCenter(new THREE.Vector3());
            logo.position.x = -center.x;
            logo.position.y = -center.y;
            logo.position.z = -center.z;
            
        },
        undefined,
        (error) => {
            console.error('Errore caricamento logo:', error);
        }
    );
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        if (logo) {
            if (shouldRotateAuto) {
                // Se stavamo puntando e ora torniamo in auto, fai lerp verso la base
                if (!wasAutoRotating) {
                    const distanceX = Math.abs(logo.rotation.x - baseRotation.x);
                    const distanceY = Math.abs(logo.rotation.y - baseRotation.y);
                    const distanceZ = Math.abs(logo.rotation.z - baseRotation.z);
                    
                    // Se non siamo ancora tornati alla base, fai il lerp
                    if (distanceX > 0.01 || distanceY > 0.01 || distanceZ > 0.01) {
                        logo.rotation.x += (baseRotation.x - logo.rotation.x) * 0.05;
                        logo.rotation.y += (baseRotation.y - logo.rotation.y) * 0.05;
                        logo.rotation.z += (baseRotation.z - logo.rotation.z) * 0.05;
                    } else {
                        // Siamo tornati alla base, riprendi rotazione automatica
                        wasAutoRotating = true;
                    }
                } else {
                    // Rotazione automatica su Y (solo dopo essere tornati alla base)
                    logo.rotation.y += 0.002;
                }
                
            } else {
                // Modalità puntamento
                wasAutoRotating = false;
                
                const targetRotationY = mouseX * Math.PI * 0.5;
                const targetRotationX = -mouseY * Math.PI * 0.3;
                
                // Smooth interpolation per un movimento fluido
                logo.rotation.y += (targetRotationY - logo.rotation.y) * 0.05;
                logo.rotation.x += (targetRotationX - logo.rotation.x) * 0.05;
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
    });
}
