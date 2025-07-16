// mission_socket.js
import { io } from "https://cdn.socket.io/4.5.4/socket.io.esm.min.js";

export function initMissionSocket(droneController, enuTransform, inverseEnuTransform, homePosition, physics) {
  const socket = io();

  // Expose command sender globally (e.g. sendNLCommand("..."))
  window.sendNLCommand = function (command) {
    socket.emit("nl_command", { command });
  };

  // Handle parsed mission plan
  socket.on("mission_parsed", (data) => {
    console.log("🛰️ Mission parsed:", data);

    if (Array.isArray(data.mission)) {
      const waypoints = missionToWaypoints(data.mission);
      droneController.setWaypoints(waypoints);
      console.log("🧭 Waypoints updated:", waypoints);
    } else {
      console.warn("Invalid mission format received:", data);
    }
  });

  socket.on("mission_error", (err) => {
    console.error("❌ Mission parsing failed:", err);
  });

  function missionToWaypoints(missionSteps) {
    const localWaypoints = [];

    for (const step of missionSteps) {
      switch (step.action) {
        case "go_to":
        case "survey":
          if (!step.lat || !step.lon || step.alt === undefined) continue;
          {
            const cart = Cesium.Cartesian3.fromDegrees(step.lon, step.lat, step.alt);
            const local = new Cesium.Cartesian3();
            Cesium.Matrix4.multiplyByPoint(inverseEnuTransform, cart, local);
            localWaypoints.push({ x: local.x, y: local.y, z: local.z, yaw: 0 });
          }
          break;

        case "return_to_base":
          localWaypoints.push({ x: homePosition.x, y: homePosition.y, z: homePosition.z, yaw: 0 });
          break;

        case "hold_position":
          const current = physics.getPosition();
          localWaypoints.push({ x: current.x, y: current.y, z: current.z, yaw: 0 });
          break;

        default:
          console.warn("⚠️ Unknown mission step:", step);
      }
    }

    return localWaypoints;
  }
}