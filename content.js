// ======= Load Fonts =======
(function loadFonts() {
  const lexendLink = document.createElement("link");
  lexendLink.href =
    "https://fonts.googleapis.com/css2?family=Lexend&display=swap";
  lexendLink.rel = "stylesheet";
  document.head.appendChild(lexendLink);

  const openDyslexicLink = document.createElement("link");
  openDyslexicLink.href =
    "https://cdn.jsdelivr.net/gh/antijingoist/open-dyslexic@0.1.1/open-dyslexic.css";
  openDyslexicLink.rel = "stylesheet";
  document.head.appendChild(openDyslexicLink);
})();

// ======= Read Ease Mode =======
chrome.storage.sync.get(["readEaseMode", "fontSize"], (data) => {
  if (data.readEaseMode) applyReadEaseMode(data.fontSize || 16);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "updateReadEase") {
    applyReadEaseMode(msg.fontSize);
  }
});

function applyReadEaseMode(fontSize) {
  document.body.classList.add("read-ease-mode");
  const elements = document.querySelectorAll("body, body *");
  elements.forEach((el) => (el.style.fontSize = fontSize + "px"));
}

// ======= Reading Lens =======
document.addEventListener("mouseup", () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText && selectedText.split(" ").length > 1)
    showReadingLens(selectedText);
});

function showReadingLens(text) {
  const lensId = "lucid-lens";
  const existing = document.getElementById(lensId);
  if (existing) existing.remove();

  const lens = document.createElement("div");
  lens.id = lensId;
  lens.className = "lucid-card";
  lens.innerHTML = `<div>${text}</div>`;
  document.body.appendChild(lens);

  const selection = window.getSelection();
  if (selection.rangeCount === 0) return;
  const rect = selection.getRangeAt(0).getBoundingClientRect();

  lens.style.position = "absolute";
  lens.style.top = `${rect.bottom + window.scrollY + 5}px`;
  lens.style.left = `${rect.left + window.scrollX}px`;
  lens.style.zIndex = 99999;
}

// ======= Audio Player =======
function playBase64Audio(base64, mimeType = "audio/mpeg") {
  const audio = new Audio(`data:${mimeType};base64,${base64}`);
  audio.play();
}

// ======= Word-click Wikipedia Popup + TTS =======
document.addEventListener("click", async (e) => {
  const validTags = ["P", "SPAN", "LI", "H1", "H2", "H3", "H4"];
  if (!validTags.includes(e.target.tagName)) return;
  if (["BUTTON", "A"].includes(e.target.tagName)) return;

  const selection = window.getSelection();
  const word = selection.toString().trim() || e.target.innerText.trim();
  if (!word || /\s/.test(word) || word.length < 2) return;

  // Remove previous card
  const oldCard = document.getElementById("lucid-word-card");
  if (oldCard) oldCard.remove();

  const card = document.createElement("div");
  card.id = "lucid-word-card";
  card.className = "lucid-card";
  card.innerHTML = `<div>Loading...</div>`;
  document.body.appendChild(card);

  // Position
  const rect = e.target.getBoundingClientRect();
  card.style.position = "absolute";
  card.style.top = `${rect.bottom + window.scrollY + 5}px`;
  card.style.left = `${rect.left + window.scrollX}px`;
  card.style.zIndex = 99999;

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        word
      )}`
    );

    if (!response.ok) throw new Error("No page found");
    const data = await response.json();

    if (data.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found")
      throw new Error("No page found");

    let html = `
            <strong>${data.title || word}</strong>
            <p>${data.extract || "No description available."}</p>
            <p style="margin-top:10px;font-size:14px;color:#888;">
                Generating audio...
            </p>
        `;

    if (data.thumbnail && data.thumbnail.source) {
      html += `
                <div style="margin-top: 10px;">
                    <img src="${data.thumbnail.source}" alt="Image" 
                    style="max-width: 100%; border-radius: 8px; display: block;">
                </div>
            `;
    }

    card.innerHTML = html;

    // ===== Deepgram TTS request =====
    chrome.runtime.sendMessage(
      {
        action: "ttsWordExplain",
        text: `${data.title}. ${data.extract}`,
      },
      (response) => {
        if (!response || response.error) {
          card.innerHTML += `<p style="color:red;">Audio unavailable</p>`;
          return;
        }

        // Play immediately
        playBase64Audio(response.base64, response.mime);

        // Add replay button
        card.innerHTML += `
                <button id="play-audio-btn" 
                    style="margin-top:10px;padding:6px 12px;
                    border-radius:6px;border:none;background:#4a7aff;
                    color:white;cursor:pointer;">
                    ▶️ Play Again
                </button>`;

        document.getElementById("play-audio-btn").onclick = () =>
          playBase64Audio(response.base64, response.mime);
      }
    );
  } catch (err) {
    card.innerHTML = `<p>No information found.</p>`;
  }

  // Close when clicking outside
  const handleClickOutside = (event) => {
    if (!card.contains(event.target) && event.target !== e.target) {
      card.remove();
      document.removeEventListener("click", handleClickOutside);
    }
  };
  document.addEventListener("click", handleClickOutside);
});
