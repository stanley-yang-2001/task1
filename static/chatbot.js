async function sendPrompt() {
  const prompt = document.getElementById("user-prompt").value.trim();
  if (!prompt) return;

  const log = document.getElementById("chat-log");

  const userMsg = document.createElement("div");
  userMsg.innerHTML = `<strong>You:</strong> ${prompt}`;
  log.appendChild(userMsg);

  const botMsg = document.createElement("div");
  botMsg.innerHTML = `<strong>Bot:</strong> <span id="streaming-response">...</span>`;
  log.appendChild(botMsg);

  log.scrollTop = log.scrollHeight;
  document.getElementById("user-prompt").value = "";

  try {
    const responseStream = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const reader = responseStream.body.getReader();
    const decoder = new TextDecoder();
    const span = botMsg.querySelector("#streaming-response");
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      span.textContent = fullText;
      log.scrollTop = log.scrollHeight;
    }

    span.textContent = fullText.trim() || "(No response received.)";
  } catch (error) {
    botMsg.innerHTML = `<strong>Bot:</strong> <em style="color: red;">Error fetching response. Try again later.</em>`;
  }
}  

// Optional: handle Enter key to submit
const inputBox = document.getElementById("user-prompt");
if (inputBox) {
  inputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendPrompt();
    }
  });
}

async function performSearch() {
  const query = document.getElementById("search-query").value.trim();
  const resultsDiv = document.getElementById("search-results");
  resultsDiv.innerHTML = "<em>Searching...</em>";

  if (!query) {
    resultsDiv.innerHTML = "<em>Please enter a search term.</em>";
    return;
  }

  try {
    const res = await fetch("/search_sensors?q=" + encodeURIComponent(query));
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      resultsDiv.innerHTML = data.results.map(r => `<div><strong>${r.name}</strong>: ${r.description}</div>`).join("");
    } else {
      resultsDiv.innerHTML = "<em>No results found.</em>";
    }
  } catch (e) {
    resultsDiv.innerHTML = "<em>Error fetching search results.</em>";
    console.error(e);
  }
}

setTimeout(() => {
  if (!fullText.trim()) {
    span.textContent = "(No response received after timeout.)";
  }
}, 8000);


function toggleChatbot() {
  document.getElementById("chatbot").classList.remove("collapsed");
  document.getElementById("chat-toggle").style.display = "none";
}

function collapseChatbot() {
  document.getElementById("chatbot").classList.add("collapsed");
  document.getElementById("chat-toggle").style.display = "flex";
}