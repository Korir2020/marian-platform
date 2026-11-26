import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Cloud, Database, FileSearch, FlaskConical, LockKeyhole, Network, Radar, RefreshCcw, ShieldCheck, TerminalSquare } from 'lucide-react';
import { PageShell } from './SiteChrome';
import { cyberAcademy } from './cyberAcademyData';
import { academyStats, stageStats } from './cyberStats';
import './cyber.css';

const STAGE_ICONS = [TerminalSquare, Network, LockKeyhole, Radar, ShieldCheck, Cloud, FileSearch, CheckCircle2];
const LAB_ICONS = { browser: TerminalSquare, external_vm: Network, cloud: Cloud };
const clean = (t) => t.replace(/^Stage\s+\d+\s*[–—-]\s*/, '');

function LabCockpit({ lab, onReset }) {
  const Icon = LAB_ICONS[lab.type] || FlaskConical;
  return (
    <div className="cy-cockpit">
      <div className="cy-cockpit-head">
        <div><span className="cy-label">PRACTICE ENVIRONMENT</span><h3>{lab.title}</h3><p>{lab.purpose}</p></div>
        <div className="cy-status"><span /> SIMULATION READY</div>
      </div>
      <div className="cy-cockpit-grid">
        <aside className="cy-lab-sidebar">
          <div className="cy-lab-scope"><ShieldCheck size={16} /><span>AUTHORISED TRAINING RANGE</span><b>Isolated scope</b></div>
          <div className="cy-lab-item active"><Icon size={16} /><span>Workspace</span><small>01</small></div>
          <div className="cy-lab-item"><FileSearch size={16} /><span>Evidence</span><small>02</small></div>
          <div className="cy-lab-item"><CheckCircle2 size={16} /><span>Assessment</span><small>03</small></div>
          <button type="button" onClick={onReset}><RefreshCcw size={14} /> Reset scenario</button>
        </aside>
        <div className="cy-lab-console">
          <div className="cy-console-top"><span>LAB CONSOLE</span><span>{lab.type === 'cloud' ? 'DISPOSABLE CLOUD SANDBOX' : lab.type === 'browser' ? 'BROWSER SANDBOX' : 'ISOLATED VM RANGE'}</span></div>
          <div className="cy-console-screen">
            <div className="cy-terminal-line"><span>&gt;</span> environment status</div>
            <div className="cy-terminal-result">scope: authorised training range<br />network: isolated<br />public inbound: disabled<br />reset: available</div>
            <div className="cy-terminal-line"><span>&gt;</span> objective</div>
            <div className="cy-terminal-result">{lab.exercise_types?.[0] || 'Complete the assigned practical exercise.'}</div>
          </div>
          <div className="cy-task-row"><div><span className="cy-label">CURRENT TASK</span><b>{lab.exercise_types?.[0] || 'Investigation exercise'}</b></div><span className="cy-task-state">NOT STARTED</span></div>
        </div>
        <aside className="cy-evidence">
          <div><span className="cy-label">EVIDENCE BOARD</span><b>0 / {Math.min(4, lab.features?.length || 4)}</b></div>
          <div className="cy-evidence-list">{(lab.features || []).slice(0, 5).map((f, i) => <div key={f}><span>{String(i + 1).padStart(2, '0')}</span><p>{f}</p><i /></div>)}</div>
          <button type="button">Open evidence checklist <ArrowRight size={14} /></button>
        </aside>
      </div>
      <div className="cy-cockpit-foot"><span><Database size={14} /> {lab.resources?.memory || lab.resources?.memory === '' ? lab.resources.memory : 'Session resources configured'}</span><span><Network size={14} /> {lab.architecture}</span></div>
    </div>
  );
}

