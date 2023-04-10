import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from '../lib/cannon.min.js'
import { uuidv4 } from '../lib/utils.js'


var textureLoader = new THREE.TextureLoader();

async function loadTexture(path) {
  var texture = await textureLoader.loadAsync(path)
  return texture
}

var params = {
  color: "#FFFFFF"
}

// init
document.body.style.margin = 0;

//event listener

var keyW = false;
var keyA = false;
var keyS = false;
var keyD = false;
var keySpace = false;

window.addEventListener("keydown", onKeyDown, false);
window.addEventListener("keyup", onKeyUp, false);

function onKeyDown(event) {
  var keyCode = event.keyCode;
  switch (keyCode) {
    case 68: //d
      keyD = true;
      break;
    case 83: //s
      keyS = true;
      break;
    case 65: //a
      keyA = true;
      break;
    case 87: //w
      keyW = true;
      break;
    case 32:
      keySpace = true;
      break;
  }
}

function onKeyUp(event) {
  var keyCode = event.keyCode;

  switch (keyCode) {
    case 68: //d
      keyD = false;
      break;
    case 83: //s
      keyS = false;
      break;
    case 65: //a
      keyA = false;
      break;
    case 87: //w
      keyW = false;
      break;
    case 32:
      keySpace = false;
      break;
  }
}

// init auth
var name = 'undefined';

