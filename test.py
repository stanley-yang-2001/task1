// drone_sim.js - Integrate Cannon.js physics with Cesium viewer and accurate terrain placement

import { DronePhysics, initCannonWorld } from './physics_engine.js';

let viewer, droneEntity, physics, world;

let waypoints = [
  { lat: 37.655, lon: -122.4175, alt: 10 },
  { lat: 37.656, lon: -122.418, alt: 15 },
  { lat: 37.657, lon: -122.417, alt: 12 }
];

let currentWaypoint = 0;
let CESIUM_ION_API_KEY = window.CESIUM_ION_API_KEY || "";

async function initCesium() {
  Cesium.Ion.defaultAccessToken = CESIUM_ION_API_KEY;

  const terrainProvider = await Cesium.createWorldTerrainAsync();
  viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider,
    shouldAnimate: true
  });

  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.enableLighting = true;

  const wp = waypoints[0];
  const carto = Cesium.Cartographic.fromDegrees(wp.lon, wp.lat);
  await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [carto]);
  const groundHeight = carto.height;
  const accurateHeight = groundHeight + wp.alt;

  droneEntity = viewer.entities.add({
    name: "Drone",
    position: Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, accurateHeight),
    model: {
      uri: "/static/assets/3d/drone_optimized.glb",
      scale: 1.5,
      minimumPixelSize: 64
    }
  });

  viewer.trackedEntity = droneEntity;
  setupPhysics();
  viewer.clock.onTick.addEventListener(updateSimulation);
}

function setupPhysics() {
  world = initCannonWorld();
  physics = new DronePhysics({ mass: 1.0 });
  physics.init(world);
}

function gpsToCartesian(lon, lat, alt) {
  return Cesium.Cartesian3.fromDegrees(lon, lat, alt);
}

function updateSimulation(clock) {
  const dt = viewer.clock.deltaTime || 1 / 60;

  const wp = waypoints[currentWaypoint];
  const carto = Cesium.Cartographic.fromDegrees(wp.lon, wp.lat);
  Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [carto]).then(() => {
    const groundHeight = carto.height;
    const target = {
      x: wp.lon * 111000 * Math.cos(wp.lat * Math.PI / 180),
      y: wp.lat * 111000,
      z: groundHeight + wp.alt
    };

    physics.update(target, dt);
    world.step(dt);

    const pos = physics.getPosition();
    const cartPos = Cesium.Cartesian3.fromElements(pos.x, pos.y, pos.z);
    droneEntity.position = cartPos;

    updateTelemetry(pos, physics.getVelocity(), groundHeight);
  });
}

function updateTelemetry(pos, vel, groundHeight) {
  document.getElementById("positionDisplay").textContent =
    `X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
  document.getElementById("velocityDisplay").textContent =
    `Vx: ${vel.x.toFixed(2)}, Vy: ${vel.y.toFixed(2)}, Vz: ${vel.z.toFixed(2)}`;
  document.getElementById("headingDisplay").textContent =
    `Yaw: ${Math.atan2(vel.y, vel.x).toFixed(2)} rad`;
  document.getElementById("altitudeDisplay").textContent =
    `AGL: ${(pos.z - groundHeight).toFixed(2)} m`;
}

window.startFlight = () => viewer.clock.shouldAnimate = true;
window.pauseFlight = () => viewer.clock.shouldAnimate = false;

initCesium();
