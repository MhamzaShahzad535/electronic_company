import sqlite3

conn = sqlite3.connect("db/products.db")
cursor = conn.cursor()

# Show table schema
cursor.execute("PRAGMA table_info(products);")
columns = cursor.fetchall()

print("Table schema:")
for col in columns:
    print(f"- {col[1]} ({col[2]})")

conn.close()
