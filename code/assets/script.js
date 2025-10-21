


// Preloader Logic
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('preloader').classList.add('hidden');
    }, 2000);
});

// Sound System
const SoundManager = {
    enabled: true,
    synth: null,
    noiseSynth: null,

    init: function () {
        // Create synth for melodic sounds
        this.synth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 }
        }).toDestination();

        // Create noise synth for collision sounds
        this.noiseSynth = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
        }).toDestination();
    },

    playMove: function () {
        if (!this.enabled) return;
        try {
            this.synth.triggerAttackRelease('C5', '0.1');
        } catch (e) {
            console.log('Sound error:', e);
        }
    },

    playScore: function () {
        if (!this.enabled) return;
        try {
            this.synth.triggerAttackRelease('E5', '0.15');
            setTimeout(() => {
                this.synth.triggerAttackRelease('G5', '0.15');
            }, 100);
        } catch (e) {
            console.log('Sound error:', e);
        }
    },

    playGameOver: function () {
        if (!this.enabled) return;
        try {
            this.noiseSynth.triggerAttackRelease('0.3');
            setTimeout(() => {
                this.synth.triggerAttackRelease('C3', '0.5');
            }, 100);
        } catch (e) {
            console.log('Sound error:', e);
        }
    },

    playButtonClick: function () {
        if (!this.enabled) return;
        try {
            this.synth.triggerAttackRelease('A4', '0.05');
        } catch (e) {
            console.log('Sound error:', e);
        }
    },

    toggle: function () {
        this.enabled = !this.enabled;
        return this.enabled;
    }
};

// Initialize sound on user interaction
let soundInitialized = false;
async function initSound() {
    if (!soundInitialized) {
        await Tone.start();
        SoundManager.init();
        soundInitialized = true;
    }
}

// Sound Toggle Button
const soundToggle = document.getElementById('sound-toggle');
const soundOnIcon = soundToggle.querySelector('.sound-on');
const soundOffIcon = soundToggle.querySelector('.sound-off');

soundToggle.addEventListener('click', () => {
    const isEnabled = SoundManager.toggle();

    if (isEnabled) {
        soundToggle.classList.remove('muted');
        soundOnIcon.style.display = 'block';
        soundOffIcon.style.display = 'none';
    } else {
        soundToggle.classList.add('muted');
        soundOnIcon.style.display = 'none';
        soundOffIcon.style.display = 'block';
    }

    SoundManager.playButtonClick();
});




// Start screen logic
const startScreen = document.getElementById("start-screen");
const playBtn = document.getElementById("play-btn");

// Pause game until Play Now is clicked
let gameStarted = false;

playBtn.addEventListener("click", async () => {
    // ✅ Initialize sound after user gesture
    await initSound();  

    startScreen.style.display = "none";
    gameStarted = true;
    bridge.platform.sendMessage("game_ready");


});




// Create animated background particles
function createParticles() {
    const particles = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.width = particle.style.height = (Math.random() * 5 + 2) + 'px';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particles.appendChild(particle);
    }
}

// Ripple effect for buttons
function createRipple(event) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (event.clientX || event.touches[0].clientX) - rect.left - size / 2;
    const y = (event.clientY || event.touches[0].clientY) - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Initialize particles and effects
createParticles();

// Game Logic
const counterDOM = document.getElementById("counter");
const countergDOM = document.getElementById("counterg");


const endDOM = document.getElementById("end");

const scene = new THREE.Scene();

const distance = 500;
const camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    0.1,
    10000
);

camera.rotation.x = (50 * Math.PI) / 180;
camera.rotation.y = (20 * Math.PI) / 180;
camera.rotation.z = (10 * Math.PI) / 180;

const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance;
const initialCameraPositionX =
    Math.tan(camera.rotation.y) *
    Math.sqrt(distance ** 2 + initialCameraPositionY ** 2);
camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = distance;

const zoom = 2;
const characterSize = 15;
const positionWidth = 42;
const columns = 17;
const boardWidth = positionWidth * columns;
const stepTime = 200;

let lanes;
let currentLane;
let currentColumn;
let previousTimestamp;
let startMoving;
let moves;
let stepStartTimestamp;

// Realistic-themed lane types and colors
const laneTypes = ["car", "truck", "forest"];
const laneSpeeds = [2, 2.5, 3];
const vehicleColors = [0x2196F3, 0xF44336, 0xFF9800, 0x9C27B0];
const treeHeights = [20, 45, 60];

