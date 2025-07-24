from dotenv import load_dotenv
from flask import Blueprint, request, jsonify, stream_with_context, Response
from flask_socketio import SocketIO, emit

import json
import os
import requests
import sqlite3


load_dotenv()

ai_bp = Blueprint("ai", __name__)

API_KEY = os.getenv("TOGETHER_API_KEY")
TOGETHER_URL = "https://api.together.xyz/v1/chat/completions"
MODEL_NAME = "mistralai/Mistral-7B-Instruct-v0.1"

def get_cached_response(prompt):
    conn = sqlite3.connect("cache.db")
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS cache (prompt TEXT PRIMARY KEY, response TEXT)")
    c.execute("SELECT response FROM cache WHERE prompt = ?", (prompt,))
    row = c.fetchone()
    conn.close()
    return row[0] if row else None

def cache_response(prompt, response):
    conn = sqlite3.connect("cache.db")
    c = conn.cursor()
    c.execute("REPLACE INTO cache (prompt, response) VALUES (?, ?)", (prompt, response))
    conn.commit()
    conn.close()

def query_sensors(prompt):
    print("hello")
    conn = sqlite3.connect("cache.db")
    c = conn.cursor()
    c.execute("""
        SELECT * FROM sensors 
        WHERE lower(sensor_type) LIKE lower(?) 
           OR lower(application) LIKE lower(?) 
           OR lower(manufacturer) LIKE lower(?)
    """, (f"%{prompt}%", f"%{prompt}%", f"%{prompt}%"))
    rows = c.fetchall()
    conn.close()
    print(f"[DEBUG] Sensor matches for '{prompt}': {rows}")
    return rows[:3]

@ai_bp.route("/api/ask", methods=["POST"])
def ask():
    prompt = request.json.get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    cached = get_cached_response(prompt)
    if cached:
        return Response(cached, mimetype="text/plain")

    # Look into sensor database
    sensor_hits = query_sensors(prompt)
    if sensor_hits:
        db_hint = "\n\n".join(
            f"{s[0]} used in {s[1]} by {s[2]}: accuracy {s[3]}, format {s[4]}, power {s[5]}"
            for s in sensor_hits
        )
        prompt += f"\n\nRelevant sensor data:\n{db_hint}"

    def generate():
        print("Calling Together API...")
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "model": MODEL_NAME,
            "stream": True,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant specializing in robotics, sensors, and AI."},
                {"role": "user", "content": prompt}
            ]
        }
        collected = ""
        try:
            with requests.post(TOGETHER_URL, headers=headers, json=data, stream=True) as response:
                print("Status code:", response.status_code)
                if response.status_code != 200:
                    yield f"(Error: {response.status_code})"
                    return
                for line in response.iter_lines():
                    if line:
                        line = line.decode("utf-8").strip()
                        print("Line:", line)
                        if line.startswith("data: "):
                            try:
                                chunk = json.loads(line[len("data: "):])
                                delta = chunk["choices"][0]["delta"].get("content", "")
                                collected += delta
                                yield delta
                            except Exception as e:
                                print("JSON decode error:", e)
                                continue
            cache_response(prompt, collected)
        except Exception as e:
            print("Request exception:", e)
            yield "(Error contacting model server)"

    return Response(stream_with_context(generate()), mimetype="text/plain")

@ai_bp.route("/search_sensors")
def search_sensors():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": []})
    
    results = query_sensors(query)
    result_dicts = [
        {
            "name": row[0],
            "description": f"{row[0]} used in {row[1]} by {row[2]} (Accuracy: {row[3]}, Format: {row[4]}, Power: {row[5]})"
        }
        for row in results
    ]
    return jsonify({"results": result_dicts})

# prompt to ask AI based on the user's command
def parse_command_to_mission(user_command):
    prompt = f"""
You are a drone mission planner.
Convert the user's instruction into a JSON list of flight actions.

Each action must be one of the following:
- survey(lat, lon, alt)
- go_to(lat, lon, alt)
- return_to_base()
- hold_position()

Only return valid JSON in the following format:
{{ "mission": [ {{ "action": "go_to", "lat": ..., "lon": ..., "alt": ... }}, ... ] }}

User command: "{user_command}"
"""

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "model": MODEL_NAME,
        "stream": False,
        "messages": [
            {"role": "system", "content": "You are a drone mission planner. Convert user commands into structured flight plans with GPS coordinates."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post(TOGETHER_URL, headers=headers, json=data)
        response.raise_for_status()

        result = response.json()
        raw_text = result["choices"][0]["message"]["content"]
        mission = json.loads(raw_text.strip())
        return mission

    except json.JSONDecodeError:
        print("[ERROR] Could not decode model response as JSON.")
        return None
    except Exception as e:
        print(f"[ERROR] Mission parsing failed: {e}")
        return None


def register_socket_handlers(socketio):
    @socketio.on("nl_command")
    def handle_nl_command(data):
        user_command = data.get("command", "")
        print(f"📥 Received NL command: {user_command}")
        mission_json = parse_command_to_mission(user_command)

        if mission_json:
            print(f"✅ Parsed mission: {mission_json}")
            emit("mission_parsed", mission_json)
        else:
            emit("mission_error", {"error": "Could not parse command"})