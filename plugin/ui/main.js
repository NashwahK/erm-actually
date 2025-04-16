// ui/main.js
console.log("UI page loaded");

// Dummy logic example for dashboard
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("total-claims")) {
    document.getElementById("total-claims").textContent = "18";
    document.getElementById("false-claims").textContent = "5";
    document.getElementById("top-source").textContent = "factcheck.org";
  }
});
