export async function generateArticle(payload) {
  const res = await fetch("http://localhost:3001/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export async function getWordInfo(payload) {
  const res = await fetch("http://localhost:3001/api/wordinfo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Word lookup failed");
  return res.json();
}

export async function ttsSpeak({ text, voice }) {
  const res = await fetch("http://localhost:3001/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice })
  });
  if (!res.ok) throw new Error("TTS failed");
  const blob = await res.blob();
  return URL.createObjectURL(blob); // mp3 url
}
