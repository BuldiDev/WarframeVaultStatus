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
    
    // Background particles - dust effect
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1200;
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
        // Position - più concentrate vicino alla camera
        posArray[i] = (Math.random() - 0.5) * 40;
        posArray[i + 1] = (Math.random() - 0.5) * 40;
        posArray[i + 2] = (Math.random() - 0.5) * 40;
        
        // Gradiente più scuro - da grigio scuro a grigio chiaro
        const grayValue = 0.3 + Math.random() * 0.5; // da grigio scuro a chiaro
        colorArray[i] = grayValue;
        colorArray[i + 1] = grayValue;
        colorArray[i + 2] = grayValue;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        map: circleTexture,
        alphaTest: 0.01,
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
            
            console.log('Logo caricato!');
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
            logo.rotation.y += 0.002;
        }
                // Animate background particles
        particlesMesh.rotation.y += 0.0005;
        particlesMesh.rotation.x += 0.0003;
        
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
