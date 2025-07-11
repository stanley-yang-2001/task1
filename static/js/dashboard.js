// dashboard_display.js

import { onTelemetry } from './telemetry_socket.js';

export function initDashboardDisplay() {
  onTelemetry((data) => {
    if (!data) return;

    updateText("positionDisplay", `Lat: ${data.gps.lat.toFixed(5)}, Lon: ${data.gps.lon.toFixed(5)}, Alt: ${data.gps.alt.toFixed(2)} m`);
    updateText("velocityDisplay", `Vx: ${data.imu.accel[0].toFixed(2)}, Vy: ${data.imu.accel[1].toFixed(2)}, Vz: ${data.imu.accel[2].toFixed(2)}`);
    updateText("pitchDisplay", data.imu.pitch.toFixed(2));
    updateText("rollDisplay", data.imu.roll.toFixed(2));
    updateText("yawDisplay", data.imu.yaw.toFixed(2));
    updateText("accelDisplay", data.imu.accel.map(v => v.toFixed(2)).join(", "));
    updateText("altitudeDisplay", data.barometer.alt.toFixed(2));
    updateText("pressureDisplay", data.barometer.pressure.toFixed(1));
    updateText("batteryDisplay", data.battery);
    updateText("temperatureDisplay", data.temperature);
  });
}

function updateText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
