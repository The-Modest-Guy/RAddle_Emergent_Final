import { Link } from "react-router-dom";
import { Logo } from "@/components/RaddleUI";

export default function Welcome() {
  return (
    <div className="min-h-screen px-5 py-8" data-testid="screen-welcome">
      <div className="max-w-3xl mx-auto">
        <Logo size="md" />

        <div className="mt-12">
          <span className="eyebrow">a tiny word ladder</span>
          <h1 className="font-display font-semibold text-charcoal mt-3" style={{ fontSize: "clamp(2.6rem, 7vw, 4.6rem)", lineHeight: 1.04, letterSpacing: "-0.02em" }}>
            Change one letter,<br/>find your <span className="text-rose-deep italic">way home.</span>
          </h1>
          <p className="text-charcoal-soft mt-4 max-w-xl font-body" style={{ fontSize: "1.05rem" }}>
            A handcrafted word-ladder game stitched together with care. Twenty puzzles for solo climbs, fast 1v1 duels for when you bring a friend.
          </p>
        </div>

        <div className="paper-card mt-10 p-7" data-testid="welcome-rules-card">
          <h3 className="font-display font-semibold text-xl mb-3">The rules in three lines</h3>
          <ul className="space-y-2 text-charcoal-soft font-body">
            <li>1. Change <span className="font-semibold text-charcoal">exactly one letter</span> per step.</li>
            <li>2. Every word must be a <span className="font-semibold text-charcoal">real 4-letter English word</span>.</li>
            <li>3. Travel from the <span className="font-semibold text-charcoal">start</span> word to the <span className="font-semibold text-charcoal">target</span>. Green tiles tell you you're close.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link to="/signup" className="btn-stitch sage flex-1 justify-center" data-testid="welcome-new-player-btn">
            New Player
          </Link>
          <Link to="/login" className="btn-stitch ghost flex-1 justify-center" data-testid="welcome-returning-btn">
            Returning Player
          </Link>
        </div>

        <p className="text-center mt-6 text-muted-ink text-sm font-body">
          Free to play. Your progress stays with your account.
        </p>
      </div>
    </div>
  );
}
