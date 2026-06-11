import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiClient, formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Logo, TileRow } from "@/components/RaddleUI";
import { differsByOne, DICTIONARY } from "@/lib/game";
import { toast } from "sonner";

const POLL_MS = 1500;

export default function BattleRoom() {
  const { code } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [state, setState] = useState(null);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [hintText, setHintText] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [timerSec, setTimerSec] = useState(60);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  // initial fetch + polling
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const { data } = await apiClient.get(`/rooms/${code}`);
        if (!stopped) setState(data);
      } catch (e) {
        if (!stopped) {
          toast.error(formatApiError(e));
          nav("/battle");
        }
      }
    };
    tick();
    pollRef.current = setInterval(tick, POLL_MS);
    return () => { stopped = true; if (pollRef.current) clearInterval(pollRef.current); };
  }, [code, nav]);

  // local 1-second timer driven by server-provided round_started_at
  useEffect(() => {
    const id = setInterval(() => {
      if (!state) return;
      const round = state.your_round;
      if (round >= 3) { setTimerSec(0); return; }
      const startedAt = state.round_started_at?.[round];
      if (!startedAt) { setTimerSec(60); return; }
      // align with server-provided "now_ts" snapshot at last poll
      // approximate current ts: state.now_ts + (Date.now()/1000 - lastFetchClient)
      const remaining = Math.max(0, Math.ceil(60 - (Date.now() / 1000 - startedAt + (state._clientSkew || 0))));
      setTimerSec(remaining);
    }, 250);
    return () => clearInterval(id);
  }, [state]);

  // compute client skew on state change
  useEffect(() => {
    if (state && state.now_ts) {
      const skew = state.now_ts - (Date.now() / 1000);
      // mutate via setState to keep skew
      setState((s) => (s ? { ...s, _clientSkew: skew } : s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.now_ts]);

  useEffect(() => {
    if (state?.status === "active" && state.your_round < 3) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [state?.your_round, state?.status]);

  if (!state) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="font-hand text-xl text-charcoal-soft">loading room…</div>
      </div>
    );
  }

  const isHost = state.your_role === "host";
  const myName = isHost ? state.host_username : state.guest_username;
  const oppName = state.opponent_username;
  const currentPuzzle = state.current_puzzle;
  const yourChain = state.your_chain || [];
  const yourCurrentWord = yourChain[yourChain.length - 1] || (currentPuzzle ? currentPuzzle.start : "");
  const isFinishedAllRounds = state.your_round >= 3;
  const matchOver = state.status === "finished";

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const submit = async () => {
    if (matchOver || isFinishedAllRounds) return;
    if (state.status !== "active") return;
    const w = (value || "").trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(w)) { setStatus("Four letters."); setShakeKey((k) => k + 1); return; }
    const prev = yourCurrentWord;
    if (w === prev) { setStatus("Same word — change one letter."); setShakeKey((k) => k + 1); return; }
    if (!differsByOne(prev, w)) { setStatus(`Change one letter from ${prev}.`); setShakeKey((k) => k + 1); return; }
    if (!DICTIONARY.has(w)) { setStatus(`“${w}” isn't in our dictionary.`); setShakeKey((k) => k + 1); return; }
    try {
      const { data } = await apiClient.post(`/rooms/${code}/move`, { word: w });
      setState(data);
      setValue("");
      setStatus("");
    } catch (e) {
      setStatus(formatApiError(e));
      setShakeKey((k) => k + 1);
    }
  };

  const useHint = async () => {
    if (!state.your_hint_unlocked) return;
    try {
      const { data } = await apiClient.post(`/rooms/${code}/hint`);
      setHintText(`Shortest: ${data.steps} · 2nd-last: ${data.second_last}`);
    } catch (e) {
      setStatus(formatApiError(e));
    }
  };

  const leave = async () => {
    try { await apiClient.post(`/rooms/${code}/leave`); } catch {}
    nav("/home");
  };

  // Opponent progress meter (NO words, just stats)
  const oppMeter = () => {
    if (!oppName) return "Waiting for opponent to join…";
    if (state.opponent_finished) return `${oppName} finished all 3 rounds.`;
    const oppRound = state.opponent_round + 1; // 1-based
    const oppWords = Math.max(0, state.opponent_words - 1); // exclude start word
    const oppScore = state.opponent_score;
    return `${oppName} · Round ${Math.min(oppRound, 3)}/3 · ${oppWords} word${oppWords === 1 ? "" : "s"} typed · ${oppScore} won`;
  };

  return (
    <div className="min-h-screen px-5 py-6" data-testid="screen-battle-room">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-5">
          <Logo size="md" linkTo="/home" />
          <button className="btn-stitch ghost xs" onClick={leave} data-testid="room-quit-btn">Quit match</button>
        </header>

        {/* Top bar */}
        <div className="paper-card p-4 mb-4 flex flex-wrap items-center gap-3 justify-between" data-testid="room-topbar">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="font-display font-bold text-lg" data-testid="room-code-label">
              Room <span className="tracking-widest text-rose-deep">{state.code}</span>
            </div>
            <button
              className="btn-stitch ghost xs"
              onClick={copyCode}
              data-testid="room-copy-code-btn"
            >
              {copied ? "Copied!" : "Copy code"}
            </button>
            <div className="text-charcoal-soft font-body text-sm">
              Round <span className="font-bold text-charcoal">{Math.min(state.your_round + 1, 3)}</span> of 3 · your score <span className="font-bold text-sage-deep">{state.your_score}</span>
            </div>
          </div>
          <div
            className={`font-display font-bold text-2xl px-4 py-1 rounded-xl border-2 border-[var(--charcoal)] ${timerSec <= 10 ? "bg-rose-paper text-[var(--cream-soft)]" : timerSec <= 20 ? "bg-butter" : "bg-cream-deep"}`}
            data-testid="room-timer"
            style={timerSec <= 10 ? { background: "var(--rose)", color: "var(--cream-soft)" } : timerSec <= 20 ? { background: "var(--butter)" } : { background: "var(--cream-deep)" }}
          >
            {state.status === "waiting" ? "--" : `${timerSec}s`}
          </div>
        </div>

        {/* Waiting state */}
        {state.status === "waiting" && (
          <div className="paper-card p-7 text-center" data-testid="room-waiting">
            <div className="font-hand text-2xl text-rose-deep">Share this code with your friend</div>
            <div className="mt-4 font-display font-bold tracking-[0.3em]" style={{ fontSize: "3.4rem", color: "var(--charcoal)" }} data-testid="room-big-code">
              {state.code}
            </div>
            <p className="text-charcoal-soft mt-4 font-body">
              They open <span className="font-semibold text-charcoal">RAddle</span>, sign in, click <span className="font-semibold text-charcoal">One vs One → Join</span>, enter this code, and you both start.
            </p>
            <button className="btn-stitch rose mt-5" onClick={copyCode} data-testid="room-waiting-copy">
              {copied ? "Copied to clipboard!" : "Copy 6-digit code"}
            </button>
          </div>
        )}

        {/* Match in progress / finished */}
        {state.status !== "waiting" && (
          <>
            <div className="paper-card p-5 mb-4" data-testid="room-opponent-meter">
              <div className="font-hand text-xl text-charcoal-soft">opponent</div>
              <div className="font-display font-semibold text-lg mt-1" data-testid="room-opponent-text">
                {oppMeter()}
              </div>
              <div className="flex gap-1 mt-2" aria-label="opponent solved rounds">
                {[0, 1, 2].map((r) => (
                  <span
                    key={r}
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: state.opponent_solved_rounds?.includes(r) ? "var(--sage-deep)" : "var(--cream-deep)",
                      border: "1px solid var(--paper-line)",
                    }}
                    data-testid={`room-opp-round-${r}`}
                  />
                ))}
              </div>
            </div>

            {!matchOver && !isFinishedAllRounds && currentPuzzle && (
              <div className="paper-card p-5" data-testid="room-your-area">
                <div className="text-center font-hand text-xl text-charcoal-soft mb-2">your puzzle</div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center" style={{ background: "var(--cream-deep)", padding: 14, borderRadius: 14 }}>
                  <div className="text-center">
                    <div className="font-hand text-base text-charcoal-soft mb-1">Start</div>
                    <TileRow word={currentPuzzle.start} target={currentPuzzle.target} size="sm" testId="room-start-tiles" />
                  </div>
                  <div className="text-center font-display text-2xl text-rose-deep">→</div>
                  <div className="text-center">
                    <div className="font-hand text-base text-charcoal-soft mb-1">Target</div>
                    <TileRow word={currentPuzzle.target} target={currentPuzzle.target} size="sm" testId="room-target-tiles" />
                  </div>
                </div>

                <div className="text-center mt-5">
                  <TileRow
                    word={value || yourCurrentWord}
                    target={currentPuzzle.target}
                    active
                    testId="room-current-tiles"
                  />
                  <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-3 flex gap-3 justify-center items-center flex-wrap">
                    <input
                      key={shakeKey}
                      ref={inputRef}
                      className={`input-stitch word w-52 ${shakeKey ? "shake" : ""}`}
                      type="text"
                      maxLength={4}
                      autoCapitalize="characters"
                      spellCheck={false}
                      autoComplete="off"
                      value={value}
                      onChange={(e) => setValue(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
                      placeholder="____"
                      data-testid="room-word-input"
                    />
                    <button type="submit" className="btn-stitch sage sm" data-testid="room-submit-btn">Submit</button>
                  </form>
                  <div className="mt-2 font-hand text-lg text-rose-deep min-h-7" data-testid="room-status">{status}</div>
                </div>

                <div className="paper-card p-4 mt-4 flex justify-between items-center gap-3 flex-wrap" style={{ background: "var(--cream-deep)" }}>
                  <div className="font-hand text-lg text-charcoal-soft min-h-6" data-testid="room-hint-text">
                    {hintText || (state.your_hint_unlocked ? "Hint unlocked!" : "Hint will unlock if your opponent solves first, or the timer hits zero.")}
                  </div>
                  <button
                    className="btn-stitch rose xs"
                    onClick={useHint}
                    disabled={!state.your_hint_unlocked || (state.your_hint_used_rounds || []).includes(state.your_round)}
                    data-testid="room-hint-btn"
                  >
                    {(state.your_hint_used_rounds || []).includes(state.your_round) ? "Hint used" : (state.your_hint_unlocked ? "Use hint" : "Hint (locked)")}
                  </button>
                </div>

                <div className="mt-4">
                  <div className="font-hand text-base text-charcoal-soft mb-1">your chain</div>
                  <div className="flex flex-wrap gap-1.5 items-center" data-testid="room-your-chain">
                    {yourChain.map((w, i) => (
                      <span
                        key={i}
                        className="font-display font-bold px-2.5 py-1 rounded-lg border border-[var(--paper-line)] tracking-wider text-sm"
                        style={{ background: i === 0 ? "var(--butter)" : (w === currentPuzzle.target ? "var(--sage)" : "var(--cream-deep)") }}
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isFinishedAllRounds && !matchOver && (
              <div className="paper-card p-7 text-center" data-testid="room-you-done">
                <div className="font-display font-bold text-2xl text-sage-deep">You're done!</div>
                <div className="text-charcoal-soft font-body mt-2">
                  Waiting for {oppName} to finish their rounds…
                </div>
              </div>
            )}

            {matchOver && (
              <div className="paper-card p-7 text-center" data-testid="room-match-over" style={{ background: "var(--cream-soft)" }}>
                <span className="eyebrow">match over</span>
                <div className="mt-3 font-display font-bold text-3xl" data-testid="room-match-result">
                  {state.winner === "tie"
                    ? "A tie!"
                    : (state.winner === state.your_role)
                      ? `${myName} wins! 🎉`
                      : `${oppName} wins.`}
                </div>
                <div className="text-charcoal-soft font-body mt-3 text-lg">
                  Final score · <span className="font-bold text-charcoal">{myName}</span> {state.your_score} — {state.opponent_score} <span className="font-bold text-charcoal">{oppName}</span>
                </div>
                <div className="mt-5 flex justify-center gap-3 flex-wrap">
                  <Link to="/home" className="btn-stitch ghost sm" data-testid="room-result-home-btn">Home</Link>
                  <Link to="/battle" className="btn-stitch sage sm" data-testid="room-result-rematch-btn">Play again</Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
