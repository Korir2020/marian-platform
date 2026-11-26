import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Code2, FileCode2, FlaskConical, Lightbulb, RotateCcw, TerminalSquare } from 'lucide-react';
import { PageShell } from './SiteChrome';
import './lesson-workspace.css';

const FILES = {
  python: 'python_programming',
  javascript: 'javascript_programming',
  'software-development': 'software_development',
  'web-development': 'web_development',
  html: 'html',
  css: 'css',
};

const COURSE_LABELS = {
  python: 'Python', javascript: 'JavaScript', 'software-development': 'Software Development',
  'web-development': 'Web Development', html: 'HTML', css: 'CSS', cyber: 'Cybersecurity',
};

function Gen({ v }) {
  if (v == null) return null;
  if (typeof v === 'string' || typeof v === 'number') return <p className="lw-text">{String(v)}</p>;
  if (Array.isArray(v)) return <ul className="lw-list">{v.map((x, i) => <li key={i}>{x && typeof x === 'object' ? <Gen v={x} /> : String(x)}</li>)}</ul>;
  return <div>{Object.entries(v).map(([k, x]) => <div key={k}><b className="lw-kicker">{k.replace(/_/g, ' ')}</b><Gen v={x} /></div>)}</div>;
}

function ContentBlock({ b }) {
  const t = b.type;
  if (t === 'explanation') return <section className="lw-block"><span className="lw-block-type">CONCEPT</span><h3>{b.title}</h3><Gen v={b.body} /></section>;
  if (t === 'worked_example' || t === 'example') return <section className="lw-block"><span className="lw-block-type">WORKED EXAMPLE</span><h3>{b.title}</h3><pre className="lw-code-readonly">{b.code}</pre>{b.expected_output != null && <><b className="lw-kicker">Expected output</b><pre className="lw-code-readonly">{String(b.expected_output)}</pre></>}<Gen v={b.explanation} /></section>;
  if (t === 'diagram') return <section className="lw-block"><span className="lw-block-type">VISUAL MODEL</span><h3>{b.title}</h3><pre className="lw-diagram">{typeof b.content === 'string' ? b.content : JSON.stringify(b.content, null, 2)}</pre><p className="lw-muted">{b.alt_text}</p></section>;
  if (t === 'knowledge_check') return <section className="lw-block"><span className="lw-block-type">KNOWLEDGE CHECK</span><h3>{b.title}</h3>{(b.items || []).map((q) => <div className="lw-question" key={q.id}><b>{q.prompt}</b>{(q.choices || []).map((c) => <div className="lw-choice" key={c.id}><span>{c.id}</span>{c.text}</div>)}</div>)}<p className="lw-muted">Use this check to explain your reasoning before moving on.</p></section>;
  const { type, title, ...rest } = b;
  return <section className="lw-block"><span className="lw-block-type">ACTIVITY</span><h3>{title || type}</h3><Gen v={rest} /></section>;
}

