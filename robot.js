var isGameRunning = false, 
score = 0, 
ROBOT = 0,
LIMIT_ROBOTS = 10,
ROBOTS_IN_ACTION = 0;

var renderer = null, 
scene = null, 
camera = null,
root = null,
robot = null,
group = null;

var robots = [];
var currentTime = Date.now();
var clock = null;
var raycaster;
var mouse = new THREE.Vector2(), INTERSECTED, CLICKED;

var animator = null,
durationAnimation = 2, // sec
loopAnimation = false;

var directionalLight = null;
var spotLight = null;
var ambientLight = null;
var mapUrl = "images/checker_large.gif";
var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;

function startGame() {
    if (!isGameRunning) {
        score= 0;
        ROBOT = 0;
        ROBOTS_IN_ACTION = 0;
        clock = new THREE.Clock();
        isGameRunning = true;
    }
}

function createDeadAnimation() {
    animator = new KF.KeyFrameAnimator;
    animator.init({ 
        interps:
            [
                { 
                    keys:[0, .5, 1], 
                    values:[
                            { x : 0,            },
                            { x : - Math.PI / 4 },
                            { x : - Math.PI / 2 },
                    ],
                },
            ],
        loop: loopAnimation,
        duration: durationAnimation * 1000,
    });
}

function loadFBX() {
    var loader = new THREE.FBXLoader();
    loader.load( 'models/Robot/robot_walk.fbx', function ( object ) {
        object.mixer = {};
        object.mixer["walk"] = new THREE.AnimationMixer( scene );
        object.mixer["walk"].clipAction( object.animations[ 0 ], object ).play();

        object.knockout = false;
        object.name = ROBOT;
        
        object.scale.set(0.02, 0.02, 0.02);
        object.position.y -= 4;
        object.position.z = -50 - Math.random() * 50;
        object.rotation.set(0,0,0);
        

        object.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        robot = object;
        createDeadAnimation();

        loader.load('models/Robot/robot_atk.fbx', function ( object ) {
            robot.mixer["attack"] = new THREE.AnimationMixer( scene );
            robot.mixer["attack"].clipAction( object.animations[ 0 ], robot ).play();
        });

        loader.load('models/Robot/robot_atk2.fbx', function ( object ) {
            robot.mixer["dead"] = new THREE.AnimationMixer( scene );
            robot.mixer["dead"].clipAction( object.animations[ 0 ], robot ).play();
        } );
        
        robots.push(robot);
        scene.add( object );
    } );
}

function clone() {
    var new_robot = cloneFbx(robot);
    new_robot.position.set(Math.random() * (100 - (-100)) + (-100), -4, -70 - Math.random() * 50);
    new_robot.rotation.set(0,0,0);

    new_robot.name = ++ROBOT;
    new_robot.mixer = {};
    new_robot.mixer["walk"] =  new THREE.AnimationMixer( scene );
    new_robot.mixer["walk"].clipAction( new_robot.animations[ 0 ], new_robot ).play();

    if (robots.length < LIMIT_ROBOTS) {
        scene.add(new_robot);
        robots.push(new_robot);
        ROBOTS_IN_ACTION++;
    }
}

function animate() {
    if (isGameRunning) {
        var now = Date.now();
        var deltat = now - currentTime;
        var delta = clock.getDelta() * 1000;
        currentTime = now;
        var seconds = parseInt(30 - clock.elapsedTime);

        if (seconds > 0) {
            console.log(seconds);
            if (seconds % 5 == 0) {
                clone();
            }
        } else {
            seconds = 0;
            isGameRunning = false;
        }

        if (robots.length > 0) {
            for (robot_i of robots) {
                if (!robot_i.knockout) {
                    robot_i.mixer["walk"].update(deltat * 0.001);
                    robot_i.position.z += 0.005 * deltat;
                    if (robot_i.position.z > 40) {
                        scene.remove(robots[robot_i.name]);
                        //robot_i.mixer["attack"].update(deltat * 0.001);
                        // setTimeout(() => {
                        //     robot_i.mixer["walk"].update(deltat * 0.001);
                        //     robot_i.position.z = -70 - Math.random() * 50;
                        // }, 1000);
                    }
                } else {
                    scene.remove(robots[robot_i.name]);
                    //robot_i.mixer["dead"].update(deltat * 0.001);
                    //robots.splice(robot_i.name, 1);
                }
            }
        }
        KF.update();
    }
}

function playAnimations() {
    animator.start();
}

function run() {
    requestAnimationFrame(function() { run(); });
    
    // Render the scene
    renderer.render( scene, camera );

    // Spin the cube for next frame
    animate();
}

function createScene(canvas) {
    // Create the Three.js renderer and attach it to our canvas
    renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );

    // Set the viewport size
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Turn on shadows
    renderer.shadowMap.enabled = true;
    // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create a new Three.js scene
    scene = new THREE.Scene();

    // Add  a camera so we can view the scene
    camera = new THREE.PerspectiveCamera( 45, canvas.width / canvas.height, 1, 4000 );
    camera.position.set(0, 30, 100);
    camera.rotation.set(-Math.PI/8, 0,0);
    scene.add(camera);
        
    // Create a group to hold all the objects
    root = new THREE.Object3D;
    
    spotLight = new THREE.SpotLight (0xffffff);
    spotLight.position.set(0, 40, -10);
    spotLight.target.position.set(-2, 0, -2);
    root.add(spotLight);

    spotLight.castShadow = true;
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    spotLight.shadow.camera.fov = 45;
    spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

    ambientLight = new THREE.AmbientLight ( 0x888888 );
    root.add(ambientLight);
    
    // Create the objects
    loadFBX();

    // Create a group to hold the objects
    group = new THREE.Object3D;
    root.add(group);

    // Create a texture map
    var map = new THREE.TextureLoader().load(mapUrl);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 8);

    var color = 0xffffff;

    // Put in a ground plane to show off the lighting
    geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, map:map, side:THREE.DoubleSide}));

    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -4.02;
    
    // Add the mesh to our group
    group.add( mesh );
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    // Now add the group to our scene
    scene.add( root );

    // Create a raycaster to detect the intersections of the mouse pointer
    raycaster = new THREE.Raycaster();
    
    // Function to execute when clicking
    document.addEventListener('mousedown', onDocumentMouseDown);
}

function onDocumentMouseDown(event) {
    event.preventDefault();
    event.preventDefault();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    // Pass coords of mouse to camera
    raycaster.setFromCamera( mouse, camera );

    // Detect all objects intersected
    var intersects = raycaster.intersectObjects( scene.children, true );

    if ( isGameRunning && intersects.length > 0 ) {
        CLICKED = intersects[ 0 ].object;
        if (!animator.running) {
            for(var i = 0; i<= animator.interps.length -1; i++) {
                CLICKED.parent.knockout = true;
                animator.interps[i].target = robots[CLICKED.parent.name].rotation;
            }
            playAnimations();
        }
    } else {
        CLICKED = null;
    }
}