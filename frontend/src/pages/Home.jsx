import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/RaddleUI";

export default function Home() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const completed = user?.completed_levels?.length || 0;
  const nextLevel = (() => {
    for (let i = 1; i <= 20; i++) if (!user?.completed_levels?.includes(i)) return i;
    return 20;
  })();
  const allDone = completed >= 20;

  return (
    <div className="min-h-screen px-5 py-8" data-testid="screen-home">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-7">
          <Logo size="md" />
          <div className="flex gap-2 items-center">
            <span className="font-hand text-lg text-charcoal-soft hidden sm:inline" data-testid="home-username">
              hello, {user?.username}
            </span>
            <button
              className="btn-stitch ghost xs"
              onClick={() => { logout(); nav("/", { replace: true }); }}
              data-testid="home-logout-btn"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="paper-card p-7 mb-8">
          <span className="eyebrow">welcome back</span>
          <h1 className="font-display font-semibold mt-3" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.1 }}>
            Choose your <span className="text-rose-deep italic">mode.</span>
          </h1>
          <p className="text-charcoal-soft mt-2 font-body">
            {allDone
              ? "All 20 single-player puzzles stitched up. Replay anytime — or try a 1v1."
              : `${completed} / 20 levels done. Next up: Level ${nextLevel}.`}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to="/levels"
            className="paper-card p-6 block hover:translate-y-[-3px] transition-transform"
            style={{ border: "2px solid var(--charcoal)", boxShadow: "0 4px 0 var(--charcoal)" }}
            data-testid="home-solo-card"
          >
            <div className="w-12 h-12 rounded-xl border-2 border-dashed border-[var(--charcoal)] bg-sage grid place-items-center font-display font-bold mb-3">
              S
            </div>
            <h3 className="font-display font-semibold text-2xl">Solo Climb</h3>
            <p className="text-charcoal-soft text-sm mt-1">
              20 hand-knit puzzles in a rhythmic difficulty wave. Each level unlocks the next.
            </p>
            <div className="mt-3 text-rose-deep font-hand text-lg">{completed}/20 stitched →</div>
          </Link>

          <Link
            to="/battle"
            className="paper-card p-6 block hover:translate-y-[-3px] transition-transform"
            style={{ border: "2px solid var(--charcoal)", boxShadow: "0 4px 0 var(--charcoal)" }}
            data-testid="home-battle-card"
          >
            <div className="w-12 h-12 rounded-xl border-2 border-dashed border-[var(--charcoal)] bg-rose-paper grid place-items-center font-display font-bold mb-3">
              1v1
            </div>
            <h3 className="font-display font-semibold text-2xl">One vs One</h3>
            <p className="text-charcoal-soft text-sm mt-1">
              Create a room, share the 6-digit code, race a friend across three quick puzzles.
            </p>
            <div className="mt-3 text-rose-deep font-hand text-lg">create or join →</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