const generateLanes = () =>
    [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((index) => {
            const lane = new Lane(index);
            lane.mesh.position.y = index * positionWidth * zoom;
            scene.add(lane.mesh);
            return lane;
        })
        .filter((lane) => lane.index >= 0);

const addLane = () => {
    const index = lanes.length;
    const lane = new Lane(index);
    lane.mesh.position.y = index * positionWidth * zoom;
    scene.add(lane.mesh);
    lanes.push(lane);
};

// Create player character (human)
function createCharacter() {
    const character = new THREE.Group();

    // Body (torso)
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(6 * zoom, 6 * zoom, 15 * zoom, 8),
        new THREE.MeshPhongMaterial({ color: 0x2196F3, flatShading: true })
    );
    body.position.z = 7.5 * zoom;
    body.castShadow = true;
    body.receiveShadow = true;
    character.add(body);

    // Head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(5 * zoom, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xFFCC99, flatShading: true })
    );
    head.position.z = 20 * zoom;
    head.castShadow = true;
    head.receiveShadow = false;
    character.add(head);

    // Arms
    const leftArm = new THREE.Mesh(
        new THREE.CylinderGeometry(2 * zoom, 2 * zoom, 12 * zoom, 6),
        new THREE.MeshPhongMaterial({ color: 0x2196F3, flatShading: true })
    );
    leftArm.position.x = -8 * zoom;
    leftArm.position.z = 7.5 * zoom;
    leftArm.rotation.z = Math.PI / 6;
    leftArm.castShadow = true;
    character.add(leftArm);

    const rightArm = new THREE.Mesh(
        new THREE.CylinderGeometry(2 * zoom, 2 * zoom, 12 * zoom, 6),
        new THREE.MeshPhongMaterial({ color: 0x2196F3, flatShading: true })
    );
    rightArm.position.x = 8 * zoom;
    rightArm.position.z = 7.5 * zoom;
    rightArm.rotation.z = -Math.PI / 6;
    rightArm.castShadow = true;
    character.add(rightArm);

    // Legs
    const leftLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5 * zoom, 2.5 * zoom, 12 * zoom, 6),
        new THREE.MeshPhongMaterial({ color: 0x795548, flatShading: true })
    );
    leftLeg.position.x = -3 * zoom;
    leftLeg.position.z = -5 * zoom;
    leftLeg.castShadow = true;
    character.add(leftLeg);

    const rightLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5 * zoom, 2.5 * zoom, 12 * zoom, 6),
        new THREE.MeshPhongMaterial({ color: 0x795548, flatShading: true })
    );
    rightLeg.position.x = 3 * zoom;
    rightLeg.position.z = -5 * zoom;
    rightLeg.castShadow = true;
    character.add(rightLeg);

    return character;
}

const character = createCharacter();
scene.add(character);

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.target = character;
scene.add(dirLight);

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
const d = 500;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

const backLight = new THREE.DirectionalLight(0x000000, 0.4);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight);

const initializeValues = () => {
    lanes = generateLanes();
    currentLane = 0;
    currentColumn = Math.floor(columns / 2);
    previousTimestamp = null;
    startMoving = false;
    moves = [];
    stepStartTimestamp = null;

    character.position.x = 0;
    character.position.y = 0;

    camera.position.y = initialCameraPositionY;
    camera.position.x = initialCameraPositionX;

    dirLight.position.x = initialDirLightPositionX;
    dirLight.position.y = initialDirLightPositionY;
};

initializeValues();

const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.touchAction = 'none';
document.body.appendChild(renderer.domElement);

// Create wheel for vehicles
function createWheel() {
    const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(6 * zoom, 6 * zoom, 4 * zoom, 12),
        new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
    );
    wheel.rotation.x = Math.PI / 2;
    return wheel;
}

