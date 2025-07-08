import { DronePhysics, initCannonWorld, DroneController } from './physics_engine.js';

let viewer, droneEntity, physics, world;
let enuTransform, inverseEnuTransform;
let droneController;
let groundHeight = 0;

window.manualMovement = { x: 0, y: 0, z: 0 };
let waypoints = [
  { lat: 37.655, lon: -122.4175, alt: 10 },
  { lat: 37.656, lon: -122.418, alt: 15 },
  { lat: 37.657, lon: -122.417, alt: 12 }
];

let CESIUM_ION_API_KEY = window.CESIUM_ION_API_KEY || "";

let isPaused = false;
let returningHome = false;
const homePosition = { x: 0, y: 0, z: 0 };
const homeOrientation = { pitch: 0, roll: 0, yaw: 0 };

window.controlFlags = {
  movement: true,
  pitch: true,
  roll: true,
  yaw: true,
  throttle: true
};

async function initCesium() {
  Cesium.Ion.defaultAccessToken = CESIUM_ION_API_KEY;

  const terrainProvider = await Cesium.createWorldTerrainAsync();
  viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider,
    shouldAnimate: true
  });

  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.enableLighting = true;

  const originWp = waypoints[0];
  const originCarto = Cesium.Cartographic.fromDegrees(originWp.lon, originWp.lat);
  await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [originCarto]);
  const originHeight = originCarto.height;
  const originCartesian = Cesium.Cartesian3.fromDegrees(originWp.lon, originWp.lat, originHeight);

  enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(originCartesian);
  inverseEnuTransform = new Cesium.Matrix4();
  Cesium.Matrix4.inverseTransformation(enuTransform, inverseEnuTransform);

  homePosition.z = waypoints[0].alt;

  droneEntity = viewer.entities.add({
    name: "Drone",
    position: Cesium.Matrix4.multiplyByPoint(enuTransform, new Cesium.Cartesian3(0, 0, homePosition.z), new Cesium.Cartesian3()),
    model: {
      uri: "/static/assets/3d/drone_optimized.glb",
      scale: 1.5,
      minimumPixelSize: 64
    }
  });

  viewer.trackedEntity = droneEntity;
  setupPhysics();

  const localWaypoints = waypoints.map(wp => {
    const cart = Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt);
    const localPos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint(inverseEnuTransform, cart, localPos);
    return { x: localPos.x, y: localPos.y, z: localPos.z, yaw: 0 };
  });

  droneController = new DroneController(localWaypoints);
  viewer.clock.onTick.addEventListener(updateSimulation);

  setupManualControls();
  setupControlToggles();
}

function setupPhysics() {
  world = initCannonWorld();
  physics = new DronePhysics({ mass: 1.0 });
  physics.init(world);

  physics.body.position.set(homePosition.x, homePosition.y, homePosition.z);
  physics.body.quaternion.setFromEuler(homeOrientation.pitch, homeOrientation.roll, homeOrientation.yaw, "YZX");
  physics.body.velocity.set(0, 0, 0);
  physics.body.angularVelocity.set(0, 0, 0);
}

function setupManualControls() {
  const keyState = {};

  window.addEventListener("keydown", (e) => {
    keyState[e.key.toLowerCase()] = true;
  });

  window.addEventListener("keyup", (e) => {
    keyState[e.key.toLowerCase()] = false;
  });

  // Continuous update
  setInterval(() => {
    let dx = 0, dy = 0, dz = 0;
    const speed = 10;

    if (keyState["w"]) dy += speed;
    if (keyState["s"]) dy -= speed;
    if (keyState["a"]) dx -= speed;
    if (keyState["d"]) dx += speed;
    if (keyState["q"]) dz += speed;
    if (keyState["e"]) dz -= speed;

    // Prevent altitude from dropping below 30m AGL
    const currentZ = physics.getPosition().z;
    if (currentZ + dz < groundHeight + 30) {
      dz = Math.max(0, dz);  // allow up, block down
    }

    window.manualMovement = { x: dx, y: dy, z: dz };
  }, 100); // update every 100ms
}

function setupControlToggles() {
  const controls = [
    ["enableMovement", "movement"],
    ["enablePitch", "pitch"],
    ["enableRoll", "roll"],
    ["enableYaw", "yaw"],
    ["enableThrottle", "throttle"]
  ];

  for (const [id, key] of controls) {
    const el = document.getElementById(id);
    if (el) {
      window.controlFlags[key] = el.checked;
      el.addEventListener("change", () => {
        window.controlFlags[key] = el.checked;
      });
    }
  }
}

