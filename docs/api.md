 API Documentation

## 1. GET `/`

**Description:**  
Renders the homepage displaying latest electronic trends.

**Request:**  
No parameters.

**Response:**  
Renders `index.html` with a list of trends.

---

## 2. POST `/api/ask`

**Description:**  
Accepts a JSON prompt, sends it to Cohere AI, caches the result, and returns AI-generated answer.

**Request:**  
```json
{
  "prompt": "Your question or prompt here"
}
Response:

json
Copy
Edit
{
  "answer": "AI-generated response text",
  "cached": true|false
}
Errors:

400 if prompt is missing or empty.

500 on internal server errors.

3. GET /products
Description:
Renders a product search page (HTML) showing products matching an optional search query.

Query parameters:

q (optional): search term.

Response:
Renders products.html with product results.

4. GET /api/products/search
Description:
Returns JSON list of products matching the optional search query.

Query parameters:

q (optional): search term.

Response:

json
Copy
Edit
[
  {
    "ID": 1,
    "Title": "Product Name",
    "Feature": "...",
    "Sub Category": "..."
  }
  // More products
]
5. GET /api/models
Description:
Returns JSON list of all 3D models available for viewer, including file paths and keywords.

Response:

json
Copy
Edit
[
  {
    "name": "Model Title",
    "file": "static/assets/3d/models",
    "keywords": ["drone", "laptop"]
  }
  // More models
]
6. GET /viewer
Description:
Renders the 3D viewer page (3d.html).

Request:
No parameters.

Response:
Renders 3d.html.

7. GET /api/greeting
Description:
Returns a simple JSON greeting message.

Response:

json
Copy
Edit
{
  "msg": "Welcome to Electronics.Company — Your tech trends hub!"
}