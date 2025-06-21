import os
import sqlite3
from flask import Flask, render_template, jsonify, request, session, redirect, url_for, flash
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv
import cohere
from ai_routes import ai_bp

# Load environment variables
load_dotenv()

# Auto-create database if missing
if not os.path.exists("database.db"):
    from init_db import initialize_database
    initialize_database()

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.urandom(24)
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

# ---------- USER AUTH HELPERS ----------

def get_user_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# ---------- USER AUTH ROUTES ----------

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username').strip()
        email = request.form.get('email').strip()
        password = request.form.get('password')

        conn = get_user_db()
        user = conn.execute(
            'SELECT * FROM users WHERE username = ? AND email = ?',
            (username, email)
        ).fetchone()
        conn.close()

        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['user_type'] = user['user_type']

            if user['user_type'] == 'admin':
                return redirect('/admin')
            else:
                return redirect('/')
        else:
            flash('Invalid username, email, or password.')
            return redirect('/login')

    return render_template('login.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username').strip()
        email = request.form.get('email').strip()
        phone = request.form.get('phone').strip()  # Optional: if used, add to DB schema
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if password != confirm_password:
            flash("Passwords do not match.")
            return redirect('/signup')

        conn = get_user_db()
        cursor = conn.cursor()

        existing_user = cursor.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?", (username, email)
        ).fetchone()

        if existing_user:
            flash("Username or email already exists.")
            conn.close()
            return redirect('/signup')

        hashed_password = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)",
            (username, email, hashed_password, 'user')
        )
        conn.commit()
        conn.close()
        flash("Account created! You can now log in.")
        return redirect('/login')

    return render_template('signup.html')


@app.route('/products')
def products():
    if 'user_id' not in session:
        return redirect('/login')  # Redirect unauthorized users to login

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
    return render_template("products.html", products=rows, username=session.get('username'))


@app.route('/admin')
def admin():
    if 'user_id' not in session or session.get('user_type') != 'admin':
        return redirect('/login')
    return render_template('admin.html', username=session.get('username'))


# ---------- EXISTING FEATURES ----------

@app.route("/")
def index():
    return render_template("index.html", trends=latest_trends)


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


@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect('/login')


@app.route("/viewer")
def viewer():
    return render_template("3d.html")


@app.route("/api/greeting")
def greeting():
    return jsonify({"msg": "Welcome to Electronics.Company — Your tech trends hub!"})

import webbrowser
import threading

def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000/login")

if __name__ == "__main__":
    # Open browser after 1.5 seconds delay (to let server start)
    threading.Timer(1.5, open_browser).start()
    app.run(debug=True)

# ---------- RUN APP ----------
if __name__ == "__main__":
    app.run(debug=True)