function updateSimulation(clock) {
  const dt = viewer.clock.deltaTime || 1 / 60;

  if (isPaused) {
    if (!returningHome) returningHome = true;
    moveDroneHome(dt);
  } else {
    returningHome = false;

    const m = window.manualMovement;
    const isManual = m.x !== 0 || m.y !== 0 || m.z !== 0;

    if (window.controlFlags.movement) {
      const m = window.manualMovement;

      const isManual = m.x !== 0 || m.y !== 0 || m.z !== 0;
      const waypointTarget = droneController.getCurrentTarget();

      if (isManual) {
        const pos = physics.getPosition();
        const manualTarget = {
          x: pos.x + m.x,
          y: pos.y + m.y,
          z: pos.z + m.z,
          yaw: 0
        };
        physics.updateControl(manualTarget, dt);
      } else if (
        waypointTarget &&
        (window.controlFlags.pitch || window.controlFlags.roll || window.controlFlags.yaw || window.controlFlags.throttle)
      ) {
        droneController.update(physics.getPosition());
        physics.updateControl(waypointTarget, dt);
      } else {
        // No input, damp movement softly
        physics.body.velocity.scale(0.95, physics.body.velocity);
        physics.body.angularVelocity.scale(0.95, physics.body.angularVelocity);
      }
}


    world.step(dt);
  }

  const pos = physics.getPosition();
  const orientation = physics.getOrientation();

  const cartPos = new Cesium.Cartesian3();
  Cesium.Matrix4.multiplyByPoint(enuTransform, new Cesium.Cartesian3(pos.x, pos.y, pos.z), cartPos);
  droneEntity.position = cartPos;

  const hpr = new Cesium.HeadingPitchRoll(orientation.yaw, orientation.pitch, orientation.roll);
  droneEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(cartPos, hpr);

  updateTelemetry(pos, physics.getVelocity());
}


function moveDroneHome(dt) {
  const pos = physics.getPosition();
  const ori = physics.getOrientation();
  const lerpFactor = 2 * dt;

  pos.x += (homePosition.x - pos.x) * lerpFactor;
  pos.y += (homePosition.y - pos.y) * lerpFactor;
  pos.z += (homePosition.z - pos.z) * lerpFactor;

  physics.body.position.set(pos.x, pos.y, pos.z);

  ori.pitch += (homeOrientation.pitch - ori.pitch) * lerpFactor;
  ori.roll += (homeOrientation.roll - ori.roll) * lerpFactor;
  ori.yaw += (homeOrientation.yaw - ori.yaw) * lerpFactor;

  physics.body.quaternion.setFromEuler(ori.pitch, ori.roll, ori.yaw, "YZX");

  physics.body.velocity.scale(0.9, physics.body.velocity);
  physics.body.angularVelocity.scale(0.9, physics.body.angularVelocity);

  const dist = Math.hypot(pos.x - homePosition.x, pos.y - homePosition.y, pos.z - homePosition.z);
  if (dist < 0.01) {
    physics.body.velocity.set(0, 0, 0);
    physics.body.angularVelocity.set(0, 0, 0);
    returningHome = false;
  }
}

function updateTelemetry(pos, vel) {
  const posEl = document.getElementById("positionDisplay");
  const velEl = document.getElementById("velocityDisplay");
  const headingEl = document.getElementById("headingDisplay");
  const altEl = document.getElementById("altitudeDisplay");

  if (posEl) posEl.textContent = `X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
  if (velEl) velEl.textContent = `Vx: ${vel.x.toFixed(2)}, Vy: ${vel.y.toFixed(2)}, Vz: ${vel.z.toFixed(2)}`;
  if (headingEl) headingEl.textContent = `Yaw: ${Math.atan2(vel.y, vel.x).toFixed(2)} rad`;
  if (altEl) altEl.textContent = `AGL: ${pos.z.toFixed(2)} m`;  // or compute relative to terrain if needed
}

window.startFlight = () => {
  isPaused = false;
  viewer.clock.shouldAnimate = true;
};

window.pauseFlight = () => {
  isPaused = true;
  viewer.clock.shouldAnimate = true;
};

window.togglePause = () => {
  if (isPaused) {
    window.startFlight();
  } else {
    window.pauseFlight();
  }
};

initCesium();
