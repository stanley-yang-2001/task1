from flask import Blueprint, request, jsonify, stream_with_context, Response
import requests
import sqlite3
import json

ai_bp = Blueprint("ai", __name__)

API_KEY = "a413eae73bde152867fdc842c2f4cf59955f0e6f7547c58ed8412d45faca9a87"
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