import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiClient, formatApiError } from "@/lib/api";
import { Logo } from "@/components/RaddleUI";
import { toast } from "sonner";

export default function Battle() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const createRoom = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post("/rooms");
      nav(`/battle/${data.code}`);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Room code must be exactly 6 digits.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await apiClient.post("/rooms/join", { code });
      nav(`/battle/${data.code}`);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-8" data-testid="screen-battle-lobby">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-7">
          <Logo size="md" linkTo="/home" />
          <Link to="/home" className="btn-stitch ghost xs" data-testid="battle-lobby-home-btn">← Home</Link>
        </header>

        <div className="paper-card p-7">
          <span className="eyebrow">one vs one</span>
          <h1 className="font-display font-semibold mt-3" style={{ fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)" }}>
            A friendly <span className="text-rose-deep italic">duel.</span>
          </h1>
          <p className="text-charcoal-soft mt-2 font-body">
            Three random puzzles, side-by-side across two devices. Solve faster than your friend.
            Each puzzle has a 60-second clock; once it runs down, hints unlock for whoever's left.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="paper-card p-6" data-testid="battle-create-card">
            <h3 className="font-display font-semibold text-xl">Create a room</h3>
            <p className="text-charcoal-soft mt-2 font-body text-sm">
              You'll get a 6-digit code to share. Match starts when your friend joins.
            </p>
            <button
              className="btn-stitch sage w-full mt-4 justify-center"
              onClick={createRoom}
              disabled={busy}
              data-testid="battle-create-btn"
            >
              {busy ? "Creating…" : "Create room"}
            </button>
          </div>

          <form onSubmit={joinRoom} className="paper-card p-6" data-testid="battle-join-card">
            <h3 className="font-display font-semibold text-xl">Join a room</h3>
            <p className="text-charcoal-soft mt-2 font-body text-sm">
              Got a code from a friend? Type it in below.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="input-stitch word mt-3"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              data-testid="battle-join-code-input"
              style={{ letterSpacing: "0.5em" }}
            />
            <button
              type="submit"
              className="btn-stitch rose w-full mt-3 justify-center"
              disabled={busy || code.length !== 6}
              data-testid="battle-join-btn"
            >
              {busy ? "Joining…" : "Join room"}
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-4 text-rose-deep font-hand text-lg text-center" data-testid="battle-lobby-error">
            {error}
          </div>
        )}

        <div className="mt-8 text-center text-muted-ink font-body text-sm">
          Playing as <span className="text-charcoal font-semibold">{user?.username}</span>
        </div>
      </div>
    </div>
  );
}
