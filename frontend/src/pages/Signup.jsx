import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/lib/auth";
import { Logo } from "@/components/RaddleUI";
import { toast } from "sonner";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const u = username.trim();
    if (u.length < 3 || u.length > 20) {
      setError("Username must be 3–20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_\.\-]+$/.test(u)) {
      setError("Use letters, numbers, _ . - only.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await signup(u, password);
      toast.success(`Welcome, ${u}! Your save is set up.`);
      nav("/home", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-8" data-testid="screen-signup">
      <div className="max-w-md mx-auto">
        <Logo size="md" linkTo="/" />

        <div className="paper-card mt-8 p-7">
          <span className="eyebrow">new player</span>
          <h1 className="font-display font-semibold mt-3" style={{ fontSize: "2.2rem" }}>
            Start your <span className="text-rose-deep italic">ladder.</span>
          </h1>
          <p className="text-charcoal-soft mt-2 font-body">Game starts from Level 1. We'll remember your climb.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="font-hand text-lg text-charcoal-soft" htmlFor="su-username">Username</label>
              <input
                id="su-username"
                className="input-stitch mt-1"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-20 characters"
                maxLength={20}
                data-testid="signup-username-input"
              />
            </div>
            <div>
              <label className="font-hand text-lg text-charcoal-soft" htmlFor="su-password">Password</label>
              <input
                id="su-password"
                className="input-stitch mt-1"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 4 characters"
                data-testid="signup-password-input"
              />
            </div>
            <div>
              <label className="font-hand text-lg text-charcoal-soft" htmlFor="su-confirm">Confirm password</label>
              <input
                id="su-confirm"
                className="input-stitch mt-1"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                data-testid="signup-confirm-input"
              />
            </div>

            {error && (
              <div className="text-rose-deep font-hand text-lg" data-testid="signup-error">{error}</div>
            )}

            <button
              type="submit"
              className="btn-stitch sage w-full justify-center"
              disabled={busy}
              data-testid="signup-submit-btn"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="mt-5 text-center font-body text-charcoal-soft">
            Already playing?{" "}
            <Link to="/login" className="text-rose-deep font-semibold underline-offset-2 hover:underline" data-testid="signup-to-login">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
