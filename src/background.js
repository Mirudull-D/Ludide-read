// ========= Retrieve Deepgram Settings =========
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["ttsApiKey", "ttsApiUrl"], (res) => {
      resolve({
        apiKey: res.ttsApiKey || "",
        ttsUrl:
          res.ttsApiUrl ||
          "https://api.deepgram.com/v1/speak?model=aura-asteria-en",
      });
    });
  });
}

// ========= ArrayBuffer → Base64 =========
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// ========= Deepgram TTS Call =========
async function callDeepgramTts({ apiKey, ttsUrl, text }) {
  if (!apiKey) throw new Error("Missing Deepgram API key");

  const res = await fetch(ttsUrl, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram error ${res.status}: ${err}`);
  }

  const blob = await res.blob();
  const buffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  return { base64, mime: blob.type };
}

// ========= Handle TTS Requests from content.js =========
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "ttsWordExplain") {
    processTTS(msg.text).then(sendResponse);
    return true; // keep channel open for async
  }
});

async function processTTS(text) {
  try {
    const settings = await getSettings();
    const result = await callDeepgramTts({
      apiKey: settings.apiKey,
      ttsUrl: settings.ttsUrl,
      text,
    });

    return {
      base64: result.base64,
      mime: result.mime,
    };
  } catch (err) {
    return { error: err.message };
  }
}