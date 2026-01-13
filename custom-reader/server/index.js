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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));