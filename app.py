import eventlet
eventlet.monkey_patch()   

from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from ai_routes import ai_bp
import sqlite3
import threading
import os

app = Flask(__name__)
CESIUM_ION_API_KEY = os.getenv("CESIUM_ION_API_KEY")                        # Make Flask async-compatible
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')  # allow JS client to connect
app.register_blueprint(ai_bp)


@app.route("/")
def index():
    #return render_template("index.html")
    return render_template("digital_twin.html", cesium_token=CESIUM_ION_API_KEY)

@app.route("/search_sensors", methods=["GET"])
def search_sensors():
    query = request.args.get("q", "").strip()
    conn = sqlite3.connect("cache.db")
    c = conn.cursor()
    c.execute("SELECT * FROM sensors WHERE sensor_type LIKE ? OR application LIKE ? OR manufacturer LIKE ?", 
              (f"%{query}%", f"%{query}%", f"%{query}%"))
    rows = c.fetchall()
    conn.close()
    return jsonify(rows)

@socketio.on("telemetry")
def handle_telemetry(data):
    #print("Received telemetry:", data)
    socketio.emit("telemetry", data)  # echo back to all clients.
'''
@socketio.on("nl_command")
def handle_nl_command(data):
    command = data.get("command", "").strip()
    if not command:
        emit("mission_error", {"error": "No command provided"})
        return

    # Call the mission parser endpoint internally
    from flask import json as flask_json
    with app.test_request_context(json={"command": command}):
        response = app.view_functions["ai.parse_mission"]()
        if response.status_code == 200:
            mission_json = response.get_json()
            emit("mission_parsed", mission_json)
        else:
            emit("mission_error", response.get_json())
'''
    
if __name__ == "__main__":
    from fake_telemetry import start_fake_telemetry
    #app.run(debug=True)
    #start_fake_telemetry()
    print("[INFO] SocketIO server starting at http://localhost:5000")
    threading.Thread(target=start_fake_telemetry, daemon=True).start()
    socketio.run(app, host='0.0.0.0', port=5000)