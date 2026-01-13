import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt({ language, level, topics, length, style, includeVocab, includeQuestions }) {
  return `
You are a helpful language tutor and writer.

Write an original article in ${language} at roughly ${level} reading level.
Topics/interests: ${topics || "general"}.
Length: ${length || "medium"}.
Style: ${style || "clear, engaging, natural"}.

Requirements:
- Output must be in ${language} (except vocab glosses if requested).
- Use vocabulary appropriate to ${level}. Avoid overly advanced constructions.
- Use short paragraphs and a title.

If includeVocab=true, include a "Vocabulary" section with 10-15 key words/phrases from the article + English gloss.
If includeQuestions=true, include 5 comprehension questions in ${language}.

Return as JSON with keys:
{ "title": "...", "article": "...", "vocabulary": [{"term":"...","gloss":"..."}], "questions":[...] }
If vocab/questions not requested, return empty arrays.
`.trim();
}

app.post("/api/generate", async (req, res) => {
  try {
    const { language, level, topics, length, style, includeVocab, includeQuestions } = req.body;

    const prompt = buildPrompt({
      language,
      level,
      topics,
      length,
      style,
      includeVocab,
      includeQuestions
    });

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Return valid JSON only. No markdown fences." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const text = response.choices?.[0]?.message?.content ?? "{}";

    // best-effort JSON parse
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { title: "", article: text, vocabulary: [], questions: [] };
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Generation failed" });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/wordinfo", async (req, res) => {
  try {
    const { language, word, sentence, level } = req.body;

    const prompt = `
You are a linguistics helper for language learners.

Given:
- language: ${language}
- learner level: ${level || "unknown"}
- clicked word: "${word}"
- sentence context: "${sentence}"

Return valid JSON only with:
{
  "surface": "...",
  "lemma": "...",
  "pos": "...",
  "definition_en": "...",
  "morphology": {
    "case": null | "nominative" | "genitive" | "dative" | "accusative" | "instrumental" | "locative" | "vocative",
    "number": null | "singular" | "plural",
    "gender": null | "masculine" | "feminine" | "neuter",
    "tense": null | "past" | "present" | "future",
    "aspect": null | "perfective" | "imperfective",
    "person": null | "1" | "2" | "3"
  },
  "notes": "1-2 short sentences for the learner"
}

Rules:
- If language is not Ukrainian or morphology is not applicable, keep fields as null.
- If the clicked token is punctuation or not a real word, still return JSON but set pos="punctuation" and definition_en="".
- If uncertain, be honest in notes and keep morphology fields null.
`.trim();

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Return valid JSON only. No markdown fences." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });

    const text = response.choices?.[0]?.message?.content ?? "{}";

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        surface: word,
        lemma: word,
        pos: "unknown",
        definition_en: "",
        morphology: { case: null, number: null, gender: null, tense: null, aspect: null, person: null },
        notes: "Could not parse model output."
      };
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "wordinfo failed" });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "alloy" } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }

    // OpenAI Audio Speech API: returns audio bytes (mp3 by default)
    const mp3 = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text.slice(0, 4000) // keep under limit
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "tts failed" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));