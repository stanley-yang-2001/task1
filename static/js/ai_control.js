// static/js/ai_control.js

// this is the code for communicating with AI for drone movement

export function switchTab(tab) {
  const motionPanel = document.getElementById("movementControls");
  const aiPanel = document.getElementById("aiControlPanel");

  const motionBtn = document.querySelector('button[onclick*="motion"]');
  const aiBtn = document.querySelector('button[onclick*="ai"]');

  if (tab === "motion") {
    motionPanel.style.display = "block";
    aiPanel.style.display = "none";
    motionBtn.classList.add("active");
    aiBtn.classList.remove("active");
  } else if (tab === "ai") {
    motionPanel.style.display = "none";
    aiPanel.style.display = "block";
    aiBtn.classList.add("active");
    motionBtn.classList.remove("active");
  }
}

export function submitAICommand() {
  const input = document.getElementById("aiCommandInput").value.trim();
  console.log("from ai_control.js: function submitAiCommand: ",input)
  const output = document.getElementById("aiResponse");
  output.textContent = "Sending command...";
  if (input && window.sendNLCommand) {
    window.sendNLCommand(input);            // sendNLCommand in mission_socket.js
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
