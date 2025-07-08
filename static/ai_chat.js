document.addEventListener("DOMContentLoaded", () => {
    const aiDevAskBtn = document.getElementById("aiDevAskBtn");
    const aiDevPrompt = document.getElementById("aiDevPrompt");
    const liveCodeEditor = document.getElementById("liveCodeEditor");
    const codeOutputFrame = document.getElementById("codeOutputFrame");
    const codeLanguage = document.getElementById("codeLanguage");

    // Function to load live code from drone_script.js into the viewer
    window.loadLiveCode = async () => {
        try {
            const response = await fetch("static/drone_script.js");
            if (response.ok) {
                const code = await response.text();
                const liveCodeViewer = document.getElementById("live-code-viewer");
                if (liveCodeViewer) {
                    // Clear any existing content and add the code
                    liveCodeViewer.innerHTML = `<code class="language-javascript">${escapeHtml(code)}</code>`;
                    
                    // Update line numbers
                    updateLineNumbers();
                    
                    // Try to highlight with Prism if available
                    if (typeof Prism !== 'undefined') {
                        const codeElement = liveCodeViewer.querySelector("code");
                        if (codeElement) {
                            Prism.highlightElement(codeElement);
                        }
                    }
                    
                    console.log("Live code loaded successfully");
                } else {
                    console.error("Live code viewer element not found");
                }
            } else {
                console.error("Failed to fetch drone_script.js:", response.status);
                const liveCodeViewer = document.getElementById("live-code-viewer");
                if (liveCodeViewer) {
                    liveCodeViewer.innerHTML = `<code style="color: #f44336;">Error loading drone_script.js - HTTP ${response.status}</code>`;
                }
            }
        } catch (error) {
            console.error("Error loading live code:", error);
            const liveCodeViewer = document.getElementById("live-code-viewer");
            if (liveCodeViewer) {
                liveCodeViewer.innerHTML = `<code style="color: #f44336;">Network error: ${error.message}</code>`;
            }
        }
    };

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Function to copy live code
    window.copyLiveCode = () => {
        const code = document.getElementById("live-code-viewer").textContent;
        navigator.clipboard.writeText(code).then(() => {
            alert("Code copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy code: ", err);
        });
    };

    // Function to format code (dummy for now)
    window.formatCode = () => {
        alert("Code formatting not yet implemented.");
    };

    // Function to clear editor
    window.clearCode = () => {
        liveCodeEditor.value = "";
        codeOutputFrame.contentDocument.body.innerHTML = "";
    };

    // Function to save code snippet (calls backend API)
    window.saveCodeSnippet = async () => {
        const code = liveCodeEditor.value.trim();
        try {
            const res = await fetch("/api/save_script", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            if (data.status === "saved") {
                alert("Code saved to drone_script.js ✅");
                loadLiveCode(); // Refresh viewer after saving
            } else {
                alert("Error saving: " + data.error);
            }
        } catch (err) {
            alert("Failed to save code: " + err.message);
        }
    };

    // Function to load example code (dummy for now)
    window.loadExample = () => {
        liveCodeEditor.value = `// Example JavaScript code\nfunction greet(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(greet("World"));`;
        codeLanguage.value = "javascript";
        alert("Example JavaScript loaded.");
    };

    // Function to run live code
    window.runLiveCode = () => {
        const code = liveCodeEditor.value;
        const outputFrame = document.getElementById("codeOutputFrame");
        const outputDoc = outputFrame.contentDocument || outputFrame.contentWindow.document;

        outputDoc.open();
        outputDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>body { font-family: monospace; white-space: pre-wrap; }</style>
            </head>
            <body>
                <script>
                    // Redirect console logs to the iframe body
                    const originalLog = console.log;
                    console.log = (...args) => {
                        originalLog(...args);
                        const p = document.createElement('p');
                        p.textContent = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
                        document.body.appendChild(p);
                    };
                    const originalError = console.error;
                    console.error = (...args) => {
                        originalError(...args);
                        const p = document.createElement('p');
                        p.style.color = 'red';
                        p.textContent = 'ERROR: ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
                        document.body.appendChild(p);
                    };
                    const originalWarn = console.warn;
                    console.warn = (...args) => {
                        originalWarn(...args);
                        const p = document.createElement('p');
                        p.style.color = 'orange';
                        p.textContent = 'WARNING: ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
                        document.body.appendChild(p);
                    };

                    try {
                        ${code}
                    } catch (e) {
                        console.error(e);
                    }
                </script>
            </body>
            </html>
        `);
        outputDoc.close();
    };

    // Function to debug code (placeholder)
    window.debugCode = () => {
        alert("Debugging functionality not yet implemented.");
    };

    // Function to share code (placeholder)
    window.shareCode = () => {
        alert("Sharing functionality not yet implemented.");
    };

    // Function to clear output
    window.clearOutput = () => {
        const outputFrame = document.getElementById("codeOutputFrame");
        const outputDoc = outputFrame.contentDocument || outputFrame.contentWindow.document;
        outputDoc.body.innerHTML = "";
    };

    // AI Code Assistant functions
    if (aiDevAskBtn) {
        aiDevAskBtn.addEventListener("click", async () => {
            const prompt = aiDevPrompt.value.trim();
            if (!prompt) {
                alert("Please enter a prompt for code generation!");
                return;
            }

            aiDevAskBtn.disabled = true;
            aiDevAskBtn.innerHTML = 
                `<i class="fas fa-spinner fa-spin"></i> Generating...`;

            try {
                const response = await fetch("/api/ai_code_generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt })
                });
                const data = await response.json();
                if (response.ok) {
                    liveCodeEditor.value = data.code;
                    codeLanguage.value = "javascript"; // Assuming JS for now
                } else {
                    alert("Error generating code: " + (data.error || "Unknown error"));
                }
            } catch (error) {
                alert("Network error: " + error.message);
            } finally {
                aiDevAskBtn.disabled = false;
                aiDevAskBtn.innerHTML = `<i class="fas fa-magic"></i> Generate Code`;
            }
        });
    }

    window.optimizeCode = async () => {
        const code = liveCodeEditor.value.trim();
        if (!code) {
            alert("No code to optimize!");
            return;
        }

        try {
            const response = await fetch("/api/ai_code_optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code })
            });
            const data = await response.json();
            if (response.ok) {
                liveCodeEditor.value = data.code;
                alert("Code optimized!");
            } else {
                alert("Error optimizing code: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            alert("Network error: " + error.message);
        }
    };

    window.explainCode = async () => {
        const code = liveCodeEditor.value.trim();
        if (!code) {
            alert("No code to explain!");
            return;
        }

        try {
            const response = await fetch("/api/ai_code_explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code })
            });
            const data = await response.json();
            if (response.ok) {
                alert("Code Explanation:\n" + data.explanation);
            } else {
                alert("Error explaining code: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            alert("Network error: " + error.message);
        }
    };

    // Line numbers for code viewer
    const updateLineNumbers = () => {
        const codeViewer = document.getElementById("live-code-viewer");
        const lineNumbers = document.getElementById("line-numbers");
        if (codeViewer && lineNumbers) {
            const codeElement = codeViewer.querySelector("code");
            if (codeElement) {
                const lineCount = codeElement.textContent.split("\n").length;
                lineNumbers.innerHTML = Array(lineCount).fill(0).map((_, i) => `<span>${i + 1}</span>`).join("");
            }
        }
    };

    // Initial load
    loadLiveCode();

    // Prism.js for syntax highlighting
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js";
    script.onload = () => {
        const javascriptLang = document.createElement("script");
        javascriptLang.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js";
        document.head.appendChild(javascriptLang);

        const cssLang = document.createElement("script");
        cssLang.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js";
        document.head.appendChild(cssLang);

        const htmlLang = document.createElement("script");
        htmlLang.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js";
        document.head.appendChild(htmlLang);

        const pythonLang = document.createElement("script");
        pythonLang.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js";
        document.head.appendChild(pythonLang);

        const cppLang = document.createElement("script");
        cppLang.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-c.min.js";
        document.head.appendChild(cppLang);

        // Add Prism CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css";
        document.head.appendChild(link);

        // Highlight on language change
        if (codeLanguage) {
            codeLanguage.addEventListener("change", () => {
                const codeElement = document.getElementById("live-code-viewer").querySelector("code");
                codeElement.className = `language-${codeLanguage.value}`;
                Prism.highlightElement(codeElement);
            });
        }
    };
    document.head.appendChild(script);

    // Ensure line numbers update when editor content changes
    if (liveCodeEditor) {
        liveCodeEditor.addEventListener("input", updateLineNumbers);
    }
});

// Toggle Code View function (compact/fullscreen)
window.toggleCodeView = () => {
    const codeWrapper = document.querySelector('.code-viewer-wrapper');
    const toggleBtn = document.querySelector('.toggle-view-btn');
    const toggleIcon = toggleBtn.querySelector('i');
    const toggleText = document.getElementById('view-toggle-text');
    
    if (codeWrapper.classList.contains('compact')) {
        // Switch to fullscreen
        codeWrapper.classList.remove('compact');
        codeWrapper.classList.add('fullscreen');
        toggleIcon.className = 'fas fa-compress';
        toggleText.textContent = 'Compact';
        toggleBtn.title = 'Switch to Compact View';
    } else {
        // Switch to compact
        codeWrapper.classList.remove('fullscreen');
        codeWrapper.classList.add('compact');
        toggleIcon.className = 'fas fa-expand';
        toggleText.textContent = 'Expand';
        toggleBtn.title = 'Switch to Fullscreen View';
    }
};

// Initialize with compact view
document.addEventListener('DOMContentLoaded', () => {
    const codeWrapper = document.querySelector('.code-viewer-wrapper');
    if (codeWrapper) {
        codeWrapper.classList.add('compact');
    }
});

