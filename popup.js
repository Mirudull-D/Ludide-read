const toggle = document.getElementById("read-ease-toggle");
const fontSlider = document.getElementById("font-size-slider");
const fontValue = document.getElementById("font-size-value");

let fontTimeout;

// Load saved settings
chrome.storage.sync.get(["readEaseMode", "fontSize"], (data) => {
  toggle.checked = data.readEaseMode || false;
  fontSlider.value = data.fontSize || 16;
  fontValue.textContent = `${fontSlider.value}px`;
  applySettings();
});

// Toggle event
toggle.addEventListener("change", applySettings);

// Slider input with debounce
fontSlider.addEventListener("input", () => {
  fontValue.textContent = `${fontSlider.value}px`;
  clearTimeout(fontTimeout);
  fontTimeout = setTimeout(applySettings, 200);
});

function applySettings() {
  const readEaseMode = toggle.checked;
  const fontSize = fontSlider.value;

  chrome.storage.sync.set({ readEaseMode, fontSize });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (mode, size) => {
        if (mode) document.body.classList.add("read-ease-mode");
        else document.body.classList.remove("read-ease-mode");

        const elements = document.querySelectorAll("body, body *");
        elements.forEach(el => el.style.fontSize = size + "px");
      },
      args: [readEaseMode, fontSize]
    });
  });
}