// Create realistic car
function createCar() {
    const car = new THREE.Group();
    const color = vehicleColors[Math.floor(Math.random() * vehicleColors.length)];

    // Car body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(50 * zoom, 25 * zoom, 12 * zoom),
        new THREE.MeshPhongMaterial({ color, flatShading: true })
    );
    body.position.z = 6 * zoom;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    // Car top
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(30 * zoom, 20 * zoom, 10 * zoom),
        new THREE.MeshPhongMaterial({ color, flatShading: true })
    );
    top.position.z = 17 * zoom;
    top.position.x = -5 * zoom;
    top.castShadow = true;
    top.receiveShadow = true;
    car.add(top);

    // Windows
    const frontWindow = new THREE.Mesh(
        new THREE.BoxGeometry(25 * zoom, 18 * zoom, 1 * zoom),
        new THREE.MeshPhongMaterial({ color: 0x87CEEB, flatShading: true })
    );
    frontWindow.position.z = 17 * zoom;
    frontWindow.position.x = 8 * zoom;
    frontWindow.rotation.y = Math.PI / 2;
    car.add(frontWindow);

    const sideWindow = new THREE.Mesh(
        new THREE.BoxGeometry(18 * zoom, 10 * zoom, 1 * zoom),
        new THREE.MeshPhongMaterial({ color: 0x87CEEB, flatShading: true })
    );
    sideWindow.position.z = 17 * zoom;
    sideWindow.position.y = 10 * zoom;
    sideWindow.position.x = -5 * zoom;
    car.add(sideWindow);

    // Wheels
    const frontLeftWheel = createWheel();
    frontLeftWheel.position.x = -15 * zoom;
    frontLeftWheel.position.y = -12.5 * zoom;
    frontLeftWheel.position.z = 6 * zoom;
    car.add(frontLeftWheel);

    const frontRightWheel = createWheel();
    frontRightWheel.position.x = 15 * zoom;
    frontRightWheel.position.y = -12.5 * zoom;
    frontRightWheel.position.z = 6 * zoom;
    car.add(frontRightWheel);

    const backLeftWheel = createWheel();
    backLeftWheel.position.x = -15 * zoom;
    backLeftWheel.position.y = 12.5 * zoom;
    backLeftWheel.position.z = 6 * zoom;
    car.add(backLeftWheel);

    const backRightWheel = createWheel();
    backRightWheel.position.x = 15 * zoom;
    backRightWheel.position.y = 12.5 * zoom;
    backRightWheel.position.z = 6 * zoom;
    car.add(backRightWheel);

    car.castShadow = true;
    car.receiveShadow = false;

    return car;
}

// Create realistic truck
function createTruck() {
    const truck = new THREE.Group();
    const color = vehicleColors[Math.floor(Math.random() * vehicleColors.length)];

    // Truck cabin
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(30 * zoom, 25 * zoom, 25 * zoom),
        new THREE.MeshPhongMaterial({ color, flatShading: true })
    );
    cabin.position.z = 12.5 * zoom;
    cabin.position.x = -25 * zoom;
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    truck.add(cabin);

    // Truck trailer
    const trailer = new THREE.Mesh(
        new THREE.BoxGeometry(70 * zoom, 30 * zoom, 20 * zoom),
        new THREE.MeshPhongMaterial({ color: 0xFFFFFF, flatShading: true })
    );
    trailer.position.z = 10 * zoom;
    trailer.position.x = 20 * zoom;
    trailer.castShadow = true;
    trailer.receiveShadow = true;
    truck.add(trailer);

    // Windows
    const window = new THREE.Mesh(
        new THREE.BoxGeometry(20 * zoom, 15 * zoom, 1 * zoom),
        new THREE.MeshPhongMaterial({ color: 0x87CEEB, flatShading: true })
    );
    window.position.z = 22 * zoom;
    window.position.x = -25 * zoom;
    window.position.y = 5 * zoom;
    truck.add(window);

    // Wheels
    const wheelPositions = [
        { x: -35, y: -17.5 },
        { x: -15, y: -17.5 },
        { x: 5, y: -17.5 },
        { x: 35, y: -17.5 },
        { x: -35, y: 17.5 },
        { x: -15, y: 17.5 },
        { x: 5, y: 17.5 },
        { x: 35, y: 17.5 }
    ];

    wheelPositions.forEach(pos => {
        const wheel = createWheel();
        wheel.position.x = pos.x * zoom;
        wheel.position.y = pos.y * zoom;
        wheel.position.z = 6 * zoom;
        truck.add(wheel);
    });

    return truck;
}