function PracticePanel({ kind, lesson }) {
  const initial = useMemo(() => {
    const example = (lesson.blocks || []).find((b) => b.type === 'worked_example' || b.type === 'example');
    if (example?.code) return String(example.code);
    if (kind === 'html') return '<main>\n  <h1>Your page</h1>\n  <p>Build something clear.</p>\n</main>';
    if (kind === 'css') return 'main {\n  max-width: 720px;\n  margin: 0 auto;\n  padding: 2rem;\n}' ;
    if (kind === 'javascript') return 'const message = "Keep building.";\nconsole.log(message);';
    if (kind === 'python') return 'message = "Keep building."\nprint(message)';
    return '# Practice workspace\n# Write down the steps you would take.\n';
  }, [lesson, kind]);
  const [code, setCode] = useState(initial);
  const [checked, setChecked] = useState(false);
  useEffect(() => { setCode(initial); setChecked(false); }, [initial]);
  const isWeb = kind === 'html' || kind === 'css';
  const preview = kind === 'html' ? code : kind === 'css' ? `<style>${code}</style><main><h1>Marian practice page</h1><p>Use CSS to shape this preview.</p><button>Example button</button></main>` : '';
  const runCheck = () => setChecked(code.trim().length > 8);
  return (
    <section className="lw-practice">
      <div className="lw-practice-head">
        <div><span className="lw-block-type">PRACTICE WORKSPACE</span><h3>{isWeb ? 'Build and see the result.' : 'Write, test and reason.'}</h3></div>
        <span className="lw-practice-mode"><TerminalSquare size={14} /> Guided sandbox</span>
      </div>
      <div className={`lw-editor-grid ${isWeb ? 'is-web' : ''}`}>
        <div className="lw-editor-pane">
          <div className="lw-editor-bar"><span>{kind === 'html' ? 'index.html' : kind === 'css' ? 'styles.css' : kind === 'javascript' ? 'main.js' : kind === 'python' ? 'main.py' : 'notes.txt'}</span><Code2 size={14} /></div>
          <textarea value={code} onChange={(e) => { setCode(e.target.value); setChecked(false); }} spellCheck="false" aria-label="Practice editor" />
          <div className="lw-editor-actions"><button type="button" onClick={runCheck}><Check size={15} /> Check work</button><button type="button" onClick={() => { setCode(initial); setChecked(false); }}><RotateCcw size={14} /> Reset</button></div>
        </div>
        {isWeb ? <div className="lw-preview-pane"><div className="lw-editor-bar"><span>LIVE PREVIEW</span><FileCode2 size={14} /></div><iframe title="Practice preview" sandbox="allow-scripts" srcDoc={preview} /></div> : <div className="lw-output-pane"><div className="lw-editor-bar"><span>CHECK OUTPUT</span><TerminalSquare size={14} /></div><div className={`lw-check-output ${checked ? 'is-ready' : ''}`}>{checked ? <><CheckCircle2 size={18} /><div><b>Practice submitted for review</b><span>Marian has enough work to continue the guided check. Use the lesson requirements to self-verify the result.</span></div></> : <><Lightbulb size={18} /><div><b>What good looks like</b><span>Make a meaningful change, then check your result against the lesson objective.</span></div></>}</div></div>}
      </div>
    </section>
  );
}

