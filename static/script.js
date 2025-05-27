// Fetch greeting message from Flask API and display it
fetch("/api/greeting")
  .then(response => response.json())
  .then(data => {
    document.getElementById("greeting").textContent = data.msg;
  })
  .catch(() => {
    document.getElementById("greeting").textContent = "Sorry, unable to load greeting.";
  });

// Chatbot interaction
document.getElementById("ask-btn").addEventListener("click", () => {
  const prompt = document.getElementById("prompt").value.trim();
  const chatMessages = document.getElementById("chat-messages");

  if (!prompt) {
    alert("Please enter a question.");
    return;
  }

  // Add user message to chat
  const userMessage = document.createElement('div');
  userMessage.className = 'user-message';
  userMessage.innerHTML = `<div class="message-content"><p>${prompt}</p></div>`;
  chatMessages.appendChild(userMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Add loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai-message loading';
  loadingDiv.innerHTML = `
    <div class="message-content">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Clear input
  document.getElementById("prompt").value = '';

  fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  })
    .then((res) => res.json())
    .then((data) => {
      // Remove loading
      chatMessages.removeChild(loadingDiv);

      const aiMessage = document.createElement('div');
      aiMessage.className = 'ai-message';
      aiMessage.innerHTML = `<div class="message-content"><p>${data.answer || "Sorry, I couldn't find an answer to that."}</p></div>`;
      chatMessages.appendChild(aiMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    })
    .catch(() => {
      chatMessages.removeChild(loadingDiv);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'ai-message';
      errorMsg.innerHTML = `<div class="message-content"><p>Failed to fetch response from AI.</p></div>`;
      chatMessages.appendChild(errorMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
});

// Submit on Enter (Shift+Enter allows newline)
document.getElementById("prompt").addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById("ask-btn").click();
  }
});

// Search functionality
const searchInput = document.getElementById('product-search-input');
const searchBtn = document.getElementById('product-search-btn');
const clearBtn = document.getElementById('clear-search-btn');
const suggestionsContainer = document.getElementById('search-suggestions');

clearBtn.style.visibility = 'hidden'; // hide clear button initially

searchInput.addEventListener('input', () => {
  if (searchInput.value.trim().length > 0) {
    clearBtn.style.visibility = 'visible';
    // Optionally you could fetch suggestions here while typing
    showSuggestions(searchInput.value.trim());
  } else {
    clearBtn.style.visibility = 'hidden';
    suggestionsContainer.style.display = 'none';
  }
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.style.visibility = 'hidden';
  suggestionsContainer.style.display = 'none';
  searchInput.focus();
});

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    performSearch();
  }
});

function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(products => {
      if (!products.length) {
        suggestionsContainer.innerHTML = '<div class="no-results">No products found.</div>';
        suggestionsContainer.style.display = 'block';
        return;
      }

      suggestionsContainer.innerHTML = products.map(p => `
        <div class="suggestion-item" data-id="${p.id}">
          <strong>${p.Title}</strong> - <em>${p['Sub Category']}</em>
        </div>
      `).join('');
      suggestionsContainer.style.display = 'block';

      // Add click event to suggestions
      document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          searchInput.value = item.querySelector('strong').textContent;
          suggestionsContainer.style.display = 'none';
          // Optionally trigger product load here if needed
        });
      });
    })
    .catch(() => {
      suggestionsContainer.innerHTML = '<div class="no-results">Error fetching products.</div>';
      suggestionsContainer.style.display = 'block';
    });
}

function showSuggestions(query) {
  if (!query) {
    suggestionsContainer.style.display = 'none';
    return;
  }

  fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(products => {
      if (!products.length) {
        suggestionsContainer.innerHTML = '<div class="no-results">No matching products found</div>';
        suggestionsContainer.style.display = 'block';
        return;
      }

      suggestionsContainer.innerHTML = products.map(p => `
        <div class="suggestion-item" data-id="${p.id}">
          <strong>${p.Title}</strong> - <em>${p['Sub Category']}</em>
        </div>
      `).join('');

      suggestionsContainer.style.display = 'block';

      document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          searchInput.value = item.querySelector('strong').textContent;
          suggestionsContainer.style.display = 'none';
          // Optionally trigger product load here if needed
        });
      });
    })
    .catch(() => {
      suggestionsContainer.innerHTML = '<div class="no-results">Error fetching suggestions.</div>';
      suggestionsContainer.style.display = 'block';
    });
}

// Hide suggestions if clicked outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    suggestionsContainer.style.display = 'none';
  }
});