// Create realistic tree
function createTree() {
    const tree = new THREE.Group();

    // Tree trunk
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(4 * zoom, 5 * zoom, 25 * zoom, 8),
        new THREE.MeshPhongMaterial({ color: 0x8B4513, flatShading: true })
    );
    trunk.position.z = 12.5 * zoom;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const height = treeHeights[Math.floor(Math.random() * treeHeights.length)];

    // Tree crown
    const crown = new THREE.Mesh(
        new THREE.SphereGeometry(15 * zoom, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x228B22, flatShading: true })
    );
    crown.position.z = (height / 2 + 20) * zoom;
    crown.castShadow = true;
    crown.receiveShadow = false;
    tree.add(crown);

    return tree;
}

// Create road
function createRoad() {
    const road = new THREE.Group();

    const createSection = (color) =>
        new THREE.Mesh(
            new THREE.PlaneGeometry(boardWidth * zoom, positionWidth * zoom),
            new THREE.MeshPhongMaterial({ color })
        );

    const middle = createSection(0x333333);
    middle.receiveShadow = true;
    road.add(middle);

    // Add road markings
    const markingGeometry = new THREE.PlaneGeometry(5 * zoom, 1 * zoom);
    const markingMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });

    for (let i = -8; i <= 8; i++) {
        const marking = new THREE.Mesh(markingGeometry, markingMaterial);
        marking.position.x = i * 40 * zoom;
        marking.position.z = 0.1 * zoom;
        road.add(marking);
    }

    const left = createSection(0x555555);
    left.position.x = -boardWidth * zoom;
    road.add(left);

    const right = createSection(0x555555);
    right.position.x = boardWidth * zoom;
    road.add(right);

    return road;
}

// Create grass
function createGrass() {
    const grass = new THREE.Group();

    const createSection = (color) =>
        new THREE.Mesh(
            new THREE.BoxGeometry(
                boardWidth * zoom,
                positionWidth * zoom,
                3 * zoom
            ),
            new THREE.MeshPhongMaterial({ color })
        );

    const middle = createSection(0x2E7D32);
    middle.receiveShadow = true;
    grass.add(middle);

    const left = createSection(0x1B5E20);
    left.position.x = -boardWidth * zoom;
    grass.add(left);

    const right = createSection(0x1B5E20);
    right.position.x = boardWidth * zoom;
    grass.add(right);

    grass.position.z = 1.5 * zoom;
    return grass;
}

// Lane constructor
function Lane(index) {
    this.index = index;
    this.type =
        index <= 0
            ? "field"
            : laneTypes[Math.floor(Math.random() * laneTypes.length)];

    switch (this.type) {
        case "field": {
            this.type = "field";
            this.mesh = createGrass();
            break;
        }
        case "forest": {
            this.mesh = createGrass();

            this.occupiedPositions = new Set();
            this.trees = [1, 2, 3, 4].map(() => {
                const tree = createTree();
                let position;
                do {
                    position = Math.floor(Math.random() * columns);
                } while (this.occupiedPositions.has(position));
                this.occupiedPositions.add(position);
                tree.position.x =
                    (position * positionWidth + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2;
                this.mesh.add(tree);
                return tree;
            });
            break;
        }
        case "car": {
            this.mesh = createRoad();
            this.direction = Math.random() >= 0.5;

            const occupiedPositions = new Set();
            this.vehicles = [1, 2, 3].map(() => {
                const vehicle = createCar();
                let position;
                do {
                    position = Math.floor((Math.random() * columns) / 2);
                } while (occupiedPositions.has(position));
                occupiedPositions.add(position);
                vehicle.position.x =
                    (position * positionWidth * 2 + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2;
                if (!this.direction) vehicle.rotation.z = Math.PI;
                this.mesh.add(vehicle);
                return vehicle;
            });

            this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
            break;
        }
        case "truck": {
            this.mesh = createRoad();
            this.direction = Math.random() >= 0.5;

            const occupiedPositions = new Set();
            this.vehicles = [1, 2].map(() => {
                const vehicle = createTruck();
                let position;
                do {
                    position = Math.floor((Math.random() * columns) / 3);
                } while (occupiedPositions.has(position));
                occupiedPositions.add(position);
                vehicle.position.x =
                    (position * positionWidth * 3 + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2;
                if (!this.direction) vehicle.rotation.z = Math.PI;
                this.mesh.add(vehicle);
                return vehicle;
            });

            this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
            break;
        }
    }
}

// Enhanced game over function
async function showGameOver(score) {
    endDOM.classList.add('visible');

    // Add shake effect to the screen
    document.body.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        document.body.style.animation = '';
    }, 500);

    // Store and retrieve score using bridge storage
    await bridge.storage.set('score', score, 'platform_internal');
    const data = await bridge.storage.get('score', 'platform_internal');

    console.log('Stored Score:', data);
}


// Control button handlers
function setupControlButton(id, direction) {
    const button = document.getElementById(id);

    // Mouse events
    button.addEventListener("click", () => move(direction));

    // Touch events with visual feedback
    button.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        button.classList.add('active');
        createRipple(e);
        move(direction);
    });

    button.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        button.classList.remove('active');
    });

    button.addEventListener("touchcancel", (e) => {
        e.preventDefault();
        button.classList.remove('active');
    });
   
   
}

