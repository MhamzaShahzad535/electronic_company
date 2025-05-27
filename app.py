import os
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv
import cohere
import sqlite3
from ai_routes import ai_bp

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.register_blueprint(ai_bp)

# Initialize Cohere client
cohere_api_key = os.getenv("COHERE_API_KEY")
co = cohere.Client(cohere_api_key)

# Latest electronic trends (for homepage display)
latest_trends = [
    "AI-powered smart sensors",
    "Flexible OLED displays",
    "Quantum dot technology",
    "5G IoT devices",
    "Wearable health monitors",
    "Wireless charging advancements",
    "Edge computing for electronics",
    "Miniaturized drones",
    "Augmented reality glasses",
    "Energy harvesting circuits"
]

# Home page
@app.route("/")
def index():
    return render_template("index.html", trends=latest_trends)

# Ask AI (Cohere) endpoint
@app.route("/api/ask", methods=["POST"])
def ask():
    data = request.json
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    try:
        response = co.chat(
            chat_history=[],
            message=prompt,
            model="command-r-plus",
            temperature=0.7
        )
        return jsonify({"answer": response.text.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Products search (HTML page)
@app.route("/products")
def products():
    query = request.args.get("q", "")
    conn = sqlite3.connect("db/products.db")
    conn.row_factory = sqlite3.Row

    if query:
        rows = conn.execute(
            "SELECT * FROM products WHERE Title LIKE ? OR Feature LIKE ? OR [Sub Category] LIKE ?",
            (f"%{query}%", f"%{query}%", f"%{query}%")
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM products LIMIT 20").fetchall()

    conn.close()
    return render_template("products.html", products=rows)

# Products API (JSON response)
@app.route("/api/products/search")
def api_product_search():
    query = request.args.get("q", "")
    conn = sqlite3.connect("db/products.db")
    conn.row_factory = sqlite3.Row

    if query:
        rows = conn.execute(
            "SELECT * FROM products WHERE Title LIKE ? OR Feature LIKE ? OR [Sub Category] LIKE ?",
            (f"%{query}%", f"%{query}%", f"%{query}%")
        ).fetchall()
    else:
        rows = []

    conn.close()
    products = [dict(row) for row in rows]
    return jsonify(products)

# ✅ NEW: Endpoint to return all models for 3D viewer
@app.route("/api/models")
def get_models():
    conn = sqlite3.connect("db/products.db")
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT Title, File, Keywords FROM products").fetchall()
    conn.close()

    models = []
    for row in rows:
        models.append({
            "name": row["Title"],
            "file": row["File"],
            "keywords": [kw.strip().lower() for kw in row["Keywords"].split(",") if kw.strip()]
        })

    return jsonify(models)

# 3D Viewer page
@app.route("/viewer")
def viewer():
    return render_template("3d.html")

# Greeting test API
@app.route("/api/greeting")
def greeting():
    return jsonify({"msg": "Welcome to Electronics.Company — Your tech trends hub!"})

# Run app
if __name__ == "__main__":
    app.run(debug=True) 