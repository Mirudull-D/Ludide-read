document.addEventListener("DOMContentLoaded", async () => {
  const ttsApiKeyInput = document.getElementById("ttsApiKey");
  const ttsApiUrlInput = document.getElementById("ttsApiUrl");
  const status = document.getElementById("status");

  // Load existing settings
  const data = await chrome.storage.local.get(["ttsApiKey", "ttsApiUrl"]);
  if (data.ttsApiKey) ttsApiKeyInput.value = data.ttsApiKey;
  if (data.ttsApiUrl) ttsApiUrlInput.value = data.ttsApiUrl;

  document.getElementById("save").onclick = async () => {
    await chrome.storage.local.set({
      ttsApiKey: ttsApiKeyInput.value.trim(),
      ttsApiUrl: ttsApiUrlInput.value.trim(),
    });
    status.textContent = "Saved!";
    setTimeout(() => (status.textContent = ""), 1500);
  };
});
