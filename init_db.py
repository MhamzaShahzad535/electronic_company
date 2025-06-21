# init_db.py
import sqlite3
from werkzeug.security import generate_password_hash

def initialize_database():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        user_type TEXT NOT NULL
    )
    ''')

    # Check if admin user exists before inserting to avoid duplicates
    existing_admin = cursor.execute("SELECT * FROM users WHERE username = 'adminuser'").fetchone()
    if not existing_admin:
        cursor.execute('''
        INSERT INTO users (username, email, password, user_type)
        VALUES (?, ?, ?, ?)
        ''', ('adminuser', 'admin@example.com', generate_password_hash('admin123'), 'admin'))

    existing_user = cursor.execute("SELECT * FROM users WHERE username = 'normaluser'").fetchone()
    if not existing_user:
        cursor.execute('''
        INSERT INTO users (username, email, password, user_type)
        VALUES (?, ?, ?, ?)
        ''', ('normaluser', 'user@example.com', generate_password_hash('user123'), 'user'))

    conn.commit()
    conn.close()
    print("✅ Database created and users added.")

if __name__ == "__main__":
    initialize_database()
