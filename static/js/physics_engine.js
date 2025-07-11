import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class DronePhysics {
  constructor(params) {
    this.mass = params.mass || 1.0;

    // PID controllers (less aggressive)
    this.pitchPID = new PIDController(0.5, 0.01, 0.1);
    this.rollPID = new PIDController(0.5, 0.01, 0.1);
    this.yawPID = new PIDController(0.4, 0.005, 0.05);
    this.throttlePID = new PIDController(1.0, 0.1, 0.3);  // Lower gain = smoother altitude hold

    this.body = null;       
    this.world = null;

    this.originalMass = this.mass;
    this.bodyTypeDynamic = CANNON.Body.DYNAMIC;
    this.bodyTypeKinematic = CANNON.Body.KINEMATIC;
  }

  init(world) {
    this.world = world;

    // Box shape for drone
    const halfExtents = new CANNON.Vec3(0.5, 0.5, 0.15);
    const boxShape = new CANNON.Box(halfExtents);

    this.body = new CANNON.Body({
      mass: this.mass,
      shape: boxShape,
      position: new CANNON.Vec3(0, 0, 0.1),
      angularDamping: 0.95, // Increased damping to reduce spin
      linearDamping: 0.1
    });

    world.addBody(this.body);
  }

  updateControl(targetPose, dt) {
    if (!this.body) return;

    const pos = this.body.position;
    const quat = this.body.quaternion;
    const euler = new CANNON.Vec3();
    quat.toEuler(euler, "YZX");

    const ex = targetPose.x - pos.x;
    const ey = targetPose.y - pos.y;
    const ez = targetPose.z - pos.z;

    const m = window.manualMovement || { x: 0, y: 0, z: 0 };
    const isManual = m.x !== 0 || m.y !== 0 || m.z !== 0;

    let pitchTorque = 0;
    let rollTorque = 0;
    let yawTorque = 0;

    // === Manual Mode ===
    if (isManual) {
      if (this.body.type !== this.bodyTypeKinematic) {
        this.body.type = this.bodyTypeKinematic;
        this.body.mass = 0;
        this.body.updateMassProperties();
      }

      this.body.velocity.set(m.x, m.y, m.z);

      // Force full angular freeze *every frame*
      this.body.angularVelocity.set(0, 0, 0);
      this.body.quaternion.setFromEuler(0, 0, 0, "YZX");
      this.body.torque.set(0, 0, 0);

      return;  // Skip all PID
    }

    // === Back to Dynamic Mode ===
    if (this.body.type !== this.bodyTypeDynamic) {
      this.body.type = this.bodyTypeDynamic;
      this.body.mass = this.originalMass;
      this.body.updateMassProperties();

      // Clear out velocity and spin from manual mode
      this.body.velocity.set(0, 0, 0);
      this.body.angularVelocity.set(0, 0, 0);
      this.body.quaternion.setFromEuler(0, 0, 0, "YZX");
    }

    // === PID Throttle Control (only if enabled and not pressing z manually) ===
    if (window.controlFlags.throttle && m.z === 0) {
      const throttleForce = clamp(this.throttlePID.update(ez, dt), -5, 10);
      const netForce = throttleForce + this.mass * 9.81;
      const upForce = new CANNON.Vec3(0, 0, netForce);
      this.body.applyForce(upForce, this.body.position);

      if (Math.abs(throttleForce) < 1.0) {
        this.body.velocity.z *= 0.95;
      }
    }

    // (Pitch/Roll/Yaw still commented for now)
    this.body.torque.set(rollTorque, pitchTorque, yawTorque);
}


  getPosition() {
    if (!this.body) return { x: 0, y: 0, z: 0 };
    return this.body.position;
  }


  // still need tuning
  getAcceleration() {
  // Estimate acceleration from velocity difference
  const currentVel = this.body.velocity;
  const dt = 1 / 60; // or pass actual dt
  if (!this.prevVel) this.prevVel = currentVel.clone();

  const ax = (currentVel.x - this.prevVel.x) / dt;
  const ay = (currentVel.y - this.prevVel.y) / dt;
  const az = (currentVel.z - this.prevVel.z) / dt;

  this.prevVel.copy(currentVel);
  return [ax, ay, az];
}

  getOrientation() {
    if (!this.body) return { pitch: 0, roll: 0, yaw: 0 };
    const euler = new CANNON.Vec3();
    this.body.quaternion.toEuler(euler, "YZX");
    return { pitch: euler.x, roll: euler.y, yaw: euler.z };
  }

  getVelocity() {
    if (!this.body) return { x: 0, y: 0, z: 0 };
    return this.body.velocity;
  }
}

class PIDController {
  constructor(kp, ki, kd) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.integral = 0;
    this.prevError = 0;
  }

  update(error, dt) {
    this.integral += error * dt;
    const derivative = (error - this.prevError) / dt;
    this.prevError = error;
    return this.kp * error + this.ki * this.integral + this.kd * derivative;
  }
}

export class DroneController {
  constructor(waypoints) {
    this.waypoints = waypoints;
    this.currentIndex = 0;
    this.reachedThreshold = 1.0;
  }

  getCurrentTarget() {
    if (this.currentIndex >= this.waypoints.length) return null;
    return this.waypoints[this.currentIndex];
  }

  update(dronePosition) {
    const target = this.getCurrentTarget();
    if (!target) return;

    const dx = target.x - dronePosition.x;
    const dy = target.y - dronePosition.y;
    const dz = target.z - dronePosition.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < this.reachedThreshold) {
      this.currentIndex++;
    }
  }
}

export function initCannonWorld() {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, 0, -9.81),
  });
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  return world;
}