import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// This is the main class that will manage our game
class CVGame {
    constructor() {
        // Core Three.js components
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x101014);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#game-canvas'),
            antialias: true
        });
        
        // Config and game state
        this.config = {
            playerHeight: 0.45,
            npcHeight: 0.7,
            maxSlope: THREE.MathUtils.degToRad(45),
            bgmVolume: 0.2
        };
        this.player = { model: null, mixer: null, actions: {}, currentAction: null, speed: 4.5, halfHeight: 0.9 };
        this.assets = { playerLoaded: false, worldLoaded: false };
        this.keys = {};
        this.stations = [];
        this.clock = new THREE.Clock();
        this.activeStation = null;
        this.billboards = [];
        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);
        this.raycaster = new THREE.Raycaster();
        this.groundMeshes = [];
        this.roadMeshes = [];
        this.npcModel = null;
        this.stationIndex = 0;
        this.compassArrow = null;
        this.minimapCanvas = null;
        this.minimapCtx = null;

        // Third-person camera boom parameters
        this.cam = {
            radius: 12,      // distance from player
            minRadius: 6,
            maxRadius: 20,
            theta: 0,        // horizontal angle around Y
            phi: 0.45,       // vertical angle (0 = horizon, up to ~1.3)
            dragging: false,
            lastX: 0,
            lastY: 0,
        };
    }

    // Initialize the entire game
    init() {
        // Renderer setup
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        if (THREE?.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Lighting
        const hemi = new THREE.HemisphereLight(0xccccff, 0x444444, 1.1);
        this.scene.add(hemi);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.3);
        directionalLight.position.set(10, 15, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(1024, 1024);
        this.scene.add(directionalLight);
        const amb = new THREE.AmbientLight(0xffffff, 0.55);
        this.scene.add(amb);
        // Add a soft fill from the opposite side
        const fill = new THREE.DirectionalLight(0xfff4dd, 0.8);
        fill.position.set(-8, 8, -8);
        this.scene.add(fill);

        // Event Listeners
        window.addEventListener('resize', () => this.onWindowResize());
        document.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        document.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        document.addEventListener('keydown', (e) => this.handleInteraction(e));
        document.addEventListener('keydown', (e) => this.handleExport(e));
        document.addEventListener('keydown', (e) => this.handlePlacementKeys(e));

        // Mouse/touch controls on canvas for camera orbit
        const canvas = this.renderer.domElement;
        canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        window.addEventListener('mouseup',   (e) => this.onPointerUp(e));
        canvas.addEventListener('wheel',     (e) => this.onWheel(e), { passive: false });
        canvas.addEventListener('click',     (e) => this.onCanvasClickPlace(e));
        // Touch
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove',  (e) => this.onTouchMove(e),  { passive: false });
        canvas.addEventListener('touchend',   (e) => this.onTouchEnd(e));

        // Start loading assets
        this.loadAssets();

        // UI references for compass/minimap if present
        this.compassArrow = document.getElementById('compass-arrow');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        if (this.minimapCanvas) this.minimapCtx = this.minimapCanvas.getContext('2d');
        // Background music
        this.setupBGM();
    }

    // Load all 3D models
    loadAssets() {
        const loadingManager = new THREE.LoadingManager(
            // On Complete
            () => {
                document.getElementById('loading-screen').style.display = 'none';
                this.setupGame();
                this.animate();
            },
            // On Progress
            (url, itemsLoaded, itemsTotal) => {
                const progress = itemsTotal > 0 ? Math.round((itemsLoaded / itemsTotal) * 100) : 100;
                document.getElementById('loading-progress').textContent = `${progress}%`;
            }
        );
        const gltfLoader = new GLTFLoader(loadingManager);
        // Support for Draco-compressed meshes and KTX2 textures (common on Sketchfab etc.)
        try {
            const draco = new DRACOLoader(loadingManager);
            draco.setDecoderPath('https://unpkg.com/three@0.164.1/examples/jsm/libs/draco/');
            gltfLoader.setDRACOLoader(draco);
        } catch (e) {
            console.warn('DRACO loader setup failed (continuing without):', e);
        }
        try {
            const ktx2 = new KTX2Loader(loadingManager);
            ktx2.setTranscoderPath('https://unpkg.com/three@0.164.1/examples/jsm/libs/basis/');
            ktx2.detectSupport(this.renderer);
            gltfLoader.setKTX2Loader(ktx2);
        } catch (e) {
            console.warn('KTX2 loader setup failed (continuing without):', e);
        }

        // Load Player Model (.glb first, then fallback to .gltf)
        const loadPlayerGLB = () => gltfLoader.load(
            'assets/models/player.glb',
            (gltf) => {
                this.player.model = gltf.scene;
                // Normalize size and place on ground
                this.normalizeAndPlaceModel(this.player.model, this.config.playerHeight, new THREE.Vector3(0, 0, 10));
                this.player.model.traverse(node => { if (node.isMesh) node.castShadow = true; });
                this.scene.add(this.player.model);

                // Setup animations if they exist in the model
                this.player.mixer = new THREE.AnimationMixer(this.player.model);
                if (gltf.animations && gltf.animations.length) {
                    // Heuristic: first is idle, second is run if present
                    this.player.actions.idle = this.player.mixer.clipAction(gltf.animations[0]);
                    if (gltf.animations[1]) {
                        this.player.actions.run = this.player.mixer.clipAction(gltf.animations[1]);
                    }
                    this.fadeToAction('idle', 0.0);
                }
                this.assets.playerLoaded = true;
            },
            undefined,
            (err) => {
                console.warn('Player .glb failed, attempting .gltf…', err?.message || err);
                gltfLoader.load(
                    'assets/models/player.gltf',
                    (gltf) => {
                        this.player.model = gltf.scene;
                        this.normalizeAndPlaceModel(this.player.model, this.config.playerHeight, new THREE.Vector3(0, 0, 10));
                        this.player.model.traverse(node => { if (node.isMesh) node.castShadow = true; });
                        this.scene.add(this.player.model);
                        this.player.mixer = new THREE.AnimationMixer(this.player.model);
                        if (gltf.animations && gltf.animations.length) {
                            this.player.actions.idle = this.player.mixer.clipAction(gltf.animations[0]);
                            if (gltf.animations[1]) this.player.actions.run = this.player.mixer.clipAction(gltf.animations[1]);
                            this.fadeToAction('idle', 0.0);
                        }
                        this.assets.playerLoaded = true;
                    },
                    undefined,
                    (err2) => {
                        console.warn('Player model failed to load (.glb and .gltf), using placeholder.', err2?.message || err2);
                        this.assets.playerLoaded = false;
                    }
                );
            }
        );

        // Load World Model (try .glb then .gltf)
        const loadWorldGLB = () => gltfLoader.load(
            'assets/models/world.glb',
            (gltf) => {
                const world = gltf.scene;
                world.traverse(node => { if (node.isMesh) node.receiveShadow = true; });
                this.worldGroup.add(world);
                this.assets.worldLoaded = true;
            },
            undefined,
            (err) => {
                console.warn('World .glb failed, attempting .gltf…', err?.message || err);
                gltfLoader.load(
                    'assets/models/world.gltf',
                    (gltf) => {
                        const world = gltf.scene;
                        world.traverse(node => { if (node.isMesh) node.receiveShadow = true; });
                        this.worldGroup.add(world);
                        this.assets.worldLoaded = true;
                    },
                    undefined,
                    (err2) => {
                        console.warn('World model failed (.glb and .gltf). Using procedural world.', err2?.message || err2);
                        this.assets.worldLoaded = false;
                    }
                );
            }
        );

        // Kick off loads
        loadPlayerGLB();
        loadWorldGLB();
    }

    // Set up stations and camera after loading
    setupGame() {
        // Define CV stations chronologically
        this.stations = [
            { id: 'sge', name: 'Abitur – Städtisches Gymnasium Erwitte', context: 'my Abitur (valedictorian) at Städtisches Gymnasium Erwitte (2019)' },
            { id: 'hsrm', name: 'RheinMain University of Applied Sciences', context: 'my BSc in Business Informatics at RheinMain University of Applied Sciences (2019–2022)' },
            { id: 'continental', name: 'Continental AG', context: 'my dual study program at Continental AG (2019–2022)' },
            { id: 'amazon', name: 'Amazon', context: 'my Business Intelligence internship in London (2022–2023)' },
            { id: 'mckinsey', name: 'McKinsey & Company', context: 'my Fellow Intern position in Munich (2023)' },
            { id: 'cambridge', name: 'University of Cambridge', context: 'my MPhil in Advanced Computer Science (2023–2024)' },
            { id: 'ip-paris', name: 'Institut Polytechnique de Paris', context: 'my MSc in Data & AI (2024–2025)' },
            { id: 'hi_paris', name: 'Hi! PARIS', context: 'my ML Research Engineer internship (2025)' }
        ];

        // Fallback procedural world if no external world file
        if (!this.assets.worldLoaded) {
            this.buildProceduralWorld();
        }

        // Ensure player exists; if not, create a placeholder capsule
        if (!this.player.model) {
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.5, 1.0, 8, 16),
                new THREE.MeshStandardMaterial({ color: 0x7cc7b2 })
            );
            body.castShadow = true;
            body.position.set(0, 1.0, 10);
            this.player.model = body;
            this.scene.add(this.player.model);
        }

        // Build collidable ground list
        this.rebuildGroundMeshes();
        // Place player spawn near bottom
        this.placeSpawnAtWorldBase();
        // Auto-place stations on the path
        this.autoPlaceStations();
        // Load and place NPCs next to signs (prefer car mechanic, fallback to man in suit)
        this.loadNpcModel('assets/models/car_mechanic.glb')
            .then((m)=>{ if(!m) return this.loadNpcModel('assets/models/man_in_suit.glb'); })
            .then(()=> this.instantiateNpcs());
        // Optionally load saved station positions
        this.tryLoadStationsJSON();

        // Position camera behind the player
        this.camera.position.set(0, 5, 18);
        this.camera.lookAt(this.player.model.position);
    }
    
    // The main game loop
    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();

        this.updatePlayer(delta);
        this.updateCamera();
        this.checkStations();
        // Keep labels facing the camera
        for (const bb of this.billboards) {
            bb.quaternion.copy(this.camera.quaternion);
        }
        
        if (this.player.mixer) {
            this.player.mixer.update(delta);
        }

        // Update compass/minimap overlays
        this.updateCompassAndMinimap();

        this.renderer.render(this.scene, this.camera);
    }

    // Resize + place model: targetHeight in world units, and place so feet touch ground
    normalizeAndPlaceModel(object3d, targetHeight = 1.2, position = new THREE.Vector3()) {
        const box = new THREE.Box3().setFromObject(object3d);
        const size = new THREE.Vector3();
        box.getSize(size);
        if (size.y > 0) {
            const scale = THREE.MathUtils.clamp(targetHeight / size.y, 0.1, 10);
            object3d.scale.multiplyScalar(scale);
        }
        // Recompute after scaling
        const box2 = new THREE.Box3().setFromObject(object3d);
        const center = new THREE.Vector3();
        box2.getCenter(center);
        const halfY = (box2.max.y - box2.min.y) / 2;
        // Move so the bottom touches y=0
        object3d.position.sub(center); // center at origin
        object3d.position.y = halfY;   // lift so base sits on ground
        object3d.position.add(position);
        object3d.userData.halfHeight = halfY;
        if (object3d === this.player?.model) this.player.halfHeight = halfY;
    }

    // Build a minimal, stylized world procedurally
    buildProceduralWorld() {
        // Ground
        const groundGeo = new THREE.PlaneGeometry(120, 120);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 1.0 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.worldGroup.add(ground);

        // Main path (simple road)
        const roadGeo = new THREE.PlaneGeometry(8, 100);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 1.0 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.02, -20);
        road.receiveShadow = true;
        this.worldGroup.add(road);

        // Lane markings
        const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
        for (let i = -45; i <= 45; i += 10) {
            const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 3), dashMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.03, i);
            this.worldGroup.add(dash);
        }

        // Decorative "buildings" as boxes
        const buildingMat1 = new THREE.MeshStandardMaterial({ color: 0x23395b, roughness: 0.9 });
        const buildingMat2 = new THREE.MeshStandardMaterial({ color: 0x3c6997, roughness: 0.9 });
        const rng = (min, max) => Math.random() * (max - min) + min;
        for (let i = 0; i < 30; i++) {
            const w = rng(2, 4), d = rng(2, 4), h = rng(2, 8);
            const geo = new THREE.BoxGeometry(w, h, d);
            const mat = Math.random() > 0.5 ? buildingMat1 : buildingMat2;
            const b = new THREE.Mesh(geo, mat);
            b.position.set(rng(-40, -12), h / 2, rng(-45, 20));
            b.castShadow = true; b.receiveShadow = true;
            this.worldGroup.add(b);
        }
        for (let i = 0; i < 30; i++) {
            const w = rng(2, 4), d = rng(2, 4), h = rng(2, 8);
            const geo = new THREE.BoxGeometry(w, h, d);
            const mat = Math.random() > 0.5 ? buildingMat1 : buildingMat2;
            const b = new THREE.Mesh(geo, mat);
            b.position.set(rng(12, 40), h / 2, rng(-45, 20));
            b.castShadow = true; b.receiveShadow = true;
            this.worldGroup.add(b);
        }

        // Signs and NPCs are added later in autoPlaceStations()
    }

    // Create a simple canvas-based billboard that always faces the camera
    createBillboard(text) {
        const canvas = document.createElement('canvas');
        const width = 512, height = 256;
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Background with rounded rect effect
        ctx.fillStyle = '#1e2a38';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#94d2bd';
        ctx.fillRect(5, 5, width - 10, height - 10);
        ctx.fillStyle = '#0a9396';
        ctx.fillRect(10, 10, width - 20, height - 20);
        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Poppins, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy?.() || 1;
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const aspect = width / height;
        const h = 0.7;
        const w = h * aspect; // keep 2:1 ratio
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
        plane.renderOrder = 2;
        plane.userData.noGround = true;
        return plane;
    }

    rebuildGroundMeshes() {
        this.groundMeshes = [];
        this.roadMeshes = [];
        const roadNameHints = ['road', 'street', 'asphalt', 'route', 'path'];
        this.worldGroup.traverse((node) => {
            if (!node.isMesh) return;
            if (node.userData?.noGround || node.userData?.isNPC) return;
            this.groundMeshes.push(node);
            const nm = (node.name || '').toLowerCase();
            const matName = (Array.isArray(node.material) ? node.material[0]?.name : node.material?.name) || '';
            const mn = matName.toLowerCase();
            if (roadNameHints.some(h => nm.includes(h) || mn.includes(h))) {
                this.roadMeshes.push(node);
            }
        });
    }

    groundAt(x, z) {
        if (!this.groundMeshes.length) return null;
        this.raycaster.set(new THREE.Vector3(x, 2000, z), new THREE.Vector3(0, -1, 0));
        const hits = this.raycaster.intersectObjects(this.groundMeshes, true);
        for (const h of hits) {
            const n = h.face?.normal ? h.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld)) : new THREE.Vector3(0,1,0);
            if (n.y > 0.5) return h;
        }
        return hits.length ? hits[0] : null;
    }

    groundAtOnMeshes(x, z, meshes) {
        if (!meshes?.length) return null;
        this.raycaster.set(new THREE.Vector3(x, 2000, z), new THREE.Vector3(0, -1, 0));
        const hits = this.raycaster.intersectObjects(meshes, true);
        for (const h of hits) {
            const n = h.face?.normal ? h.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld)) : new THREE.Vector3(0,1,0);
            if (n.y > 0.5) return h;
        }
        return hits.length ? hits[0] : null;
    }

    autoPlaceStations() {
        const box = new THREE.Box3().setFromObject(this.worldGroup);
        const centerX = (box.min.x + box.max.x) / 2;
        const zStart = box.max.z - 5;
        const zEnd = box.min.z + 5;
        const n = this.stations.length;
        const side = [ -1.2, 1.2 ];
        for (let i = 0; i < n; i++) {
            const t = i / Math.max(1, n - 1);
            const z = THREE.MathUtils.lerp(zStart, zEnd, t);
            let hit = null;
            for (let dx = 0; dx <= 5; dx += 0.5) {
                const tryXs = [centerX + dx, centerX - dx];
                for (const x of tryXs) {
                    hit = (this.roadMeshes.length ? this.groundAtOnMeshes(x, z, this.roadMeshes) : null);
                    if (hit) break;
                }
                if (hit) break;
            }
            if (!hit) hit = this.groundAt(centerX, z);
            const lateral = side[i % 2];
            let pos = hit ? hit.point.clone().add(new THREE.Vector3(lateral, 0, 0)) : new THREE.Vector3(centerX + lateral, 0, z);
            const drop = this.groundAt(pos.x, pos.z);
            if (drop) pos = drop.point.clone();
            this.stations[i].position = pos;
            // Beacon
            const geo = new THREE.SphereGeometry(0.2, 12, 12);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.55 });
            const sphere = new THREE.Mesh(geo, mat);
            sphere.position.copy(pos.clone().add(new THREE.Vector3(0, 0.3, 0)));
            sphere.userData.noGround = true;
            this.worldGroup.add(sphere);
            this.stations[i].beacon = sphere;
            // Billboard sign
            const sign = this.createBillboard(this.stations[i].name);
            sign.position.copy(pos.clone().add(new THREE.Vector3(0, 1.2, 0)));
            this.worldGroup.add(sign);
            this.billboards.push(sign);
            this.stations[i].sign = sign;
        }
    }

    placeSpawnAtWorldBase() {
        const box = new THREE.Box3().setFromObject(this.worldGroup);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const startZ = box.max.z - 2;
        const hit = this.groundAt(center.x, startZ);
        if (hit && this.player.model) {
            const hh = this.player.halfHeight || 0.9;
            this.player.model.position.set(center.x, hit.point.y + hh, startZ);
        }
    }

    autoPlaceStations() {
        const box = new THREE.Box3().setFromObject(this.worldGroup);
        const centerX = (box.min.x + box.max.x) / 2;
        const zStart = box.max.z - 5;
        const zEnd = box.min.z + 5;
        const n = this.stations.length;
        const side = [ -1.6, 1.6 ]; // closer to road
        for (let i = 0; i < n; i++) {
            const t = i / Math.max(1, n - 1);
            const z = THREE.MathUtils.lerp(zStart, zEnd, t);
            const x = centerX;
            let hit = (this.roadMeshes.length ? this.groundAtOnMeshes(x, z, this.roadMeshes) : null) || this.groundAt(x, z);
            const lateral = side[i % 2];
            let pos = hit ? hit.point.clone().add(new THREE.Vector3(lateral, 0, 0)) : new THREE.Vector3(centerX + lateral, 0, z);
            const drop = this.groundAt(pos.x, pos.z);
            if (drop) pos = drop.point.clone();
            this.stations[i].position = pos;
            // Beacon
            const geo = new THREE.SphereGeometry(0.25, 12, 12);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.55 });
            const sphere = new THREE.Mesh(geo, mat);
            sphere.position.copy(pos.clone().add(new THREE.Vector3(0, 0.35, 0)));
            sphere.userData.noGround = true;
            this.worldGroup.add(sphere);
            this.stations[i].beacon = sphere;
            // Billboard sign
            const sign = this.createBillboard(this.stations[i].name);
            sign.position.copy(pos.clone().add(new THREE.Vector3(0, 1.6, 0)));
            this.worldGroup.add(sign);
            this.billboards.push(sign);
            this.stations[i].sign = sign;
        }
    }

    async loadNpcModel(url) {
        if (this.npcModel) return this.npcModel;
        return new Promise((resolve) => {
            const loader = new GLTFLoader();
            loader.load(url, (gltf) => {
                this.normalizeAndPlaceModel(gltf.scene, this.config.npcHeight, new THREE.Vector3(0,0,0));
                // Mark entire subtree as non-ground and clean large flat floors
                gltf.scene.traverse((n) => {
                    n.userData.noGround = true;
                    if (n.isMesh && n.geometry) {
                        try {
                            if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
                            const size = n.geometry.boundingBox.getSize(new THREE.Vector3());
                            const worldScale = n.getWorldScale(new THREE.Vector3());
                            size.multiply(worldScale);
                            const avgXZ = (size.x + size.z) / 2;
                            // Hide very flat, very wide planes (likely imported floors)
                            if (avgXZ > this.config.npcHeight * 3 && size.y < avgXZ * 0.1) {
                                n.visible = false;
                                n.receiveShadow = false;
                            }
                        } catch {}
                    }
                });
                this.npcModel = gltf.scene;
                resolve(this.npcModel);
            }, undefined, (err) => {
                console.warn('NPC model failed:', err?.message || err);
                resolve(null);
            });
        });
    }

    instantiateNpcs() {
        if (!this.npcModel) return;
        this.stations.forEach((s, idx) => {
            if (!s.position) return;
            const npc = SkeletonUtils.clone(this.npcModel);
            npc.position.copy(s.position.clone().add(new THREE.Vector3((idx%2?1:-1)*0.8, 0, 0.6)));
            npc.userData.isNPC = true;
            npc.userData.noGround = true;
            npc.traverse(n => { n.userData.noGround = true; });
            const hit = this.groundAt(npc.position.x, npc.position.z);
            if (hit) npc.position.y = hit.point.y;
            npc.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
            this.worldGroup.add(npc);
            s.npc = npc;
        });
    }

    // Interactive placement mode
    handlePlacementKeys(e) {
        const key = e.key.toLowerCase();
        if (key === 'p') {
            this.togglePlacementMode();
        } else if (this.placement?.enabled) {
            if (key === 'u') {
                this.placement.index = Math.max(0, this.placement.index - 1);
                this.updatePlacementHint();
            } else if (key === 's') {
                this.saveStationsJSON();
            } else if (key === 'escape') {
                this.togglePlacementMode(false);
            }
        }
    }

    togglePlacementMode(forceState) {
        if (!this.placement) this.placement = { enabled: false, index: 0 };
        this.placement.enabled = (typeof forceState === 'boolean') ? forceState : !this.placement.enabled;
        if (this.placement.enabled) {
            this.placement.index = 0;
        }
        const hint = document.getElementById('placement-hint');
        if (hint) hint.style.display = this.placement.enabled ? 'block' : 'none';
        this.updatePlacementHint();
    }

    updatePlacementHint() {
        const hint = document.getElementById('placement-hint');
        if (!hint || !this.placement) return;
        const i = this.placement.index;
        const total = this.stations.length;
        const name = this.stations[i]?.name || '';
        hint.innerHTML = `Placement Mode: Click to place <strong>${i+1}/${total}</strong> — ${name}. Keys: [U]=Undo, [S]=Save JSON, [Esc]=Exit`;
    }

    onCanvasClickPlace(e) {
        if (!this.placement?.enabled) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const mouse = new THREE.Vector2(x, y);
        const rc = new THREE.Raycaster();
        rc.setFromCamera(mouse, this.camera);
        const hits = rc.intersectObjects(this.groundMeshes, true);
        if (!hits.length) return;
        const p = hits[0].point.clone();
        const idx = this.placement.index;
        if (this.stations[idx]) {
            this.stations[idx].position = p;
            this.updateStationVisual(idx);
            this.placement.index = Math.min(this.stations.length - 1, idx + 1);
            this.updatePlacementHint();
        }
    }

    updateStationVisual(i) {
        const s = this.stations[i];
        if (!s || !s.position) return;
        if (s.beacon) s.beacon.position.copy(s.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
        if (s.sign) s.sign.position.copy(s.position.clone().add(new THREE.Vector3(0, 2.2, 0)));
        if (s.npc) {
            s.npc.position.copy(s.position.clone().add(new THREE.Vector3((i%2?1:-1)*0.8, 0, 0.6)));
            const hit = this.groundAt(s.npc.position.x, s.npc.position.z);
            if (hit) s.npc.position.y = hit.point.y;
        }
    }

    saveStationsJSON() {
        const data = this.stations.map((s) => ({ id: s.id, name: s.name, context: s.context, x: s.position?.x ?? 0, y: s.position?.y ?? 0, z: s.position?.z ?? 0 }));
        const json = JSON.stringify({ stations: data }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'stations.json';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        console.log('Saved stations.json');
    }

    async tryLoadStationsJSON() {
        try {
            const res = await fetch('assets/data/stations.json', { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (!data?.stations?.length) return;
            for (const entry of data.stations) {
                const idx = this.stations.findIndex(s => s.id === entry.id || s.name === entry.name);
                if (idx >= 0) {
                    const pos = new THREE.Vector3(entry.x || 0, entry.y || 0, entry.z || 0);
                    this.stations[idx].position = pos;
                    this.updateStationVisual(idx);
                }
            }
            if (data.spawn && this.player?.model) {
                const sp = data.spawn;
                const hh = this.player.halfHeight || 0.9;
                const pos = new THREE.Vector3(sp.x || 0, sp.y || 0, sp.z || 0);
                // If y not provided, snap to ground
                if (!('y' in sp)) {
                    const hit = this.groundAt(pos.x, pos.z);
                    if (hit) pos.y = hit.point.y + hh;
                }
                this.player.model.position.copy(pos);
            }
            console.log('Loaded station positions from assets/data/stations.json');
        } catch (e) {
            // ignore missing file or parse errors silently
        }
    }

    // Update player movement based on key presses
    updatePlayer(delta) {
        if (!this.player.model) return;

        const moveDistance = this.player.speed * delta;
        let isMoving = false;
        
        // Build input in camera-relative space (W always moves forward from current view)
        let ix = 0, iz = 0; // input axes
        if (this.keys['w'] || this.keys['arrowup']) { iz -= 1; isMoving = true; }
        if (this.keys['s'] || this.keys['arrowdown']) { iz += 1; isMoving = true; }
        if (this.keys['a'] || this.keys['arrowleft']) { ix -= 1; isMoving = true; }
        if (this.keys['d'] || this.keys['arrowright']) { ix += 1; isMoving = true; }

        if (isMoving) {
            // Rotate input by camera yaw
            const yaw = this.cam.theta;
            const worldX = ix * Math.cos(yaw) - iz * Math.sin(yaw);
            const worldZ = ix * Math.sin(yaw) + iz * Math.cos(yaw);
            const moveDirection = new THREE.Vector3(worldX, 0, worldZ).normalize();
            const prev = this.player.model.position.clone();
            this.player.model.position.addScaledVector(moveDirection, moveDistance);

            // Rotate player to face movement direction
            const angle = Math.atan2(moveDirection.x, moveDirection.z);
            this.player.model.rotation.y = angle;

            // Stick to ground and limit steep slopes
            const hit = this.groundAt(this.player.model.position.x, this.player.model.position.z);
            if (hit) {
                const normal = hit.face?.normal ? hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)) : new THREE.Vector3(0,1,0);
                const slope = Math.acos(THREE.MathUtils.clamp(normal.y, -1, 1));
                if (slope > this.config.maxSlope) {
                    this.player.model.position.copy(prev);
                } else {
                    const hh = this.player.halfHeight || 0.9;
                    this.player.model.position.y = hit.point.y + hh;
                }
            }

            // Switch to run animation
            this.fadeToAction('run', 0.2);
        } else {
            // Switch to idle animation and re-snap to ground
            this.fadeToAction('idle', 0.3);
            const hit = this.groundAt(this.player.model.position.x, this.player.model.position.z);
            if (hit) {
                const hh = this.player.halfHeight || 0.9;
                this.player.model.position.y = hit.point.y + hh;
            }
        }
    }

    // Make the camera follow the player smoothly
    updateCamera() {
        if (!this.player.model) return;
        // Convert spherical (radius, theta, phi) to offset
        const r = this.cam.radius;
        const x = r * Math.sin(this.cam.theta) * Math.cos(this.cam.phi);
        const y = r * Math.sin(this.cam.phi) + 2.0; // slight lift to look down
        const z = r * Math.cos(this.cam.theta) * Math.cos(this.cam.phi);
        const desired = new THREE.Vector3(x, y, z).add(this.player.model.position);
        this.camera.position.lerp(desired, 0.08);
        this.camera.lookAt(this.player.model.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
    }

    // Check if the player is near a station
    checkStations() {
        if (!this.player.model) return;
        const radius = 2.5;
        const current = this.stations[this.stationIndex] || null;
        if (current && current.position && this.player.model.position.distanceTo(current.position) < radius) {
            this.activeStation = current;
            document.getElementById('interaction-prompt').style.display = 'block';
        } else {
            // Fallback: find any station within radius
            let stationFound = null;
            for (const station of this.stations) {
                if (station.position && this.player.model.position.distanceTo(station.position) < radius) {
                    stationFound = station; break;
                }
            }
            if (stationFound) {
                this.activeStation = stationFound;
                document.getElementById('interaction-prompt').style.display = 'block';
            } else {
                this.activeStation = null;
                document.getElementById('interaction-prompt').style.display = 'none';
            }
        }
    }

    // Cross-fade between animations if they exist
    fadeToAction(name, duration = 0.2) {
        if (!this.player.mixer || !this.player.actions[name]) return;
        if (this.player.currentAction === name) return;

        const prev = this.player.currentAction ? this.player.actions[this.player.currentAction] : null;
        const next = this.player.actions[name];

        if (prev && prev !== next) prev.fadeOut(duration);
        next.reset().fadeIn(duration).play();
        this.player.currentAction = name;
    }

    // Handle the 'E' key press for interaction
    handleInteraction(e) {
        if (e.key.toLowerCase() === 'e' && this.activeStation) {
            // This is the bridge to your main.js file
            // We dispatch a custom event that main.js will listen for.
            const event = new CustomEvent('start-chat', { detail: { context: this.activeStation.context, name: this.activeStation.name } });
            window.dispatchEvent(event);
            // Advance to next station if this one was current
            const idx = this.stations.findIndex(s => s === this.activeStation);
            if (idx >= 0 && idx === this.stationIndex) {
                this.stationIndex = Math.min(this.stationIndex + 1, this.stations.length - 1);
            }
        }
    }

    // Press 'X' to export current world (procedural + decorations) to GLB
    handleExport(e) {
        if (e.key.toLowerCase() !== 'x') return;
        try {
            const exporter = new GLTFExporter();
            exporter.parse(
                this.worldGroup,
                (result) => {
                    const blob = new Blob([result], { type: 'model/gltf-binary' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'world.glb';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    console.log('World exported to world.glb');
                },
                { binary: true }
            );
        } catch (err) {
            console.warn('World export failed:', err);
        }
    }

    // Pointer & touch controls for camera orbit
    onPointerDown(e) {
        this.cam.dragging = true;
        this.cam.lastX = e.clientX;
        this.cam.lastY = e.clientY;
    }
    onPointerMove(e) {
        if (!this.cam.dragging) return;
        const dx = e.clientX - this.cam.lastX;
        const dy = e.clientY - this.cam.lastY;
        this.cam.lastX = e.clientX;
        this.cam.lastY = e.clientY;
        // Adjust sensitivity
        this.cam.theta -= dx * 0.005;
        this.cam.phi   -= dy * 0.003;
        // Clamp phi so camera doesn't flip
        this.cam.phi = THREE.MathUtils.clamp(this.cam.phi, 0.1, 1.3);
    }
    onPointerUp(e) {
        this.cam.dragging = false;
    }
    onWheel(e) {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        this.cam.radius = THREE.MathUtils.clamp(this.cam.radius + delta, this.cam.minRadius, this.cam.maxRadius);
    }
    onTouchStart(e) {
        if (!e.touches || e.touches.length !== 1) return;
        this.cam.dragging = true;
        this.cam.lastX = e.touches[0].clientX;
        this.cam.lastY = e.touches[0].clientY;
    }
    onTouchMove(e) {
        if (!this.cam.dragging || !e.touches || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - this.cam.lastX;
        const dy = e.touches[0].clientY - this.cam.lastY;
        this.cam.lastX = e.touches[0].clientX;
        this.cam.lastY = e.touches[0].clientY;
        this.cam.theta -= dx * 0.008;
        this.cam.phi   -= dy * 0.006;
        this.cam.phi = THREE.MathUtils.clamp(this.cam.phi, 0.1, 1.3);
    }
    onTouchEnd(e) {
        this.cam.dragging = false;
    }

    updateCompassAndMinimap() {
        // Compass: points from camera forward to next station
        if (this.compassArrow && this.stations.length && this.player.model) {
            const target = this.stations[this.stationIndex] || this.stations[this.stations.length - 1];
            if (target && target.position) {
                const toTarget = new THREE.Vector3().subVectors(target.position, this.player.model.position);
                const targetYaw = Math.atan2(toTarget.x, toTarget.z);
                const camVec = new THREE.Vector3().subVectors(this.camera.position, this.player.model.position);
                const camYaw = Math.atan2(camVec.x, camVec.z);
                const angle = THREE.MathUtils.radToDeg(targetYaw - camYaw);
                this.compassArrow.style.transform = `rotate(${angle}deg)`;
            }
        }

        // Minimap: simple top-down dots
        if (this.minimapCtx && this.worldGroup) {
            const ctx = this.minimapCtx;
            const w = this.minimapCanvas.width, h = this.minimapCanvas.height;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, w, h);

            const box = new THREE.Box3().setFromObject(this.worldGroup);
            const minX = box.min.x, maxX = box.max.x;
            const minZ = box.min.z, maxZ = box.max.z;
            const pad = 6;
            const mapX = (x) => pad + (x - minX) / (maxX - minX) * (w - 2 * pad);
            const mapY = (z) => pad + (1 - (z - minZ) / (maxZ - minZ)) * (h - 2 * pad);

            // Stations
            this.stations.forEach((s, i) => {
                if (!s.position) return;
                ctx.fillStyle = i === this.stationIndex ? '#ffcc66' : '#94d2bd';
                ctx.beginPath();
                ctx.arc(mapX(s.position.x), mapY(s.position.z), 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Player
            if (this.player.model) {
                ctx.fillStyle = '#ff6666';
                ctx.beginPath();
                ctx.arc(mapX(this.player.model.position.x), mapY(this.player.model.position.z), 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Background music setup and events
    setupBGM() {
        try {
            this.bgm = new Audio();
            this.bgm.loop = true;
            this.bgm.volume = this.config.bgmVolume;
            // A couple of permissive tracks; you can replace URLs
            this.bgm.src = 'assets/data/calm-soft-background-music-399329.mp3';
            // If autoplay blocked, wait for user gesture via toggle button
            const start = () => { if (this.bgm && this.bgm.paused) this.bgm.play().catch(()=>{}); };
            window.addEventListener('toggle-bgm', () => {
                if (!this.bgm) return;
                if (this.bgm.paused) this.bgm.play().catch(()=>{}); else this.bgm.pause();
            });
            // Start quietly on first key/mouse interaction
            const firstUser = () => { start(); window.removeEventListener('keydown', firstUser); window.removeEventListener('mousedown', firstUser); };
            window.addEventListener('keydown', firstUser);
            window.addEventListener('mousedown', firstUser);
        } catch (e) {
            console.log('BGM setup skipped');
        }
    }
    
    // Handle window resizing
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Global game instance
let cvGame = null;

// Export a function that main.js can call to launch the game
export function launchGame() {
    if (!cvGame) {
        cvGame = new CVGame();
        cvGame.init();
    }
    document.getElementById('game-modal').style.display = 'block';
}

// Export a function to close the game
export function closeGame() {
    document.getElementById('game-modal').style.display = 'none';
    // Optionally, you can add logic here to pause the game or free up resources
}
