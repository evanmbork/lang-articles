import { useState } from "react";
import { generateArticle } from "./api";
import "./styles.scss";

const LANGS = ["Ukrainian", "Italian", "Spanish", "French", "German"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LENGTHS = ["short", "medium", "long"];

export default function App() {
  const [language, setLanguage] = useState("Ukrainian");
  const [level, setLevel] = useState("B1");
  const [topics, setTopics] = useState("startups, travel, running");
  const [length, setLength] = useState("medium");
  const [style, setStyle] = useState("simple, vivid, natural");
  const [includeVocab, setIncludeVocab] = useState(true);
  const [includeQuestions, setIncludeQuestions] = useState(true);

  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);
  const [error, setError] = useState("");

  async function onGenerate() {
    setError("");
    setLoading(true);
    setOut(null);
    try {
      const data = await generateArticle({
        language,
        level,
        topics,
        length,
        style,
        includeVocab,
        includeQuestions
      });
      setOut(data);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>LinguaReader</h1>
        <p>Generate custom reading practice articles by language, topic, and level.</p>
      </header>

      <div className="grid">
        <section className="card">
          <h2>Settings</h2>

          <label>
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>

          <label>
            Level
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((lv) => (
                <option key={lv} value={lv}>{lv}</option>
              ))}
            </select>
          </label>

          <label>
            Topics (comma-separated)
            <input value={topics} onChange={(e) => setTopics(e.target.value)} />
          </label>

          <label>
            Length
            <select value={length} onChange={(e) => setLength(e.target.value)}>
              {LENGTHS.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>

          <label>
            Style notes
            <input value={style} onChange={(e) => setStyle(e.target.value)} />
          </label>

          <div className="checks">
            <label className="check">
              <input type="checkbox" checked={includeVocab} onChange={(e) => setIncludeVocab(e.target.checked)} />
              Include vocabulary list
            </label>
            <label className="check">
              <input type="checkbox" checked={includeQuestions} onChange={(e) => setIncludeQuestions(e.target.checked)} />
              Include comprehension questions
            </label>
          </div>

          <button className="btn" onClick={onGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </button>

          {error && <p className="error">{error}</p>}
        </section>

        <section className="card">
          <h2>Output</h2>

          {!out && !loading && <p className="muted">Choose settings and click Generate.</p>}

          {out && (
            <div className="output">
              <h3>{out.title}</h3>
              <div className="article">
                {(out.article || "").split("\n").map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>

              {out.vocabulary?.length > 0 && (
                <>
                  <h4>Vocabulary</h4>
                  <ul>
                    {out.vocabulary.map((v, i) => (
                      <li key={i}>
                        <b>{v.term}</b> — {v.gloss}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {out.questions?.length > 0 && (
                <>
                  <h4>Questions</h4>
                  <ol>
                    {out.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      <footer className="footer">
        <p className="muted">Hack-week prototype: Vite + React + SCSS + Express + OpenAI</p>
      </footer>
    </div>
  );
}