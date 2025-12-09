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

// ======= Dyslexia-Friendly Focus Ruler =======
// Creates a horizontal ruler that follows the cursor to help with reading focus
// Only active when toggle is enabled in popup
let focusRulerEnabled = false;
let ruler = null;
let isVisible = false;
let rafId = null;
let mousemoveHandler = null;
let mouseleaveHandler = null;

// Get the line height at cursor position for better alignment
function getLineHeightAtPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  if (!element) return 1.5;

  const computedStyle = window.getComputedStyle(element);
  const lineHeight = parseFloat(computedStyle.lineHeight);
  const fontSize = parseFloat(computedStyle.fontSize);

  // Return line height in pixels, default to 1.5em if not valid
  return isNaN(lineHeight) ? fontSize * 1.5 : lineHeight;
}

// Update ruler position smoothly
function updateRulerPosition(e) {
  if (!focusRulerEnabled || !ruler) return;

  if (rafId) {
    cancelAnimationFrame(rafId);
  }

  rafId = requestAnimationFrame(() => {
    if (!focusRulerEnabled || !ruler) return;

    const y = e.clientY;
    const lineHeight = getLineHeightAtPoint(e.clientX, y);
    
    // Position ruler centered on cursor with line height (ruler is 3em, so center it)
    ruler.style.top = `${y - 1.5 * lineHeight}px`;
    
    // Show ruler when over text content (not over images, buttons, etc.)
    const target = e.target;
    const isTextContent = target && (
      target.tagName === 'P' ||
      target.tagName === 'SPAN' ||
      target.tagName === 'DIV' ||
      target.tagName === 'LI' ||
      target.tagName === 'H1' ||
      target.tagName === 'H2' ||
      target.tagName === 'H3' ||
      target.tagName === 'H4' ||
      target.tagName === 'H5' ||
      target.tagName === 'H6' ||
      target.tagName === 'A' ||
      (target.nodeType === Node.TEXT_NODE && target.parentElement)
    );

    // Don't show over interactive elements or extension overlays
    const isInteractive = target && (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('.lucid-card') ||
      target.closest('#lucid-focus-ruler')
    );

    if (isTextContent && !isInteractive && !isVisible) {
      ruler.classList.add('visible');
      isVisible = true;
    } else if ((!isTextContent || isInteractive) && isVisible) {
      ruler.classList.remove('visible');
      isVisible = false;
    }
  });
}

// Enable focus ruler functionality
function enableFocusRuler() {
  if (focusRulerEnabled) return; // Already enabled

  focusRulerEnabled = true;

  // Create the ruler element if it doesn't exist
  if (!ruler) {
    ruler = document.createElement("div");
    ruler.id = "lucid-focus-ruler";
    document.body.appendChild(ruler);
  }

  // Add event listeners
  mousemoveHandler = (e) => updateRulerPosition(e);
  mouseleaveHandler = () => {
    if (isVisible && ruler) {
      ruler.classList.remove('visible');
      isVisible = false;
    }
  };

  document.addEventListener('mousemove', mousemoveHandler, { passive: true });
  document.addEventListener('mouseleave', mouseleaveHandler, { passive: true });
}

// Disable focus ruler functionality
function disableFocusRuler() {
  if (!focusRulerEnabled) return; // Already disabled

  focusRulerEnabled = false;

  // Remove event listeners
  if (mousemoveHandler) {
    document.removeEventListener('mousemove', mousemoveHandler);
    mousemoveHandler = null;
  }
  if (mouseleaveHandler) {
    document.removeEventListener('mouseleave', mouseleaveHandler);
    mouseleaveHandler = null;
  }

  // Hide and remove ruler
  if (ruler) {
    ruler.classList.remove('visible');
    isVisible = false;
  }

  // Cancel any pending animation frames
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// ======= Read Ease Mode =======
chrome.storage.sync.get(
  ["readEaseMode", "fontSize", "focusContrastMode", "focusRulerEnabled"],
  (data) => {
    if (data.readEaseMode) applyReadEaseMode(data.fontSize || 16);
    if (data.focusContrastMode) enableFocusContrast();
    if (data.focusRulerEnabled) enableFocusRuler();
  }
);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "updateReadEase") {
    const enabled = msg.enabled ?? true;
    if (enabled) applyReadEaseMode(msg.fontSize);
    else removeReadEaseMode();
  }

  if (msg.action === "updateFocusContrast") {
    const enabled = msg.enabled ?? false;
    if (enabled) enableFocusContrast();
    else disableFocusContrast();
  }

  if (msg.action === "updateFocusRuler") {
    const enabled = msg.enabled ?? false;
    if (enabled) enableFocusRuler();
    else disableFocusRuler();
  }
});

function applyReadEaseMode(fontSize = 16) {
  document.body.classList.add("read-ease-mode");
  document.documentElement.classList.add("read-ease-mode");
  setFontSize(fontSize);
}

function removeReadEaseMode() {
  document.body.classList.remove("read-ease-mode");
  document.documentElement.classList.remove("read-ease-mode");
}

function enableFocusContrast() {
  document.body.classList.add("focus-contrast-mode");
  document.documentElement.classList.add("focus-contrast-mode");
}

function disableFocusContrast() {
  document.body.classList.remove("focus-contrast-mode");
  document.documentElement.classList.remove("focus-contrast-mode");
}

function setFontSize(fontSize = 16) {
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

    // Truncate extract to first 2 sentences
    let truncatedExtract = data.extract || "No description available.";
    if (data.extract) {
      const sentences = data.extract.split(".");
      if (sentences.length >= 2) {
        truncatedExtract = sentences[0].trim() + ". " + sentences[1].trim() + ".";
      } else if (sentences.length === 1 && sentences[0].trim()) {
        truncatedExtract = sentences[0].trim() + ".";
      }
    }

    let html = `
            <strong>${data.title || word}</strong>
            <p>${truncatedExtract}</p>
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