function LessonSidebar({ d, selected, setSelected, kind, onBack }) {
  return (
    <aside className="lw-sidebar">
      <button type="button" className="lw-sidebar-back" onClick={onBack}><ArrowLeft size={15} /> Course roadmap</button>
      <div className="lw-sidebar-title"><span>{COURSE_LABELS[kind] || 'Learning'}</span><b>Learning path</b></div>
      <div className="lw-sidebar-scroll">
        {(d?.modules || []).map((m, mi) => (
          <section key={m.key || mi} className="lw-module-nav">
            <div className="lw-module-nav-head"><span>MODULE {String(mi + 1).padStart(2, '0')}</span><ChevronDown size={14} /></div>
            <b>{m.title}</b>
            <div className="lw-topic-list">
              {(m.topics || []).map((t, ti) => {
                const active = selected?.[0] === mi && selected?.[1] === ti;
                return <button key={t.key || ti} type="button" className={active ? 'is-active' : ''} onClick={() => setSelected([mi, ti])}><span>{active ? <PlayDot /> : <span className="lw-topic-dot" />}</span><span>{t.title}</span><small>{t.lesson?.estimated_minutes || 10}m</small></button>;
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

function PlayDot() { return <span className="lw-play-dot" />; }

export default function LessonViewer({ scr, go }) {
  const [, kind, key] = String(scr).split(':');
  const file = kind === 'cyber' ? `cybersecurity_stage_${key}` : `${FILES[kind] || kind}_${key}`;
  const back = kind === 'cyber' ? 'site-cybersecurity' : `site-pathway-${kind}`;
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState(null);

  useEffect(() => {
    setD(null); setErr(''); setSel(null);
    fetch(import.meta.env.BASE_URL + `curriculum/${file}.json`)
      .then((r) => { if (!r.ok) throw new Error('missing'); return r.json(); })
      .then((data) => { setD(data); setSel(data?.modules?.[0]?.topics?.length ? [0, 0] : null); })
      .catch(() => setErr('This learning environment could not load its curriculum.'));
  }, [file]);

  const lesson = d && sel ? d.modules?.[sel[0]]?.topics?.[sel[1]]?.lesson : null;
  const moduleTitle = d && sel ? d.modules?.[sel[0]]?.title : '';
  const topicTitle = d && sel ? d.modules?.[sel[0]]?.topics?.[sel[1]]?.title : '';
  const flatTopics = useMemo(() => (d?.modules || []).flatMap((m, mi) => (m.topics || []).map((t, ti) => ({ mi, ti, title: t.title }))), [d]);
  const currentIndex = sel ? flatTopics.findIndex((x) => x.mi === sel[0] && x.ti === sel[1]) : -1;
  const previous = currentIndex > 0 ? flatTopics[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < flatTopics.length - 1 ? flatTopics[currentIndex + 1] : null;

  return (
    <PageShell go={go} active="site-learning">
      <div className="lw-shell">
        {err && <div className="lw-error"><h1>Learning environment unavailable</h1><p>{err}</p><button type="button" onClick={() => go(back)}>Back to course</button></div>}
        {!d && !err && <div className="lw-loading"><span />Preparing your learning environment…</div>}
        {d && <>
          <LessonSidebar d={d} selected={sel} setSelected={setSel} kind={kind} onBack={() => go(back)} />
          <main className="lw-main">
            <div className="lw-topbar">
              <div><span>{COURSE_LABELS[kind] || 'Learning'} / {key}</span><b>{moduleTitle || 'Course roadmap'}</b></div>
              <div className="lw-progress"><span>PATH PROGRESS</span><b>{currentIndex + 1} / {flatTopics.length}</b><i><em style={{ width: `${flatTopics.length ? ((currentIndex + 1) / flatTopics.length) * 100 : 0}%` }} /></i></div>
            </div>
            {lesson ? <>
              <div className="lw-lesson-head">
                <span className="lw-breadcrumb">MODULE {String((sel?.[0] || 0) + 1).padStart(2, '0')} · {topicTitle}</span>
                <h1>{lesson.title}</h1>
                <div className="lw-lesson-meta"><span>{lesson.estimated_minutes || 10} minutes</span><span>Concept → Practice → Check</span></div>
              </div>
              {lesson.objectives && <section className="lw-objectives"><div><span className="lw-block-type">LEARNING OBJECTIVES</span><h3>By the end of this lesson</h3></div><Gen v={lesson.objectives} /></section>}
              <div className="lw-content">{(lesson.blocks || []).map((b, i) => <ContentBlock key={i} b={b} />)}</div>
              <PracticePanel kind={kind} lesson={lesson} />
              {lesson.revision_notes && <section className="lw-block"><span className="lw-block-type">REVIEW</span><h3>Revision notes</h3><Gen v={lesson.revision_notes} /></section>}
              {kind === 'cyber' && lesson.lab_environment && <section className="lw-cy-lab-link"><FlaskConical size={19} /><div><span className="lw-block-type">LAB ENVIRONMENT</span><b>Open the practical security lab</b><p>This lesson includes a controlled lab specification. The lab interface remains isolated from the main application.</p></div><button type="button" onClick={() => go('site-cybersecurity')}>View labs <ArrowRight size={15} /></button></section>}
              <nav className="lw-next-nav" aria-label="Lesson navigation">
                <button type="button" disabled={!previous} onClick={() => previous && setSel([previous.mi, previous.ti])}><ArrowLeft size={16} /><span><small>Previous</small><b>{previous?.title || 'Beginning of path'}</b></span></button>
                <button type="button" disabled={!next} onClick={() => next && setSel([next.mi, next.ti])}><span><small>{next ? 'Next lesson' : 'Path complete'}</small><b>{next?.title || 'You reached this level'}</b></span><ArrowRight size={16} /></button>
              </nav>
            </> : <div className="lw-empty"><h1>{d.course?.title || d.title || 'Learning path'}</h1><p>Select a lesson from the roadmap.</p></div>}
          </main>
        </>}
      </div>
    </PageShell>
  );
}
