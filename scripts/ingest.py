import sqlite3
import pandas as pd
import os

# Paths
CSV_FILE = "../datasets/electronics_products.csv"
DB_FILE = "../db/products.db"

# Read CSV
df = pd.read_csv(CSV_FILE)

# Clean columns
df.columns = [col.strip().replace(' ', '_').replace('[', '').replace(']', '') for col in df.columns]

# Optional: Drop duplicate or null entries
df.drop_duplicates(inplace=True)
df.dropna(subset=["Title"], inplace=True)  # Assuming Title is mandatory

# Create DB directory
os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)

# Connect to SQLite
conn = sqlite3.connect(DB_FILE)
cur = conn.cursor()

# Drop existing table
cur.execute("DROP TABLE IF EXISTS products")

# Auto-generate table based on DataFrame
df.to_sql("products", conn, if_exists="replace", index=False)

print("✅ Data successfully ingested to SQLite!")

conn.commit()
conn.close()