// Event Listeners
document.querySelector("#retry").addEventListener("click", () => {
    lanes.forEach((lane) => scene.remove(lane.mesh));
    initializeValues();
    endDOM.classList.remove('visible');
    counterDOM.textContent = '0';
    countergDOM.textContent = '0';
   
});

// Setup control buttons with proper touch handling
setupControlButton("forward", "forward");
setupControlButton("backward", "backward");
setupControlButton("left", "left");
setupControlButton("right", "right");

// Add ripple effect to retry button
document.getElementById("retry").addEventListener('click', createRipple);

// Keyboard controls
window.addEventListener("keydown", (event) => {
    if (event.keyCode == "38") {
        // up arrow
        move("forward");
    } else if (event.keyCode == "40") {
        // down arrow
        move("backward");
    } else if (event.keyCode == "37") {
        // left arrow
        move("left");
    } else if (event.keyCode == "39") {
        // right arrow
        move("right");
    }
});

// Improved touch/swipe controls for mobile
let touchStartX = 0;
let touchStartY = 0;
let touchArea = document.getElementById('touch-area');

touchArea.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, { passive: false });

touchArea.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Only register swipe if movement is significant
    if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) return;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0) {
            move('left');
        } else {
            move('right');
        }
    } else {
        // Vertical swipe
        if (diffY > 0) {
            move('forward');
        } else {
            move('backward');
        }
    }

    touchStartX = 0;
    touchStartY = 0;
    e.preventDefault();
}, { passive: false });

function move(direction) {
    const finalPositions = moves.reduce(
        (position, move) => {
            if (move === "forward")
                return { lane: position.lane + 1, column: position.column };
            if (move === "backward")
                return { lane: position.lane - 1, column: position.column };
            if (move === "left")
                return { lane: position.lane, column: position.column - 1 };
            if (move === "right")
                return { lane: position.lane, column: position.column + 1 };
        },
        { lane: currentLane, column: currentColumn }
    );

    if (direction === "forward") {
        if (
            lanes[finalPositions.lane + 1].type === "forest" &&
            lanes[finalPositions.lane + 1].occupiedPositions.has(
                finalPositions.column
            )
        )
            return;
        if (!stepStartTimestamp) startMoving = true;
        addLane();
    } else if (direction === "backward") {
        if (finalPositions.lane === 0) return;
        if (
            lanes[finalPositions.lane - 1].type === "forest" &&
            lanes[finalPositions.lane - 1].occupiedPositions.has(
                finalPositions.column
            )
        )
            return;
        if (!stepStartTimestamp) startMoving = true;
    } else if (direction === "left") {
        if (finalPositions.column === 0) return;
        if (
            lanes[finalPositions.lane].type === "forest" &&
            lanes[finalPositions.lane].occupiedPositions.has(
                finalPositions.column - 1
            )
        )
            return;
        if (!stepStartTimestamp) startMoving = true;
    } else if (direction === "right") {
        if (finalPositions.column === columns - 1) return;
        if (
            lanes[finalPositions.lane].type === "forest" &&
            lanes[finalPositions.lane].occupiedPositions.has(
                finalPositions.column + 1
            )
        )
            return;
        if (!stepStartTimestamp) startMoving = true;
    }
    moves.push(direction);

    SoundManager.playMove();
}

