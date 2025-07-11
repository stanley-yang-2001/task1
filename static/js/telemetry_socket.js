// telemetry_socket.js

import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

let socket;
let telemetryCallbacks = [];

/**
 * Initialize telemetry socket connection
 * @param {string} serverUrl
 */
export function initTelemetrySocket(serverUrl = "http://localhost:5000") {
  socket = io(serverUrl, {
    transports: ["websocket"], // Force WebSocket to avoid polling issues
    reconnectionAttempts: 5
  });

  socket.on("connect", () => {
    console.log("🔌 Connected to telemetry server");
  });

  socket.on("disconnect", () => {
    console.warn("❌ Disconnected from telemetry server");
  });

  socket.on("telemetry", (data) => {
    telemetryCallbacks.forEach(cb => cb(data));
  });
}

/**
 * Emit telemetry data to server
 * @param {Object} data
 */
export function sendTelemetry(data) {
  if (socket && socket.connected) {
    socket.emit("telemetry", data);
  }
}

/**
 * Register a callback to run when telemetry is received
 * @param {Function} callback
 */
export function onTelemetry(callback) {
  if (typeof callback === "function") {
    telemetryCallbacks.push(callback);
  }
}
