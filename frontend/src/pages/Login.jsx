import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/lib/auth";
import { Logo } from "@/components/RaddleUI";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Both fields are required.");
      return;
    }
    setBusy(true);
    try {
      const u = await login(username.trim(), password);
      toast.success(`Welcome back, ${u.username}.`);
      nav("/home", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-8" data-testid="screen-login">
      <div className="max-w-md mx-auto">
        <Logo size="md" linkTo="/" />

        <div className="paper-card mt-8 p-7">
          <span className="eyebrow">returning player</span>
          <h1 className="font-display font-semibold mt-3" style={{ fontSize: "2.2rem" }}>
            Continue your <span className="text-rose-deep italic">climb.</span>
          </h1>
          <p className="text-charcoal-soft mt-2 font-body">Pick up from the next level after your last completed one.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="font-hand text-lg text-charcoal-soft" htmlFor="li-username">Username</label>
              <input
                id="li-username"
                className="input-stitch mt-1"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                data-testid="login-username-input"
              />
            </div>
            <div>
              <label className="font-hand text-lg text-charcoal-soft" htmlFor="li-password">Password</label>
              <input
                id="li-password"
                className="input-stitch mt-1"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
              />
            </div>

            {error && (
              <div className="text-rose-deep font-hand text-lg" data-testid="login-error">{error}</div>
            )}

            <button
              type="submit"
              className="btn-stitch sage w-full justify-center"
              disabled={busy}
              data-testid="login-submit-btn"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-center font-body text-charcoal-soft">
            First time here?{" "}
            <Link to="/signup" className="text-rose-deep font-semibold underline-offset-2 hover:underline" data-testid="login-to-signup">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
