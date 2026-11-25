import { useState } from 'react';
import { PageShell } from './SiteChrome';
import { cyberAcademy } from './cyberAcademyData';
import { academyStats, stageStats } from './cyberStats';
import {
  ArrowLeft, ChevronRight, ShieldCheck, Terminal, Network, Lock, Radar, Bug,
  Building2, Fingerprint, GraduationCap, FlaskConical,
} from './CyberIcons';
import heroImg from './assets/cyber-screen.jpg';
import './cyber.css';

const clean = (t) => t.replace(/^Stage\s+\d+\s*[–—-]\s*/, '');
const STAGE_META = [
  [Terminal, 'Beginner'], [Network, 'Beginner'], [Lock, 'Intermediate'], [Radar, 'Intermediate'],
  [Bug, 'Advanced'], [Building2, 'Advanced'], [Fingerprint, 'Expert'], [GraduationCap, 'Expert'],
];
const CODE = ['Learn', 'Observe', 'Practise', 'Investigate', 'Prove', 'Reflect', 'Advance'];
const TABS = ['Overview', 'Journey', 'Labs'];

export default function CyberAcademyPage({ go }) {
  const [tab, setTab] = useState('Overview');
  const [open, setOpen] = useState(0);
  const { stages, labs } = cyberAcademy;
  const totals = academyStats(cyberAcademy);
  const stats = [
    [totals.stages, 'stages'],
    [totals.lessons, 'lessons'],
    [totals.activities, 'activities'],
    [totals.labs, 'lab types'],
  ];

  return (
    <PageShell go={go} active="site-learning">
      <div className="cy-wrap">
        <div className="cy-main">
          <div className="cy-scan" />
          <div className="cy-in">
            <button type="button" className="cy-back" onClick={() => go('site-learning')}>
              <ArrowLeft size={16} />Back
            </button>
            <p className="cy-eyebrow">// MARIAN CYBERSECURITY ACADEMY</p>
            <h1 className="cy-h1">
              Learn the idea. <span>Build the skill.</span> Prove the competence.
            </h1>
            <p className="cy-lead">A clear path from zero to professional security practice, built on evidence.</p>

            <figure className="cy-fig">
              <img src={heroImg} alt="Security operations screen showing live threat activity, network traffic and system status" width="1280" height="800" />
              <figcaption><span className="cy-dot" /> Live security operations</figcaption>
            </figure>

            <div className="cy-tabs">
              {TABS.map((x) => (
                <button key={x} type="button" className={'cy-tab' + (tab === x ? ' on' : '')} onClick={() => setTab(x)}>{x}</button>
              ))}
            </div>

            <div className="cy-stats">
              {stats.map(([n, l]) => (
                <div key={l} className="cy-stat"><b>{n}</b><span>{l}</span></div>
              ))}
            </div>

            {tab !== 'Labs' && (
              <>
                <h2 className="cy-label">THE LEARNING CODE</h2>
                <div className="cy-code">
                  {CODE.map((c, i) => (
                    <span key={c}>
                      <span className="cy-pill">{c}</span>
                      {i < CODE.length - 1 && <ChevronRight size={12} />}
                    </span>
                  ))}
                </div>

                <h2 className="cy-label">THE PROGRESSION</h2>
                <ol className="cy-line">
                  {stages.map((s, i) => {
                    const [Icon, level] = STAGE_META[i] || STAGE_META[STAGE_META.length - 1];
                    const on = open === i;
                    const st = stageStats(s);
                    return (
                      <li key={s.number}>
                        <button type="button" className={'cy-stage' + (on ? ' on' : '')} onClick={() => setOpen(on ? null : i)}>
                          <div className="cy-ico"><Icon size={20} /></div>
                          <div className="cy-body">
                            <div className="cy-top">
                              <div>
                                <span className="cy-num">{String(i + 1).padStart(2, '0')}</span>
                                <h3 className="cy-name">{clean(s.title)}</h3>
                              </div>
                              <span className="cy-badge">{level}</span>
                            </div>
                            {(on || tab === 'Overview') && <p className="cy-desc">{s.description}</p>}
                            <span className="cy-meta">{st.modules} modules · {st.lessons} lessons · {st.activities} activities</span>
                            {on && tab === 'Journey' && (
                              <div className="cy-mods">
                                {s.modules.map((m, mi) => (
                                  <div key={m.title} className="cy-mod">
                                    <b>{m.title}</b>
                                    <small>MODULE {mi + 1} · {m.lessons.length} lessons</small>
                                    <em>{m.lessons.map((l) => l.title).join(' · ')}</em>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {tab === 'Labs' && (
              <div className="cy-labs">
                {labs.map((l) => (
                  <div key={l.key} className="cy-lab">
                    <div className="cy-lab-head">
                      <div className="cy-ico"><FlaskConical size={20} /></div>
                      <div>
                        <h3 className="cy-lab-name">{l.title}</h3>
                        <p className="cy-lab-desc">{l.purpose}</p>
                      </div>
                    </div>
                    <div className="cy-strip">$ preview --not-live<span className="cy-blink">_</span></div>
                  </div>
                ))}
                <div className="cy-dash">
                  <FlaskConical size={20} />
                  Live labs are not available yet. Each lab is designed to run in a sandboxed, resettable environment.
                </div>
              </div>
            )}

            <div className="cy-safe">
              <ShieldCheck size={20} />
              <p><strong>Safe by design.</strong> <span>Offensive techniques are confined to explicitly authorised, isolated environments.</span></p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
