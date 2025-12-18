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
            logo.rotation.y += 0.005;
        }
        
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
