import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, LockKeyhole, Play, Sparkles } from "lucide-react";
import { PageShell } from "./SiteChrome";
import { additionalPathways } from "./pathwayData";
import "./pathways.css";

const LEVEL_NAMES = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

const LEVEL_COLORS = {
  beginner: "BEGINNER",
  intermediate: "INTERMEDIATE",
  advanced: "ADVANCED",
};

function levelStats(level) {
  const modules = level?.modules || [];
  const topics = modules.reduce((n, m) => n + (m.topics?.length || 0), 0);
  return { modules: modules.length, topics };
}

function Roadmap({ levels, selected, setSelected, onEnter }) {
  return (
    <div className="pw-roadmap" aria-label="Course roadmap">
      <div className="pw-roadmap-line" aria-hidden="true" />
      {levels.map((level, index) => {
        const active = index === selected;
        const previous = index < selected;
        const stats = levelStats(level);
        return (
          <article key={level.level} className={`pw-level ${active ? "is-active" : ""} ${previous ? "is-complete" : ""}`}>
            <button type="button" className="pw-level-node" onClick={() => setSelected(index)} aria-label={`Open ${LEVEL_NAMES[level.level]} level`}>
              {previous ? <CheckCircle2 size={19} /> : <span>{String(index + 1).padStart(2, "0")}</span>}
            </button>
            <div className="pw-level-card">
              <div className="pw-level-top">
                <div>
                  <span className="pw-level-label">{LEVEL_COLORS[level.level] || level.level}</span>
                  <h2>{level.title}</h2>
                </div>
                <span className="pw-level-state">{previous ? "Completed path" : active ? "Current path" : "Next"}</span>
              </div>
              <p>{level.description}</p>
              <div className="pw-level-meta">
                <span><Clock3 size={14} /> {level.hours} hours</span>
                <span>{stats.modules} modules</span>
                <span>{stats.topics} topics</span>
              </div>
              <div className="pw-module-track">
                {level.modules.map((m, mi) => (
                  <button key={m.title} type="button" className={`pw-module ${active && mi === 0 ? "is-current" : ""}`} onClick={() => setSelected(index)}>
                    <span>{String(mi + 1).padStart(2, "0")}</span>
                    <b>{m.title}</b>
                    <small>{m.topics?.length || 0} skills</small>
                  </button>
                ))}
              </div>
              {active && (
                <div className="pw-level-action">
                  <div>
                    <span>Next learning action</span>
                    <strong>{level.modules?.[0]?.topics?.[0] || "Begin the first module"}</strong>
                  </div>
                  <button type="button" className="pw-enter" onClick={() => onEnter(level.level)}>
                    <Play size={16} fill="currentColor" /> Enter learning environment
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function PathwayCards({ go }) {
  return (
    <div className="pw-catalog-grid">
      {additionalPathways.map((p) => (
        <button key={p.slug} type="button" className={`pw-catalog-card pw-theme-${p.theme}`} onClick={() => go(`site-pathway-${p.slug}`)}>
          <span className="pw-mark">{p.mark}</span>
          <span className="pw-catalog-copy">
            <small>{p.tagline}</small>
            <b>{p.title}</b>
            <span>{p.description}</span>
          </span>
          <ArrowRight size={18} />
        </button>
      ))}
    </div>
  );
}

export default function PathwayPage({ go, slug }) {
  const p = additionalPathways.find((x) => x.slug === slug);
  const [selected, setSelected] = useState(0);
  const levels = useMemo(() => p?.levels || [], [p]);

  if (!p) {
    return (
      <PageShell go={go} active="site-learning">
        <div className="pw-error">
          <h1>Pathway not found</h1>
          <button type="button" onClick={() => go("site-learning")}>Back to learning</button>
        </div>
      </PageShell>
    );
  }

  const enter = (level) => go(`lessons:${p.slug}:${level}`);

  return (
    <PageShell go={go} active="site-learning">
      <div className={`pw pw-theme-${p.theme}`}>
        <section className="pw-hero pw-hero-pro">
          <div className="pw-in">
            <button type="button" className="pw-back" onClick={() => go("site-learning")}><ArrowLeft size={16} /> All learning</button>
            <div className="pw-hero-grid">
              <div>
                <div className="pw-identity">
                  <span className="pw-mark pw-mark-lg">{p.mark}</span>
                  <span><small>LEARNING PATH</small><b>{p.tagline}</b></span>
                </div>
                <h1 className="pw-title">{p.title}</h1>
                <p className="pw-lead">{p.description}</p>
                <div className="pw-hero-points">
                  <span><Sparkles size={15} /> Structured progression</span>
                  <span><CheckCircle2 size={15} /> Practice-led lessons</span>
                  <span><ArrowRight size={15} /> Level-by-level mastery</span>
                </div>
              </div>
              <div className="pw-3d-card" aria-hidden="true">
                <div className="pw-3d-inner">
                  <span>{p.mark}</span>
                  <b>{p.title}</b>
                  <small>LEARN · PRACTISE · BUILD</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pw-body pw-body-pro">
          <div className="pw-in">
            <div className="pw-section-head">
              <div>
                <span className="pw-eyebrow">YOUR ROADMAP</span>
                <h2>One clear path from first principles to advanced work.</h2>
              </div>
              <button type="button" className="pw-outline" onClick={() => enter(levels[selected]?.level || "beginner")}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
            <Roadmap levels={levels} selected={selected} setSelected={setSelected} onEnter={enter} />

            <div className="pw-project-banner">
              <div>
                <span>CAPSTONE DIRECTION</span>
                <h3>{levels[selected]?.project || "Practical project work appears throughout the path."}</h3>
                <p>Each level should move from understanding to guided practice, independent work and evidence of what the learner can build.</p>
              </div>
              <LockKeyhole size={22} />
            </div>

            <div className="pw-footer-nav">
              <button type="button" onClick={() => go("site-learning")}><ArrowLeft size={16} /> Back to learning</button>
              <button type="button" onClick={() => enter(levels[selected]?.level || "beginner")}>Enter {LEVEL_NAMES[levels[selected]?.level] || "course"} <ArrowRight size={16} /></button>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
