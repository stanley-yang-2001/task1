# fake_telemetry.py

import time
import random
from threading import Thread
from app import socketio  # make sure 'app.py' exposes 'socketio'

def generate_fake_telemetry():
    return {
        "gps": {
            "lat": 37.655 + random.uniform(-0.0005, 0.0005),
            "lon": -122.4175 + random.uniform(-0.0005, 0.0005),
            "alt": 100 + random.uniform(-2, 2)
        },
        "imu": {
            "pitch": random.uniform(-5, 5),
            "roll": random.uniform(-5, 5),
            "yaw": random.uniform(0, 360),
            "accel": [random.uniform(-1, 1) for _ in range(3)]
        },
        "barometer": {
            "alt": 100 + random.uniform(-2, 2),
            "pressure": 1013.25 + random.uniform(-5, 5)
        },
        "battery": max(0, 100 - random.uniform(0, 1)),
        "temperature": 25 + random.uniform(-2, 2)
    }

def telemetry_emitter():
    while True:
        data = generate_fake_telemetry()
        # ✅ DEBUG: Print outgoing telemetry
        print("🔄 Emitting telemetry:", data)
        socketio.emit('telemetry', data)  # No need for broadcast=True
        time.sleep(3)

def start_fake_telemetry():
    t = Thread(target=telemetry_emitter)
    t.daemon = True
    t.start()