export default function CyberAcademyPage({ go }) {
  const [tab, setTab] = useState('journey');
  const [stage, setStage] = useState(0);
  const [labKey, setLabKey] = useState(cyberAcademy.labs[0]?.key);
  const [resetCount, setResetCount] = useState(0);
  const totals = academyStats(cyberAcademy);
  const activeStage = cyberAcademy.stages[stage];
  const activeLab = useMemo(() => cyberAcademy.labs.find((l) => l.key === labKey) || cyberAcademy.labs[0], [labKey]);
  const stats = stageStats(activeStage);
  return (
    <PageShell go={go} active="site-learning">
      <div className="cy-academy">
        <header className="cy-header">
          <div className="cy-header-in">
            <button type="button" className="cy-back" onClick={() => go('site-learning')}><ArrowLeft size={15} /> Learning</button>
            <div className="cy-kicker">MARIAN SECURITY ACADEMY</div>
            <div className="cy-header-grid">
              <div><h1>Learn security.<br /><em>Operate with discipline.</em></h1><p>Eight deliberate stages from digital foundations to professional specialisation, with practical work designed around authorised, isolated environments.</p><div className="cy-hero-actions"><button type="button" onClick={() => { setTab('journey'); document.querySelector('.cy-work')?.scrollIntoView({ behavior: 'smooth' }); }}>Enter the academy <ArrowRight size={16} /></button><button type="button" onClick={() => { setTab('labs'); document.querySelector('.cy-work')?.scrollIntoView({ behavior: 'smooth' }); }}>View lab environments</button></div></div>
              <div className="cy-command-card"><div><span>ACADEMY STATUS</span><b>READY</b></div><strong>{String(totals.stages).padStart(2, '0')}</strong><small>stages</small><div className="cy-command-line" /><p>{totals.lessons} lessons · {totals.activities} activities · {totals.labs} lab environments</p></div>
            </div>
          </div>
        </header>

        <main className="cy-work">
          <div className="cy-tabs"><button className={tab === 'journey' ? 'on' : ''} onClick={() => setTab('journey')}>Academy journey</button><button className={tab === 'labs' ? 'on' : ''} onClick={() => setTab('labs')}>Lab environments</button></div>
          {tab === 'journey' && <>
            <section className="cy-journey-head"><div><span className="cy-label">THE ROADMAP</span><h2>Eight stages. One professional progression.</h2><p>Every stage builds the knowledge and practical habits required by the next.</p></div><div className="cy-progress-summary"><b>{String(stage + 1).padStart(2, '0')} / 08</b><span>stage selected</span></div></section>
            <div className="cy-stage-layout">
              <nav className="cy-stage-list">{cyberAcademy.stages.map((s, i) => { const I = STAGE_ICONS[i] || ShieldCheck; return <button key={s.number} className={stage === i ? 'active' : ''} onClick={() => setStage(i)}><span className="cy-stage-number">{String(i + 1).padStart(2, '0')}</span><I size={17} /><span><b>{clean(s.title)}</b><small>{stageStats(s).lessons} lessons · {stageStats(s).activities} practicals</small></span><ChevronRight size={14} /></button>; })}</nav>
              <section className="cy-stage-detail"><div className="cy-stage-top"><div><span className="cy-label">STAGE {String(stage + 1).padStart(2, '0')}</span><h3>{clean(activeStage.title)}</h3><p>{activeStage.description}</p></div><div className="cy-stage-stat"><b>{stats.lessons}</b><span>lessons</span></div></div><div className="cy-module-grid">{activeStage.modules.map((m, i) => <article key={m.title}><span>MODULE {String(i + 1).padStart(2, '0')}</span><h4>{m.title}</h4><p>{m.lessons.length} lessons · {m.lessons.reduce((n, l) => n + l.activities, 0)} practical activities</p><button type="button" onClick={() => go(`lessons:cyber:${stage + 1}`)}>Enter module <ArrowRight size={14} /></button></article>)}</div><div className="cy-stage-footer"><div><span>STAGE CAPABILITY</span><b>Understand → Practise → Investigate → Prove</b></div><button type="button" onClick={() => go(`lessons:cyber:${stage + 1}`)}>Enter Stage {stage + 1} <ArrowRight size={15} /></button></div></section>
            </div>
          </>}

          {tab === 'labs' && <>
            <section className="cy-journey-head"><div><span className="cy-label">PRACTICAL INFRASTRUCTURE</span><h2>Labs that look and behave like real environments.</h2><p>These interfaces describe the intended isolated training environments. They do not claim to execute real commands until a sandbox service is connected.</p></div></section>
            <div className="cy-lab-picker">{cyberAcademy.labs.map((l) => <button key={l.key} className={labKey === l.key ? 'active' : ''} onClick={() => setLabKey(l.key)}><FlaskConical size={16} /><span><b>{l.title}</b><small>{l.level} · {l.type.replace('_', ' ')}</small></span></button>)}</div>
            <LabCockpit key={`${activeLab.key}-${resetCount}`} lab={activeLab} onReset={() => setResetCount((n) => n + 1)} />
          </>}

          <div className="cy-safety"><ShieldCheck size={20} /><div><b>Safe by design</b><span>Offensive techniques belong only inside explicitly authorised, isolated training environments. No production targets are connected to these learning interfaces.</span></div></div>
        </main>
      </div>
    </PageShell>
  );
}
