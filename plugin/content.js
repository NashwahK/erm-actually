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
    background-color: #fca5a5;
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
  const apiKey = 'AIzaSyAExykXappCz3H7G1h038bPFEZEV06MwHY'; // Replace with your actual key

  const response = await fetch(
    `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(sentence)}&key=${apiKey}`
  );

  const data = await response.json();
  return data.claims || [];
}

async function checkForClaimsOnPage() {
  const paragraphs = document.querySelectorAll("p");

  for (const p of paragraphs) {
    const sentences = p.textContent.split(/(?<=[.?!])\s+/);
    const newParagraph = document.createElement("p");

    for (const sentence of sentences) {
      if (sentence.trim().length < 5) {
        newParagraph.appendChild(document.createTextNode(sentence + " "));
        continue;
      }

      try {
        const claims = await checkClaim(sentence);

        if (claims.length > 0) {
          const span = document.createElement("span");
          span.textContent = sentence + " ";
          span.className = "fact-highlight";

          // On hover, show custom tooltip
          span.addEventListener("mouseenter", () => {
            tooltipDiv.textContent = ""; // clear

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

            const rect = span.getBoundingClientRect();
            tooltipDiv.style.top = `${rect.bottom + window.scrollY + 6}px`;
            tooltipDiv.style.left = `${rect.left + window.scrollX}px`;
          });

          span.addEventListener("mouseleave", () => {
            tooltipDiv.style.display = "none";
          });

          newParagraph.appendChild(span);
        } else {
          newParagraph.appendChild(document.createTextNode(sentence + " "));
        }
      } catch (err) {
        console.error("Fact Check API error:", err);
        newParagraph.appendChild(document.createTextNode(sentence + " "));
      }
    }

    p.replaceWith(newParagraph);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "checkClaims") {
    checkForClaimsOnPage();
    sendResponse({ status: "done" });
  }
});
