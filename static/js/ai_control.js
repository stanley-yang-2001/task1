export function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  const index = tabId === "motionTab" ? 0 : 1;
  document.querySelectorAll(".tab-btn")[index].classList.add("active");
}

export function submitAICommand() {
  const input = document.getElementById("aiCommandInput").value.trim();
  const output = document.getElementById("aiResponseBox");
  output.textContent = "Sending command...";
  if (input && window.sendNLCommand) {
    window.sendNLCommand(input);
  } else {
    output.textContent = "Error: command not sent.";
  }
}

// Handle response from socket (optional)
export function setupAISocketHandlers(socket) {
  socket.on("mission_parsed", data => {
    document.getElementById("aiResponseBox").textContent =
      JSON.stringify(data, null, 2);
  });

  socket.on("mission_error", err => {
    document.getElementById("aiResponseBox").textContent = "Error: " + err;
  });
}