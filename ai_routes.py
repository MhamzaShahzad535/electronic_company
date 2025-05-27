import sqlite3
import time
from flask import Blueprint, request, jsonify
import cohere
import os

ai_bp = Blueprint('ai', __name__, url_prefix='/api')

# Initialize Cohere client
cohere_api_key = os.getenv("COHERE_API_KEY")
co = cohere.Client(cohere_api_key)

# Cache DB path
DB_PATH = "db/ai_cache.db"

def get_cache_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_cache_db():
    conn = get_cache_conn()
    conn.execute("""
    CREATE TABLE IF NOT EXISTS cache (
        prompt TEXT PRIMARY KEY,
        response TEXT,
        timestamp INTEGER
    )
    """)
    conn.commit()
    conn.close()

# Initialize cache table
init_cache_db()

@ai_bp.route("/ask", methods=["POST"])
def ask():
    data = request.json
    prompt = data.get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    conn = get_cache_conn()
    cached = conn.execute("SELECT response FROM cache WHERE prompt = ?", (prompt,)).fetchone()

    if cached:
        conn.close()
        return jsonify({"answer": cached["response"], "cached": True})

    try:
        response = co.chat(
            chat_history=[],
            message=prompt,
            model="command-r-plus",
            temperature=0.7
        )
        answer = response.text.strip()

        conn.execute(
            "INSERT OR REPLACE INTO cache (prompt, response, timestamp) VALUES (?, ?, ?)",
            (prompt, answer, int(time.time()))
        )
        conn.commit()
        conn.close()

        return jsonify({"answer": answer, "cached": False})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500
