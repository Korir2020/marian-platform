import { useState } from "react";
import { PageShell } from "./SiteChrome";
import { additionalPathways } from "./pathwayData";
import "./pathways.css";

const LEVEL_NAMES = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export function PathwayCards({ go }) {
  return (
    <div className="pw pw-grid">
      {additionalPathways.map((p) => (
        <button key={p.slug} type="button" className={`pw-card pw-theme-${p.theme}`} onClick={() => go(`site-pathway-${p.slug}`)}>
          <span className="pw-mark">{p.mark}</span>
          <b>{p.title}</b>
          {p.tagline}
        </button>
      ))}
    </div>
  );
}

export default function PathwayPage({ go, slug }) {
  const p = additionalPathways.find((x) => x.slug === slug);
  const [i, setI] = useState(0);
  if (!p) {
    return (
      <PageShell go={go} active="site-learning">
        <div className="pw">
          <div className="pw-in" style={{ padding: "56px 20px" }}>
            <h1 className="pw-title">Pathway not found</h1>
            <button type="button" className="pw-card" style={{ width: "auto" }} onClick={() => go("site-learning")}>Back to learning</button>
          </div>
        </div>
      </PageShell>
    );
  }
  const lv = p.levels[i] || p.levels[0];
  return (
    <PageShell go={go} active="site-learning">
      <div className={`pw pw-theme-${p.theme}`}>
        <section className="pw-hero">
          <div className="pw-in">
            <span className="pw-mark">{p.mark}</span>
            <span className="pw-kicker">{p.tagline}</span>
            <h1 className="pw-title">{p.title}</h1>
            <p className="pw-lead">{p.description}</p>
            <div className="pw-tabs" role="group" aria-label="Course level">
              {p.levels.map((l, n) => (
                <button key={l.level} type="button" className="pw-tab" aria-pressed={n === i} onClick={() => setI(n)}>
                  {LEVEL_NAMES[l.level] || l.level}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="pw-body">
          <div className="pw-in">
            <h2 className="pw-h" style={{ marginTop: 0 }}>{lv.title}</h2>
            <p>{lv.description}</p>
            <div className="pw-facts">
              <div className="pw-fact"><b>Prerequisites:</b> {lv.prerequisites}</div>
              <div className="pw-fact"><b>Hours:</b> {lv.hours}</div>
            </div>
            <h3 className="pw-h">What you will learn</h3>
            {lv.modules.map((m) => (
              <details key={m.title} className="pw-mod">
                <summary>{m.title}</summary>
                <p>{m.description}</p>
                <ul>{m.topics.map((t) => <li key={t}>{t}</li>)}</ul>
              </details>
            ))}
            <p className="pw-cap">Preview of a draft course outline. Publishing, enrolment and progress tracking are not available yet.</p>
            <button type="button" className="pw-card" style={{ width: 'auto', marginTop: 16, marginRight: 12 }} onClick={() => go('lessons:' + p.slug + ':' + lv.level)}>Read the lessons</button>
            <button type="button" className="pw-card" style={{ width: 'auto', marginTop: 16, marginRight: 12 }} onClick={() => go('pathways')}>Start this course</button>
            <button type="button" className="pw-card" style={{ width: "auto", marginTop: 16 }} onClick={() => go("site-learning")}>Back to learning</button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
