// popup.js

document.getElementById("check-claims-btn").addEventListener("click", async () => {
    console.log("button was clicked");
  
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    // First, inject content script (in case it wasn't auto-injected)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  
    // Then send message
    chrome.tabs.sendMessage(tab.id, { action: "checkClaims" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError.message);
      } else {
        console.log("Message sent to content script. Response:", response);
      }
    });
  });
  document.addEventListener("DOMContentLoaded", function () {
    const dashboardBtn = document.getElementById("go-to-dashboard-btn");
    
    dashboardBtn.addEventListener("click", function () {
      window.location.href = 'dashboard.html';
    });
  });
  document.getElementById("go-to-dashboard-btn").addEventListener("click", () => {
    const dashboardPath = chrome.runtime.getURL("ui/dashboard.html");
    window.open(dashboardPath, "_blank");
  });
  
  
  
    