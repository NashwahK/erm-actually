// content.js

  const style = document.createElement('style');
style.textContent = `
  .fact-tooltip {
    position: absolute;
    background-color: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px;
    font-size: 14px;
    color: #111827;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    max-width: 300px;
    display: none;
    white-space: pre-line;
  }

  .fact-highlight {
    background-color:rgb(252, 245, 165);
    border-radius: 4px;
    padding: 2px 4px;
    cursor: pointer;
    position: relative;
  }

  .fact-tooltip a {
    color: #2563eb;
    text-decoration: underline;
  }
`;
document.head.appendChild(style);

const tooltipDiv = document.createElement("div");
tooltipDiv.className = "fact-tooltip";
document.body.appendChild(tooltipDiv);

async function checkClaim(sentence) {
  console.log("about to check claims for:", sentence);
  const apiKey = 'AIzaSyAExykXappCz3H7G1h038bPFEZEV06MwHY'; 

  const response = await fetch(
    `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(sentence)}&key=${apiKey}`
  );

  const data = await response.json();
  console.log("API response:", data);
  return data.claims || [];
}

async function checkForClaimsOnPage() {
  const paragraphs = document.querySelectorAll("p, blockquote");

  for (const element of paragraphs) {
    const originalHTML = element.innerHTML;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = originalHTML;
    const sentences = tempDiv.textContent.split(/(?<=[.?!])\s+/);

    let updatedHTML = originalHTML;

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 5) continue;

      try {
        const claims = await checkClaim(trimmed);

        if (claims.length > 0) {
          // Escape special characters for RegExp and build matcher
          const safeSentence = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          const reg = new RegExp(safeSentence, 'g');

          // Wrap matching sentence in highlight span
          updatedHTML = updatedHTML.replace(
            reg,
            `<span class="fact-highlight">${trimmed}</span>`
          );
        }
      } catch (err) {
        console.error("Fact Check API error:", err);
      }
    }

    const newElement = document.createElement(element.tagName);
    newElement.innerHTML = updatedHTML;
    element.replaceWith(newElement);
  }

  // Re-hook tooltips
  document.querySelectorAll(".fact-highlight").forEach(async (el) => {
    const claims = await checkClaim(el.textContent.trim());
    if (claims.length > 0) setupTooltip(el, claims);
  });
}


function setupTooltip(element, claims) {
  element.addEventListener("mouseenter", () => {
    tooltipDiv.textContent = "";

    const sourceList = document.createElement("div");
    sourceList.innerHTML = `
      <strong>⚠️ Claim flagged</strong><br/>
      <em>Top sources:</em><br/>
      ${claims
        .slice(0, 3)
        .map(
          (c) =>
            `<a href="${c.claimReview?.[0]?.url}" target="_blank">
              ${c.claimReview?.[0]?.publisher?.name || "Source"}
            </a><br/>`
        )
        .join("")}
    `;

    tooltipDiv.appendChild(sourceList);
    tooltipDiv.style.display = "block";

    const rect = element.getBoundingClientRect();
    tooltipDiv.style.top = `${rect.bottom + window.scrollY + 6}px`;
    tooltipDiv.style.left = `${rect.left + window.scrollX}px`;
  });

  element.addEventListener("mouseleave", () => {
    tooltipDiv.style.display = "none";
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "checkClaims") {
    checkForClaimsOnPage();
    sendResponse({ status: "done" });
  }
});