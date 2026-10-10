import { useCallback, useEffect, useRef, useState } from "react";
import { ToneAudioEngine } from "./audio/AudioEngine";
import type { AudioEngine } from "./audio/AudioEngine";
import { DEFINITIONS, DIFFICULTIES, MODES } from "./domain/chords";
import type { Difficulty, Mode } from "./domain/chords";
import { generateQuestions, QUESTION_COUNT, summarize } from "./domain/quiz";
import type { Attempt, Question, SessionResult } from "./domain/quiz";
import { loadResults, saveResult } from "./domain/storage";

const LEVEL_DETAILS = {
  beginner: "メジャー・マイナー",
  intermediate: "7th・9thまで",
  advanced: "dim・augまで",
};
const defaultEngine = () => new ToneAudioEngine();
export default function App({
  createAudioEngine = defaultEngine,
}: {
  createAudioEngine?: () => AudioEngine;
}) {
  const [screen, setScreen] = useState<"home" | "quiz" | "result">("home");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [mode, setMode] = useState<Mode>("practice");
  const [volume, setVolume] = useState(50);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [hints, setHints] = useState({ arpeggio: false, reference: false });
  const hintsRef = useRef(hints);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [history, setHistory] = useState(loadResults);
  const [audioError, setAudioError] = useState("");
  const [playStatus, setPlayStatus] = useState("");
  const engine = useRef<AudioEngine | null>(null);
  const interaction = useRef(0);
  const answered = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = questions[index];
  const currentAttempt = attempts[index];

  useEffect(() => {
    const audio = createAudioEngine();
    engine.current = audio;
    return () => {
      interaction.current++;
      audio.dispose();
      engine.current = null;
    };
  }, [createAudioEngine]);
  useEffect(() => {
    engine.current?.setVolume(volume / 100);
  }, [volume]);
  useEffect(() => {
    heading.current?.focus();
  }, [screen, index]);
  const stop = useCallback(() => {
    interaction.current++;
    engine.current?.stop();
    setPlayStatus("");
  }, []);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [stop]);

  const play = useCallback(
    async (kind: "chord" | "arpeggio" | "reference") => {
      if (
        !question ||
        !engine.current ||
        (kind !== "chord" && mode !== "practice")
      )
        return;
      const token = ++interaction.current;
      setAudioError("");
      try {
        const played = await (kind === "chord"
          ? engine.current.playChord(question.answer.midiNotes)
          : kind === "arpeggio"
            ? engine.current.playArpeggio(question.answer.midiNotes)
            : engine.current.playReference());
        if (!played || token !== interaction.current) return;
        if (kind !== "chord" && !answered.current) {
          hintsRef.current = { ...hintsRef.current, [kind]: true };
          setHints(hintsRef.current);
        }
        setPlayStatus(
          kind === "chord"
            ? "コードを再生しました。もう一度聴くこともできます。"
            : kind === "arpeggio"
              ? "低い音から順に再生しています。"
              : "基準音 C4 を再生しました。",
        );
      } catch {
        if (token === interaction.current)
          setAudioError(
            "音声を再生できませんでした。音量・ミュート設定を確認し、もう一度「コードを再生」を押してください。改善しない場合はページを再読み込みしてください。",
          );
      }
    },
    [question, mode],
  );
  const choose = useCallback(
    (selected: string) => {
      if (screen !== "quiz" || !question || answered.current) return;
      answered.current = true;
      stop();
      setAttempts((previous) => [
        ...previous,
        {
          questionId: question.id,
          selected,
          correct: selected === question.answer.displayName,
          usedArpeggioHint: hintsRef.current.arpeggio,
          usedReferenceTone: hintsRef.current.reference,
          difficulty,
          mode,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [screen, question, difficulty, mode, stop],
  );
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (
        screen !== "quiz" ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, button, a, [contenteditable="true"], [role="slider"]',
        )
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        void play("chord");
      }
      const option = question?.options[Number(event.key) - 1];
      if (/^[1-4]$/.test(event.key) && option) {
        event.preventDefault();
        choose(option.displayName);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [screen, question, choose, play]);
  function resetHints() {
    hintsRef.current = { arpeggio: false, reference: false };
    setHints(hintsRef.current);
    answered.current = false;
  }
  function start() {
    stop();
    setAudioError("");
    setQuestions(generateQuestions(difficulty));
    setIndex(0);
    setAttempts([]);
    setResult(null);
    resetHints();
    setScreen("quiz");
  }
  function next() {
    if (!currentAttempt) return;
    stop();
    setAudioError("");
    if (index === QUESTION_COUNT - 1) {
      const completed = summarize(attempts);
      setResult(completed);
      setHistory(saveResult(completed));
      setScreen("result");
    } else {
      resetHints();
      setIndex(index + 1);
    }
  }
  function home() {
    stop();
    setAudioError("");
    setHistory(loadResults());
    setScreen("home");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          href="#"
          onClick={(event) => {
            event.preventDefault();
            home();
          }}
          aria-label="Chord Notes 設定へ戻る"
        >
          <span className="brand-icon">♬</span> Chord Notes
          <span className="brand-caption">EAR TRAINING</span>
        </a>
        <span className="header-note">耳で見つける、音のかたち。</span>
      </header>
      <main>
        {screen === "home" && (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">A LITTLE PRACTICE, EVERY DAY</p>
                <h1 ref={heading} tabIndex={-1}>
                  聴くほどに、
                  <br />
                  コードがわかる。
                </h1>
                <p className="intro">
                  重なった音に、耳をすませて。
                  <br />
                  1セット10問、自分のペースで育てる音感。
                </p>
                <div className="hero-tags">
                  <span>12のルート音</span>
                  <span>3つの難易度</span>
                  <span>登録不要</span>
                </div>
              </div>
              <div className="sound-art" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="art-label">LISTEN. FEEL. FIND.</div>
                <div className="wave">
                  {[22, 42, 70, 98, 54, 82, 120, 82, 54, 98, 70, 42, 22].map(
                    (height, i) => (
                      <i key={i} style={{ height }} />
                    ),
                  )}
                </div>
                <span className="art-note note-one">C</span>
                <span className="art-note note-two">E</span>
                <span className="art-note note-three">G</span>
                <div className="art-bottom">THREE NOTES. ONE HARMONY.</div>
              </div>
            </section>
            <section className="settings card" aria-labelledby="settings-title">
              <div className="section-title">
                <div>
                  <p className="eyebrow">YOUR SESSION</p>
                  <h2 id="settings-title">今日のトレーニング</h2>
                </div>
                <span className="quiet">全10問</span>
              </div>
              <fieldset>
                <legend>
                  01 <span>難易度を選ぶ</span>
                </legend>
                <div className="level-grid">
                  {(Object.keys(DIFFICULTIES) as Difficulty[]).map(
                    (level, i) => (
                      <button
                        key={level}
                        className={`selection ${difficulty === level ? "selected" : ""}`}
                        aria-pressed={difficulty === level}
                        onClick={() => setDifficulty(level)}
                      >
                        <span className="selection-top">
                          <span className="level-mark">
                            {"▰".repeat(i + 1)}
                          </span>
                          <span className="radio-dot" />
                        </span>
                        <strong>{DIFFICULTIES[level]}</strong>
                        <small>{LEVEL_DETAILS[level]}</small>
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
              <fieldset>
                <legend>
                  02 <span>モードを選ぶ</span>
                </legend>
                <div className="mode-grid">
                  {(["practice", "test"] as Mode[]).map((item) => (
                    <button
                      key={item}
                      className={`selection mode-choice ${mode === item ? "selected" : ""}`}
                      aria-pressed={mode === item}
                      onClick={() => setMode(item)}
                    >
                      <span>
                        <strong>{MODES[item]}</strong>
                        <small>
                          {item === "practice"
                            ? "ヒントを使って、じっくり"
                            : "耳だけを頼りに、力だめし"}
                        </small>
                      </span>
                      <span className="radio-dot" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="settings-bottom">
                <p>
                  まずは初級・練習モードがおすすめ。
                  <br />
                  何度聴き直しても大丈夫です。
                </p>
                <button className="primary start" onClick={start}>
                  トレーニングをスタート <span>→</span>
                </button>
              </div>
            </section>
            <section className="history">
              <div className="section-title">
                <h2>これまでの記録</h2>
                <span className="quiet">このブラウザに保存</span>
              </div>
              {history.results.length === 0 ? (
                <p className="empty-history">
                  最初の10問から、あなたの記録がはじまります。
                </p>
              ) : (
                <ul>
                  {history.results.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <span>
                        <time dateTime={item.timestamp}>
                          {new Date(item.timestamp).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                        <small>
                          {DIFFICULTIES[item.difficulty]} · {MODES[item.mode]}
                          {item.mode === "practice"
                            ? ` · ヒント ${item.hintCount}問`
                            : ""}
                        </small>
                      </span>
                      <strong>
                        {item.correctCount}
                        <span> / {item.total}</span>
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        {screen === "quiz" && question && (
          <section className="quiz card">
            <div className="quiz-meta">
              <span className="badge">
                {DIFFICULTIES[difficulty]} · {MODES[mode]}モード
              </span>
              <button className="text-button" onClick={home}>
                設定へ戻る
              </button>
            </div>
            <div className="question-heading">
              <h1 ref={heading} tabIndex={-1}>
                このコードは？
              </h1>
              <span>
                <strong>{String(index + 1).padStart(2, "0")}</strong> / 10
              </span>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label="回答した問題数"
              aria-valuenow={attempts.length}
              aria-valuemin={0}
              aria-valuemax={10}
            >
              <div style={{ width: `${attempts.length * 10}%` }} />
            </div>
            <div className="listen-panel">
              <span className="listen-symbol" aria-hidden="true">
                ♫
              </span>
              <p>音の重なりを聴いてみましょう</p>
              <button
                className="primary play"
                onClick={() => void play("chord")}
              >
                ▶ コードを再生
              </button>
              <button className="text-button stop" onClick={stop}>
                ■ 再生停止
              </button>
            </div>
            {mode === "practice" && (
              <div className="hint-row">
                <button
                  className="secondary"
                  onClick={() => void play("arpeggio")}
                >
                  ヒント：低い音から順に再生{hints.arpeggio ? " ✓" : ""}
                </button>
                <button
                  className="secondary"
                  onClick={() => void play("reference")}
                >
                  基準音 C を再生{hints.reference ? " ✓" : ""}
                </button>
              </div>
            )}
            <p className="sr-only" role="status">
              {playStatus}
            </p>
            <p className="answer-label">
              コード名を選んでください
              <span>キー 1–4 で回答 / Space で再生</span>
            </p>
            <div className="answer-grid">
              {question.options.map((option, i) => {
                const isCorrect =
                  currentAttempt &&
                  option.displayName === question.answer.displayName;
                const isWrong =
                  currentAttempt &&
                  option.displayName === currentAttempt.selected &&
                  !currentAttempt.correct;
                return (
                  <button
                    key={option.displayName}
                    disabled={!!currentAttempt}
                    onClick={() => choose(option.displayName)}
                    className={`answer ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                  >
                    <span className="key-number">{i + 1}</span>
                    <strong>{option.displayName}</strong>
                    <span className="answer-mark">
                      {isCorrect ? "✓ 正解" : isWrong ? "× 選択" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            {currentAttempt && (
              <div
                className={`feedback ${currentAttempt.correct ? "success" : ""}`}
                role="status"
              >
                <p className="feedback-title">
                  {currentAttempt.correct ? "✓ 正解！" : "× 不正解"}{" "}
                  <span>正解は {question.answer.displayName}</span>
                </p>
                <p className="notes">
                  構成音：{question.answer.noteNames.join(" – ")}
                </p>
                <p>{DEFINITIONS[question.answer.quality].description}</p>
                <button className="primary" onClick={next}>
                  {index === 9 ? "結果を見る" : "次の問題へ"} →
                </button>
              </div>
            )}
          </section>
        )}
        {screen === "result" && result && (
          <section className="result card">
            <p className="eyebrow">SESSION COMPLETE</p>
            <h1 ref={heading} tabIndex={-1}>
              おつかれさまでした。
            </h1>
            <p>
              {DIFFICULTIES[result.difficulty]} · {MODES[result.mode]}モード /
              全10問
            </p>
            <div className="score">
              <strong>{result.correctCount}</strong>
              <span> / 10</span>
            </div>
            <p className="rate">
              正答率 {Math.round((result.correctCount / result.total) * 100)}%
            </p>
            <p>今日聴いた響きが、次の一歩に。</p>
            {result.mode === "practice" && (
              <div className="result-stats">
                <div>
                  <span>ヒント使用問題数</span>
                  <strong>
                    {result.hintCount}
                    <small> 問</small>
                  </strong>
                </div>
                <div>
                  <span>ヒント未使用正解数</span>
                  <strong>
                    {result.unassistedCorrectCount}
                    <small> 問</small>
                  </strong>
                </div>
              </div>
            )}
            <p className="quiet">
              {history.error
                ? "この結果は保存されていません。"
                : "学習記録をこのブラウザに保存しました。"}
            </p>
            <div className="result-actions">
              <button className="primary" onClick={start}>
                もう一度
              </button>
              <button className="secondary" onClick={home}>
                設定へ戻る
              </button>
            </div>
          </section>
        )}
        {audioError && (
          <p className="error" role="alert">
            {audioError}
          </p>
        )}
        {history.error && (
          <p className="error" role="alert">
            {history.error}
          </p>
        )}
        <div className="volume-bar">
          <label htmlFor="volume">
            音量 <span>{volume}%</span>
          </label>
          <input
            id="volume"
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
          <span className="quiet">小さめの音量から、心地よく。</span>
        </div>
      </main>
      <footer>
        <span>Chord Notes</span>
        <p>毎日の少しずつが、聴く力になる。</p>
        <span>LISTEN & LEARN</span>
      </footer>
    </div>
  );
}
