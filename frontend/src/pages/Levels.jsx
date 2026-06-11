import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Logo, DiffPill } from "@/components/RaddleUI";
import { LEVELS } from "@/lib/game";

export default function Levels() {
  const { user } = useAuth();
  const nav = useNavigate();
  const completed = new Set(user?.completed_levels || []);
  const allDone = completed.size >= 20;

  return (
    <div className="min-h-screen px-5 py-8" data-testid="screen-levels">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-7">
          <Logo size="md" linkTo="/home" />
          <div className="flex gap-2">
            <Link to="/home" className="btn-stitch ghost xs" data-testid="levels-home-btn">← Home</Link>
          </div>
        </header>

        <div className="paper-card p-7">
          <span className="eyebrow">solo climb</span>
          <h1 className="font-display font-semibold mt-3" style={{ fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)" }}>
            Twenty <span className="text-rose-deep italic">little climbs.</span>
          </h1>
          <p className="text-charcoal-soft mt-2 font-body">
            Easy, easy, medium, medium, tricky — and so the wave rolls on.
          </p>

          {allDone && (
            <div className="mt-5 paper-card p-5 bg-sage" style={{ background: "var(--sage)" }} data-testid="levels-all-done">
              <div className="font-display font-bold text-xl">All levels completed! 🎉</div>
              <div className="text-charcoal-soft mt-1 font-body">You've climbed every ladder. Replay anytime to chase a tidier solution.</div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {LEVELS.map((lv) => {
              const isCompleted = completed.has(lv.n);
              const prevDone = lv.n === 1 || completed.has(lv.n - 1);
              const unlocked = isCompleted || prevDone;

              return (
                <button
                  key={lv.n}
                  className="relative text-left p-4 rounded-xl border-2 border-[var(--charcoal)] paper-card"
                  style={{
                    background: isCompleted ? "var(--sage)" : "var(--cream-soft)",
                    boxShadow: "0 3px 0 var(--charcoal)",
                    opacity: unlocked ? 1 : 0.5,
                    cursor: unlocked ? "pointer" : "not-allowed",
                    minHeight: 130,
                  }}
                  onClick={() => unlocked && nav(`/play/${lv.n}`)}
                  disabled={!unlocked}
                  data-testid={`level-cell-${lv.n}`}
                >
                  <div className="absolute top-2 right-2">
                    <DiffPill value={lv.difficulty} />
                  </div>
                  <div className="font-display font-bold text-2xl">Lv {lv.n}</div>
                  <div className="font-display font-bold text-base mt-2 tracking-widest">
                    {lv.start} → {lv.target}
                  </div>
                  {isCompleted && (
                    <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-charcoal text-[var(--cream-soft)] grid place-items-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                  {!unlocked && (
                    <div className="absolute bottom-2 right-2 font-hand text-charcoal-soft text-sm">locked</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
