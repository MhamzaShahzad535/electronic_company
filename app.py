import os
import sqlite3
import threading
import webbrowser
from flask import Flask, render_template, jsonify, request, session, redirect, url_for, flash
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import cohere
from ai_routes import ai_bp  # blueprint for AI routes
# --- ENV SETUP ---
load_dotenv()

# --- DATABASE INIT ---
# Database will be created automatically when needed

# --- FLASK APP SETUP ---
app = Flask(__name__)
app.secret_key = os.urandom(24)
app.register_blueprint(ai_bp)


# --- COHERE SETUP ---
cohere_api_key = os.getenv("COHERE_API_KEY")
co = cohere.Client(cohere_api_key) if cohere_api_key else None

# --- ELECTRONICS TRENDS ---
latest_trends = [
    "AI-powered smart sensors", "Flexible OLED displays", "Quantum dot technology",
    "5G IoT devices", "Wearable health monitors", "Wireless charging advancements",
    "Edge computing for electronics", "Miniaturized drones",
    "Augmented reality glasses", "Energy harvesting circuits"
]

# --- USER AUTH HELPERS ---
def get_user_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# --- MODEL DATABASE HELPERS ---
def get_model_db():
    conn = sqlite3.connect('models.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_model_db():
    conn = get_model_db()
    conn.execute("""
    CREATE TABLE IF NOT EXISTS models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cesium_asset_id INTEGER NOT NULL,
        longitude REAL NOT NULL,
        latitude REAL NOT NULL,
        height REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()

# Initialize model database
init_model_db()

# --- LOGIN ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username').strip()
        email = request.form.get('email').strip()
        password = request.form.get('password')

        conn = get_user_db()
        user = conn.execute(
            'SELECT * FROM users WHERE username = ? AND email = ?', (username, email)
        ).fetchone()
        conn.close()

        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['user_type'] = user['user_type']
            return redirect('/admin' if user['user_type'] == 'admin' else '/')
        else:
            flash('Invalid username, email, or password.')
            return redirect('/login')

    return render_template('login.html')

# --- SIGNUP ---
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username').strip()
        email = request.form.get('email').strip()
        phone = request.form.get('phone').strip()
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

# --- PRODUCT PAGE ---
@app.route('/products')
def products():
    if 'user_id' not in session:
        return redirect('/login')

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

# --- ADMIN DASHBOARD ---
@app.route('/admin')
def admin():
    if 'user_id' not in session or session.get('user_type') != 'admin':
        return redirect('/login')
    return render_template('admin.html', username=session.get('username'))

# --- HOMEPAGE ---
@app.route("/")
def index():
    return render_template("index.html", trends=latest_trends)

# --- AI API ---
@app.route("/api/ask", methods=["POST"])
def ask():
    data = request.json
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    try:
        if co:
            response = co.chat(
                chat_history=[],
                message=prompt,
                model="command-r-plus",
                temperature=0.7
            )
            return jsonify({"answer": response.text.strip()})
        else:
            return jsonify({"answer": "I'm a demo AI assistant. Please configure the COHERE_API_KEY environment variable to enable full AI functionality."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- MODEL API ---
@app.route("/api/models", methods=["POST"])
def save_model():
    data = request.json
    name = data.get("name", "").strip()
    cesium_asset_id = data.get("cesium_asset_id")
    longitude = data.get("longitude")
    latitude = data.get("latitude")
    height = data.get("height")

    if not name or cesium_asset_id is None or longitude is None or latitude is None or height is None:
        return jsonify({"error": "All model details are required"}), 400

    try:
        conn = get_model_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO models (name, cesium_asset_id, longitude, latitude, height) VALUES (?, ?, ?, ?, ?)",
            (name, cesium_asset_id, longitude, latitude, height)
        )
        model_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "message": f"Model '{name}' saved successfully",
            "model_id": model_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/models", methods=["GET"])
def get_models():
    try:
        conn = get_model_db()
        models = conn.execute("SELECT * FROM models ORDER BY created_at DESC").fetchall()
        conn.close()
        
        models_list = []
        for model in models:
            models_list.append({
                "id": model["id"],
                "name": model["name"],
                "cesium_asset_id": model["cesium_asset_id"],
                "longitude": model["longitude"],
                "latitude": model["latitude"],
                "height": model["height"],
                "created_at": model["created_at"]
            })
        
        return jsonify({"models": models_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- SEARCH API ---
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

# --- LOGOUT ---
@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect('/login')

# --- VIEWER PAGE ---
@app.route("/viewer")
def viewer():
    return render_template("3d.html")

# --- GREETING TEST API ---
@app.route("/api/greeting")
def greeting():
    return jsonify({"msg": "Welcome to Electronics.Company — Your tech trends hub!"})

# --- FILE UPLOAD ---
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'assets', '3d')
ALLOWED_EXTENSIONS = {'glb', 'gltf', 'obj', 'fbx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['GET'])
def upload_page():
    uploaded_files = []
    try:
        uploaded_files = os.listdir(app.config['UPLOAD_FOLDER'])
    except Exception as e:
        print("Error reading upload folder:", e)
    return render_template('upload.html', uploaded_files=uploaded_files)

@app.route('/upload', methods=['POST'])
def upload_model():
    if 'model' not in request.files:
        flash('No file part in the form.')
        print("DEBUG - No file part found in request.files.")
        return redirect(request.url)

    file = request.files['model']
    print(f"DEBUG - Uploaded filename: {file.filename}")

    if file.filename == '':
        flash('No file selected.')
        print("DEBUG - Filename was empty.")
        return redirect(request.url)

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        try:
            file.save(save_path)
            print("✅ File saved successfully at:", save_path)
            print("✅ File exists?", os.path.exists(save_path))
            flash('Model uploaded successfully!')
        except Exception as e:
            print("❌ Error saving file:", e)
            flash("Upload failed: " + str(e))
        return redirect(url_for('upload_page'))
    else:
        flash('Invalid file type. Allowed types: ' + ', '.join(ALLOWED_EXTENSIONS))
        print("❌ Invalid file type.")
        return redirect(request.url)

# --- OPEN BROWSER & START SERVER ---
def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000/login")

if __name__ == "__main__":
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        threading.Timer(1.5, open_browser).start()
    app.run(debug=True, host='0.0.0.0')

