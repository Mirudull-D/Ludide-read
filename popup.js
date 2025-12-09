
const toggle = document.getElementById("read-ease-toggle");
const fontSlider = document.getElementById("font-size-slider");
const fontValue = document.getElementById("font-size-value");
const focusContrastToggle = document.getElementById("focus-contrast-toggle");

let fontTimeout;

// Load saved settings
chrome.storage.sync.get(["readEaseMode", "fontSize", "focusContrastMode"], (data) => {
  toggle.checked = data.readEaseMode || false;
  fontSlider.value = data.fontSize || 16;
  fontValue.textContent = `${fontSlider.value}px`;
  focusContrastToggle.checked = data.focusContrastMode || false;
  applySettings();
});

// Toggle events
toggle.addEventListener("change", applySettings);
focusContrastToggle.addEventListener("change", applySettings);

// Slider input with debounce
fontSlider.addEventListener("input", () => {
  fontValue.textContent = `${fontSlider.value}px`;
  clearTimeout(fontTimeout);
  fontTimeout = setTimeout(applySettings, 200);
});

function applySettings() {
  const readEaseMode = toggle.checked;
  const fontSize = fontSlider.value;
  const focusContrastMode = focusContrastToggle.checked;

  chrome.storage.sync.set({ readEaseMode, fontSize, focusContrastMode });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "updateReadEase",
      enabled: readEaseMode,
      fontSize,
    }, () => {
      // Ignore errors (content script might not be loaded on some pages)
      if (chrome.runtime.lastError) {
        console.log("Content script not available:", chrome.runtime.lastError.message);
      }
    });
    
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "updateFocusContrast",
      enabled: focusContrastMode,
    }, () => {
      // Ignore errors (content script might not be loaded on some pages)
      if (chrome.runtime.lastError) {
        console.log("Content script not available:", chrome.runtime.lastError.message);
      }
    });
  });
}