import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Logo, TileRow, DiffPill } from "@/components/RaddleUI";
import { LEVELS, DICTIONARY, differsByOne } from "@/lib/game";
import { toast } from "sonner";

export default function Play() {
  const { level } = useParams();
  const nav = useNavigate();
  const { user, markLevelComplete } = useAuth();
  const lv = useMemo(() => LEVELS.find((l) => l.n === Number(level)), [level]);

  const [chain, setChain] = useState(lv ? [lv.start] : []);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [hintClicks, setHintClicks] = useState(0);
  const [hintMsg, setHintMsg] = useState("Stuck? Pull a thread.");
  const [won, setWon] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef(null);

  // Unlock check
  useEffect(() => {
    if (!lv) { nav("/levels", { replace: true }); return; }
    if (lv.n > 1) {
      const prevCompleted = (user?.completed_levels || []).includes(lv.n - 1);
      if (!prevCompleted && !(user?.completed_levels || []).includes(lv.n)) {
        toast.error("Complete the previous level first.");
        nav("/levels", { replace: true });
        return;
      }
    }
    setChain([lv.start]);
    setValue("");
    setFeedback("");
    setFeedbackOk(false);
    setHintClicks(0);
    setHintMsg("Stuck? Pull a thread.");
    setWon(false);
    setTimeout(() => inputRef.current?.focus(), 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  if (!lv) return null;
  const current = chain[chain.length - 1];

  const submit = () => {
    if (won) return;
    const w = (value || "").trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(w)) {
      setFeedback("Four letters, please.");
      setFeedbackOk(false);
      setShakeKey((k) => k + 1);
      return;
    }
    if (w === current) {
      setFeedback("Same word — change one letter.");
      setFeedbackOk(false);
      setShakeKey((k) => k + 1);
      return;
    }
    if (!differsByOne(current, w)) {
      setFeedback(`Change exactly one letter from ${current}.`);
      setFeedbackOk(false);
      setShakeKey((k) => k + 1);
      return;
    }
    if (!DICTIONARY.has(w)) {
      setFeedback(`“${w}” isn't in our dictionary.`);
      setFeedbackOk(false);
      setShakeKey((k) => k + 1);
      return;
    }
    const next = [...chain, w];
    setChain(next);
    setValue("");
    setFeedback("");
    if (w === lv.target) {
      setWon(true);
      setFeedbackOk(true);
      setFeedback("Level complete!");
      markLevelComplete(lv.n).catch(() => {});
    } else {
      inputRef.current?.focus();
    }
  };

  const useHint = () => {
    if (won) return;
    const steps = lv.path.length - 1;
    const nextClicks = hintClicks + 1;
    if (nextClicks === 1) {
      setHintMsg(`Shortest path: ${steps} steps.`);
    } else if (nextClicks === 2) {
      const last2 = lv.path[lv.path.length - 2];
      setHintMsg(`Shortest path: ${steps} steps. Second-last word: ${last2}.`);
    } else if (nextClicks === 3 && steps >= 4) {
      const last2 = lv.path[lv.path.length - 2];
      const last3 = lv.path[lv.path.length - 3];
      setHintMsg(`Shortest path: ${steps} steps. Third-last: ${last3}, second-last: ${last2}.`);
    } else {
      return;
    }
    setHintClicks(nextClicks);
  };

  const hintLimitReached =
    (lv.path.length - 1 < 4 && hintClicks >= 2) || hintClicks >= 3;

  const undo = () => {
    if (chain.length <= 1 || won) return;
    setChain(chain.slice(0, -1));
    setFeedback("");
  };

  const restart = () => {
    setChain([lv.start]);
    setValue("");
    setFeedback("");
    setWon(false);
    setHintClicks(0);
    setHintMsg("Stuck? Pull a thread.");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const nextLevel = () => {
    if (lv.n >= 20) {
      toast.success("All 20 levels completed!");
      nav("/levels");
      return;
    }
    nav(`/play/${lv.n + 1}`);
  };

  return (
    <div className="min-h-screen px-5 py-8" data-testid="screen-play">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <Logo size="md" linkTo="/home" />
          <div className="flex gap-2">
            <Link to="/levels" className="btn-stitch ghost xs" data-testid="play-levels-btn">Levels</Link>
            <Link to="/home" className="btn-stitch ghost xs" data-testid="play-home-btn">Home</Link>
          </div>
        </header>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-display font-semibold text-2xl" data-testid="play-title">Level {lv.n}</h2>
            <DiffPill value={lv.difficulty} />
          </div>
          <div className="flex gap-2">
            <button className="btn-stitch ghost xs" onClick={undo} data-testid="play-undo-btn">Undo</button>
            <button className="btn-stitch ghost xs" onClick={restart} data-testid="play-restart-btn">Restart</button>
          </div>
        </div>

        <div className="paper-card p-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center mb-5" style={{ background: "var(--cream-deep)" }}>
          <div className="text-center">
            <div className="font-hand text-lg text-charcoal-soft mb-1">Start</div>
            <TileRow word={lv.start} target={lv.target} testId="play-start-tiles" />
          </div>
          <div className="text-center font-display text-3xl text-rose-deep sm:rotate-0 rotate-90">→</div>
          <div className="text-center">
            <div className="font-hand text-lg text-charcoal-soft mb-1">Target</div>
            <TileRow word={lv.target} target={lv.target} testId="play-target-tiles" />
          </div>
        </div>

        <div className="text-center" data-testid="play-current-row">
          <TileRow
            word={(value || current)}
            target={lv.target}
            active
            testId="play-current-tiles"
          />
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="mt-4 flex gap-3 items-center justify-center flex-wrap"
          >
            <input
              key={shakeKey}
              ref={inputRef}
              className={`input-stitch word w-56 ${shakeKey ? "shake" : ""}`}
              type="text"
              maxLength={4}
              autoCapitalize="characters"
              spellCheck={false}
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
              onKeyDown={(e) => { if (e.key === "Escape") setValue(""); }}
              placeholder="____"
              disabled={won}
              data-testid="play-word-input"
            />
            <button type="submit" className="btn-stitch sage sm" disabled={won} data-testid="play-submit-btn">Submit</button>
          </form>
          <div className={`mt-2 font-hand text-xl min-h-7 ${feedbackOk ? "text-sage-deep" : "text-rose-deep"}`} data-testid="play-feedback">
            {feedback}
          </div>
        </div>

        <div className="paper-card p-5 mt-5 flex flex-wrap items-center justify-between gap-3" data-testid="play-hint-panel">
          <div className="font-hand text-xl text-charcoal-soft" data-testid="play-hint-text" dangerouslySetInnerHTML={{ __html: highlightWords(hintMsg) }} />
          <button
            className="btn-stitch rose sm"
            onClick={useHint}
            disabled={won || hintLimitReached}
            data-testid="play-hint-btn"
          >
            {hintLimitReached ? "No more hints" : "Hint"}
          </button>
        </div>

        <div className="paper-card p-5 mt-5">
          <h4 className="font-hand text-xl text-charcoal-soft mb-2">Your path so far</h4>
          <div className="flex flex-wrap gap-2 items-center" data-testid="play-path-chain">
            {chain.map((w, i) => (
              <span key={`step-${i}`} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-muted-ink">→</span>}
                <span
                  className="font-display font-bold px-3 py-1.5 rounded-full border border-[var(--paper-line)] tracking-widest"
                  style={{ background: i === 0 ? "var(--butter)" : (w === lv.target ? "var(--sage)" : "var(--cream-deep)") }}
                >
                  {w}
                </span>
              </span>
            ))}
            {current !== lv.target && (
              <span className="inline-flex items-center gap-2">
                <span className="text-muted-ink">→</span>
                <span className="font-display font-bold px-3 py-1.5 rounded-full border border-[var(--paper-line)] tracking-widest bg-sage" style={{ background: "var(--sage)" }}>
                  {lv.target}
                </span>
              </span>
            )}
          </div>
        </div>

        {won && (
          <div className="mt-6 paper-card p-5 text-center" style={{ background: "var(--sage)" }} data-testid="play-win-card">
            <div className="font-display font-bold text-2xl">Level {lv.n} complete!</div>
            <div className="text-charcoal-soft mt-1 font-body">
              You used {chain.length - 1} step{chain.length - 1 === 1 ? "" : "s"} (par: {lv.path.length - 1}).
            </div>
            <div className="mt-4 flex justify-center gap-3 flex-wrap">
              <Link to="/levels" className="btn-stitch ghost sm" data-testid="play-win-levels-btn">All levels</Link>
              <button onClick={nextLevel} className="btn-stitch sage sm" data-testid="play-win-next-btn">
                {lv.n >= 20 ? "Finish" : "Next level →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function highlightWords(s) {
  // Wrap 4-letter ALL-CAPS words in a strong tag for color emphasis.
  if (!s) return "";
  return s.replace(/\b([A-Z]{4})\b/g, '<strong style="color: var(--rose-deep); letter-spacing: 0.15em">$1</strong>');
}
