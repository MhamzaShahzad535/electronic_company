# Electronics.Company

A Flask-based web app showcasing the latest electronic trends with AI-powered product search, 3D model viewer, and chatbot features using Cohere AI.

## Features

- Search electronics products from a curated SQLite database  
- Chat with AI powered by Cohere API  
- View 3D electronic models with interactive viewer  

## Setup

1. Clone the repo  
```bash
git clone https://github.com/yourusername/electronics-company.git
cd electronics-company
Create and activate a virtual environment

bash
Copy
Edit
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
Install dependencies

bash
Copy
Edit
pip install -r requirements.txt
Create .env file with your Cohere API key

ini
Copy
Edit
COHERE_API_KEY=your_api_key_here
Run the app

bash
Copy
Edit
python app.py
Usage
Open http://localhost:5000 to access the homepage.

Use /products page to search electronics products.

Use /viewer to see 3D models.

Use the chatbot on the homepage to ask AI questions.


Credits
Dataset: Electronics Dataset on Kaggle (CC BY 4.0)

3D Models: Sketchfab (various CC licenses)

AI: Cohere API

Python
pycache/
*.pyc
*.pyo
*.pyd
.Python
.env
.venv/
venv/
ENV/
env/
.sqlite3
db/.db

VS Code
.vscode/

macOS
.DS_Store

Others
*.log
*.sqlite


