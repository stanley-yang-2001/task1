// drone_navigation.js
export class WaypointNavigator {
  constructor(waypoints, reachedThreshold = 1.0, maxSpeed = 5.0) {
    this.waypoints = waypoints;
    this.currentIndex = 0;
    this.reachedThreshold = reachedThreshold;
    this.maxSpeed = maxSpeed;
    this.target = null;
  }

  getCurrentTarget() {
    return this.target;
  }

  update(dronePos, dt) {
    if (this.currentIndex >= this.waypoints.length) {
      this.target = null;
      return;
    }

    const wp = this.waypoints[this.currentIndex];
    const dx = wp.x - dronePos.x;
    const dy = wp.y - dronePos.y;
    const dz = wp.z - dronePos.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

    if (dist < this.reachedThreshold) {
      this.currentIndex++;
      if (this.currentIndex >= this.waypoints.length) {
        this.target = null;
        return;
      }
    }

    if (this.currentIndex < this.waypoints.length) {
      const nextWp = this.waypoints[this.currentIndex];
      let direction = {
        x: nextWp.x - dronePos.x,
        y: nextWp.y - dronePos.y,
        z: nextWp.z - dronePos.z
      };

      const mag = Math.sqrt(direction.x*direction.x + direction.y*direction.y + direction.z*direction.z);
      if (mag > 0) {
        direction.x /= mag;
        direction.y /= mag;
        direction.z /= mag;
      }

      const lookaheadDist = Math.min(this.maxSpeed * dt, dist);
      this.target = {
        x: dronePos.x + direction.x * lookaheadDist,
        y: dronePos.y + direction.y * lookaheadDist,
        z: dronePos.z + direction.z * lookaheadDist,
        yaw: Math.atan2(direction.y, direction.x)
      };
    }
  }
}
