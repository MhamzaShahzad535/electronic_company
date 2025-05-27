# Contributing to Electronics.Company Project

Thank you for your interest in contributing! This document outlines how to set up the project, contribute code, and where our datasets and 3D models come from.

---

## Project Overview

Electronics.Company is a Flask-based web app showcasing the latest electronic trends with AI-powered product search, 3D model viewer, and chatbot features using Cohere AI.

---

## Getting Started

### Prerequisites

- Python 3.8+
- `pip` package manager
- A Cohere API key (sign up at [cohere.ai](https://cohere.ai/))

### Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/electronics-company.git
    cd electronics-company
    ```

2. Create and activate a virtual environment:
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    ```

3. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4. Create a `.env` file with your Cohere API key:
    ```
    COHERE_API_KEY=your_api_key_here
    ```

5. Run the Flask app:
    ```bash
    python app.py
    ```

---

## How to Contribute

- Fork the repo and create a feature branch.
- Write clear, modular code and add comments where needed.
- Update documentation (like `api.md`) if you add/change endpoints.
- Open a Pull Request describing your changes.

---

## Data and Assets

### Dataset

We use the Electronics Dataset from Kaggle:  
[https://www.kaggle.com/datasets/elvinrustam/electronics-dataset](https://www.kaggle.com/datasets/elvinrustam/electronics-dataset)  
License: Creative Commons Attribution 4.0 International (CC BY 4.0)  
[https://creativecommons.org/licenses/by/4.0/](https://creativecommons.org/licenses/by/4.0/)

### 3D Models

3D assets are sourced from Sketchfab with CC licenses:  

- [Gaming Laptop](https://sketchfab.com/3d-models/gaming-laptop-4e72a2078b3c4a75a821ab09830693fe)  
- [Laptop and Mouse](https://sketchfab.com/3d-models/laptop-and-mouse-c6e193ac304e477aaed7946289dbe150)  
- [MFP Office Printer](https://sketchfab.com/3d-models/mfp-office-printer-d55f6fca7c3d45c883bbff770672970d)  
- [Smart Phone School Project](https://sketchfab.com/3d-models/smart-phone-school-project-5134059a9eb844c1b106e4cb7eafd88c)  
- [TV](https://sketchfab.com/3d-models/tv-1b7eff20a86b4cc692bc4222ac1ac252)  
- [Electronic Scale](https://sketchfab.com/3d-models/electronic-scale-d89b9877ba3a436ebed68ab17106ed50)  

Please respect the respective licenses.


---

Thank you for helping improve Electronics.Company!  
Feel free to ask questions or suggest features.