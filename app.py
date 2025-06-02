from flask import Flask, render_template, request, jsonify
from ai_routes import ai_bp
import sqlite3

app = Flask(__name__)
app.register_blueprint(ai_bp)

@app.route("/")
def index():
    return render_template("index.html")

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

if __name__ == "__main__":
    app.run(debug=True)