var authKey = localStorage.getItem("oAuth");
if (!authKey || (authKey == '')) {
  window.location.href = './login';
} else {
  var data = {
    type: "auth",
    auth: authKey
  }
  console.log(data)
  try {
    const response = await fetch("./auth", {
      method: "POST", // or 'PUT'
      headers: {
      "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.text();
    if (result == "0") {
      window.location.href = './login';
    } else {
      name = result;
      console.log('signed in');
      console.log(name);
    }
  } catch (error) {
    window.alert("Signin error");
    window.location.href = './login';
  }
}

// server
var serverURL = 'ws://localhost:8080';
var myId = authKey;
console.log(myId);
const currentServer = new WebSocket(serverURL);
var otherPlayers = [];
var otherPlayerMeshes = {};
var otherPlayerBodies = {};
/**
var otherPlayerMeshes = {
  (idname): mesh
};
*/
var otherPlayerBodies = {};
/**
var otherPlayerMeshes = {
  (idname): body
};
*/

var scene;
console.log('created screne')
console.log(THREE)
var world;

async function main() {
  scene = new THREE.Scene();
  //console.log('created screne')
  world = new CANNON.World()
  scene.background = new THREE.Color(params.color);
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2.1;
  controls.maxDistance = 10;
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.zoomSpeed = 0.5;

  // phyisics

  world.gravity = new CANNON.Vec3(0, -9.82, 0);
  var maxspeed = 2;
  var canJump = false;

  const groundBody = new CANNON.Body({
    shape: new CANNON.Box(new CANNON.Vec3(5, 0.25, 5)),
  })
  world.addBody(groundBody)
  console.log(groundBody)

  var force = 30;
  var jumpForce = 3;
  const playerBody = new CANNON.Body({
      mass: 3, // kg
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
      angularDamping: 1,
  })
  const playerFeet = new CANNON.Body({
    shape: new CANNON.Box(new CANNON.Vec3(0.48, 0.1, 0.48)),
  })

  playerBody.position.y = 2;

  playerFeet.position.x = playerBody.position.x;
  playerFeet.position.y = playerBody.position.y + playerBody.aabb.lowerBound.y + 0.005;
  playerFeet.position.z = playerBody.position.z;

  playerFeet.collisionResponse = 0;
  playerFeet.addEventListener('collide', (event) => {
    console.log(event)
    console.log(event.target.aabb.lowerBound)
    if (
      (event.bodyA === groundBody && event.bodyB === playerFeet) ||
      (event.bodyB === groundBody && event.bodyA === playerFeet)
    ) {
      console.log('The sphere enterd the trigger!', event)
    }
  })
  world.addEventListener('endContact', (event) => {
    //console.log('e')
    if (
      (event.bodyA === groundBody && event.bodyB === playerFeet) ||
      (event.bodyB === groundBody && event.bodyA === playerFeet)
    ) {
      console.log('The sphere exited the trigger!', event)
    }
  })

  world.addBody(playerBody);
  world.addBody(playerFeet);

  // stuff
  const groundGeom = new THREE.BoxGeometry( groundBody.aabb.upperBound.x*2, groundBody.aabb.upperBound.y*2, groundBody.aabb.upperBound.z*2 );
  const groundMat = new THREE.MeshLambertMaterial( {color: 0x00ff00} );
  const ground = new THREE.Mesh( groundGeom, groundMat );
  scene.add( ground );
  ground.position.copy(groundBody.position);
  ground.quaternion.copy(groundBody.quaternion);

  const playerGeom = new THREE.BoxGeometry( playerBody.aabb.upperBound.x*2, playerBody.aabb.upperBound.y*2, playerBody.aabb.upperBound.z*2 );
  const playerMat = new THREE.MeshLambertMaterial( {color: 0x20ffe0} );
  const player = new THREE.Mesh( playerGeom, playerMat );
  player.position.y = 2;
  scene.add( player );

  // dev
  const playerFeetGeom = new THREE.BoxGeometry( playerFeet.aabb.upperBound.x*2, playerFeet.aabb.upperBound.y*2, playerFeet.aabb.upperBound.z*2 );
  const playerFeetMat = new THREE.MeshLambertMaterial( {color: 0xFF0000} );
  const playerFeetMesh = new THREE.Mesh( playerFeetGeom, playerFeetMat );
  scene.add( playerFeetMesh );

  camera.position.z = 30;
  controls.update();

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 1); // soft white light
  scene.add(ambientLight);
  const light = new THREE.PointLight(0xeeffee, 2, 100, 5);
  light.position.set(4, 10, 14);
  scene.add(light);

  function animate() {
    requestAnimationFrame(animate);

    if (keyD == true) {
      playerBody.velocity.x += (0.01)*force * 1;
    }
    if (keyS == true) {
      playerBody.velocity.z += (0.01)*force * 1;
    }
    if (keyA == true) {
      playerBody.velocity.x += (0.01)*force * -1;
    }
    if (keyW == true) {
      playerBody.velocity.z += (0.01)*force * -1;
    }
    if (keySpace == true) {
      //console.log('jumpressed')
      if (Math.abs(playerBody.velocity.y) < 0.2) {
        console.log(playerBody.velocity.y)
        playerBody.velocity.y += jumpForce;
        //console.log('jump')
      }
    }

    if (playerBody.velocity.x > maxspeed) {
      playerBody.velocity.x = maxspeed;
    } else if (playerBody.velocity.x < -1*maxspeed) {
      playerBody.velocity.x = -1*maxspeed;
    }
    if (playerBody.velocity.y > 30) {
      playerBody.velocity.y = 30;
    } else if (playerBody.velocity.y < -30) {
      playerBody.velocity.y = -30;
    }
    if (playerBody.velocity.z > maxspeed) {
      playerBody.velocity.z = maxspeed;
    } else if (playerBody.velocity.z < -1*maxspeed) {
      playerBody.velocity.z = -1*maxspeed;
    }

    playerFeet.position.x = playerBody.position.x;
    playerFeet.position.y = playerBody.position.y + playerBody.aabb.lowerBound.y + 0.005;
    playerFeet.position.z = playerBody.position.z;
    
    player.position.copy(playerBody.position);
    player.quaternion.copy(playerBody.quaternion);

    playerFeetMesh.position.copy(playerFeet.position);
    playerFeetMesh.quaternion.copy(playerFeet.quaternion);

    currentServer.send(JSON.stringify({
      id: myId,
      position: playerBody.position,
      quaternion: playerBody.quaternion,
    }));

    if (otherPlayers.length != 0) {
      for (var i in otherPlayers) {
        var playere = otherPlayers[i];
        if (Object.keys(otherPlayerBodies).includes(playere.id)) {
          otherPlayerBodies[playere.id].position.x = playere.position.x;
          otherPlayerBodies[playere.id].position.y = playere.position.y;
          otherPlayerBodies[playere.id].position.z = playere.position.z;

          otherPlayerBodies[playere.id].quaternion.x = playere.quaternion.x;
          otherPlayerBodies[playere.id].quaternion.y = playere.quaternion.y;
          otherPlayerBodies[playere.id].quaternion.z = playere.quaternion.z;

          otherPlayerMeshes[playere.id][0].position.copy(otherPlayerBodies[playere.id].position);
          otherPlayerMeshes[playere.id][0].quaternion.copy(otherPlayerBodies[playere.id].quaternion);

          otherPlayerMeshes[playere.id][1].position.x = otherPlayerMeshes[playere.id][0].position.x;
          otherPlayerMeshes[playere.id][1].position.y = otherPlayerMeshes[playere.id][0].position.y + 1;
          otherPlayerMeshes[playere.id][1].position.z = otherPlayerMeshes[playere.id][0].position.z;
          otherPlayerMeshes[playere.id][1].lookAt(camera.position);
        } else {
          var finalBody = new CANNON.Body({
              mass: 3, // kg
              shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
              angularDamping: 1,
          })
          finalBody.position.x = playere.position.x;
          finalBody.position.y = playere.position.y;
          finalBody.position.z = playere.position.z;

          finalBody.quaternion.x = playere.quaternion.x;
          finalBody.quaternion.y = playere.quaternion.y;
          finalBody.quaternion.z = playere.quaternion.z;
          world.addBody(finalBody);

          otherPlayerBodies[playere.id] = finalBody;
          console.log(otherPlayerBodies)

          var finalMesh = new THREE.Mesh( playerGeom, playerMat );
          finalMesh.position.copy(finalBody.position);
          finalMesh.position.copy(finalBody.position)
          scene.add(finalMesh);
          
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext("2d");
          canvas.width = 200;
          canvas.height = 100;
          ctx.font="20px Georgia";
          console.log(playere.user)
          ctx.textAlign = 'center';
          ctx.fillText(playere.user,10,50);
          console.log(canvas.toDataURL());

          var texture = new THREE.Texture(canvas);
          texture.needsUpdate = true; //just to make sure it's all up to date.
          var label = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshLambertMaterial({emissiveMap:texture}));
          label.position.x = finalMesh.position.x;
          label.position.y = finalMesh.position.y + 1;
          label.position.z = finalMesh.position.z;
          label.lookAt(camera.position);
          scene.add(label);

          otherPlayerMeshes[playere.id] = [finalMesh, label];

          

          console.log(otherPlayerMeshes)

        }
      }
    }
    
    world.fixedStep();
    controls.update();

    renderer.render(scene, camera);
  };

  animate();
}

// initialise and run

currentServer.onopen = async (event) => {
  await currentServer.send("Id: " + myId)
  await main();
}

currentServer.onmessage = (event) => {
  if (event.data == "null") {
    console.error('null');
    return
  } else if (JSON.parse(event.data)) {
    var dataa = JSON.parse(event.data)
    var dataaList = [];
    for (var i in dataa) {
      dataaList.push(dataa[i].id)
    }
    //console.log(JSON.parse(event.data))
    for (var i in Object.keys(otherPlayerBodies)) {
      var sceneObjId = Object.keys(otherPlayerBodies)[i];
      if (!dataaList.includes(sceneObjId)) {
        // delete sceneObjId
        world.remove(otherPlayerBodies[sceneObjId])
        delete otherPlayerBodies[sceneObjId];
        scene.remove(otherPlayerMeshes[sceneObjId])
        delete otherPlayerMeshes[sceneObjId];
      }
    }
    
    otherPlayers = dataa;
    if (otherPlayers.length == 0) {
      //console.log(":C no other players")
    }
  } else if (event.data == "400") {
    window.alert('INVALID TOKEN');
    window.location.href = './login';
  } else {
    console.log('!!!')
    console.log(event.data)
  }
  //console.log(event.data);
};