function animate(timestamp) {
    requestAnimationFrame(animate);

    if (!previousTimestamp) previousTimestamp = timestamp;
    const delta = timestamp - previousTimestamp;
    previousTimestamp = timestamp;

    // Animate cars and trucks moving on the lane
    lanes.forEach((lane) => {
        if (lane.type === "car" || lane.type === "truck") {
            const aBitBeforeTheBeginingOfLane =
                (-boardWidth * zoom) / 2 - positionWidth * 2 * zoom;
            const aBitAfterTheEndOFLane =
                (boardWidth * zoom) / 2 + positionWidth * 2 * zoom;
            lane.vehicles.forEach((vehicle) => {
                if (lane.direction) {
                    vehicle.position.x =
                        vehicle.position.x < aBitBeforeTheBeginingOfLane
                            ? aBitAfterTheEndOFLane
                            : (vehicle.position.x -= (lane.speed / 16) * delta);
                } else {
                    vehicle.position.x =
                        vehicle.position.x > aBitAfterTheEndOFLane
                            ? aBitBeforeTheBeginingOfLane
                            : (vehicle.position.x += (lane.speed / 16) * delta);
                }
            });
        }
    });

    if (startMoving) {
        stepStartTimestamp = timestamp;
        startMoving = false;
    }

    if (stepStartTimestamp) {
        const moveDeltaTime = timestamp - stepStartTimestamp;
        const moveDeltaDistance =
            Math.min(moveDeltaTime / stepTime, 1) * positionWidth * zoom;
        const jumpDeltaDistance =
            Math.sin(Math.min(moveDeltaTime / stepTime, 1) * Math.PI) * 8 * zoom;
        switch (moves[0]) {
            case "forward": {
                const positionY =
                    currentLane * positionWidth * zoom + moveDeltaDistance;
                camera.position.y = initialCameraPositionY + positionY;
                dirLight.position.y = initialDirLightPositionY + positionY;
                character.position.y = positionY;
                character.position.z = jumpDeltaDistance;
                break;
            }
            case "backward": {
                const positionY = currentLane * positionWidth * zoom - moveDeltaDistance;
                camera.position.y = initialCameraPositionY + positionY;
                dirLight.position.y = initialDirLightPositionY + positionY;
                character.position.y = positionY;
                character.position.z = jumpDeltaDistance;
                break;
            }
            case "left": {
                const positionX =
                    (currentColumn * positionWidth + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2 -
                    moveDeltaDistance;
                camera.position.x = initialCameraPositionX + positionX;
                dirLight.position.x = initialDirLightPositionX + positionX;
                character.position.x = positionX;
                character.position.z = jumpDeltaDistance;
                break;
            }
            case "right": {
                const positionX =
                    (currentColumn * positionWidth + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2 +
                    moveDeltaDistance;
                camera.position.x = initialCameraPositionX + positionX;
                dirLight.position.x = initialDirLightPositionX + positionX;
                character.position.x = positionX;
                character.position.z = jumpDeltaDistance;
                break;
            }
        }

        // Once a step has ended
        if (moveDeltaTime > stepTime) {
            switch (moves[0]) {
                case "forward": {
                    currentLane++;
                    counterDOM.innerHTML = currentLane;
                    countergDOM.innerHTML = currentLane;

                    break;
                }
                case "backward": {
                    currentLane--;
                    counterDOM.innerHTML = currentLane;
                    countergDOM.innerHTML = currentLane;
                    break;
                }
                case "left": {
                    currentColumn--;
                    break;
                }
                case "right": {
                    currentColumn++;
                    break;
                }
            }
            moves.shift();
            stepStartTimestamp = moves.length === 0 ? null : timestamp;
        }
    }

    // Hit test
    if (
        lanes[currentLane].type === "car" ||
        lanes[currentLane].type === "truck"
    ) {
        const characterMinX = character.position.x - (characterSize * zoom) / 2;
        const characterMaxX = character.position.x + (characterSize * zoom) / 2;
        const vehicleLength = { car: 60, truck: 105 }[lanes[currentLane].type];
        lanes[currentLane].vehicles.forEach((vehicle) => {
            const carMinX = vehicle.position.x - (vehicleLength * zoom) / 2;
            const carMaxX = vehicle.position.x + (vehicleLength * zoom) / 2;
            if (characterMaxX > carMinX && characterMinX < carMaxX) {
                showGameOver();
            }
        });
    }
    renderer.render(scene, camera);
}

// Window resize handler
window.addEventListener('resize', () => {
    camera.left = window.innerWidth / -2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = window.innerHeight / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(animate);
