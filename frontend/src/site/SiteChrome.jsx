import { useEffect, useState } from "react";
import { Icon } from "./icons";
import "./site.css";

// `go` is the App.jsx screen setter. Existing screens are reused:
// login, join, school-register, privacy, terms.
const LINKS = [
  ["site-school", "School Management"],
  ["site-learning", "Personalized Learning"],
];

export function LogoMark({ inverted }) {
  return (
    <svg viewBox="0 0 40 40" className={"ms-lm" + (inverted ? " is-ring" : "")} aria-hidden="true">
      <rect width="40" height="40" rx="12" className="ms-lm-bg" />
      <path d="M9 29V12l11 10 11-10v17" fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="ms-lm-line" />
      <circle cx="9" cy="12" r="3.2" className="ms-lm-a" />
      <circle cx="31" cy="12" r="3.2" className="ms-lm-b" />
    </svg>
  );
}

export function Logo({ go, inverted }) {
  return (
    <button type="button" className="ms-logo" onClick={() => go("site-home")} aria-label="MARIAN home">
      <LogoMark inverted={inverted} />
      <span className={"ms-logo-text" + (inverted ? " is-inv" : "")}>MARIAN</span>
    </button>
  );
}

export function SiteHeader({ go, active }) {
  const [open, setOpen] = useState(false);
  const nav = (to) => { setOpen(false); go(to); };
  return (
    <header className="ms-header">
      <div className="ms-container ms-header-row">
        <Logo go={go} />
        <nav className="ms-nav" aria-label="Main">
          {LINKS.map(([to, label]) => (
            <button key={to} type="button" className={"ms-navlink" + (active === to ? " is-active" : "")} onClick={() => nav(to)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="ms-header-cta">
          <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={() => nav("login")}>Sign in</button>
          <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm ms-pill" onClick={() => nav("site-learning")}>Explore</button>
          <button type="button" className="ms-btn ms-btn--ink ms-btn--sm ms-pill" onClick={() => nav("pathways")}>Start</button>
        </div>
        <button type="button" className="ms-burger" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          <Icon name={open ? "close" : "menu"} s={20} />
        </button>
      </div>
      {open && (
        <div className="ms-mobile">
          <nav className="ms-container ms-mobile-nav" aria-label="Mobile">
            {LINKS.map(([to, label]) => (
              <button key={to} type="button" className="ms-mobile-link" onClick={() => nav(to)}>{label}</button>
            ))}
      <div className="ms-mobile-cta">
        <button type="button" className="ms-btn ms-btn--quiet ms-btn--lg ms-pill" onClick={() => nav("login")}>Sign in</button>
        <button type="button" className="ms-btn ms-btn--ghost ms-btn--lg ms-pill" onClick={() => nav("site-learning")}>Explore</button>
        <button type="button" className="ms-btn ms-btn--ink ms-btn--lg ms-pill" onClick={() => nav("pathways")}>Start</button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter({ go }) {
  return (
    <footer className="ms-footer">
      <div className="ms-container ms-footer-grid">
        <div className="ms-footer-brand">
          <Logo go={go} inverted />
          <p>School Management and Personalized Learning on one platform — for CBC and everything beyond it.</p>
        </div>
        <div>
          <h3 className="ms-eyebrow ms-gold">Platform</h3>
          <ul className="ms-footer-list">
            <li><button type="button" onClick={() => go("site-school")}>School Management</button></li>
            <li><button type="button" onClick={() => go("site-learning")}>Personalized Learning</button></li>
            <li><button type="button" onClick={() => go("school-register")}>Register a school</button></li>
<li><button type="button" onClick={() => go("school-status")}>Check school status</button></li>
<li><button type="button" onClick={() => go("learning-status")}>Check learning status</button></li>
          </ul>
        </div>
        <div>
          <h3 className="ms-eyebrow ms-gold">Learning</h3>
          <ul className="ms-footer-list ms-footer-plain">
            <li>CBC (Grades 1–12)</li>
            <li>Computer Science</li>
            <li>Life Skills</li>
            <li>Languages &amp; Arts</li>
          </ul>
        </div>
      </div>
      <div className="ms-footer-bar">
        <div className="ms-container ms-footer-bar-row">
          <p>© 2026 MARIAN. All rights reserved.</p>
          <p>
            <button type="button" onClick={() => go("privacy")}>Privacy</button>
            {" · "}
            <button type="button" onClick={() => go("terms-of-service")}>Terms</button>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ go, active, children }) {
  useEffect(() => { window.scrollTo(0, 0); }, [active]);
  return (
    <div className="msite">
      <SiteHeader go={go} active={active} />
      <main className="ms-main">{children}</main>
      <SiteFooter go={go} />
    </div>
  );
}
