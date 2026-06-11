import { Link } from "react-router-dom";

export function Logo({ size = "md", linkTo = null, testId = "raddle-logo" }) {
  const sizes = {
    sm: { box: 32, font: 16, text: 20 },
    md: { box: 44, font: 22, text: 28 },
    lg: { box: 64, font: 32, text: 44 },
  };
  const s = sizes[size] || sizes.md;
  const content = (
    <div className="flex items-center gap-3" data-testid={testId}>
      <div
        className="rounded-2xl border-2 border-dashed border-[var(--charcoal)] bg-sage grid place-items-center font-display font-bold"
        style={{ width: s.box, height: s.box, fontSize: s.font, transform: "rotate(-6deg)" }}
      >
        R
      </div>
      <div className="font-display font-semibold" style={{ fontSize: s.text, letterSpacing: "-0.01em" }}>
        R<span className="text-rose-deep font-hand" style={{ fontSize: s.text * 1.18 }}>a</span>ddle
      </div>
    </div>
  );
  if (linkTo) return <Link to={linkTo}>{content}</Link>;
  return content;
}

export function Tile({ letter = "", match = false, active = false, size = "md", testId }) {
  const cls = ["tile"];
  if (!letter) cls.push("empty");
  if (active) cls.push("active");
  if (match) cls.push("match");
  if (size === "sm") cls.push("small");
  if (size === "xs") cls.push("tiny");
  return (
    <div className={cls.join(" ")} data-testid={testId}>
      {letter || ""}
    </div>
  );
}

export function TileRow({ word = "", target = "", active = false, size = "md", testId }) {
  const w = (word || "").toUpperCase().padEnd(4, "_").slice(0, 4).split("");
  const t = (target || "").toUpperCase().split("");
  return (
    <div className="flex gap-2 justify-center" data-testid={testId}>
      {w.map((ch, i) => (
        <Tile
          key={i}
          letter={ch === "_" ? "" : ch}
          match={ch !== "_" && ch === t[i]}
          active={active}
          size={size}
          testId={testId ? `${testId}-${i}` : undefined}
        />
      ))}
    </div>
  );
}

export function DiffPill({ value }) {
  const k = (value || "").toLowerCase();
  return <span className={`diff-pill diff-${k}`}>{value}</span>;
}

export function TopBar({ right = null, showLogo = true }) {
  return (
    <header className="flex items-center justify-between mb-7">
      {showLogo ? <Logo linkTo="/home" /> : <div />}
      <div className="flex gap-2 items-center">{right}</div>
    </header>
  );
}
