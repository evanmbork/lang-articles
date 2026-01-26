import { useEffect, useRef, useState } from "react";
import { generateArticle, getWordInfo, ttsSpeak } from "./api";
import "./styles.scss";

const LANGS = ["Ukrainian", "Italian", "Spanish", "French", "German", "Korean", "Japanese", "Chinese"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LENGTHS = ["short", "medium", "long"];

function tokenizeWithSpaces(text) {
  // Keeps spaces + punctuation so rendering looks identical.
  // tokens are things like "Hello", ",", " ", "world", "!"
  return text.match(/(\s+|[^\s]+)/g) || [];
}

function isWordToken(tok) {
  // Treat tokens with at least one letter as "word-like"
  return /[\p{L}]/u.test(tok);
}

function splitIntoSentences(text) {
  // Simple sentence split; good enough for context extraction
  return text.split(/(?<=[.!?…])\s+/);
}

function findSentenceForWord(article, clickedWord) {
  const sentences = splitIntoSentences(article);
  const lower = clickedWord.toLowerCase();
  for (const s of sentences) {
    if (s.toLowerCase().includes(lower)) return s;
  }
  // fallback: return first 200 chars
  return article.slice(0, 200);
}

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

  const [wordInfo, setWordInfo] = useState(null);
  const [wordInfoOpen, setWordInfoOpen] = useState(false);
  const [wordInfoLoading, setWordInfoLoading] = useState(false);
  const [wordAnchor, setWordAnchor] = useState({ x: 0, y: 0 });

  const [audioUrl, setAudioUrl] = useState("");
  const [ttsLoading, setTtsLoading] = useState(false);

  const wordCacheRef = useRef(new Map());

  async function onReadAloud() {
  if (!out?.article) return;
  setTtsLoading(true);
  try {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    // Read title + article (nice)
    const text = `${out.title}\n\n${out.article}`;
    const url = await ttsSpeak({ text, voice: "alloy" });
    setAudioUrl(url);
    // auto-play
    setTimeout(() => {
      const el = document.getElementById("tts-audio");
      if (el) el.play().catch(() => {});
    }, 0);
  } finally {
    setTtsLoading(false);
  }
  }

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
      pushHistory({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        settings: { language, level, topics, length, style, includeVocab, includeQuestions },
        output: data
      });

    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const HISTORY_KEY = "linguareader_history_v1";
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* empty */ }
  }, []);

  function pushHistory(item) {
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }

  function loadHistoryItem(item) {
    setLanguage(item.settings.language);
    setLevel(item.settings.level);
    setTopics(item.settings.topics);
    setLength(item.settings.length);
    setStyle(item.settings.style);
    setIncludeVocab(item.settings.includeVocab);
    setIncludeQuestions(item.settings.includeQuestions);
    setOut(item.output);
  }

  async function onWordClick(e, tok) {
  if (!out?.article) return;

  const word = tok.replace(/[^\p{L}\p{M}'’-]/gu, ""); // strip surrounding punctuation
  if (!word) return;

  const sentence = findSentenceForWord(out.article, word);
  const cacheKey = `${language}|${level}|${word}|${sentence}`;

  setWordAnchor({ x: e.clientX, y: e.clientY });
  setWordInfoOpen(true);

  const cached = wordCacheRef.current.get(cacheKey);
  if (cached) {
    setWordInfo(cached);
    return;
  }

  setWordInfoLoading(true);
  setWordInfo(null);
  try {
    const info = await getWordInfo({ language, level, word, sentence });
    wordCacheRef.current.set(cacheKey, info);
    setWordInfo(info);
  } catch (err) {
    setWordInfo({ surface: word, lemma: word, pos: "unknown", definition_en: "", morphology: {}, notes: err.message });
  } finally {
    setWordInfoLoading(false);
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

          <div className="history">
            <h3>History</h3>
            {history.length === 0 && <p className="muted">No saved articles yet.</p>}
            <ul>
              {history.map((h) => (
                <li key={h.id}>
                  <button className="link-btn" onClick={() => loadHistoryItem(h)}>
                    {new Date(h.createdAt).toLocaleString()} — {h.settings.language} {h.settings.level}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {error && <p className="error">{error}</p>}
        </section>

        <section className="card">
          <h2>Output</h2>

          {!out && !loading && <p className="muted">Choose settings and click Generate.</p>}

          {out && (
            <div className="output">
              <h3>{out.title}</h3>

              <button className="btn secondary no-print" onClick={() => window.print()} disabled={!out}>
                Export to PDF
              </button>

              <button className="btn secondary no-print" onClick={onReadAloud} disabled={!out || ttsLoading}>
                {ttsLoading ? "Generating audio..." : "Read it to me"}
              </button>

              {audioUrl && (
                <audio id="tts-audio" className="no-print" controls src={audioUrl} />
              )}

              <div className="article">
                {(out.article || "").split("\n").map((line, idx) => {
                  const tokens = tokenizeWithSpaces(line);
                  return (
                    <p key={idx}>
                      {tokens.map((tok, i) => {
                        if (!isWordToken(tok)) return <span key={i}>{tok}</span>;
                        return (
                          <span
                            key={i}
                            className="word"
                            onClick={(e) => onWordClick(e, tok)}
                            title="Click for info"
                          >
                            {tok}
                          </span>
                        );
                      })}
                    </p>
                  );
                })}
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

      {wordInfoOpen && (
  <div
    className="word-popover"
    style={{ left: wordAnchor.x + 12, top: wordAnchor.y + 12 }}
    onClick={(e) => e.stopPropagation()}
  >
    <div className="word-popover-header">
      <b>{wordInfo?.surface || "..."}</b>
      <button className="icon-btn" onClick={() => setWordInfoOpen(false)}>×</button>
    </div>

    {wordInfoLoading && <div className="muted">Looking it up…</div>}

    {!wordInfoLoading && wordInfo && (
      <div className="word-popover-body">
        <div><b>Lemma:</b> {wordInfo.lemma || "—"}</div>
        <div><b>POS:</b> {wordInfo.pos || "—"}</div>
        {wordInfo.definition_en ? <div><b>Definition:</b> {wordInfo.definition_en}</div> : null}

        {wordInfo?.morphology?.case && (
          <div><b>Case:</b> {wordInfo.morphology.case}</div>
        )}

        {wordInfo?.notes ? <div className="notes">{wordInfo.notes}</div> : null}
      </div>
    )}
  </div>
)}


      <footer className="footer">
        <p className="muted">Hack-week prototype: Vite + React + SCSS + Express + OpenAI</p>
      </footer>
    </div>
  );
}