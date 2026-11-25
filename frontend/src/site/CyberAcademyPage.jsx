import { useState } from 'react';
import { PageShell } from './SiteChrome';
import { cyberAcademy } from './cyberAcademyData';
import './cyber.css';

const clean = (t) => t.replace(/^Stage\s+\d+\s*[–—-]\s*/, '');
const sum = (arr, f) => arr.reduce((n, x) => n + f(x), 0);
const lessonsOf = (s) => s.modules.flatMap((m) => m.lessons);
const CYCLE = ['Learn', 'Observe', 'Practise', 'Investigate', 'Prove', 'Reflect', 'Advance'];

export default function CyberAcademyPage({ go }) {
  const [tab, setTab] = useState('overview');
  const [stageNo, setStageNo] = useState(1);
  const [labKey, setLabKey] = useState(cyberAcademy.labs[0].key);
  const stages = cyberAcademy.stages;
  const stage = stages.find((s) => s.number === stageNo) || stages[0];
  const lab = cyberAcademy.labs.find((l) => l.key === labKey) || cyberAcademy.labs[0];
  const allLessons = stages.flatMap(lessonsOf);
  const totalActivities = sum(allLessons, (l) => l.activities);
  const openStage = (n) => { setStageNo(n); setTab('journey'); };

  return (
    <PageShell go={go} active="site-learning">
      <div className="cy">
        <div className="cy-in">
          <button type="button" className="cy-back" onClick={() => go('site-learning')}>← Back</button>
          <span className="cy-eyebrow">MARIAN CYBERSECURITY ACADEMY</span>
          <h1 className="cy-title">Learn the idea. <em>Build the skill.</em> Prove the competency.</h1>
          <p className="cy-sub">A clear path from zero to professional security practice, built on evidence.</p>

          <div className="cy-tabs">
            {[['overview', 'Overview'], ['journey', 'Journey'], ['labs', 'Labs']].map(([k, t]) => (
              <button key={k} type="button" className={'cy-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{t}</button>
            ))}
          </div>

          {tab === 'overview' && (
            <div>
              <div className="cy-stats">
                <div><b>{stages.length}</b><span>stages</span></div>
                <div><b>{allLessons.length}</b><span>lessons</span></div>
                <div><b>{totalActivities}</b><span>activities</span></div>
                <div><b>{cyberAcademy.labs.length}</b><span>lab types</span></div>
              </div>
              <h2 className="cy-h2">The learning cycle</h2>
              <div className="cy-cycle">{CYCLE.map((c) => <span key={c}>{c}</span>)}</div>
              <h2 className="cy-h2">The progression</h2>
              <div className="cy-stage-list">
                {stages.map((s) => (
                  <button key={s.number} type="button" className="cy-stage" onClick={() => openStage(s.number)}>
                    <span className="cy-num">{String(s.number).padStart(2, '0')}</span>
                    <span className="cy-stage-main">
                      <b>{clean(s.title)}</b>
                      <small>{s.description}</small>
                      <small className="cy-meta">{s.modules.length} modules · {lessonsOf(s).length} lessons · {sum(lessonsOf(s), (l) => l.activities)} activities</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="cy-safe"><b>Safe by design.</b> Offensive techniques are confined to explicitly authorised, isolated environments.</div>
            </div>
          )}

          {tab === 'journey' && (
            <div>
              <div className="cy-steps">
                {stages.map((s) => (
                  <button key={s.number} type="button" className={'cy-step' + (s.number === stage.number ? ' on' : '')} onClick={() => setStageNo(s.number)}>
                    {String(s.number).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <div className="cy-banner">
                <span className="cy-eyebrow">STAGE {stage.number}</span>
                <h2>{clean(stage.title)}</h2>
                <p>{stage.description}</p>
              </div>
              {stage.modules.map((m, mi) => (
                <details key={m.title} className="cy-module">
                  <summary><span className="cy-num">{String(mi + 1).padStart(2, '0')}</span><b>{m.title}</b><small>{m.lessons.length} lessons</small></summary>
                  {m.lessons.map((l, li) => (
                    <div key={l.title} className="cy-lesson">
                      <span className="cy-meta">LESSON {li + 1} · {l.minutes} min</span>
                      <b>{l.title}</b>
                      {l.objectives && l.objectives[0] && <p>{l.objectives[0]}</p>}
                      <span className="cy-meta">{l.activities} practicals · {l.lab}</span>
                    </div>
                  ))}
                </details>
              ))}
            </div>
          )}

          {tab === 'labs' && (
            <div>
              <div className="cy-safe">Live labs are not available yet. This page describes how each lab will work.</div>
              <div className="cy-steps">
                {cyberAcademy.labs.map((l, i) => (
                  <button key={l.key} type="button" className={'cy-step' + (l.key === lab.key ? ' on' : '')} onClick={() => setLabKey(l.key)}>
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <div className="cy-banner">
                <span className="cy-eyebrow">{String(lab.type).replace(/_/g, ' ').toUpperCase()} · STAGES {lab.level}</span>
                <h2>{lab.title}</h2>
                <p>{lab.purpose}</p>
              </div>
              <h2 className="cy-h2">What it covers</h2>
              <ul className="cy-list">{lab.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <h2 className="cy-h2">Exercises</h2>
              <div className="cy-tags">{lab.exercise_types.map((e) => <span key={e}>{e}</span>)}</div>
              <h2 className="cy-h2">Resource limits</h2>
              <div className="cy-tags">
                {Object.entries(lab.resources).map(([k, v]) => <span key={k}>{k.replace(/_/g, ' ')}: {String(v)}</span>)}
              </div>
              <h2 className="cy-h2">Architecture</h2>
              <p className="cy-arch">{lab.architecture}</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
